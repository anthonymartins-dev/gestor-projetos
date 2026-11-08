-- Gestor de Projetos: esquema PostgreSQL.
-- Pode ser corrido mais do que uma vez sem estragar nada.

CREATE TABLE IF NOT EXISTS membros (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL CHECK (btrim(nome) <> ''),
  funcao     TEXT,
  email      TEXT,
  cor        TEXT NOT NULL DEFAULT '#24493c' CHECK (cor ~ '^#[0-9a-fA-F]{6}$'),
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projetos (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL CHECK (btrim(nome) <> ''),
  cliente    TEXT,
  descricao  TEXT,
  estado     TEXT NOT NULL DEFAULT 'ativo'
             CHECK (estado IN ('ativo', 'em_pausa', 'concluido', 'arquivado')),
  prazo      DATE,
  cor        TEXT NOT NULL DEFAULT '#24493c' CHECK (cor ~ '^#[0-9a-fA-F]{6}$'),
  criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- `posicao` ordena os cartões dentro de cada coluna do quadro.
CREATE TABLE IF NOT EXISTS tarefas (
  id              SERIAL PRIMARY KEY,
  projeto_id      INT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL CHECK (btrim(titulo) <> ''),
  descricao       TEXT,
  estado          TEXT NOT NULL DEFAULT 'por_fazer'
                  CHECK (estado IN ('por_fazer', 'em_curso', 'em_revisao', 'feito')),
  prioridade      TEXT NOT NULL DEFAULT 'media'
                  CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  responsavel_id  INT REFERENCES membros(id) ON DELETE SET NULL,
  prazo           DATE,
  estimativa      NUMERIC(6,2) CHECK (estimativa IS NULL OR estimativa > 0),
  posicao         INT NOT NULL DEFAULT 0,
  criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
  concluida_em    TIMESTAMP
);
CREATE INDEX IF NOT EXISTS tarefas_quadro_idx ON tarefas (projeto_id, estado, posicao);
CREATE INDEX IF NOT EXISTS tarefas_responsavel_idx ON tarefas (responsavel_id);

CREATE TABLE IF NOT EXISTS subtarefas (
  id         SERIAL PRIMARY KEY,
  tarefa_id  INT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  titulo     TEXT NOT NULL CHECK (btrim(titulo) <> ''),
  feita      BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subtarefas_tarefa_idx ON subtarefas (tarefa_id);

CREATE TABLE IF NOT EXISTS comentarios (
  id         SERIAL PRIMARY KEY,
  tarefa_id  INT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  autor_id   INT REFERENCES membros(id) ON DELETE SET NULL,
  texto      TEXT NOT NULL CHECK (btrim(texto) <> ''),
  criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comentarios_tarefa_idx ON comentarios (tarefa_id);

CREATE TABLE IF NOT EXISTS tempo (
  id         SERIAL PRIMARY KEY,
  tarefa_id  INT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  membro_id  INT REFERENCES membros(id) ON DELETE SET NULL,
  data       DATE NOT NULL DEFAULT CURRENT_DATE,
  horas      NUMERIC(5,2) NOT NULL CHECK (horas > 0 AND horas <= 24),
  nota       TEXT,
  criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tempo_tarefa_idx ON tempo (tarefa_id);
CREATE INDEX IF NOT EXISTS tempo_data_idx ON tempo (data);

-- Tarefa com tudo o que a interface precisa para a mostrar numa lista ou num cartão.
CREATE OR REPLACE VIEW tarefas_v AS
SELECT
  t.*,
  p.nome  AS projeto_nome,
  p.cor   AS projeto_cor,
  p.estado AS projeto_estado,
  m.nome  AS responsavel_nome,
  m.cor   AS responsavel_cor,
  (t.estado <> 'feito' AND t.prazo < CURRENT_DATE) AS atrasada,
  (SELECT COUNT(*) FROM subtarefas s WHERE s.tarefa_id = t.id)::int AS subtarefas_total,
  (SELECT COUNT(*) FROM subtarefas s WHERE s.tarefa_id = t.id AND s.feita)::int AS subtarefas_feitas,
  (SELECT COUNT(*) FROM comentarios c WHERE c.tarefa_id = t.id)::int AS comentarios,
  COALESCE((SELECT SUM(x.horas) FROM tempo x WHERE x.tarefa_id = t.id), 0) AS horas
FROM tarefas t
JOIN projetos p ON p.id = t.projeto_id
LEFT JOIN membros m ON m.id = t.responsavel_id;
