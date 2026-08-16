# AI Usage Log — Elite Dev Events

## 1. Objetivo

Este documento registra como ferramentas de IA foram utilizadas durante o desenvolvimento do projeto.

O objetivo não é armazenar todos os prompts, mas demonstrar:

- onde IA auxiliou;
- qual contexto foi fornecido;
- quais artefatos foram produzidos;
- quais decisões permaneceram humanas;
- quais sugestões da IA foram rejeitadas ou modificadas;
- como a qualidade das saídas foi verificada.

---

## 2. Princípios

A IA é utilizada como ferramenta de:

- análise;
- decomposição;
- geração assistida;
- revisão;
- documentação;
- implementação incremental.

A IA não é considerada autoridade final sobre:

- requisitos;
- arquitetura;
- segurança;
- acceptance criteria;
- decisões de produto.

Toda mudança relevante deve continuar sujeita a revisão humana.

---

## 3. Guardrails de uso de IA

A IA não deve:

- alterar acceptance criteria para fazer código passar;
- remover assertions para satisfazer testes;
- alterar contratos silenciosamente;
- inventar requisitos ausentes;
- adicionar funcionalidades fora da spec atual sem justificativa;
- versionar segredos;
- ignorar divergências entre documentação e implementação.

As regras completas estão em:

```text
docs/GUARDRAILS.md
AGENTS.md
```

---

## 4. Registro de utilização

### 2026-08-15 — Análise do desafio e PRD

**Ferramenta**

ChatGPT.

**Contexto fornecido**

PDF do desafio técnico.

**Contribuição da IA**

- extração de requisitos funcionais e não funcionais;
- organização dos três perfis;
- identificação dos fluxos críticos;
- proposta de priorização MVP;
- estruturação inicial de `docs/PRD.md`.

**Decisões humanas**

- priorizar fluxo end-to-end;
- utilizar ingressos por quantidade em vez de mapa de assentos;
- manter documentação versionada junto ao código.

**Artefatos**

```text
docs/PRD.md
```

---

### 2026-08-15 — Arquitetura

**Contribuição da IA**

Proposta de:

- monólito modular;
- NestJS;
- PostgreSQL;
- módulos de domínio;
- TMDb encapsulada por `CatalogModule`;
- proteção transacional para compra e validação.

**Decisões humanas**

- aprovação da estratégia de monólito modular;
- escolha de manter frontend e backend no mesmo repositório.

**Artefatos**

```text
docs/ARCHITECTURE.md
```

---

### 2026-08-15 — Persistência e troca de ORM

**Contribuição inicial da IA**

A primeira proposta utilizava Prisma.

**Decisão humana**

A desenvolvedora rejeitou Prisma e escolheu **TypeORM**.

**Ajuste realizado**

Arquitetura e modelo de dados foram revisados para utilizar:

- TypeORM entities;
- Repository;
- EntityManager;
- DataSource;
- migrations;
- pessimistic locking;
- `synchronize: false`.

**Artefatos**

```text
docs/ARCHITECTURE.md
docs/DATABASE.md
```

Este registro é importante porque demonstra que sugestões da IA são avaliadas e podem ser rejeitadas.

---

### 2026-08-15 — Contrato REST

**Contribuição da IA**

Estruturação do contrato HTTP entre Next.js e NestJS:

- auth;
- catálogo;
- eventos;
- reservas;
- pagamento simulado;
- tickets;
- compartilhamento;
- portaria;
- erros;
- RBAC;
- paginação.

**Revisão humana**

Aprovação do fluxo:

```text
Reservation PENDING_PAYMENT
        ↓
Payment APPROVE/DECLINE
        ↓
Ticket somente após APPROVED
```

**Artefato**

```text
docs/API.md
```

---

### 2026-08-15 — Estratégia de testes independentes

**Contexto**

Foi identificado o risco de uma IA com acesso simultâneo à implementação e aos acceptance tests adaptar os testes para que sempre passem.

**Decisão humana**

Manter:

```text
unit/integration/basic e2e
```

no repositório principal e criar um repositório privado separado para:

```text
black-box evaluation tests
```

**Contribuição da IA**

Formalização da estratégia, limites e regras do repositório de avaliação.

**Artefatos**

```text
docs/TESTING_STRATEGY.md
docs/DECISIONS.md
```

---

### 2026-08-15 — Guardrails e decomposição por specs

**Contribuição da IA**

Criação de:

- guardrails de implementação;
- protocolo para agentes;
- decomposição dos RFs em capabilities;
- specs técnicas implementáveis.

**Decisão humana**

Seguir um workflow:

```text
PRD → Architecture → Database/API → Specs → Tasks → Code
```

**Artefatos**

```text
docs/GUARDRAILS.md
AGENTS.md
specs/
```

