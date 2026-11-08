require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool, types } = require('pg');

// DATE e TIMESTAMP chegam como texto (sem fusos horários); NUMERIC chega como número.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1114, (v) => v.replace(' ', 'T'));
types.setTypeParser(1700, parseFloat);

const app = express();
// Em produção, CORS_ORIGIN lista os endereços do site (separados por vírgulas).
// Sem ela (desenvolvimento), aceita qualquer origem.
const origens = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors(origens.length ? { origin: origens } : undefined));

// Usado pelo alojamento para saber se a API está viva.
app.get('/health', (req, res) => res.json({ ok: true }));
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ESTADOS = ['por_fazer', 'em_curso', 'em_revisao', 'feito'];
const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente'];
const ESTADOS_PROJETO = ['ativo', 'em_pausa', 'concluido', 'arquivado'];

const rota = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (erro) {
    if (erro.code === '22007' || erro.code === '22008') {
      return res.status(400).json({ erro: 'Data inválida' });
    }
    if (erro.code === '22P02' || erro.code === '22003') {
      return res.status(400).json({ erro: 'Valor inválido' });
    }
    console.error(erro);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

/* ---------- utilitários ---------- */

const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const COR_RE = /^#[0-9a-fA-F]{6}$/;
const vazio = (v) => v === undefined || v === null || v === '';

// Executa várias queries na mesma ligação, com tudo-ou-nada.
async function transacao(fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

// Erro de validação com código HTTP, para sair de dentro de uma transação.
class Falha extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const rotaT = (fn) =>
  rota(async (req, res) => {
    try {
      await fn(req, res);
    } catch (erro) {
      if (erro instanceof Falha) return res.status(erro.status).json({ erro: erro.message });
      throw erro;
    }
  });

function lerData(v, rotulo) {
  if (vazio(v)) return { valor: null };
  if (typeof v !== 'string' || !DATA_RE.test(v)) return { erro: `${rotulo} inválido` };
  return { valor: v };
}

function lerNumero(v, rotulo, { max } = {}) {
  if (vazio(v)) return { valor: null };
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return { erro: `${rotulo}: tem de ser maior que zero` };
  if (max && n > max) return { erro: `${rotulo}: o máximo é ${max}` };
  return { valor: Math.round(n * 100) / 100 };
}

async function membroAtivo(db, id) {
  if (vazio(id)) return null;
  const { rows } = await db.query('SELECT id FROM membros WHERE id = $1 AND ativo', [id]);
  if (rows.length === 0) throw new Falha(400, 'Membro não encontrado');
  return rows[0].id;
}

const tarefaPorId = async (db, id) =>
  (await db.query('SELECT * FROM tarefas_v WHERE id = $1', [id])).rows[0];

/* ---------- membros ---------- */

app.get('/membros', rota(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT m.*,
      (SELECT COUNT(*) FROM tarefas t WHERE t.responsavel_id = m.id AND t.estado <> 'feito')::int AS abertas,
      (SELECT COUNT(*) FROM tarefas t
        WHERE t.responsavel_id = m.id AND t.estado <> 'feito' AND t.prazo < CURRENT_DATE)::int AS atrasadas,
      COALESCE((SELECT SUM(x.horas) FROM tempo x
        WHERE x.membro_id = m.id AND x.data > CURRENT_DATE - 30), 0) AS horas_30d
    FROM membros m WHERE m.ativo ORDER BY m.nome`);
  res.json(rows);
}));

function lerMembro(corpo) {
  const nome = texto(corpo.nome);
  if (!nome) return { erro: 'O nome é obrigatório' };
  const email = texto(corpo.email);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: 'Email inválido' };
  const cor = texto(corpo.cor) || '#24493c';
  if (!COR_RE.test(cor)) return { erro: 'Cor inválida' };
  return { dados: [nome, texto(corpo.funcao), email, cor] };
}

app.post('/membros', rota(async (req, res) => {
  const { erro, dados } = lerMembro(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    'INSERT INTO membros (nome, funcao, email, cor) VALUES ($1, $2, $3, $4) RETURNING *', dados);
  res.status(201).json(rows[0]);
}));

app.put('/membros/:id', rota(async (req, res) => {
  const { erro, dados } = lerMembro(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    `UPDATE membros SET nome = $1, funcao = $2, email = $3, cor = $4
     WHERE id = $5 AND ativo RETURNING *`, [...dados, req.params.id]);
  if (rows.length === 0) return res.status(404).json({ erro: 'Membro não encontrado' });
  res.json(rows[0]);
}));

// Arquivar um membro tira-lhe as tarefas por concluir; o histórico fica.
app.delete('/membros/:id', rota(async (req, res) => {
  const encontrado = await transacao(async (db) => {
    const { rowCount } = await db.query('UPDATE membros SET ativo = FALSE WHERE id = $1 AND ativo', [req.params.id]);
    if (rowCount === 0) return false;
    await db.query(
      "UPDATE tarefas SET responsavel_id = NULL WHERE responsavel_id = $1 AND estado <> 'feito'",
      [req.params.id]);
    return true;
  });
  if (!encontrado) return res.status(404).json({ erro: 'Membro não encontrado' });
  res.status(204).end();
}));

/* ---------- projetos ---------- */

const SQL_PROJETOS = `
  SELECT p.*,
    COUNT(v.id)::int AS total,
    COUNT(v.id) FILTER (WHERE v.estado = 'feito')::int AS feitas,
    COUNT(v.id) FILTER (WHERE v.atrasada)::int AS atrasadas,
    COALESCE(SUM(v.horas), 0) AS horas,
    COALESCE(SUM(v.estimativa), 0) AS estimativa,
    COALESCE(ARRAY_AGG(DISTINCT v.responsavel_id) FILTER (WHERE v.responsavel_id IS NOT NULL), '{}') AS equipa
  FROM projetos p LEFT JOIN tarefas_v v ON v.projeto_id = p.id`;

app.get('/projetos', rota(async (req, res) => {
  const filtro = req.query.arquivados === 'true' ? '' : "WHERE p.estado <> 'arquivado'";
  const { rows } = await pool.query(`${SQL_PROJETOS} ${filtro}
    GROUP BY p.id
    ORDER BY (p.estado = 'ativo') DESC, (p.estado = 'em_pausa') DESC, p.prazo NULLS LAST, p.nome`);
  res.json(rows);
}));

app.get('/projetos/:id', rota(async (req, res) => {
  const { rows } = await pool.query(`${SQL_PROJETOS} WHERE p.id = $1 GROUP BY p.id`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ erro: 'Projeto não encontrado' });
  const tarefas = await pool.query(
    'SELECT * FROM tarefas_v WHERE projeto_id = $1 ORDER BY posicao, id', [req.params.id]);
  res.json({ ...rows[0], tarefas: tarefas.rows });
}));

function lerProjeto(corpo) {
  const nome = texto(corpo.nome);
  if (!nome) return { erro: 'O nome é obrigatório' };
  const estado = corpo.estado ?? 'ativo';
  if (!ESTADOS_PROJETO.includes(estado)) return { erro: 'Estado inválido' };
  const prazo = lerData(corpo.prazo, 'Prazo');
  if (prazo.erro) return { erro: prazo.erro };
  const cor = texto(corpo.cor) || '#24493c';
  if (!COR_RE.test(cor)) return { erro: 'Cor inválida' };
  return { dados: [nome, texto(corpo.cliente), texto(corpo.descricao), estado, prazo.valor, cor] };
}

app.post('/projetos', rota(async (req, res) => {
  const { erro, dados } = lerProjeto(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    `INSERT INTO projetos (nome, cliente, descricao, estado, prazo, cor)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, dados);
  res.status(201).json(rows[0]);
}));

