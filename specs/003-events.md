# SPEC-003 — Event Management and Discovery

## Source requirements

```text
RF-004
RF-005
RF-006
RF-007
RF-008
```

## Goal

Permitir criação/publicação pelo organizador e navegação pública dos eventos publicados.

## Dependencies

```text
SPEC-001
SPEC-002
```

---

## In scope

- Event entity/migration;
- snapshot de dados do catálogo;
- criação `DRAFT`;
- edição de draft;
- publicação;
- listagem do organizer;
- listagem pública;
- busca por título;
- detalhe público;
- disponibilidade derivada.

## Out of scope

- cancelamento completo;
- dashboard analítico;
- filtros avançados;
- mapa de assentos.

---

## Business rules

### BR-001

Novo evento começa em:

```text
DRAFT
```

### BR-002

Somente owner organizer edita/publica.

### BR-003

Somente `PUBLISHED` aparece publicamente.

### BR-004

Evento guarda snapshot:

```text
externalCatalogId
title
description
imageUrl
```

### BR-005

Evento publicado não é editável no MVP nos campos operacionais definidos na API.

### BR-006

`capacity > 0`.

### BR-007

`price >= 0`.

---

## API contracts

```text
POST  /api/v1/events
PATCH /api/v1/events/:eventId
POST  /api/v1/events/:eventId/publish
GET   /api/v1/organizer/events
GET   /api/v1/events
GET   /api/v1/events/:eventId
```

Detalhes completos em `docs/API.md`.

---

## Database impact

Criar `events`.

Índices:

```text
(status, startsAt)
organizerId
```

Constraints conforme `DATABASE.md`.

---

## Backend tasks

- [x] Event entity;
- [x] migration;
- [x] create event;
- [x] update draft;
- [x] ownership;
- [x] publish transition;
- [x] organizer listing;
- [x] public listing;
- [x] title search;
- [x] public detail;
- [x] availability projection;
- [x] Swagger.

---

## Frontend tasks

### Organizer

- [ ] formulário de evento após escolha TMDb;
- [ ] lista de eventos próprios;
- [ ] edição de draft;
- [ ] ação de publicar.

### Público/Customer

- [ ] listagem;
- [ ] busca;
- [ ] card com data/local/preço;
- [ ] detalhe;
- [ ] disponibilidade.

---

## Tests

- cria DRAFT;
- customer não cria;
- organizer B não edita event A;
- publish válido;
- publish duplicado falha;
- draft não aparece na listagem pública;
- busca por título;
- detalhe inexistente retorna 404.

---

## Acceptance criteria

- [ ] organizer cria evento;
- [ ] evento mantém snapshot;
- [ ] organizer edita seu draft;
- [ ] outro organizer não edita;
- [ ] organizer publica;
- [ ] cliente encontra evento publicado;
- [ ] cliente não encontra draft;
- [ ] listagem mostra nome/data/local/preço;
- [ ] detalhe mostra disponibilidade e informações completas.
