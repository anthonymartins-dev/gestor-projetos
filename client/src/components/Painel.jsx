import { api } from '../api.js';
import { dataCurta, horas } from '../format.js';
import {
  Avatar,
  Barra,
  Cartao,
  PontoProjeto,
  PrazoBadge,
  PrioridadeBadge,
  Vazio,
  useDados,
} from './ui.jsx';

function Indicador({ rotulo, valor, nota, perigo }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-sm text-muted">{rotulo}</p>
      <p className={`num mt-1 font-serif text-4xl font-semibold ${perigo ? 'text-danger' : ''}`}>{valor}</p>
      <p className="mt-1 text-sm text-muted">{nota}</p>
    </div>
  );
}

function Atividade({ dias }) {
  const maximo = Math.max(...dias.map((d) => d.horas), 1);
  return (
    <div>
      <div className="flex h-28 items-end gap-1.5" role="img" aria-label="Horas registadas por dia nos últimos 14 dias">
        {dias.map((d, i) => (
          <div
            key={d.dia}
            title={`${dataCurta(d.dia)}: ${horas(d.horas)}${d.concluidas ? ` · ${d.concluidas} concluída(s)` : ''}`}
            className={`flex-1 rounded-t-md ${i === dias.length - 1 ? 'bg-brand' : 'bg-brand/35'}`}
            style={{ height: `${Math.max((d.horas / maximo) * 100, d.horas > 0 ? 4 : 1.5)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{dataCurta(dias[0].dia)}</span>
        <span>Hoje</span>
      </div>
    </div>
  );
}

export default function Painel({ versao, abrirTarefa, abrirProjeto }) {
  const { dados, erro } = useDados(async () => {
    const [painel, projetos] = await Promise.all([api.painel(), api.projetos()]);
    return { painel, projetos };
  }, [versao]);

  if (erro && !dados) return <p className="text-danger">{erro}</p>;
  if (!dados) return <div className="h-96 animate-pulse rounded-2xl border border-line bg-line/40" />;

  const { painel: p, projetos } = dados;
  const ativos = projetos.filter((x) => x.estado === 'ativo' || x.estado === 'em_pausa');
  const maxRestante = Math.max(...p.carga.map((m) => m.horas_restantes), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador rotulo="Projetos ativos" valor={p.projetos_ativos} nota={`${p.abertas} tarefas abertas`} />
        <Indicador
          rotulo="Atrasadas"
          valor={p.atrasadas}
          perigo={p.atrasadas > 0}
          nota={p.atrasadas > 0 ? 'Precisam de atenção' : 'Tudo em dia'}
        />
        <Indicador rotulo="A entregar em 7 dias" valor={p.esta_semana} nota="Tarefas com prazo próximo" />
        <Indicador
          rotulo="Horas esta semana"
          valor={horas(p.horas_semana)}
          nota={`${p.concluidas_semana} tarefas concluídas`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Cartao titulo="Próximas entregas" texto="As tarefas por concluir com prazo mais perto, atrasadas primeiro.">
            {p.proximas.length === 0 ? (
              <div className="p-5">
                <Vazio titulo="Nada com prazo" texto="As tarefas com prazo aparecem aqui." />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {p.proximas.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => abrirTarefa(t.id)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-line/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t.titulo}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
                          <PontoProjeto cor={t.projeto_cor} /> {t.projeto_nome}
                        </p>
                      </div>
                      {(t.prioridade === 'alta' || t.prioridade === 'urgente') && (
                        <span className="hidden sm:block">
                          <PrioridadeBadge prioridade={t.prioridade} />
                        </span>
                      )}
                      <PrazoBadge prazo={t.prazo} estado={t.estado} />
                      <Avatar nome={t.responsavel_nome} cor={t.responsavel_cor} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao titulo="Projetos" texto="Progresso medido pelas tarefas feitas.">
            <ul className="divide-y divide-line">
              {ativos.map((x) => (
                <li key={x.id}>
                  <button
                    onClick={() => abrirProjeto(x.id)}
                    className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-line/30"
                  >
                    <PontoProjeto cor={x.cor} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{x.nome}</p>
                      <p className="truncate text-sm text-muted">
                        {x.cliente}
                        {x.estado === 'em_pausa' && ' · em pausa'}
                      </p>
                    </div>
                    <div className="hidden w-32 sm:block">
                      <Barra valor={x.feitas} maximo={x.total} />
                    </div>
                    <span className="num w-12 text-right text-sm text-muted">
                      {x.feitas}/{x.total}
                    </span>
                    <span className="hidden w-24 justify-end sm:flex">
                      <PrazoBadge prazo={x.prazo} estado="ativo" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>

        <div className="min-w-0 space-y-6">
          <Cartao titulo="Equipa" texto="Trabalho que falta a cada pessoa.">
            <ul className="divide-y divide-line">
              {p.carga.map((m) => (
                <li key={m.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar nome={m.nome} cor={m.cor} tamanho={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.nome}</p>
                      <p className="num text-sm text-muted">
                        {m.abertas} {m.abertas === 1 ? 'tarefa' : 'tarefas'}
                        {m.atrasadas > 0 && <span className="text-danger"> · {m.atrasadas} atrasada{m.atrasadas > 1 ? 's' : ''}</span>}
                      </p>
                    </div>
                    <span className="num text-sm text-muted">{horas(m.horas_restantes)}</span>
                  </div>
                  <div className="mt-2.5">
                    <Barra valor={m.horas_restantes} maximo={maxRestante} classe="bg-info" />
                  </div>
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao titulo="Horas registadas" texto="Últimos 14 dias.">
            <div className="p-5">
              <Atividade dias={p.atividade} />
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
