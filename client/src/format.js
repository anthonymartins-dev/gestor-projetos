const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const p2 = (n) => String(n).padStart(2, '0');

const isoLocal = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const hojeISO = () => isoLocal(new Date());

/* Horas sem zeros inúteis: 2 h, 2,5 h. */
export function horas(valor) {
  const n = Number(valor) || 0;
  return `${String(Math.round(n * 10) / 10).replace('.', ',')} h`;
}

/* "2026-11-12" -> "12 nov" */
export function dataCurta(iso) {
  if (!iso) return '';
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MESES[m - 1]}`;
}

/* Dias entre hoje e uma data (negativo = já passou). */
export function diasAte(iso) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(a, m - 1, d) - hoje) / 86400000);
}

/* Texto e tom do prazo de uma tarefa. Tarefas feitas mostram só a data. */
export function prazoInfo(prazo, estado) {
  if (!prazo) return null;
  if (estado === 'feito') return { texto: dataCurta(prazo), tom: 'normal' };
  const n = diasAte(prazo);
  if (n < 0) return { texto: `Atrasada ${-n} ${n === -1 ? 'dia' : 'dias'}`, tom: 'atraso' };
  if (n === 0) return { texto: 'Hoje', tom: 'breve' };
  if (n === 1) return { texto: 'Amanhã', tom: 'breve' };
  if (n <= 7) return { texto: `Em ${n} dias`, tom: 'breve' };
  return { texto: dataCurta(prazo), tom: 'normal' };
}

/* "Hoje, 14:30", "Ontem, 09:10", "5 nov, 16:00" */
export function quando(ts) {
  const dia = ts.slice(0, 10);
  const hora = ts.slice(11, 16);
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  if (dia === hojeISO()) return `Hoje, ${hora}`;
  if (dia === isoLocal(ontem)) return `Ontem, ${hora}`;
  return `${dataCurta(dia)}, ${hora}`;
}

export function dataRelativa(iso) {
  const n = diasAte(iso);
  if (n === 0) return 'Hoje';
  if (n === -1) return 'Ontem';
  return dataCurta(iso);
}

export const iniciais = (nome = '') =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export const ESTADOS = [
  { chave: 'por_fazer', texto: 'Por fazer', ponto: 'bg-muted/50', badge: 'bg-line text-muted' },
  { chave: 'em_curso', texto: 'Em curso', ponto: 'bg-info', badge: 'bg-info-soft text-info' },
  { chave: 'em_revisao', texto: 'Em revisão', ponto: 'bg-warn', badge: 'bg-warn-soft text-warn' },
  { chave: 'feito', texto: 'Feito', ponto: 'bg-brand', badge: 'bg-brand-soft text-brand' },
];
export const ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.chave, e]));

export const PRIORIDADES = {
  baixa: { texto: 'Baixa', badge: 'bg-line text-muted' },
  media: { texto: 'Média', badge: 'bg-line text-ink' },
  alta: { texto: 'Alta', badge: 'bg-warn-soft text-warn' },
  urgente: { texto: 'Urgente', badge: 'bg-danger-soft text-danger' },
};

export const ESTADOS_PROJETO = {
  ativo: { texto: 'Ativo', badge: 'bg-brand-soft text-brand' },
  em_pausa: { texto: 'Em pausa', badge: 'bg-warn-soft text-warn' },
  concluido: { texto: 'Concluído', badge: 'bg-info-soft text-info' },
  arquivado: { texto: 'Arquivado', badge: 'bg-line text-muted' },
};

export const CORES = ['#24493c', '#3b5a7a', '#8a5a14', '#a63a2b', '#6b4f7a', '#2f6f73', '#5c5a52'];
