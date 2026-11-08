import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../api.js';
import { horas } from '../format.js';
import ProjetoForm from './ProjetoForm.jsx';
import {
  Avatar,
  Barra,
  BotaoPrimario,
  EstadoProjetoBadge,
  PrazoBadge,
  Vazio,
  useDados,
} from './ui.jsx';

function CartaoProjeto({ p, membros, aoAbrir }) {
  const equipa = membros.filter((m) => p.equipa.includes(m.id));
  const parado = p.estado === 'arquivado' || p.estado === 'concluido';
  return (
    <button
      onClick={aoAbrir}
      className={`group overflow-hidden rounded-2xl border border-line bg-card text-left transition hover:border-brand/40 hover:shadow-md hover:shadow-ink/5 ${
        p.estado === 'arquivado' ? 'opacity-70' : ''
      }`}
    >
      <div className="h-1.5" style={{ backgroundColor: p.cor }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-xl font-semibold">{p.nome}</h3>
            <p className="truncate text-sm text-muted">{p.cliente || 'Sem cliente'}</p>
          </div>
          <EstadoProjetoBadge estado={p.estado} />
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-muted">Progresso</span>
            <span className="num">
              {p.feitas} de {p.total} tarefas
            </span>
          </div>
          <Barra valor={p.feitas} maximo={p.total} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex -space-x-2">
            {equipa.map((m) => (
              <Avatar key={m.id} nome={m.nome} cor={m.cor} tamanho={28} className="ring-2 ring-card" />
            ))}
          </div>
          <div className="num flex items-center gap-2 text-sm text-muted">
            {p.atrasadas > 0 && !parado && (
              <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                {p.atrasadas} atrasada{p.atrasadas > 1 ? 's' : ''}
              </span>
            )}
            {p.prazo && <PrazoBadge prazo={p.prazo} estado={parado ? 'feito' : 'ativo'} />}
          </div>
        </div>

        <p className="num mt-3 border-t border-line pt-3 text-xs text-muted">
          {horas(p.horas)} registadas{p.estimativa > 0 ? ` de ${horas(p.estimativa)} estimadas` : ''}
        </p>
      </div>
    </button>
  );
}

export default function Projetos({ membros, versao, abrirProjeto, aoMudar, avisar }) {
  const [arquivados, setArquivados] = useState(false);
  const [novo, setNovo] = useState(false);
  const { dados, erro } = useDados(() => api.projetos(arquivados), [arquivados, versao]);

  if (erro && !dados) return <p className="text-danger">{erro}</p>;
  if (!dados) return <div className="h-96 animate-pulse rounded-2xl border border-line bg-line/40" />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={arquivados}
            onChange={(e) => setArquivados(e.target.checked)}
            className="size-4 accent-brand"
          />
          Mostrar arquivados
        </label>
        <BotaoPrimario onClick={() => setNovo(true)}>
          <Plus size={16} /> Novo projeto
        </BotaoPrimario>
      </div>

      {dados.length === 0 ? (
        <Vazio titulo="Ainda não há projetos" texto="Cria o primeiro para começar a organizar as tarefas.">
          <BotaoPrimario onClick={() => setNovo(true)}>Novo projeto</BotaoPrimario>
        </Vazio>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {dados.map((p) => (
            <CartaoProjeto key={p.id} p={p} membros={membros} aoAbrir={() => abrirProjeto(p.id)} />
          ))}
        </div>
      )}

      {novo && (
        <ProjetoForm
          aoGuardar={async (projeto) => {
            setNovo(false);
            avisar('Projeto criado');
            aoMudar();
            abrirProjeto(projeto.id);
          }}
          aoFechar={() => setNovo(false)}
        />
      )}
    </div>
  );
}
