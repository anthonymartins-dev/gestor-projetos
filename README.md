# Gestor de Projetos

Quadro de tarefas para estúdios, agências e pequenas equipas: quem está a fazer o quê, o que
está atrasado e quanto tempo levou cada coisa. Projeto 5 de uma série de 6 ferramentas para
pequenos negócios.

## Funcionalidades

- **Painel** com projetos ativos, tarefas atrasadas, entregas dos próximos 7 dias, horas da semana, carga de cada pessoa e gráfico de horas
- **Projetos** com cliente, prazo, cor, progresso e horas registadas face à estimativa
- **Quadro kanban** por projeto (Por fazer, Em curso, Em revisão, Feito) com **arrastar e largar**; a ordem dos cartões fica guardada
- **Tarefas** com prioridade, responsável, prazo, estimativa, lista de passos, comentários e registo de horas
- Vista **Tarefas** com pesquisa e filtros (projeto, responsável, estado, só atrasadas) e conclusão com um clique
- **Equipa** com carga de trabalho por pessoa; cada um escolhe "a trabalhar como" para filtrar as suas tarefas
- Interface responsiva, do telemóvel ao ecrã largo

### Regras de negócio

- Um projeto só pode ficar **Concluído** quando todas as tarefas estão feitas; se entrar uma tarefa nova ou uma for reaberta, volta a Ativo
- Mover um cartão para **Feito** regista a data de conclusão; reabri-lo limpa-a
- Arquivar um membro tira-lhe as tarefas por concluir; as horas e comentários ficam
- Projetos arquivados não aceitam tarefas novas e saem das listas
- As horas registadas por entrada vão de 0,01 a 24
- Apagar um projeto apaga as tarefas, comentários e horas (a interface pede confirmação e sugere arquivar)

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 19, Vite, Tailwind CSS 4 |
| API | Node.js, Express 5 (REST) |
| Base de dados | PostgreSQL |

Pontos técnicos:

- **Ordem no quadro:** mover um cartão corre numa transação que bloqueia o projeto, recalcula as posições da coluna e grava tudo de uma vez. Seis movimentos em simultâneo não deixam posições repetidas.
- **Interface otimista:** o cartão muda de sítio de imediato; se a API recusar, o quadro volta ao estado real.
- **Vista `tarefas_v`:** junta projeto, responsável, contagem de passos e comentários e horas, e calcula `atrasada`, para que todas as listas usem a mesma regra.
- **Arrastar e largar** com a API nativa do navegador, sem bibliotecas; há sempre a alternativa do campo "Estado" no detalhe da tarefa.

## Como correr

Requisitos: Node.js 20+ e PostgreSQL 15+.

```bash
# 1. Base de dados
createdb gestor_projetos
psql -d gestor_projetos -f server/db/schema.sql
psql -d gestor_projetos -f server/db/seed.sql   # dados de demonstração (opcional)

# 2. API
cd server
cp .env.example .env     # ajusta o utilizador e a palavra-passe
npm install
npm start                # http://localhost:3005

# 3. Interface (noutro terminal)
cd client
npm install
npm run dev              # http://localhost:5173
```

## API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/painel` | Indicadores, próximas entregas, carga da equipa e atividade |
| GET, POST | `/projetos` | Lista (`?arquivados=true`) e cria |
| GET, PUT, DELETE | `/projetos/:id` | Detalhe com tarefas, edita e apaga |
| GET | `/tarefas` | Lista com filtros (`projeto_id`, `responsavel_id`, `estado`, `atrasadas`, `q`) |
| POST | `/tarefas` | Cria |
| GET, PUT, DELETE | `/tarefas/:id` | Detalhe, edita e apaga |
| POST | `/tarefas/:id/mover` | Muda de coluna e/ou de posição (`estado`, `posicao`) |
| POST | `/tarefas/:id/subtarefas`, PUT, DELETE `/subtarefas/:id` | Lista de passos |
| POST | `/tarefas/:id/comentarios`, DELETE `/comentarios/:id` | Comentários |
| POST | `/tarefas/:id/tempo`, DELETE `/tempo/:id` | Registo de horas |
| GET, POST, PUT, DELETE | `/membros` | Equipa (apagar arquiva) |

## Estrutura

```
gestor-projetos/
  client/   interface React
  server/   API Express, esquema SQL e dados de demonstração
```
