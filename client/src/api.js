const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005';

async function pedir(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Algo correu mal');
  return dados;
}

const enviar = (metodo, corpo) => ({ method: metodo, body: JSON.stringify(corpo) });
const apagar = { method: 'DELETE' };

export const api = {
  painel: () => pedir('/painel'),

  membros: () => pedir('/membros'),
  criarMembro: (d) => pedir('/membros', enviar('POST', d)),
  editarMembro: (id, d) => pedir(`/membros/${id}`, enviar('PUT', d)),
  arquivarMembro: (id) => pedir(`/membros/${id}`, apagar),

  projetos: (arquivados = false) => pedir(`/projetos?arquivados=${arquivados}`),
  projeto: (id) => pedir(`/projetos/${id}`),
  criarProjeto: (d) => pedir('/projetos', enviar('POST', d)),
  editarProjeto: (id, d) => pedir(`/projetos/${id}`, enviar('PUT', d)),
  apagarProjeto: (id) => pedir(`/projetos/${id}`, apagar),

  tarefas: (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => v && params.set(k, v));
    return pedir(`/tarefas?${params}`);
  },
  tarefa: (id) => pedir(`/tarefas/${id}`),
  criarTarefa: (d) => pedir('/tarefas', enviar('POST', d)),
  editarTarefa: (id, d) => pedir(`/tarefas/${id}`, enviar('PUT', d)),
  moverTarefa: (id, estado, posicao) => pedir(`/tarefas/${id}/mover`, enviar('POST', { estado, posicao })),
  apagarTarefa: (id) => pedir(`/tarefas/${id}`, apagar),

  criarSubtarefa: (tarefaId, titulo) => pedir(`/tarefas/${tarefaId}/subtarefas`, enviar('POST', { titulo })),
  editarSubtarefa: (id, d) => pedir(`/subtarefas/${id}`, enviar('PUT', d)),
  apagarSubtarefa: (id) => pedir(`/subtarefas/${id}`, apagar),

  comentar: (tarefaId, d) => pedir(`/tarefas/${tarefaId}/comentarios`, enviar('POST', d)),
  apagarComentario: (id) => pedir(`/comentarios/${id}`, apagar),

  registarTempo: (tarefaId, d) => pedir(`/tarefas/${tarefaId}/tempo`, enviar('POST', d)),
  apagarTempo: (id) => pedir(`/tempo/${id}`, apagar),
};