app.put('/projetos/:id', rotaT(async (req, res) => {
  const { erro, dados } = lerProjeto(req.body);
  if (erro) return res.status(400).json({ erro });

  if (dados[3] === 'concluido') {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS abertas FROM tarefas WHERE projeto_id = $1 AND estado <> 'feito'",
      [req.params.id]);
    if (rows[0].abertas > 0) {
      const n = rows[0].abertas;
      throw new Falha(409, `Ainda há ${n} ${n === 1 ? 'tarefa' : 'tarefas'} por concluir`);
    }
  }

  const { rows } = await pool.query(
    `UPDATE projetos SET nome = $1, cliente = $2, descricao = $3, estado = $4, prazo = $5, cor = $6
     WHERE id = $7 RETURNING *`, [...dados, req.params.id]);
  if (rows.length === 0) return res.status(404).json({ erro: 'Projeto não encontrado' });
  res.json(rows[0]);
}));

// Apaga o projeto e, em cascata, tudo o que lhe pertence. A interface pede confirmação.
app.delete('/projetos/:id', rota(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM projetos WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Projeto não encontrado' });
  res.status(204).end();
}));

/* ---------- tarefas ---------- */

app.get('/tarefas', rota(async (req, res) => {
  const { projeto_id, responsavel_id, estado, atrasadas, q } = req.query;
  const condicoes = ["projeto_estado <> 'arquivado'"];
  const valores = [];
  const param = (v) => `$${valores.push(v)}`;

  if (projeto_id) condicoes.push(`projeto_id = ${param(projeto_id)}`);
  if (responsavel_id === 'nenhum') condicoes.push('responsavel_id IS NULL');
  else if (responsavel_id) condicoes.push(`responsavel_id = ${param(responsavel_id)}`);
  if (estado === 'abertas') condicoes.push("estado <> 'feito'");
  else if (estado) condicoes.push(`estado = ${param(estado)}`);
  if (atrasadas === 'true') condicoes.push('atrasada');
  if (q) condicoes.push(`titulo ILIKE ${param(`%${String(q).trim()}%`)}`);

  const { rows } = await pool.query(
    `SELECT * FROM tarefas_v WHERE ${condicoes.join(' AND ')}
     ORDER BY (estado = 'feito'), prazo NULLS LAST, id LIMIT 500`, valores);
  res.json(rows);
}));

