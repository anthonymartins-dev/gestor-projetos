import { useState } from 'react';
import { api } from '../api.js';
import { ESTADOS_PROJETO } from '../format.js';
import { Area, BotaoPrimario, BotaoSecundario, Campo, Erro, Modal, SeletorCor, Selecao } from './ui.jsx';

export default function ProjetoForm({ projeto, aoGuardar, aoApagar, aoFechar }) {
  const [dados, setDados] = useState({
    nome: projeto?.nome ?? '',
    cliente: projeto?.cliente ?? '',
    descricao: projeto?.descricao ?? '',
    estado: projeto?.estado ?? 'ativo',
    prazo: projeto?.prazo ?? '',
    cor: projeto?.cor ?? '#24493c',
  });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  async function submeter(e) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      const guardado = projeto
        ? await api.editarProjeto(projeto.id, dados)
        : await api.criarProjeto(dados);
      await aoGuardar(guardado);
    } catch (err) {
      setErro(err.message);
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={projeto ? 'Editar projeto' : 'Novo projeto'} aoFechar={aoFechar}>
      <form onSubmit={submeter} className="space-y-4">
        <Campo rotulo="Nome" obrigatorio value={dados.nome} onChange={mudar('nome')} autoFocus />
        <Campo rotulo="Cliente" value={dados.cliente} onChange={mudar('cliente')} />
        <Area rotulo="Descrição" value={dados.descricao} onChange={mudar('descricao')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao rotulo="Estado" value={dados.estado} onChange={mudar('estado')}>
            {Object.entries(ESTADOS_PROJETO).map(([chave, { texto }]) => (
              <option key={chave} value={chave}>
                {texto}
              </option>
            ))}
          </Selecao>
          <Campo rotulo="Prazo de entrega" type="date" value={dados.prazo} onChange={mudar('prazo')} />
        </div>
        <SeletorCor valor={dados.cor} aoMudar={(cor) => setDados({ ...dados, cor })} />
        <Erro>{erro}</Erro>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {projeto && (
              <button
                type="button"
                onClick={aoApagar}
                className="text-sm font-medium text-danger hover:underline"
              >
                Apagar projeto
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <BotaoSecundario type="button" onClick={aoFechar}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario type="submit" disabled={ocupado}>
              Guardar
            </BotaoPrimario>
          </div>
        </div>
      </form>
    </Modal>
  );
}
