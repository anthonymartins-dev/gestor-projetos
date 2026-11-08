import { Fragment, useState } from 'react';
import { ArrowLeft, Clock, ListChecks, MessageSquare, Pencil, Plus } from 'lucide-react';
import { api } from '../api.js';
import { ESTADOS, horas } from '../format.js';
import ProjetoForm from './ProjetoForm.jsx';
import TarefaForm from './TarefaForm.jsx';
import {
  Avatar,
  Barra,
  BotaoPrimario,
  BotaoSecundario,
  Confirmar,
  EstadoProjetoBadge,
  IconeBotao,
  PontoProjeto,
  PrazoBadge,
  PrioridadeBadge,
  useDados,
} from './ui.jsx';

const porPosicao = (a, b) => a.posicao - b.posicao || a.id - b.id;

/* Mesma regra do servidor: tira a tarefa, mete-a na coluna de destino no índice pedido. */
function aplicarMovimento(tarefas, id, estado, posicao) {
  const tarefa = tarefas.find((t) => t.id === id);
  const resto = tarefas.filter((t) => t.id !== id);
  const coluna = resto.filter((t) => t.estado === estado).sort(porPosicao);
  coluna.splice(posicao, 0, { ...tarefa, estado });
  return [...resto.filter((t) => t.estado !== estado), ...coluna.map((t, i) => ({ ...t, posicao: i }))];
}

// Índice onde o cartão largado ficaria, pelo sítio do rato face aos cartões visíveis.
function indiceDestino(coluna, y, idArrastado) {
  const cartoes = [...coluna.querySelectorAll('[data-cartao]')].filter(
    (el) => Number(el.dataset.cartao) !== idArrastado
  );
  let indice = 0;
  for (const cartao of cartoes) {
    const caixa = cartao.getBoundingClientRect();
    if (y > caixa.top + caixa.height / 2) indice++;
    else break;
  }
  return indice;
}

function CartaoTarefa({ t, arrastada, aoAbrir, aoComecar, aoTerminar }) {
  return (
    <article
      data-cartao={t.id}
      draggable
      onDragStart={aoComecar}
      onDragEnd={aoTerminar}
      onClick={aoAbrir}
      className={`cursor-grab rounded-xl border bg-white p-3.5 shadow-sm shadow-ink/5 transition select-none hover:border-brand/40 active:cursor-grabbing ${
        t.atrasada ? 'border-danger/30' : 'border-line'
      } ${arrastada ? 'opacity-40' : ''}`}
    >
      <p className="text-[15px] leading-snug font-medium">{t.titulo}</p>

      {(t.prioridade === 'alta' || t.prioridade === 'urgente' || t.prazo) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {(t.prioridade === 'alta' || t.prioridade === 'urgente') && <PrioridadeBadge prioridade={t.prioridade} />}
          <PrazoBadge prazo={t.prazo} estado={t.estado} />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="num flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {t.subtarefas_total > 0 && (
            <span className="inline-flex items-center gap-1" title="Subtarefas feitas">
              <ListChecks size={13} /> {t.subtarefas_feitas}/{t.subtarefas_total}
            </span>
          )}
          {t.comentarios > 0 && (
            <span className="inline-flex items-center gap-1" title="Comentários">
              <MessageSquare size={13} /> {t.comentarios}
            </span>
          )}
          {(t.horas > 0 || t.estimativa) && (
            <span className="inline-flex items-center gap-1" title="Horas registadas e estimadas">
              <Clock size={13} /> {horas(t.horas)}
              {t.estimativa ? ` / ${horas(t.estimativa)}` : ''}
            </span>
          )}
        </div>
        <Avatar nome={t.responsavel_nome} cor={t.responsavel_cor} tamanho={24} />
      </div>
    </article>
  );
}

const Linha = () => <div className="-my-0.5 h-1 rounded-full bg-brand" />;

