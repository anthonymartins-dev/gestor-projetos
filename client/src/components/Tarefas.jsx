import { useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { api } from '../api.js';
import { ESTADOS } from '../format.js';
import TarefaForm from './TarefaForm.jsx';
import {
  Avatar,
  BotaoPrimario,
  EstadoBadge,
  PontoProjeto,
  PrazoBadge,
  PrioridadeBadge,
  Selecao,
  Vazio,
  classeInput,
  useDados,
} from './ui.jsx';

export default function Tarefas({ membros, eu, versao, abrirTarefa, aoMudar, avisar }) {
  const [filtros, setFiltros] = useState({ q: '', projeto: '', responsavel: '', estado: 'abertas', atrasadas: false });
  const [novo, setNovo] = useState(false);

  const projetos = useDados(() => api.projetos(), [versao]);
  const lista = useDados(
    () =>
      api.tarefas({
        q: filtros.q,
        projeto_id: filtros.projeto,
        responsavel_id: filtros.responsavel === 'eu' ? eu : filtros.responsavel,
        estado: filtros.estado,
        atrasadas: filtros.atrasadas ? 'true' : '',
      }),
    [filtros, eu, versao]
  );

  const mudar = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value });

  async function alternarFeita(t) {
    try {
      await api.moverTarefa(t.id, t.estado === 'feito' ? 'por_fazer' : 'feito');
      aoMudar();
    } catch (e) {
      avisar(e.message);
    }
  }

  const ativos = (projetos.dados ?? []).filter((p) => p.estado !== 'arquivado');

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            className={`${classeInput} pl-9`}
            placeholder="Pesquisar tarefas"
            aria-label="Pesquisar tarefas"
            value={filtros.q}
            onChange={mudar('q')}
          />
        </div>
        <Selecao aria-label="Projeto" value={filtros.projeto} onChange={mudar('projeto')} className="w-52">
          <option value="">Todos os projetos</option>
          {ativos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Selecao>
        <Selecao aria-label="Responsável" value={filtros.responsavel} onChange={mudar('responsavel')} className="w-44">
          <option value="">Toda a gente</option>
          {eu && <option value="eu">Só as minhas</option>}
          <option value="nenhum">Sem responsável</option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </Selecao>
        <Selecao aria-label="Estado" value={filtros.estado} onChange={mudar('estado')} className="w-40">
          <option value="abertas">Por concluir</option>
          <option value="">Todas</option>
          {ESTADOS.map((e) => (
            <option key={e.chave} value={e.chave}>
              {e.texto}
            </option>
          ))}
        </Selecao>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={filtros.atrasadas}
            onChange={(e) => setFiltros({ ...filtros, atrasadas: e.target.checked })}
            className="size-4 accent-brand"
          />
          Só atrasadas
        </label>
        <BotaoPrimario className="ml-auto" onClick={() => setNovo(true)}>
          <Plus size={16} /> Nova tarefa
        </BotaoPrimario>
      </div>

      {lista.erro && !lista.dados && <p className="text-danger">{lista.erro}</p>}
      {!lista.dados && !lista.erro && <div className="h-96 animate-pulse rounded-2xl border border-line bg-line/40" />}

      {lista.dados &&
        (lista.dados.length === 0 ? (
          <Vazio titulo="Nenhuma tarefa" texto="Não há tarefas com estes filtros." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <ul className="divide-y divide-line">
              {lista.dados.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-line/30 sm:px-5">
                  <button
                    onClick={() => alternarFeita(t)}
                    role="checkbox"
                    aria-checked={t.estado === 'feito'}
                    aria-label={t.estado === 'feito' ? 'Reabrir tarefa' : 'Marcar como feita'}
                    className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${
                      t.estado === 'feito'
                        ? 'border-brand bg-brand text-white'
                        : 'border-muted/50 bg-white hover:border-brand'
                    }`}
                  >
                    {t.estado === 'feito' && <Check size={13} strokeWidth={3} />}
                  </button>

                  <button onClick={() => abrirTarefa(t.id)} className="min-w-0 flex-1 text-left">
                    <p className={`truncate font-medium ${t.estado === 'feito' ? 'text-muted line-through' : ''}`}>
                      {t.titulo}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
                      <PontoProjeto cor={t.projeto_cor} /> {t.projeto_nome}
                    </p>
                  </button>

                  <span className="hidden md:block">
                    <EstadoBadge estado={t.estado} />
                  </span>
                  <span className="hidden w-20 lg:block">
                    {(t.prioridade === 'alta' || t.prioridade === 'urgente') && (
                      <PrioridadeBadge prioridade={t.prioridade} />
                    )}
                  </span>
                  <span className="flex w-28 justify-end">
                    <PrazoBadge prazo={t.prazo} estado={t.estado} />
                  </span>
                  <Avatar nome={t.responsavel_nome} cor={t.responsavel_cor} />
                </li>
              ))}
            </ul>
          </div>
        ))}

      {novo && (
        <TarefaForm
          projetos={ativos}
          membros={membros}
          eu={eu}
          aoGuardar={async (tarefa) => {
            setNovo(false);
            avisar('Tarefa criada');
            aoMudar();
            abrirTarefa(tarefa.id);
          }}
          aoFechar={() => setNovo(false)}
        />
      )}
    </div>
  );
}
