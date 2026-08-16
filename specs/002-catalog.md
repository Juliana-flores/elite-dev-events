# SPEC-002 — External Catalog (TMDb)

## Source requirements

```text
RF-003 — Consulta ao catálogo externo
```

## Goal

Permitir que um organizador pesquise filmes na TMDb através do backend.

## Dependencies

```text
SPEC-001
```

---

## In scope

- `CatalogModule`;
- provider abstraction;
- `TmdbProvider`;
- pesquisa por texto;
- paginação básica;
- tratamento de indisponibilidade;
- UI de busca para organizer.

## Out of scope

- Ticketmaster;
- persistência de catálogo;
- sincronização periódica;
- cache distribuído.

---

## Business rules

### BR-001

Somente `ORGANIZER` utiliza busca de catálogo para criação de evento.

### BR-002

Frontend não utiliza TMDb diretamente para fluxo de domínio.

### BR-003

Resultado externo deve ser normalizado para contrato interno.

### BR-004

Falha da TMDb gera erro controlado:

```text
CATALOG_PROVIDER_UNAVAILABLE
```

---

## API contract

### GET `/api/v1/catalog/movies`

Query:

```text
query
page
```

Response normalizada:

```json
{
  "items": [
    {
      "externalId": "157336",
      "title": "Interstellar",
      "description": "...",
      "imageUrl": "...",
      "releaseDate": "2014-11-05"
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 10,
    "totalItems": 198
  }
}
```

---

## Database impact

Nenhuma tabela obrigatória.

A persistência acontece apenas quando o organizer cria um `Event` na próxima spec.

---

## Backend tasks

- [x] criar `CatalogModule`;
- [x] definir contrato/provider;
- [x] implementar `TmdbProvider`;
- [x] configuração `TMDB_API_KEY`;
- [x] mapear response externa;
- [x] criar controller;
- [x] proteger rota por `ORGANIZER`;
- [x] tratar timeout/falhas;
- [x] documentar Swagger.

---

## Frontend tasks

- [ ] tela/componente de busca;
- [ ] loading;
- [ ] empty state;
- [ ] erro de provider;
- [ ] seleção de um item para criação de evento.

---

## Tests

- provider mapping;
- query inválida;
- role proibida;
- indisponibilidade externa;
- response normalizada.

---

## Acceptance criteria

- [ ] organizer pesquisa filme;
- [ ] customer recebe `403`;
- [ ] resposta não expõe formato bruto da TMDb;
- [ ] falha externa é controlada;
- [ ] item selecionado fornece dados necessários para iniciar criação de evento.
