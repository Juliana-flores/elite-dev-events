# Architecture Decision Record — Elite Dev Events

## 1. Objetivo

Este documento registra decisões técnicas e de processo relevantes do projeto.

Cada decisão deve responder:

- qual era o contexto;
- qual decisão foi tomada;
- quais alternativas foram consideradas;
- quais consequências e trade-offs foram aceitos.

As decisões aqui registradas não substituem `PRD.md`, `ARCHITECTURE.md`, `DATABASE.md` ou `API.md`. Elas explicam **por que** escolhas importantes foram feitas.

---

## ADR-001 — Frontend, backend e documentação no mesmo repositório

**Status:** Accepted

### Contexto

O projeto possui frontend, backend e documentação fortemente relacionados e será desenvolvido em um período curto.

### Decisão

Manter no mesmo repositório:

```text
frontend/
backend/
docs/
specs/
```

### Alternativas consideradas

- repositório separado para frontend;
- repositório separado para backend;
- múltiplos repositórios por módulo.

### Consequências

**Positivas**

- contexto técnico centralizado;
- mudanças de contrato podem ser versionadas junto com código;
- mais simples para avaliação;
- facilita desenvolvimento AI-First com documentação próxima da implementação.

**Negativas**

- o repositório cresce com múltiplas responsabilidades;
- CI precisa diferenciar frontend e backend.

---

## ADR-002 — Monólito modular no backend

**Status:** Accepted

### Contexto

O domínio possui módulos distintos, porém o escopo e o prazo não justificam complexidade distribuída.

### Decisão

Utilizar NestJS como monólito modular:

```text
Auth
Users
Catalog
Events
Reservations
Payments
Tickets
Gate
```

### Alternativas consideradas

- microserviços;
- backend sem divisão modular.

### Consequências

- menor custo operacional;
- transações locais mais simples;
- separação de responsabilidades preservada;
- futura extração de módulos continua possível.

---

## ADR-003 — NestJS + TypeORM + PostgreSQL

**Status:** Accepted

### Contexto

O sistema possui operações que dependem de integridade, transactions e locking.

### Decisão

Utilizar:

```text
Node.js
NestJS
TypeORM
PostgreSQL
```

### Alternativas consideradas

- Prisma;
- Sequelize;
- banco NoSQL.

### Consequências

**Positivas**

- integração natural entre NestJS e TypeORM;
- controle explícito de `Repository`, `EntityManager` e `DataSource`;
- suporte a migrations e pessimistic locking;
- PostgreSQL como fonte de verdade para concorrência.

**Negativas**

- exige disciplina no gerenciamento de transactions;
- mappings e migrations precisam ser mantidos explicitamente.

---

## ADR-004 — `synchronize: false`

**Status:** Accepted

### Contexto

Mudanças automáticas de schema podem tornar ambientes imprevisíveis.

### Decisão

TypeORM será configurado com:

```ts
synchronize: false
```

Toda mudança estrutural persistente deverá utilizar migration versionada.

### Consequências

- evolução do schema é rastreável;
- ambiente de avaliação é reproduzível;
- criação de migrations passa a ser parte obrigatória de mudanças no banco.

---

## ADR-005 — TMDb como catálogo externo do MVP

**Status:** Accepted

### Contexto

O desafio exige integração com catálogo externo e permite TMDb ou Ticketmaster.

### Decisão

Utilizar TMDb no MVP.

### Alternativas consideradas

- Ticketmaster Discovery API;
- ambas simultaneamente.

### Consequências

- menor escopo de integração;
- foco permanece nas regras de compra e validação;
- `CatalogModule` deverá abstrair o fornecedor para evitar acoplamento.

---

## ADR-006 — Ingressos por quantidade, sem mapa de assentos

**Status:** Accepted

### Contexto

O desafio aceita quantidade ou mapa de assentos.

### Decisão

O cliente selecionará uma quantidade de ingressos.

### Alternativa

Mapa de assentos.

### Consequências

- reduz complexidade de UI e modelo;
- ainda exige proteção contra overselling;
- mapa de assentos permanece possível evolução P2.

---

## ADR-007 — Um `Ticket` por ingresso individual

**Status:** Accepted

### Contexto

Uma reserva pode adquirir múltiplos ingressos, e cada ingresso pode ser compartilhado e validado independentemente.

### Decisão

Uma reserva de quantidade `N` produz `N` registros `Ticket`.

```text
Reservation quantity=3
 ├── Ticket A
 ├── Ticket B
 └── Ticket C
```

### Consequências

- QR individual;
- validação individual;
- compartilhamento individual;
- ciclo de vida de cada ingresso é independente.

---

## ADR-008 — Pagamento simulado e síncrono

**Status:** Accepted

### Contexto

O desafio exige pagamento simulado ou sandbox, mas não pagamento real.

### Decisão

Criar uma abstração:

```text
PaymentProvider
      ↓
FakePaymentProvider
```

A simulação aceitará cenários determinísticos:

```text
APPROVE
DECLINE
```

### Consequências

- fácil demonstração dos dois fluxos;
- não exige webhook;
- não exige inventory hold;
- arquitetura mantém uma fronteira que permite substituir o provider futuramente.

---

## ADR-009 — Reserva pendente não mantém hold de estoque

**Status:** Accepted

### Contexto

Um sistema real de hold exigiria expiração, job de liberação e coordenação com pagamento assíncrono.

### Decisão

`PENDING_PAYMENT` não bloqueia permanentemente capacidade.

A capacidade é revalidada atomicamente no momento da confirmação do pagamento.

### Consequências

- MVP fica mais simples;
- uma reserva pode existir e perder disponibilidade antes do pagamento;
- nesse caso o pagamento retorna `EVENT_SOLD_OUT`;
- um futuro pagamento real exigirá `InventoryHold`, `expiresAt`, webhook e idempotência.

---

## ADR-010 — Pessimistic locking para confirmação de capacidade

**Status:** Accepted

### Contexto

Clientes concorrentes podem tentar adquirir o último ingresso.

### Decisão

Bloquear a linha do `Event` durante a transação crítica de confirmação:

```text
SELECT ... FOR UPDATE
```

via TypeORM `pessimistic_write`.

### Alternativas consideradas

- mutex em memória;
- optimistic locking;
- contador `availableTickets` mantido somente pela aplicação.

### Consequências

**Positivas**

- PostgreSQL permanece fonte de verdade;
- evita overselling entre múltiplas instâncias da API.

**Negativas**

- compras concorrentes para o mesmo evento são serializadas durante a seção crítica.

---

## ADR-011 — Validação de ingresso é atômica e server-side

**Status:** Accepted

### Contexto

O mesmo QR pode ser apresentado simultaneamente em duas portarias.

### Decisão

A transição:

```text
VALID → USED
```

deverá acontecer atomicamente no backend/banco.

### Consequências

O resultado simultâneo correto é:

```text
Gate A → VALID
Gate B → ALREADY_USED
```

Nunca:

```text
Gate A → VALID
Gate B → VALID
```

---

## ADR-012 — `secureCode` e `shareToken` separados

**Status:** Accepted

### Contexto

O link de compartilhamento é público, enquanto o código de validação é usado pela portaria.

### Decisão

`Ticket` possuirá dois tokens distintos:

```text
secureCode
shareToken
```

### Consequências

- URL de compartilhamento não precisa utilizar diretamente a credencial de validação;
- ambos devem ser únicos e imprevisíveis.

---

## ADR-013 — Repositório separado para testes de avaliação independentes

**Status:** Accepted

### Contexto

A IA implementadora deve poder criar e executar testes normais do projeto, mas não deve possuir acesso aos testes utilizados como avaliação independente da própria implementação.

### Decisão

O repositório principal conterá:

```text
unit tests
integration tests
basic e2e tests
```

Um segundo repositório privado conterá black-box acceptance/evaluation tests.

### Regra

Os testes externos:

- não importam serviços internos;
- não importam entities;
- não conhecem detalhes de implementação;
- interagem via HTTP/browser;
- não são fornecidos como contexto ao agente implementador.

### Consequências

- reduz risco de adaptar implementação ou assertions aos testes de avaliação;
- preserva testes normais como parte visível da qualidade do projeto.

---

## ADR-014 — Desenvolvimento orientado por specs

**Status:** Accepted

### Contexto

Entregar todo o desafio como um único prompt aumenta ambiguidade e incentiva geração de código sem rastreabilidade.

### Decisão

Fluxo:

```text
PRD
 ↓
Architecture
 ↓
Database + API
 ↓
Feature Spec
 ↓
Tasks
 ↓
Implementation
 ↓
Tests
 ↓
Review
```

Cada incremento deve referenciar uma `SPEC-XXX`.

### Consequências

- menor escopo por execução;
- melhor revisão;
- decisões deixam de ser inferidas silenciosamente pela IA;
- histórico do Git passa a refletir a decomposição do produto.

---

## ADR-015 — Conflitos de documentação interrompem implementação

**Status:** Accepted

### Contexto

Documentos podem divergir durante a evolução.

### Decisão

A IA não deverá escolher silenciosamente qual documento ignorar.

Em caso de conflito:

```text
1. identificar documentos em conflito;
2. interromper a parte afetada;
3. reportar a divergência;
4. aguardar decisão humana;
5. atualizar os artefatos antes de continuar.
```

### Hierarquia de contexto

```text
PRD.md
  ↓
ARCHITECTURE.md
  ↓
DATABASE.md + API.md
  ↓
DECISIONS.md
  ↓
SPEC atual
  ↓
Código
```

A hierarquia orienta leitura, mas não autoriza alterar requisitos silenciosamente.
