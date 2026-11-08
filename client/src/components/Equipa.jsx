import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { CORES, horas } from '../format.js';
import {
  Avatar,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Confirmar,
  Erro,
  IconeBotao,
  Modal,
  SeletorCor,
  Vazio,
} from './ui.jsx';

function MembroForm({ membro, aoGuardar, aoFechar }) {
  const [dados, setDados] = useState({
    nome: membro?.nome ?? '',
    funcao: membro?.funcao ?? '',
    email: membro?.email ?? '',
    cor: membro?.cor ?? CORES[Math.floor(Math.random() * CORES.length)],
  });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  async function submeter(e) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      if (membro) await api.editarMembro(membro.id, dados);
      else await api.criarMembro(dados);
      await aoGuardar();
    } catch (err) {
      setErro(err.message);
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={membro ? 'Editar membro' : 'Novo membro'} aoFechar={aoFechar}>
      <form onSubmit={submeter} className="space-y-4">
        <Campo rotulo="Nome" obrigatorio value={dados.nome} onChange={mudar('nome')} autoFocus />
        <Campo rotulo="Função" placeholder="ex.: Designer" value={dados.funcao} onChange={mudar('funcao')} />
        <Campo rotulo="Email" type="email" value={dados.email} onChange={mudar('email')} />
        <SeletorCor valor={dados.cor} aoMudar={(cor) => setDados({ ...dados, cor })} />
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

export default function Equipa({ membros, eu, aoMudar, avisar }) {
  const [form, setForm] = useState(null);
  const [arquivar, setArquivar] = useState(null);

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <BotaoPrimario onClick={() => setForm({})}>
          <Plus size={16} /> Novo membro
        </BotaoPrimario>
      </div>

      {membros.length === 0 ? (
        <Vazio titulo="Sem equipa" texto="Adiciona as pessoas que trabalham nos projetos." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {membros.map((m) => (
            <article key={m.id} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-start gap-4">
                <Avatar nome={m.nome} cor={m.cor} tamanho={48} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-serif text-xl font-semibold">
                    {m.nome}
                    {m.id === eu && <span className="ml-2 font-sans text-xs font-medium text-brand">eu</span>}
                  </h3>
                  <p className="truncate text-sm text-muted">{m.funcao || 'Sem função'}</p>
                  {m.email && <p className="truncate text-sm text-muted">{m.email}</p>}
                </div>
                <div className="flex">
                  <IconeBotao rotulo="Editar" onClick={() => setForm(m)}>
                    <Pencil size={15} />
                  </IconeBotao>
                  <IconeBotao rotulo="Arquivar" perigo onClick={() => setArquivar(m)}>
                    <Trash2 size={15} />
                  </IconeBotao>
                </div>
              </div>

              <dl className="num mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                <div>
                  <dd className="font-serif text-2xl font-semibold">{m.abertas}</dd>
                  <dt className="text-xs text-muted">por concluir</dt>
                </div>
                <div>
                  <dd className={`font-serif text-2xl font-semibold ${m.atrasadas > 0 ? 'text-danger' : ''}`}>
                    {m.atrasadas}
                  </dd>
                  <dt className="text-xs text-muted">atrasadas</dt>
                </div>
                <div>
                  <dd className="font-serif text-2xl font-semibold">{horas(m.horas_30d)}</dd>
                  <dt className="text-xs text-muted">em 30 dias</dt>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      {form && (
        <MembroForm
          membro={form.id ? form : null}
          aoGuardar={async () => {
            setForm(null);
            avisar('Membro guardado');
            aoMudar();
          }}
          aoFechar={() => setForm(null)}
        />
      )}
      {arquivar && (
        <Confirmar
          titulo="Arquivar membro?"
          texto={`${arquivar.nome} deixa de aparecer na equipa e as tarefas por concluir ficam sem responsável. As horas e comentários já registados mantêm-se.`}
          rotulo="Arquivar"
          aoConfirmar={async () => {
            await api.arquivarMembro(arquivar.id);
            setArquivar(null);
            avisar('Membro arquivado');
            aoMudar();
          }}
          aoFechar={() => setArquivar(null)}
        />
      )}
    </div>
  );
}