---

### 2026-08-16 — SPEC-001: Autenticação e RBAC (Backend)


**Contexto fornecido**

`specs/001-auth-rbac.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/GUARDRAILS.md`, `AGENTS.md`.

**Contribuição da IA**

- Implementação de `JwtStrategy`, `JwtAuthGuard`, `@Roles`, `RolesGuard` e endpoint `GET /api/v1/auth/me`;
- Testes unitários para `JwtStrategy`, `JwtAuthGuard`, `RolesGuard` e `AuthController`;
- Testes de integração/E2E cobrindo login válido, login inválido, rota sem token, token válido, role correta, role incorreta, `/auth/me` e garantia de ausência de `passwordHash`.

**Decisões humanas**

- Manter RBAC executado estritamente no backend sem dependências externas adicionais;
- Garantir que `passwordHash` seja sempre omitido em todas as respostas da API.

**Validação realizada**

- `npm run lint` (0 erros);
- `npm run build` (sucesso);
- `npm test` (7 suites, 30 testes passando);
- `npm run test:e2e` (2 suites, 10 testes passando).

**Artefatos**

```text
backend/src/modules/auth/strategies/jwt.strategy.ts
backend/src/modules/auth/guards/jwt-auth.guard.ts
backend/src/modules/auth/guards/roles.guard.ts
backend/src/modules/auth/decorators/roles.decorator.ts
backend/src/modules/auth/decorators/current-user.decorator.ts
backend/src/modules/auth/auth.controller.ts
backend/src/modules/auth/auth.module.ts
backend/src/modules/auth/strategies/jwt.strategy.spec.ts
backend/src/modules/auth/guards/jwt-auth.guard.spec.ts
backend/src/modules/auth/guards/roles.guard.spec.ts
backend/src/modules/auth/auth.controller.spec.ts
backend/test/auth.e2e-spec.ts
```

### 2026-08-16 — Swagger / OpenAPI Documentation (SPEC-001)


**Contexto fornecido**

Necessidade de documentação OpenAPI/Swagger para atender aos requisitos de Definition of Done da `specs/001-auth-rbac.md`.

**Contribuição da IA**

