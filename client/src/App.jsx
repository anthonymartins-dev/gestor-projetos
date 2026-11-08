import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Equipa from './components/Equipa.jsx';
import Painel from './components/Painel.jsx';
import Projetos from './components/Projetos.jsx';
import Quadro from './components/Quadro.jsx';
import TarefaDetalhe from './components/TarefaDetalhe.jsx';
import Tarefas from './components/Tarefas.jsx';
import { Avatar, BotaoSecundario } from './components/ui.jsx';

const SEPARADORES = [
  ['painel', 'Painel'],
  ['projetos', 'Projetos'],
  ['tarefas', 'Tarefas'],
  ['equipa', 'Equipa'],
];

// Sem contas de utilizador: cada pessoa diz quem é, e o navegador lembra-se.
const lerEu = () => {
  try {
    return Number(localStorage.getItem('gestor-eu')) || null;
  } catch {
    return null;
  }
};

export default function App() {
  const [separador, setSeparador] = useState('painel');
  const [projetoId, setProjetoId] = useState(null);
  const [tarefaId, setTarefaId] = useState(null);
  const [membros, setMembros] = useState(null);
  const [eu, setEu] = useState(lerEu);
  const [versao, setVersao] = useState(0);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  // Qualquer alteração sobe a versão; os ecrãs abertos voltam a pedir os dados.
  const aoMudar = useCallback(() => setVersao((v) => v + 1), []);

  const carregarMembros = useCallback(async () => {
    setErro('');
    try {
      setMembros(await api.membros());
    } catch {
      setErro('Não foi possível ligar ao servidor. Confirma que a API está a correr.');
    }
  }, []);

  useEffect(() => {
    carregarMembros();
  }, [carregarMembros, versao]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 2800);
    return () => clearTimeout(t);
  }, [aviso]);

  function escolherEu(valor) {
    const id = Number(valor) || null;
    setEu(id);
    try {
      if (id) localStorage.setItem('gestor-eu', String(id));
      else localStorage.removeItem('gestor-eu');
    } catch {
      /* sem armazenamento local: a escolha vale só até recarregar */
    }
  }

  function irPara(chave) {
    setSeparador(chave);
    setProjetoId(null);
  }

  const abrirProjeto = (id) => {
    setSeparador('projetos');
    setProjetoId(id);
  };

  const euMembro = membros?.find((m) => m.id === eu);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-brand uppercase">Estúdio Alfa</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Gestor de projetos</h1>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          {membros && membros.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted">
              {euMembro ? <Avatar nome={euMembro.nome} cor={euMembro.cor} tamanho={22} /> : null}
              A trabalhar como
              <select
                value={eu ?? ''}
                onChange={(e) => escolherEu(e.target.value)}
                className="rounded-lg border border-line bg-card px-2 py-1 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">ninguém</option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <nav className="flex gap-6 overflow-x-auto border-b border-line sm:border-0">
            {SEPARADORES.map(([chave, texto]) => (
              <button
                key={chave}
                onClick={() => irPara(chave)}
                className={`-mb-px border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition sm:mb-0 ${
                  separador === chave ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {texto}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mt-8">
        {erro ? (
          <div className="rounded-2xl border border-line bg-card p-10 text-center">
            <p className="text-danger">{erro}</p>
            <BotaoSecundario className="mt-4" onClick={carregarMembros}>
              Tentar de novo
            </BotaoSecundario>
          </div>
        ) : !membros ? (
          <div className="h-96 animate-pulse rounded-2xl border border-line bg-line/40" />
        ) : separador === 'painel' ? (
          <Painel versao={versao} abrirTarefa={setTarefaId} abrirProjeto={abrirProjeto} />
        ) : separador === 'projetos' && projetoId ? (
          <Quadro
            key={projetoId}
            projetoId={projetoId}
            membros={membros}
            eu={eu}
            versao={versao}
            voltar={() => setProjetoId(null)}
            abrirTarefa={setTarefaId}
            aoMudar={aoMudar}
            avisar={setAviso}
          />
        ) : separador === 'projetos' ? (
          <Projetos membros={membros} versao={versao} abrirProjeto={abrirProjeto} aoMudar={aoMudar} avisar={setAviso} />
        ) : separador === 'tarefas' ? (
          <Tarefas
            membros={membros}
            eu={eu}
            versao={versao}
            abrirTarefa={setTarefaId}
            aoMudar={aoMudar}
            avisar={setAviso}
          />
        ) : (
          <Equipa membros={membros} eu={eu} aoMudar={aoMudar} avisar={setAviso} />
        )}
      </main>

      {tarefaId && membros && (
        <TarefaDetalhe
          key={tarefaId}
          id={tarefaId}
          membros={membros}
          eu={eu}
          aoMudar={aoMudar}
          aoFechar={() => setTarefaId(null)}
          avisar={setAviso}
        />
      )}

      {aviso && (
        <div className="animar fixed right-4 bottom-4 z-[60] rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          {aviso}
        </div>
      )}
    </div>
  );
}
