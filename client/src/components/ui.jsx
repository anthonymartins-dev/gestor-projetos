import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { CORES, ESTADO, ESTADOS_PROJETO, PRIORIDADES, iniciais, prazoInfo } from '../format.js';

/* Carrega dados da API e volta a carregar quando as dependências mudam. */
export function useDados(carregar, dependencias) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const pedido = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recarregar = useCallback(async () => {
    const meu = ++pedido.current;
    try {
      const resultado = await carregar();
      if (meu !== pedido.current) return;
      setDados(resultado);
      setErro('');
    } catch (e) {
      if (meu === pedido.current) setErro(e.message);
    }
  }, dependencias);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, setDados, erro, recarregar };
}

export function useEscape(aoFechar) {
  useEffect(() => {
    const fechar = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aoFechar]);
}

export function Modal({ titulo, subtitulo, largura = 'max-w-md', aoFechar, children }) {
  useEscape(aoFechar);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div
        className={`animar my-auto w-full ${largura} rounded-2xl border border-line bg-card p-6 shadow-xl shadow-ink/10`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-sm text-muted">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted transition hover:bg-line/60 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const classeInput =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-brand focus:ring-3 focus:ring-brand/15';

export function Campo({ rotulo, obrigatorio, ajuda, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">
        {rotulo}
        {obrigatorio && <span className="text-danger"> *</span>}
      </span>
      <input className={classeInput} {...props} />
      {ajuda && <span className="mt-1 block text-xs text-muted">{ajuda}</span>}
    </label>
  );
}

export function Area({ rotulo, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{rotulo}</span>
      <textarea rows={3} className={`${classeInput} resize-y`} {...props} />
    </label>
  );
}

export function Selecao({ rotulo, children, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {rotulo && <span className="mb-1.5 block text-sm font-medium">{rotulo}</span>}
      <select className={classeInput} {...props}>
        {children}
      </select>
    </label>
  );
}

export function BotaoPrimario({ className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function BotaoSecundario({ className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-line/50 disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function BotaoPerigo({ className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function IconeBotao({ rotulo, perigo, children, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={`rounded-lg p-2 text-muted transition ${
        perigo ? 'hover:bg-danger-soft hover:text-danger' : 'hover:bg-line/70 hover:text-ink'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Erro({ children }) {
  if (!children) return null;
  return <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>;
}

export function Vazio({ titulo, texto, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/60 px-6 py-14 text-center">
      <h2 className="font-serif text-xl font-semibold">{titulo}</h2>
      <p className="mt-1 text-sm text-muted">{texto}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Cartao({ titulo, texto, acao, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line bg-card ${className}`}>
      <header className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <h2 className="font-serif text-xl font-semibold">{titulo}</h2>
          {texto && <p className="mt-0.5 text-sm text-muted">{texto}</p>}
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}

export function Barra({ valor, maximo, classe = 'bg-brand' }) {
  const largura = maximo > 0 ? Math.max(0, Math.min(valor / maximo, 1)) * 100 : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full rounded-full transition-all ${classe}`} style={{ width: `${largura}%` }} />
    </div>
  );
}

/* Círculo com as iniciais; a cor identifica a pessoa em toda a aplicação. */
export function Avatar({ nome, cor, tamanho = 28, className = '' }) {
  if (!nome) {
    return (
      <span
        title="Sem responsável"
        className={`inline-grid shrink-0 place-items-center rounded-full border border-dashed border-muted/50 text-muted ${className}`}
        style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4 }}
      >
        ?
      </span>
    );
  }
  return (
    <span
      title={nome}
      className={`inline-grid shrink-0 place-items-center rounded-full font-medium text-white ${className}`}
      style={{ width: tamanho, height: tamanho, backgroundColor: cor, fontSize: tamanho * 0.4 }}
    >
      {iniciais(nome)}
    </span>
  );
}

export function EstadoBadge({ estado }) {
  const { texto, badge } = ESTADO[estado];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${badge}`}>
      {texto}
    </span>
  );
}

export function EstadoProjetoBadge({ estado }) {
  const { texto, badge } = ESTADOS_PROJETO[estado];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${badge}`}>
      {texto}
    </span>
  );
}

export function PrioridadeBadge({ prioridade }) {
  const { texto, badge } = PRIORIDADES[prioridade];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${badge}`}>
      {texto}
    </span>
  );
}

const TONS_PRAZO = {
  atraso: 'bg-danger-soft px-2 text-danger',
  breve: 'bg-warn-soft px-2 text-warn',
  normal: 'text-muted',
};

export function PrazoBadge({ prazo, estado }) {
  const info = prazoInfo(prazo, estado);
  if (!info) return null;
  return (
    <span className={`num inline-flex rounded-full py-0.5 text-xs font-medium whitespace-nowrap ${TONS_PRAZO[info.tom]}`}>
      {info.texto}
    </span>
  );
}

export function PontoProjeto({ cor, className = '' }) {
  return <span className={`inline-block size-2.5 shrink-0 rounded-full ${className}`} style={{ backgroundColor: cor }} />;
}

export function SeletorCor({ valor, aoMudar }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">Cor</span>
      <div className="flex flex-wrap gap-2">
        {CORES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Cor ${c}`}
            aria-pressed={valor === c}
            onClick={() => aoMudar(c)}
            className={`size-8 rounded-full transition ${valor === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : 'hover:scale-110'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

/* Pede confirmação antes de uma ação que não se desfaz. */
export function Confirmar({ titulo, texto, rotulo, aoConfirmar, aoFechar }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  async function confirmar() {
    setOcupado(true);
    setErro('');
    try {
      await aoConfirmar();
    } catch (e) {
      setErro(e.message);
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={titulo} aoFechar={aoFechar}>
      <p className="text-sm leading-relaxed text-muted">{texto}</p>
      <div className="mt-4">
        <Erro>{erro}</Erro>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <BotaoSecundario onClick={aoFechar}>Cancelar</BotaoSecundario>
        <BotaoPerigo onClick={confirmar} disabled={ocupado}>
          {rotulo}
        </BotaoPerigo>
      </div>
    </Modal>
  );
}

/* Gaveta lateral onde se abre o detalhe de uma tarefa. */
export function Gaveta({ aoFechar, children }) {
  useEscape(aoFechar);
  return (
    <div
      className="fixed inset-0 z-40 bg-ink/30"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <aside className="painel absolute top-0 right-0 h-full w-full max-w-xl overflow-y-auto border-l border-line bg-card shadow-2xl shadow-ink/10">
        {children}
      </aside>
    </div>
  );
}
