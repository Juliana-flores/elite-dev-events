# Elite Dev Events — Plataforma de Eventos, Ingressos e Portaria

> **Elite Dev Events** é uma plataforma completa e robusta de gestão de eventos, venda de ingressos com controle transacional de capacidade e validação na portaria (gate), desenvolvida com arquitetura modular, tipagem estrita e garantias formais de concorrência.

---

## 📌 Sumário

- [Visão Geral e Arquitetura](#-visão-geral-e-arquitetura)
- [Credenciais de Demonstração](#-credenciais-de-demonstração)
- [Como Executar Localmente](#-como-executar-localmente)
  - [1. Banco de Dados (Docker Compose)](#1-banco-de-dados-docker-compose)
  - [2. Backend (NestJS + TypeORM)](#2-backend-nestjs--typeorm)
  - [3. Frontend (Next.js App Router)](#3-frontend-nextjs-app-router)
- [Documentação da API (Swagger / OpenAPI)](#-documentação-da-api-swagger--openapi)
- [Fluxos Críticos de Demonstração](#-fluxos-críticos-de-demonstração)
- [Invariantes Críticas e Concorrência](#-invariantes-críticas-e-concorrência)
- [Comandos de Testes e Qualidade](#-comandos-de-testes-e-qualidade)
- [Estrutura do Repositório e Documentação](#-estrutura-do-repositório-e-documentação)

---

## 🏛 Visão Geral e Arquitetura

O sistema é construído como um **monólito modular** com separação clara de responsabilidades entre as camadas:

- **Backend**: [NestJS 11](https://nestjs.com/) com TypeScript, TypeORM, validação declarativa com `class-validator`, documentação Swagger via `@nestjs/swagger`, autenticação JWT com controle de acesso baseado em papéis (RBAC).
- **Banco de Dados**: [PostgreSQL 17](https://www.postgresql.org/) com schema versionado via **Migrations** (`synchronize: false`), integridade referencial, constraints a nível de banco e índices otimizados para concorrência.
- **Frontend**: [Next.js 15](https://nextjs.com/) (App Router), Vanilla CSS customizado, design responsivo com leitura de QR Code via câmera nativa e atalhos rápidos para alternância de usuários.
- **Catálogo Externo**: Integração resiliente com a API da [TMDb](https://www.themoviedb.org/) para enriquecimento de eventos cinematográficos.

---

## 👥 Credenciais de Demonstração

O banco de dados é inicializado com 4 contas pré-configuradas com papéis e objetivos distintos:

| Papel (Role) | Nome | E-mail | Senha | Objetivo / Permissões |
| :--- | :--- | :--- | :--- | :--- |
| **`ORGANIZER`** | Organizer User | `organizer@elite.dev` | `password` | Busca filmes na TMDb, cria eventos em `DRAFT`, edita e publica eventos. |
| **`CUSTOMER`** | Customer One | `customer1@elite.dev` | `password` | Descobre eventos, faz reservas com lock, realiza checkout, visualiza carteira de ingressos e compartilha via link público. |
| **`CUSTOMER`** | Customer Two | `customer2@elite.dev` | `password` | Permite demonstrar compras simultâneas e testes de concorrência na capacidade. |
| **`GATE`** | Gate User | `gate@elite.dev` | `password` | Operador da portaria. Valida ingressos por leitura de QR Code (câmera) ou código alfanumérico. |

> 💡 **Dica na Interface**: A tela de login do frontend (`/login`) disponibiliza **botões de acesso rápido** com um clique para cada um dos 4 perfis.

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- **Node.js**: `v20.x` ou superior
- **npm**: `v10.x` ou superior
- **Docker** e **Docker Compose** (ou uma instância local do PostgreSQL 15+)

---

### 1. Banco de Dados (Docker Compose)

Na raiz do repositório, inicie o container PostgreSQL:

```bash
docker compose up -d
```

O container subirá na porta `5432` com as seguintes credenciais padrão:
- **Host**: `localhost`
- **Porta**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: `seupassword` 

---

### 2. Backend (NestJS + TypeORM)

1. Acesse o diretório do backend:
   ```bash
   cd backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o arquivo `.env`:
   ```bash
   cp .env.example .env
   ```
   *(Ajuste o `DATABASE_PASSWORD` para coincidir com o container do Docker Compose, ex: `postgres`)*

4. Execute as migrations versionadas:
   ```bash
   npm run migration:run
   ```

5. Execute o seed idempotente de dados iniciais:
   ```bash
   npm run seed
   ```
   *(O seed provisiona de forma idempotente os 4 usuários e o evento publicado inicial "Interstellar")*

6. Inicie a aplicação NestJS em modo de desenvolvimento:
   ```bash
   npm run start:dev
   ```
   O backend estará disponível em: `http://localhost:3001`

---

### 3. Frontend (Next.js App Router)

1. Em outro terminal, acesse o diretório do frontend:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o arquivo `.env`:
   ```bash
   cp .env.example .env
   ```
   *(Contém `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`)*

4. Inicie o servidor Next.js em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
   O frontend estará disponível em: `http://localhost:3000`

---

## 📖 Documentação da API (Swagger / OpenAPI)

A documentação interativa completa do Swagger com especificações de endpoints, esquemas DTO e autenticação JWT Bearer está disponível em:

👉 **[/api/docs](/api/docs)**

### Principais Módulos da API (`/api/v1`)

- **`POST /auth/login`**: Autenticação com retorno de Bearer Token JWT e dados do usuário.
- **`GET /auth/me`**: Informações da sessão autenticada.
- **`GET /catalog/movies`**: Busca filmes integrados ao catálogo externo TMDb (`ORGANIZER`).
- **`POST /organizer/events`**: Criação de novos eventos em status `DRAFT` (`ORGANIZER`).
- **`PATCH /organizer/events/:id`**: Atualização de eventos em rascunho pertencentes ao organizador (`ORGANIZER`).
- **`POST /organizer/events/:id/publish`**: Publicação de evento com validação de data futura (`ORGANIZER`).
- **`DELETE /events/:id`**: Exclusão de evento pelo organizador proprietário (`ORGANIZER`).
- **`GET /events`**: Descoberta pública de eventos com busca por título e projeção de ingressos disponíveis em tempo real.
- **`POST /reservations`**: Criação de reserva com trava de capacidade (`CUSTOMER`).
- **`POST /payments/simulate`**: Simulação determinística de pagamento (`APPROVE` / `DECLINE`).
- **`GET /me/tickets`**: Listagem da carteira de ingressos do cliente autenticado.
- **`GET /me/tickets/:id`**: Detalhes do ingresso com `secureCode` e `shareToken`.
- **`GET /tickets/share/:shareToken`**: Visualização pública e segura do ingresso compartilhado.
- **`POST /gate/validate`**: Validação atômica e consumo de ingresso na portaria (`GATE`).

---

## 🔄 Fluxos Críticos de Demonstração

### 1. Fluxo do Organizador (`ORGANIZER`)
1. Faça login como `organizer@elite.dev`.
2. Acesse **Criar Evento** (`/organizer/events/new`).
3. Digite um termo de busca para consultar filmes na **TMDb** e selecione um filme para autopreencher título, sinopse e pôster.
4. Defina a data (no futuro), local, capacidade e preço do ingresso para criar em `DRAFT`.
5. Na listagem de eventos do organizador (`/organizer/events`), clique em **Publicar** para disponibilizar o evento ao público.

### 2. Fluxo do Cliente (`CUSTOMER`)
1. Faça login como `customer1@elite.dev` ou navegue na Home (`/`).
2. Localize um evento publicado e acesse seus detalhes.
3. Escolha a quantidade de ingressos e clique em **Comprar Ingressos**.
4. Na tela de checkout (`/checkout/:reservationId`), selecione **Aprovar Pagamento** para simular uma transação bem-sucedida.
5. Acesse **Meus Ingressos** (`/me/tickets`), visualize o ingresso com **QR Code** renderizado em SVG e copie o **Link de Compartilhamento** para abrir em modo público (`/tickets/share/:token`).

### 3. Fluxo da Portaria (`GATE`)
1. Faça login como `gate@elite.dev` e acesse a tela de portaria (`/gate`).
2. Selecione o evento ativo no seletor de eventos.
3. Valide o ingresso utilizando a **Câmera** (lendo o QR Code exibido no celular do cliente) ou digitando o **Código Alfanumérico** (`ELITE-...`).
4. Observe as respostas determinísticas:
   - **`VALID` (Sucesso)**: Ingresso consumido e transicionado para `USED`.
   - **`ALREADY_USED` (Alerta)**: Tentativa de reapresentação do mesmo ingresso.
   - **`WRONG_EVENT` (Erro)**: Ingresso válido, porém emitido para outro evento.
   - **`INVALID` (Erro)**: Código inexistente ou corrompido.

---

## 🛡 Invariantes Críticas e Concorrência

A plataforma implementa proteções estritas no banco de dados e na camada de aplicação:

1. **Garantia contra Overselling**:
   $$\text{confirmedTickets} \le \text{Event.capacity}$$
   A compra e a reserva utilizam transações com **Pessimistic Write Locking** (`SELECT ... FOR UPDATE`) na tabela `events`, impedindo que compras concorrentes excedam a capacidade do evento.
2. **Emissão de Ingressos**:
   Ingressos (`Ticket`) só são emitidos após o pagamento ter sido transicionado com sucesso para `APPROVED`.
3. **Uso Único na Portaria (No Double Spending)**:
   A validação na portaria executa `SELECT ... FOR UPDATE` no registro de `Ticket`, garantindo que múltiplas catracas validando simultaneamente o mesmo QR Code transicionem o ingresso para `USED` **exatamente uma vez**.
4. **Isolamento de Segurança e Ownership**:
   - IDs de organizador e cliente são extraídos exclusivamente do payload assinado do JWT (nunca do corpo da requisição).
   - Senhas são criptografadas com `bcrypt` (10 rounds de salt) e o campo `passwordHash` é omitido em todas as respostas da API.

---

## 🧪 Comandos de Testes e Qualidade

Na pasta `backend/`:

```bash
# Executar todos os testes unitários
npm test

# Executar testes unitários com coverage
npm run test:cov

# Executar testes de integração / E2E
npm run test:e2e

# Executar verificação de lint (ESLint + TypeScript)
npm run lint

# Executar verificação de build / compilação NestJS
npm run build
```

Na pasta `frontend/`:

```bash
# Executar verificação de lint Next.js
npm run lint

# Executar build de produção do Next.js
npm run build
```

---

## 📂 Estrutura do Repositório e Documentação

```text
├── AGENTS.md               # Instruções e protocolo de governança para agentes de IA
├── README.md               # Documentação principal de execução e arquitetura
├── docker-compose.yml      # Configuração do PostgreSQL local
│
├── backend/                # Aplicação NestJS
│   ├── src/
│   │   ├── database/       # Migrations e Seeds idempotentes
│   │   └── modules/        # Módulos: auth, catalog, events, reservations, payments, tickets, gate
│   └── test/               # Testes de integração e concorrência E2E
│
├── frontend/               # Aplicação Next.js 15 (App Router)
│   ├── app/                # Rotas: /, /login, /events, /checkout, /me/tickets, /gate, /organizer
│   ├── components/         # Componentes: Navbar, QrCode, CameraQrScanner, Alert, EventCard
│   ├── context/            # Contexto de Autenticação e Sessão
│   └── lib/                # Cliente HTTP tipado com tratamento de erros
│
├── docs/                   # Documentação detalhada do projeto
│   ├── PRD.md              # Product Requirements Document e especificações funcionais
│   ├── ARCHITECTURE.md     # Decisões arquiteturais e fluxos de dados
│   ├── DATABASE.md         # Modelo de dados, entidades e estratégia transacional
│   ├── API.md              # Contrato oficial dos endpoints HTTP REST
│   ├── DECISIONS.md        # Architecture Decision Records (ADRs)
│   ├── GUARDRAILS.md       # Regras inegociáveis de segurança e qualidade
│   ├── TESTING_STRATEGY.md # Estratégia de testes unitários, E2E e black-box
│   └── AI_USAGE.md         # Registro formal de governança e uso de IA
│
└── specs/                  # Especificações técnicas executáveis (SPEC-001 a SPEC-007)
```

---

Desenvolvido para o desafio técnico **Elite Dev Events**.