app.get('/tarefas/:id', rota(async (req, res) => {
  const tarefa = await tarefaPorId(pool, req.params.id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada' });
  const [subtarefas, comentarios, tempo] = await Promise.all([
    pool.query('SELECT * FROM subtarefas WHERE tarefa_id = $1 ORDER BY id', [tarefa.id]),
    pool.query(
      `SELECT c.*, m.nome AS autor_nome, m.cor AS autor_cor
       FROM comentarios c LEFT JOIN membros m ON m.id = c.autor_id
       WHERE c.tarefa_id = $1 ORDER BY c.criado_em, c.id`, [tarefa.id]),
    pool.query(
      `SELECT x.*, m.nome AS membro_nome, m.cor AS membro_cor
       FROM tempo x LEFT JOIN membros m ON m.id = x.membro_id
       WHERE x.tarefa_id = $1 ORDER BY x.data DESC, x.id DESC`, [tarefa.id]),
  ]);
  res.json({
    ...tarefa,
    subtarefas: subtarefas.rows,
    comentarios_lista: comentarios.rows,
    tempo: tempo.rows,
  });
}));

// Valida os campos comuns à criação e à edição.
async function lerTarefa(db, corpo) {
  const titulo = texto(corpo.titulo);
  if (!titulo) throw new Falha(400, 'O título é obrigatório');
  const prioridade = corpo.prioridade ?? 'media';
  if (!PRIORIDADES.includes(prioridade)) throw new Falha(400, 'Prioridade inválida');
  const prazo = lerData(corpo.prazo, 'Prazo');
  if (prazo.erro) throw new Falha(400, prazo.erro);
  const estimativa = lerNumero(corpo.estimativa, 'A estimativa', { max: 999 });
  if (estimativa.erro) throw new Falha(400, estimativa.erro);
  const responsavel = await membroAtivo(db, corpo.responsavel_id);
  return [titulo, texto(corpo.descricao), prioridade, responsavel, prazo.valor, estimativa.valor];
}

app.post('/tarefas', rotaT(async (req, res) => {
  const estado = req.body.estado ?? 'por_fazer';
  if (!ESTADOS.includes(estado)) throw new Falha(400, 'Estado inválido');

  const id = await transacao(async (db) => {
    const campos = await lerTarefa(db, req.body);
    // Bloqueia o projeto para que dois cartões novos não fiquem na mesma posição.
    const projeto = await db.query('SELECT estado FROM projetos WHERE id = $1 FOR UPDATE', [req.body.projeto_id ?? 0]);
    if (projeto.rows.length === 0) throw new Falha(400, 'Projeto não encontrado');
    if (projeto.rows[0].estado === 'arquivado') throw new Falha(409, 'O projeto está arquivado');

    const { rows } = await db.query(
      `INSERT INTO tarefas (projeto_id, titulo, descricao, prioridade, responsavel_id, prazo, estimativa,
                            estado, posicao, concluida_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
         (SELECT COALESCE(MAX(posicao) + 1, 0) FROM tarefas WHERE projeto_id = $1 AND estado = $8),
         CASE WHEN $8 = 'feito' THEN NOW() END)
       RETURNING id`, [req.body.projeto_id, ...campos, estado]);
    if (estado !== 'feito') {
      await db.query("UPDATE projetos SET estado = 'ativo' WHERE id = $1 AND estado = 'concluido'", [req.body.projeto_id]);
    }
    return rows[0].id;
  });
  res.status(201).json(await tarefaPorId(pool, id));
}));

app.put('/tarefas/:id', rotaT(async (req, res) => {
  const campos = await lerTarefa(pool, req.body);
  const { rowCount } = await pool.query(
    `UPDATE tarefas SET titulo = $1, descricao = $2, prioridade = $3, responsavel_id = $4,
                        prazo = $5, estimativa = $6
     WHERE id = $7`, [...campos, req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Tarefa não encontrada' });
  res.json(await tarefaPorId(pool, req.params.id));
}));

// Muda a tarefa de coluna e/ou de lugar. `posicao` é o índice na coluna de destino
// (sem contar com a própria tarefa); se faltar, vai para o fim.
app.post('/tarefas/:id/mover', rotaT(async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) throw new Falha(400, 'Estado inválido');
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) throw new Falha(400, 'Valor inválido');
  let pedida;
  if (!vazio(req.body.posicao)) {
    pedida = Number(req.body.posicao);
    if (!Number.isInteger(pedida) || pedida < 0) throw new Falha(400, 'Posição inválida');
  }

  await transacao(async (db) => {
    const previa = await db.query('SELECT projeto_id FROM tarefas WHERE id = $1', [id]);
    if (previa.rows.length === 0) throw new Falha(404, 'Tarefa não encontrada');
    const projetoId = previa.rows[0].projeto_id;

    // Um bloqueio por projeto: movimentos em simultâneo não se atropelam.
    await db.query('SELECT 1 FROM projetos WHERE id = $1 FOR UPDATE', [projetoId]);
    const atual = await db.query('SELECT estado FROM tarefas WHERE id = $1', [id]);
    if (atual.rows.length === 0) throw new Falha(404, 'Tarefa não encontrada');

    const coluna = await db.query(
      'SELECT id FROM tarefas WHERE projeto_id = $1 AND estado = $2 AND id <> $3 ORDER BY posicao, id',
      [projetoId, estado, id]);
    const ids = coluna.rows.map((r) => r.id);
    ids.splice(pedida === undefined ? ids.length : Math.min(pedida, ids.length), 0, id);

    await db.query(
      `UPDATE tarefas t SET
         posicao = x.pos - 1,
         estado = $2::text,
         concluida_em = CASE
           WHEN t.id <> $3 OR $4::text = $2::text THEN t.concluida_em
           WHEN $2::text = 'feito' THEN NOW()
           ELSE NULL END
       FROM unnest($1::int[]) WITH ORDINALITY AS x(id, pos)
       WHERE t.id = x.id`, [ids, estado, id, atual.rows[0].estado]);

    if (estado !== 'feito') {
      await db.query("UPDATE projetos SET estado = 'ativo' WHERE id = $1 AND estado = 'concluido'", [projetoId]);
    }
  });
  res.json(await tarefaPorId(pool, id));
}));

