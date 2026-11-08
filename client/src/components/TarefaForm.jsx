import { useState } from 'react';
import { api } from '../api.js';
import { ESTADOS, PRIORIDADES } from '../format.js';
import { Area, BotaoPrimario, BotaoSecundario, Campo, Erro, Modal, Selecao } from './ui.jsx';

/* Cria ou edita uma tarefa. Para criar, o projeto vem fixo (do quadro) ou escolhe-se na lista. */
export default function TarefaForm({
  tarefa,
  projetoId,
  projetos = [],
  estadoInicial = 'por_fazer',
  membros,
  eu,
  aoGuardar,
  aoFechar,
}) {
  const [dados, setDados] = useState({
    projeto_id: tarefa?.projeto_id ?? projetoId ?? projetos[0]?.id ?? '',
    titulo: tarefa?.titulo ?? '',
    descricao: tarefa?.descricao ?? '',
    estado: estadoInicial,
    prioridade: tarefa?.prioridade ?? 'media',
    responsavel_id: tarefa?.responsavel_id ?? '',
    prazo: tarefa?.prazo ?? '',
    estimativa: tarefa?.estimativa ?? '',
  });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  async function submeter(e) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    const corpo = {
      ...dados,
      responsavel_id: dados.responsavel_id || null,
      prazo: dados.prazo || null,
      estimativa: dados.estimativa === '' ? null : dados.estimativa,
    };
    try {
      const guardada = tarefa ? await api.editarTarefa(tarefa.id, corpo) : await api.criarTarefa(corpo);
      await aoGuardar(guardada);
    } catch (err) {
      setErro(err.message);
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={tarefa ? 'Editar tarefa' : 'Nova tarefa'} largura="max-w-lg" aoFechar={aoFechar}>
      <form onSubmit={submeter} className="space-y-4">
        {!tarefa && !projetoId && (
          <Selecao rotulo="Projeto" value={dados.projeto_id} onChange={mudar('projeto_id')}>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Selecao>
        )}
        <Campo rotulo="Título" obrigatorio value={dados.titulo} onChange={mudar('titulo')} autoFocus />
        <Area rotulo="Descrição" value={dados.descricao} onChange={mudar('descricao')} />
        <div className="grid gap-4 sm:grid-cols-2">
          {!tarefa && (
            <Selecao rotulo="Coluna" value={dados.estado} onChange={mudar('estado')}>
              {ESTADOS.map((e) => (
                <option key={e.chave} value={e.chave}>
                  {e.texto}
                </option>
              ))}
            </Selecao>
          )}
          <Selecao rotulo="Prioridade" value={dados.prioridade} onChange={mudar('prioridade')}>
            {Object.entries(PRIORIDADES).map(([chave, { texto }]) => (
              <option key={chave} value={chave}>
                {texto}
              </option>
            ))}
          </Selecao>
          <Selecao rotulo="Responsável" value={dados.responsavel_id} onChange={mudar('responsavel_id')}>
            <option value="">Sem responsável</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
                {m.id === eu ? ' (eu)' : ''}
              </option>
            ))}
          </Selecao>
          <Campo rotulo="Prazo" type="date" value={dados.prazo} onChange={mudar('prazo')} />
          <Campo
            rotulo="Estimativa (horas)"
            inputMode="decimal"
            placeholder="ex.: 6"
            value={dados.estimativa}
            onChange={mudar('estimativa')}
          />
        </div>
        <Erro>{erro}</Erro>
        <div className="flex justify-end gap-2 pt-1">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={ocupado}>
            Guardar
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}