- Instalação e configuração do pacote `@nestjs/swagger` em `main.ts`;
- Adição dos DTOs de resposta (`AuthUserDto`, `LoginResponseDto`, `ApiErrorResponseDto`) com decoradores `@ApiProperty`;
- Anotação do `AuthController` com `@ApiTags('auth')`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`;
- Atualização do checklist de tarefas do backend na spec.

**Decisões humanas**

- Manter a rota de documentação Swagger acessível em `/api/docs`;
- Suportar autenticação Bearer JWT na interface do Swagger com esquema `JWT-auth`.

**Validação realizada**

- `npx tsc --noEmit` (0 erros de compilação);
- `npm test` (7 suites, 30 testes passando);
- `npm run lint` (0 erros).

**Artefatos**

```text
backend/src/main.ts
backend/src/modules/auth/dto/login.dto.ts
backend/src/modules/auth/dto/auth-response.dto.ts
backend/src/modules/auth/auth.controller.ts
specs/001-auth-rbac.md
```

### 2026-08-16 — SPEC-002: TMDb External Catalog


**Contexto fornecido**

Implementação da `specs/002-catalog.md` (Catálogo externo da TMDb, provider abstraction, endpoint `GET /api/v1/catalog/movies` protegido para `ORGANIZER` e tratamento de erros 502 `CATALOG_PROVIDER_UNAVAILABLE`).

**Contribuição da IA**

- Definição da interface e token de injeção `CATALOG_PROVIDER` e modelo de domínio `CatalogSearchResult`;
- Implementação de `TmdbProvider` consumindo a API da TMDb via `fetch` nativo com timeout, suporte a Bearer token/API Key e normalização de poster/backdrop para URLs completas;
- Criação de `CatalogService`, `CatalogController` e `CatalogModule`;
- Criação de DTOs com validação (`SearchMoviesQueryDto`) e Swagger (`CatalogMoviesResponseDto`);
- Adição de testes unitários (`tmdb.provider.spec.ts`, `catalog.service.spec.ts`, `catalog.controller.spec.ts`) e suite de integração E2E (`catalog.e2e-spec.ts`);
- Atualização do checklist em `specs/002-catalog.md` e variáveis de ambiente em `backend/.env.example`.

**Decisões humanas**

- Utilizar `fetch` nativo com `AbortController` ao invés de adicionar dependências externas de HTTP;
- Tratar indisponibilidade da TMDb com código de erro de domínio `502 CATALOG_PROVIDER_UNAVAILABLE`.

**Validação realizada**

- `npx tsc --noEmit` (0 erros de compilação);
- `npm test` (10 suites, 40 testes passando);
- `npm run test:e2e` (3 suites, 15 testes passando);
- `npm run lint` (0 erros).

**Artefatos**

```text
backend/src/modules/catalog/providers/catalog-provider.interface.ts
backend/src/modules/catalog/providers/tmdb.provider.ts
backend/src/modules/catalog/dto/search-movies-query.dto.ts
backend/src/modules/catalog/dto/catalog-movies-response.dto.ts
backend/src/modules/catalog/catalog.service.ts
backend/src/modules/catalog/catalog.controller.ts
backend/src/modules/catalog/catalog.module.ts
backend/src/modules/catalog/providers/tmdb.provider.spec.ts
backend/src/modules/catalog/catalog.service.spec.ts
backend/src/modules/catalog/catalog.controller.spec.ts
backend/test/catalog.e2e-spec.ts
specs/002-catalog.md
backend/.env.example
```

### 2026-08-16 — SPEC-003: Event Management and Discovery


**Contexto fornecido**

Implementação da `specs/003-events.md` (criação de eventos em `DRAFT`, atualização de draft pelo owner, publicação com validações, listagem do organizador, descoberta pública com busca por título e projeção de `availableTickets`).

**Contribuição da IA**

- Definição do enum `EventStatus` e entidade TypeORM `Event` com constraints (`capacity > 0`, `price >= 0`) e índices `(status, startsAt)` e `(organizerId)`;
- Criação da migration versionada `1786860001536-CreateEventsTable.ts`;
- Implementação de `EventsService` com checagens de ownership, transição para `PUBLISHED`, validação de data futura e projeção de disponibilidade;
- Criação de `EventsController` e `OrganizerEventsController` com decorators de validação, RBAC (`@Roles(UserRole.ORGANIZER)`), `@CurrentUser` e documentação Swagger;
- Criação de DTOs com validação (`CreateEventDto`, `UpdateEventDto`, `QueryEventsDto`, `QueryOrganizerEventsDto`, `EventDto`, `PublicEventDto`);
- Adição de testes unitários (`events.service.spec.ts`, `events.controller.spec.ts`) e suite completa de integração E2E (`events.e2e-spec.ts`);
- Atualização do checklist de tarefas em `specs/003-events.md`.

**Decisões humanas**

- Separar endpoints públicos e autenticados de organizador preservando as rotas da API (`/events` e `/organizer/events`);
- Garantir que `organizerId` seja extraído exclusivamente do token JWT autenticado.

**Validação realizada**

- `npx tsc --noEmit` (0 erros de compilação);
- `npm test` (12 suites, 58 testes passando);
- `npm run test:e2e` (4 suites, 20 testes passando);
- `npm run lint` (0 erros).

**Artefatos**

```text
backend/src/modules/events/enums/event-status.enum.ts
backend/src/modules/events/entities/event.entity.ts
backend/src/database/migrations/1786860001536-CreateEventsTable.ts
backend/src/modules/events/dto/create-event.dto.ts
backend/src/modules/events/dto/update-event.dto.ts
backend/src/modules/events/dto/query-events.dto.ts
backend/src/modules/events/dto/query-organizer-events.dto.ts
backend/src/modules/events/dto/event-response.dto.ts
backend/src/modules/events/events.service.ts
backend/src/modules/events/events.controller.ts
backend/src/modules/events/organizer-events.controller.ts
backend/src/modules/events/events.module.ts
backend/src/modules/events/events.service.spec.ts
backend/src/modules/events/events.controller.spec.ts
backend/test/events.e2e-spec.ts
specs/003-events.md
```

---


## 5. Template para novos registros

Copiar para futuras fases:

```md
### YYYY-MM-DD — <fase>

**Ferramenta**

<nome>

**Contexto fornecido**

<contexto relevante>

**Contribuição da IA**

- ...

**Decisões humanas**

- ...

**Validação realizada**

- testes;
- revisão;
- documentação;
- comparação com spec.

**Artefatos**

- ...
```

---

## 6. O que permanece responsabilidade humana

A desenvolvedora é responsável por:

- aceitar ou rejeitar decisões;
- aprovar alterações de escopo;
- resolver conflitos entre artefatos;
- revisar código gerado;
- avaliar segurança;
- interpretar resultados de testes;
- decidir quando uma spec está concluída.

---

## 7. Política de atualização

Adicionar um registro quando a IA:

- participar de decisão arquitetural relevante;
- gerar parte significativa de uma feature;
- sugerir alteração de requisito;
- auxiliar na correção de bug crítico;
- contribuir para estratégia de teste ou segurança;
- tiver uma sugestão importante rejeitada.

Não é necessário registrar autocomplete, pequenas correções de texto ou operações triviais.
