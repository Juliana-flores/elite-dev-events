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
