import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../api.js';
import { ESTADOS, dataRelativa, hojeISO, horas, quando } from '../format.js';
import TarefaForm from './TarefaForm.jsx';
import {
  Avatar,
  Barra,
  BotaoPrimario,
  Confirmar,
  Erro,
  Gaveta,
  IconeBotao,
  PontoProjeto,
  PrazoBadge,
  PrioridadeBadge,
  Selecao,
  classeInput,
  useDados,
} from './ui.jsx';

function Secao({ titulo, extra, children }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {extra && <span className="num text-xs text-muted">{extra}</span>}
      </div>
      {children}
    </section>
  );
}

function Checklist({ tarefa, atualizar, avisar }) {
  const [novo, setNovo] = useState('');

  const tentar = async (fn) => {
    try {
      await fn();
      await atualizar();
    } catch (e) {
      avisar(e.message);
    }
  };

  function adicionar(e) {
    e.preventDefault();
    if (!novo.trim()) return;
    tentar(async () => {
      await api.criarSubtarefa(tarefa.id, novo);
      setNovo('');
    });
  }

  const feitas = tarefa.subtarefas.filter((s) => s.feita).length;

  return (
    <Secao titulo="Lista de passos" extra={tarefa.subtarefas.length ? `${feitas} de ${tarefa.subtarefas.length}` : ''}>
      <ul className="space-y-0.5">
        {tarefa.subtarefas.map((s) => (
          <li key={s.id} className="group flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-line/40">
            <button
              type="button"
              role="checkbox"
              aria-checked={s.feita}
              aria-label={s.titulo}
              onClick={() => tentar(() => api.editarSubtarefa(s.id, { feita: !s.feita }))}
              className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${
                s.feita ? 'border-brand bg-brand text-white' : 'border-muted/50 bg-white hover:border-brand'
              }`}
            >
              {s.feita && <Check size={13} strokeWidth={3} />}
            </button>
            <span className={`flex-1 text-[15px] ${s.feita ? 'text-muted line-through' : ''}`}>{s.titulo}</span>
            <IconeBotao
              rotulo="Remover passo"
              perigo
              className="p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
              onClick={() => tentar(() => api.apagarSubtarefa(s.id))}
            >
              <X size={15} />
            </IconeBotao>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className="mt-2">
        <input
          className={classeInput}
          placeholder="Adicionar um passo e carregar em Enter"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          aria-label="Novo passo"
        />
      </form>
    </Secao>
  );
}

function Tempo({ tarefa, membros, eu, atualizar, avisar }) {
  const [form, setForm] = useState({
    horas: '',
    membro_id: eu ?? tarefa.responsavel_id ?? membros[0]?.id ?? '',
    data: hojeISO(),
    nota: '',
  });
  const [erro, setErro] = useState('');
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function registar(e) {
    e.preventDefault();
    setErro('');
    try {
      await api.registarTempo(tarefa.id, form);
      setForm({ ...form, horas: '', nota: '' });
      await atualizar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function apagar(id) {
    try {
      await api.apagarTempo(id);
      await atualizar();
    } catch (err) {
      avisar(err.message);
    }
  }

  const passou = tarefa.estimativa && tarefa.horas > tarefa.estimativa;

  return (
    <Secao
      titulo="Tempo"
      extra={`${horas(tarefa.horas)}${tarefa.estimativa ? ` de ${horas(tarefa.estimativa)}` : ''}`}
    >
      {tarefa.estimativa > 0 && (
        <div className="mb-3">
          <Barra valor={tarefa.horas} maximo={tarefa.estimativa} classe={passou ? 'bg-danger' : 'bg-brand'} />
          {passou && <p className="mt-1 text-xs text-danger">Passou a estimativa em {horas(tarefa.horas - tarefa.estimativa)}.</p>}
        </div>
      )}

      <form onSubmit={registar} className="grid grid-cols-2 gap-2 sm:grid-cols-[5rem_1fr_9rem_auto]">
        <input
          className={classeInput}
          inputMode="decimal"
          placeholder="Horas"
          aria-label="Horas"
          value={form.horas}
          onChange={mudar('horas')}
        />
        <Selecao aria-label="Quem trabalhou" value={form.membro_id} onChange={mudar('membro_id')}>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </Selecao>
        <input className={classeInput} type="date" aria-label="Dia" value={form.data} onChange={mudar('data')} />
        <BotaoPrimario type="submit" className="col-span-2 sm:col-span-1">
          Registar
        </BotaoPrimario>
        <input
          className={`${classeInput} col-span-2 sm:col-span-4`}
          placeholder="Nota (opcional)"
          aria-label="Nota"
          value={form.nota}
          onChange={mudar('nota')}
        />
      </form>
      <div className="mt-2">
        <Erro>{erro}</Erro>
      </div>

      {tarefa.tempo.length > 0 && (
        <ul className="mt-3 divide-y divide-line text-sm">
          {tarefa.tempo.map((x) => (
            <li key={x.id} className="group flex items-center gap-3 py-2">
              <Avatar nome={x.membro_nome} cor={x.membro_cor} tamanho={22} />
              <span className="min-w-0 flex-1 truncate">
                <span className="text-muted">{dataRelativa(x.data)}</span>
                {x.nota && <span> · {x.nota}</span>}
              </span>
              <span className="num font-medium">{horas(x.horas)}</span>
              <IconeBotao
                rotulo="Apagar registo"
                perigo
                className="p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                onClick={() => apagar(x.id)}
              >
                <Trash2 size={14} />
              </IconeBotao>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}

function Comentarios({ tarefa, membros, eu, atualizar, avisar }) {
  const [texto, setTexto] = useState('');
  const [autor, setAutor] = useState(eu ?? tarefa.responsavel_id ?? membros[0]?.id ?? '');
  const [erro, setErro] = useState('');

  async function comentar(e) {
    e.preventDefault();
    setErro('');
    try {
      await api.comentar(tarefa.id, { texto, autor_id: autor });
      setTexto('');
      await atualizar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function apagar(id) {
    try {
      await api.apagarComentario(id);
      await atualizar();
    } catch (err) {
      avisar(err.message);
    }
  }

  return (
    <Secao titulo="Comentários" extra={tarefa.comentarios_lista.length || ''}>
      <ul className="space-y-4">
        {tarefa.comentarios_lista.map((c) => (
          <li key={c.id} className="group flex gap-3">
            <Avatar nome={c.autor_nome} cor={c.autor_cor} tamanho={28} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{c.autor_nome ?? 'Ex-membro'}</span>
                <span className="text-muted"> · {quando(c.criado_em)}</span>
              </p>
              <p className="mt-0.5 text-[15px] leading-relaxed whitespace-pre-wrap">{c.texto}</p>
            </div>
            <IconeBotao
              rotulo="Apagar comentário"
              perigo
              className="h-fit p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
              onClick={() => apagar(c.id)}
            >
              <Trash2 size={14} />
            </IconeBotao>
          </li>
        ))}
      </ul>

      <form onSubmit={comentar} className="mt-4 space-y-2">
        <textarea
          rows={2}
          className={`${classeInput} resize-y`}
          placeholder="Escreve um comentário"
          aria-label="Comentário"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="flex items-center justify-between gap-3">
          <Selecao aria-label="Quem comenta" value={autor} onChange={(e) => setAutor(e.target.value)} className="w-48">
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Selecao>
          <BotaoPrimario type="submit">Comentar</BotaoPrimario>
        </div>
        <Erro>{erro}</Erro>
      </form>
    </Secao>
  );
}

export default function TarefaDetalhe({ id, membros, eu, aoMudar, aoFechar, avisar }) {
  const { dados: t, erro, recarregar } = useDados(() => api.tarefa(id), [id]);
  const [editar, setEditar] = useState(false);
  const [apagar, setApagar] = useState(false);

  const atualizar = async () => {
    await recarregar();
    aoMudar();
  };

  async function mudarEstado(estado) {
    try {
      await api.moverTarefa(t.id, estado);
      await atualizar();
    } catch (e) {
      avisar(e.message);
    }
  }

  async function mudarResponsavel(valor) {
    try {
      await api.editarTarefa(t.id, { ...t, responsavel_id: valor || null });
      await atualizar();
    } catch (e) {
      avisar(e.message);
    }
  }

  return (
    <Gaveta aoFechar={aoFechar}>
      {erro && !t && (
        <div className="p-8">
          <p className="text-danger">{erro}</p>
          <button onClick={aoFechar} className="mt-3 text-sm underline">
            Fechar
          </button>
        </div>
      )}
      {!t && !erro && <div className="m-6 h-64 animate-pulse rounded-2xl bg-line/40" />}

      {t && (
        <>
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-card/95 p-6 backdrop-blur">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm text-muted">
                <PontoProjeto cor={t.projeto_cor} /> {t.projeto_nome}
              </p>
              <h2 className="mt-1 font-serif text-2xl leading-tight font-semibold">{t.titulo}</h2>
            </div>
            <div className="flex shrink-0">
              <IconeBotao rotulo="Editar" onClick={() => setEditar(true)}>
                <Pencil size={16} />
              </IconeBotao>
              <IconeBotao rotulo="Apagar" perigo onClick={() => setApagar(true)}>
                <Trash2 size={16} />
              </IconeBotao>
              <IconeBotao rotulo="Fechar" onClick={aoFechar}>
                <X size={18} />
              </IconeBotao>
            </div>
          </header>

          <div className="space-y-8 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Selecao rotulo="Estado" value={t.estado} onChange={(e) => mudarEstado(e.target.value)}>
                {ESTADOS.map((e) => (
                  <option key={e.chave} value={e.chave}>
                    {e.texto}
                  </option>
                ))}
              </Selecao>
              <Selecao rotulo="Responsável" value={t.responsavel_id ?? ''} onChange={(e) => mudarResponsavel(e.target.value)}>
                <option value="">Sem responsável</option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </Selecao>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-2 text-muted">
                Prioridade <PrioridadeBadge prioridade={t.prioridade} />
              </span>
              <span className="flex items-center gap-2 text-muted">
                Prazo {t.prazo ? <PrazoBadge prazo={t.prazo} estado={t.estado} /> : <span>sem prazo</span>}
              </span>
              {t.concluida_em && <span className="text-muted">Concluída {quando(t.concluida_em).toLowerCase()}</span>}
            </div>

            {t.descricao && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{t.descricao}</p>}

            <Checklist tarefa={t} atualizar={atualizar} avisar={avisar} />
            <Tempo tarefa={t} membros={membros} eu={eu} atualizar={atualizar} avisar={avisar} />
            <Comentarios tarefa={t} membros={membros} eu={eu} atualizar={atualizar} avisar={avisar} />
          </div>
        </>
      )}

      {editar && t && (
        <TarefaForm
          tarefa={t}
          membros={membros}
          eu={eu}
          aoGuardar={async () => {
            setEditar(false);
            avisar('Tarefa guardada');
            await atualizar();
          }}
          aoFechar={() => setEditar(false)}
        />
      )}
      {apagar && t && (
        <Confirmar
          titulo="Apagar tarefa?"
          texto={`"${t.titulo}" vai ser apagada, com os passos, comentários e horas registadas. Não dá para desfazer.`}
          rotulo="Apagar tarefa"
          aoConfirmar={async () => {
            await api.apagarTarefa(t.id);
            avisar('Tarefa apagada');
            aoMudar();
            aoFechar();
          }}
          aoFechar={() => setApagar(false)}
        />
      )}
    </Gaveta>
  );
}