app.delete('/tarefas/:id', rota(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM tarefas WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Tarefa não encontrada' });
  res.status(204).end();
}));

/* ---------- subtarefas ---------- */

app.post('/tarefas/:id/subtarefas', rota(async (req, res) => {
  const titulo = texto(req.body.titulo);
  if (!titulo) return res.status(400).json({ erro: 'O título é obrigatório' });
  const existe = await pool.query('SELECT 1 FROM tarefas WHERE id = $1', [req.params.id]);
  if (existe.rows.length === 0) return res.status(404).json({ erro: 'Tarefa não encontrada' });
  const { rows } = await pool.query(
    'INSERT INTO subtarefas (tarefa_id, titulo) VALUES ($1, $2) RETURNING *', [req.params.id, titulo]);
  res.status(201).json(rows[0]);
}));

app.put('/subtarefas/:id', rota(async (req, res) => {
  const titulo = req.body.titulo === undefined ? null : texto(req.body.titulo);
  if (req.body.titulo !== undefined && !titulo) {
    return res.status(400).json({ erro: 'O título é obrigatório' });
  }
  const feita = typeof req.body.feita === 'boolean' ? req.body.feita : null;
  const { rows } = await pool.query(
    `UPDATE subtarefas SET titulo = COALESCE($1, titulo), feita = COALESCE($2, feita)
     WHERE id = $3 RETURNING *`, [titulo, feita, req.params.id]);
  if (rows.length === 0) return res.status(404).json({ erro: 'Subtarefa não encontrada' });
  res.json(rows[0]);
}));

app.delete('/subtarefas/:id', rota(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM subtarefas WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Subtarefa não encontrada' });
  res.status(204).end();
}));

/* ---------- comentários ---------- */