export default function Quadro({ projetoId, membros, eu, versao, voltar, abrirTarefa, aoMudar, avisar }) {
  const { dados, setDados, erro, recarregar } = useDados(() => api.projeto(projetoId), [projetoId, versao]);
  const [filtro, setFiltro] = useState('');
  const [arrasto, setArrasto] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const [formTarefa, setFormTarefa] = useState(null);
  const [formProjeto, setFormProjeto] = useState(false);
  const [apagar, setApagar] = useState(false);

  if (erro && !dados) {
    return (
      <div className="rounded-2xl border border-line bg-card p-10 text-center">
        <p className="text-danger">{erro}</p>
        <BotaoSecundario className="mt-4" onClick={voltar}>
          Voltar aos projetos
        </BotaoSecundario>
      </div>
    );
  }
  if (!dados) return <div className="h-96 animate-pulse rounded-2xl border border-line bg-line/40" />;

  const tarefas = dados.tarefas;
  const feitas = tarefas.filter((t) => t.estado === 'feito').length;
  const naColuna = (estado) => tarefas.filter((t) => t.estado === estado).sort(porPosicao);
  const aparece = (t) => !filtro || (filtro === 'nenhum' ? !t.responsavel_id : t.responsavel_id === Number(filtro));
  const visiveis = (estado) => naColuna(estado).filter(aparece);

  const equipa = membros.filter((m) => dados.equipa.includes(m.id));
  const haSemResponsavel = tarefas.some((t) => !t.responsavel_id);

  function limparArrasto() {
    setArrasto(null);
    setAlvo(null);
  }

  async function mover(id, estado, posicao) {
    const atual = tarefas.find((t) => t.id === id);
    const indiceAtual = naColuna(estado).findIndex((t) => t.id === id);
    if (atual.estado === estado && indiceAtual === posicao) return;

    setDados({ ...dados, tarefas: aplicarMovimento(tarefas, id, estado, posicao) });
    try {
      await api.moverTarefa(id, estado, posicao);
      aoMudar();
    } catch (e) {
      avisar(e.message);
      recarregar();
    }
  }

  function soltar(estado) {
    if (!arrasto || !alvo || alvo.estado !== estado) return limparArrasto();
    const id = arrasto;
    const todas = naColuna(estado).filter((t) => t.id !== id);
    const vis = visiveis(estado).filter((t) => t.id !== id);
    const posicao = alvo.indice >= vis.length ? todas.length : todas.findIndex((t) => t.id === vis[alvo.indice].id);
    limparArrasto();
    mover(id, estado, posicao);
  }

  function aoArrastarSobre(e, estado) {
    if (!arrasto) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const indice = indiceDestino(e.currentTarget, e.clientY, arrasto);
    if (!alvo || alvo.estado !== estado || alvo.indice !== indice) setAlvo({ estado, indice });
  }

  async function aposGuardarTarefa(tarefa) {
    setFormTarefa(null);
    avisar('Tarefa criada');
    aoMudar();
    abrirTarefa(tarefa.id);
  }

  return (
    <div>
      <button onClick={voltar} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
        <ArrowLeft size={15} /> Projetos
      </button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <PontoProjeto cor={dados.cor} />
            {dados.cliente && <p className="text-sm text-muted">{dados.cliente}</p>}
            <EstadoProjetoBadge estado={dados.estado} />
          </div>
          <h2 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">{dados.nome}</h2>
          {dados.descricao && <p className="mt-1 max-w-2xl text-sm text-muted">{dados.descricao}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <BotaoSecundario onClick={() => setFormProjeto(true)}>
            <Pencil size={15} /> Editar
          </BotaoSecundario>
          <BotaoPrimario onClick={() => setFormTarefa({ estado: 'por_fazer' })}>
            <Plus size={16} /> Nova tarefa
          </BotaoPrimario>
        </div>
      </header>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex-1">
          <Barra valor={feitas} maximo={tarefas.length} />
        </div>
        <p className="num text-sm text-muted">
          <span className="font-medium text-ink">
            {feitas} de {tarefas.length}
          </span>{' '}
          tarefas feitas
          {dados.prazo && (
            <>
              {' · '}
              Entrega <PrazoBadge prazo={dados.prazo} estado={dados.estado === 'concluido' ? 'feito' : 'ativo'} />
            </>
          )}
          {' · '}
          {horas(dados.horas)}
          {dados.estimativa > 0 && ` de ${horas(dados.estimativa)}`}
        </p>
      </div>

      {(equipa.length > 1 || haSemResponsavel) && (
        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por responsável">
          {[
            ['', 'Todos'],
            ...equipa.map((m) => [String(m.id), m.id === eu ? `${m.nome.split(' ')[0]} (eu)` : m.nome.split(' ')[0], m]),
            ...(haSemResponsavel ? [['nenhum', 'Sem responsável']] : []),
          ].map(([valor, texto, membro]) => (
            <button
              key={valor || 'todos'}
              onClick={() => setFiltro(valor)}
              aria-pressed={filtro === valor}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
                filtro === valor ? 'border-brand bg-brand-soft font-medium text-brand' : 'border-line bg-card text-muted hover:text-ink'
              }`}
            >
              {membro && <Avatar nome={membro.nome} cor={membro.cor} tamanho={18} />}
              {texto}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ESTADOS.map((estado) => {
          const lista = visiveis(estado.chave);
          const aqui = arrasto && alvo?.estado === estado.chave;
          let contador = 0;
          return (
            <section
              key={estado.chave}
              onDragOver={(e) => aoArrastarSobre(e, estado.chave)}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setAlvo(null)}
              onDrop={(e) => {
                e.preventDefault();
                soltar(estado.chave);
              }}
              className={`rounded-2xl border bg-paper p-3 transition ${aqui ? 'border-brand/50 bg-brand-soft/40' : 'border-line'}`}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${estado.ponto}`} />
                  <h3 className="text-sm font-semibold">{estado.texto}</h3>
                  <span className="num text-sm text-muted">{lista.length}</span>
                </div>
                <IconeBotao rotulo={`Nova tarefa em ${estado.texto}`} onClick={() => setFormTarefa({ estado: estado.chave })}>
                  <Plus size={16} />
                </IconeBotao>
              </header>

              <div className="flex min-h-24 flex-col gap-2.5">
                {lista.map((t) => {
                  const propria = t.id === arrasto;
                  const mostrarLinha = aqui && !propria && contador === alvo.indice;
                  if (!propria) contador++;
                  return (
                    <Fragment key={t.id}>
                      {mostrarLinha && <Linha />}
                      <CartaoTarefa
                        t={t}
                        arrastada={propria}
                        aoAbrir={() => abrirTarefa(t.id)}
                        aoComecar={(e) => {
                          e.dataTransfer.setData('text/plain', String(t.id));
                          e.dataTransfer.effectAllowed = 'move';
                          setArrasto(t.id);
                        }}
                        aoTerminar={limparArrasto}
                      />
                    </Fragment>
                  );
                })}
                {aqui && alvo.indice >= contador && <Linha />}
                {lista.length === 0 && !aqui && (
                  <p className="px-2 py-6 text-center text-sm text-muted/80">
                    {arrasto ? 'Larga aqui' : 'Sem tarefas'}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">Arrasta os cartões entre colunas, ou abre uma tarefa para mudar o estado.</p>

      {formTarefa && (
        <TarefaForm
          projetoId={projetoId}
          estadoInicial={formTarefa.estado}
          membros={membros}
          eu={eu}
          aoGuardar={aposGuardarTarefa}
          aoFechar={() => setFormTarefa(null)}
        />
      )}
      {formProjeto && (
        <ProjetoForm
          projeto={dados}
          aoGuardar={async () => {
            setFormProjeto(false);
            avisar('Projeto guardado');
            aoMudar();
          }}
          aoApagar={() => {
            setFormProjeto(false);
            setApagar(true);
          }}
          aoFechar={() => setFormProjeto(false)}
        />
      )}
      {apagar && (
        <Confirmar
          titulo="Apagar projeto?"
          texto={`"${dados.nome}" e as suas ${tarefas.length} tarefas, comentários e horas vão ser apagados. Não dá para desfazer. Se só queres tirá-lo da lista, muda o estado para Arquivado.`}
          rotulo="Apagar projeto"
          aoConfirmar={async () => {
            await api.apagarProjeto(projetoId);
            avisar('Projeto apagado');
            aoMudar();
            voltar();
          }}
          aoFechar={() => setApagar(false)}
        />
      )}
    </div>
  );
}