app.post('/tarefas/:id/comentarios', rotaT(async (req, res) => {
  const conteudo = texto(req.body.texto);
  if (!conteudo) throw new Falha(400, 'Escreve um comentário');
  const autor = await membroAtivo(pool, req.body.autor_id);
  const existe = await pool.query('SELECT 1 FROM tarefas WHERE id = $1', [req.params.id]);
  if (existe.rows.length === 0) throw new Falha(404, 'Tarefa não encontrada');
  const { rows } = await pool.query(
    'INSERT INTO comentarios (tarefa_id, autor_id, texto) VALUES ($1, $2, $3) RETURNING id',
    [req.params.id, autor, conteudo]);
  const completo = await pool.query(
    `SELECT c.*, m.nome AS autor_nome, m.cor AS autor_cor
     FROM comentarios c LEFT JOIN membros m ON m.id = c.autor_id WHERE c.id = $1`, [rows[0].id]);
  res.status(201).json(completo.rows[0]);
}));

app.delete('/comentarios/:id', rota(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM comentarios WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Comentário não encontrado' });
  res.status(204).end();
}));

/* ---------- tempo ---------- */

app.post('/tarefas/:id/tempo', rotaT(async (req, res) => {
  const horas = lerNumero(req.body.horas, 'As horas', { max: 24 });
  if (horas.erro || horas.valor === null) throw new Falha(400, horas.erro || 'Indica as horas');
  const data = lerData(req.body.data, 'Data');
  if (data.erro) throw new Falha(400, data.erro);
  const membro = await membroAtivo(pool, req.body.membro_id);
  const existe = await pool.query('SELECT 1 FROM tarefas WHERE id = $1', [req.params.id]);
  if (existe.rows.length === 0) throw new Falha(404, 'Tarefa não encontrada');

  const { rows } = await pool.query(
    `INSERT INTO tempo (tarefa_id, membro_id, data, horas, nota)
     VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5) RETURNING id`,
    [req.params.id, membro, data.valor, horas.valor, texto(req.body.nota)]);
  const completo = await pool.query(
    `SELECT x.*, m.nome AS membro_nome, m.cor AS membro_cor
     FROM tempo x LEFT JOIN membros m ON m.id = x.membro_id WHERE x.id = $1`, [rows[0].id]);
  res.status(201).json(completo.rows[0]);
}));

app.delete('/tempo/:id', rota(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM tempo WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Registo não encontrado' });
  res.status(204).end();
}));

/* ---------- painel ---------- */

app.get('/painel', rota(async (req, res) => {
  const [indicadores, proximas, carga, atividade] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COUNT(*) FROM projetos WHERE estado = 'ativo')::int AS projetos_ativos,
        COUNT(*) FILTER (WHERE t.estado <> 'feito')::int AS abertas,
        COUNT(*) FILTER (WHERE t.estado <> 'feito' AND t.prazo < CURRENT_DATE)::int AS atrasadas,
        COUNT(*) FILTER (WHERE t.estado <> 'feito' AND t.prazo BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)::int AS esta_semana,
        COUNT(*) FILTER (WHERE t.estado = 'feito' AND t.concluida_em > NOW() - INTERVAL '7 days')::int AS concluidas_semana,
        (SELECT COALESCE(SUM(horas), 0) FROM tempo WHERE data > CURRENT_DATE - 7) AS horas_semana
      FROM tarefas t JOIN projetos p ON p.id = t.projeto_id
      WHERE p.estado <> 'arquivado'`),
    pool.query(`
      SELECT * FROM tarefas_v
      WHERE estado <> 'feito' AND prazo IS NOT NULL AND projeto_estado <> 'arquivado'
      ORDER BY prazo, id LIMIT 8`),
    pool.query(`
      SELECT m.id, m.nome, m.funcao, m.cor,
        COUNT(v.id) FILTER (WHERE v.estado <> 'feito')::int AS abertas,
        COUNT(v.id) FILTER (WHERE v.atrasada)::int AS atrasadas,
        COALESCE(SUM(GREATEST(COALESCE(v.estimativa, 0) - v.horas, 0)) FILTER (WHERE v.estado <> 'feito'), 0) AS horas_restantes
      FROM membros m
      LEFT JOIN tarefas_v v ON v.responsavel_id = m.id AND v.projeto_estado <> 'arquivado'
      WHERE m.ativo GROUP BY m.id ORDER BY abertas DESC, m.nome`),
    pool.query(`
      SELECT d::date AS dia,
        (SELECT COUNT(*) FROM tarefas WHERE concluida_em::date = d::date)::int AS concluidas,
        COALESCE((SELECT SUM(horas) FROM tempo WHERE data = d::date), 0) AS horas
      FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, INTERVAL '1 day') d ORDER BY d`),
  ]);

  res.json({
    ...indicadores.rows[0],
    proximas: proximas.rows,
    carga: carga.rows,
    atividade: atividade.rows,
  });
}));

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Servidor a correr em http://localhost:${PORT}`));
