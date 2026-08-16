# API Contract — Elite Dev Events

## 1. Objetivo

Este documento define o contrato HTTP entre o frontend e o backend do **Elite Dev Events**.

Ele estabelece:

- convenções da API;
- autenticação;
- autorização;
- endpoints;
- parâmetros;
- payloads;
- respostas;
- códigos HTTP;
- erros de domínio;
- regras de idempotência e concorrência relevantes para o MVP.

A implementação deverá respeitar este contrato sempre que possível. Mudanças relevantes devem ser refletidas neste documento.

---

## 2. Base URL

A API será versionada.

```text
/api/v1
```

Exemplo local:

```text
http://localhost:3001/api/v1
```

---

## 3. Formato

A API utilizará:

```text
HTTP
REST
JSON
```

Headers:

```http
Content-Type: application/json
Accept: application/json
```

Para endpoints autenticados:

```http
Authorization: Bearer <jwt>
```

---

## 4. Convenções

### JSON

Campos utilizarão `camelCase`.

Exemplo:

```json
{
  "eventId": "uuid",
  "totalAmount": "150.00",
  "createdAt": "2026-08-20T18:00:00.000Z"
}
```

### Datas

Datas serão retornadas em ISO 8601.

```text
2026-08-20T18:00:00.000Z
```

### Valores monetários

Valores monetários serão retornados como `string`.

```json
{
  "price": "50.00",
  "totalAmount": "150.00"
}
```

Isso evita perda de precisão causada por ponto flutuante.

---

## 5. Status HTTP

| Status | Uso |
|---|---|
| `200` | Operação concluída |
| `201` | Recurso criado |
| `204` | Operação concluída sem corpo |
| `400` | Payload ou parâmetros inválidos |
| `401` | Usuário não autenticado |
| `403` | Usuário autenticado sem permissão |
| `404` | Recurso não encontrado |
| `409` | Conflito de regra de negócio |
| `422` | Entrada semanticamente inválida |
| `500` | Erro interno inesperado |
| `502` | Falha relevante em serviço externo |

---

## 6. Formato de Erro

Erros da API seguirão o formato:

```json
{
  "statusCode": 409,
  "code": "EVENT_SOLD_OUT",
  "message": "There are not enough tickets available"
}
```

Erros de validação poderão incluir detalhes:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    {
      "field": "quantity",
      "message": "quantity must be greater than 0"
    }
  ]
}
```

O frontend deverá utilizar principalmente o campo `code` para tratar erros conhecidos.

---

# 7. Códigos de Erro de Domínio

```text
VALIDATION_ERROR

INVALID_CREDENTIALS
UNAUTHORIZED
FORBIDDEN

USER_NOT_FOUND

CATALOG_PROVIDER_UNAVAILABLE

EVENT_NOT_FOUND
EVENT_NOT_PUBLISHED
EVENT_ALREADY_PUBLISHED
EVENT_ALREADY_STARTED
EVENT_SOLD_OUT
EVENT_NOT_OWNED_BY_ORGANIZER

RESERVATION_NOT_FOUND
RESERVATION_NOT_OWNED_BY_CUSTOMER
RESERVATION_ALREADY_PAID
RESERVATION_NOT_PAYABLE

PAYMENT_DECLINED

TICKET_NOT_FOUND
TICKET_ALREADY_USED
WRONG_EVENT
```

---

# 8. Autenticação

A autenticação será baseada em JWT.

Roles:

```text
ORGANIZER
CUSTOMER
GATE
```

---

## 8.1 POST /auth/login

Autentica um usuário.

### Autenticação

```text
Pública
```

### Request

```http
POST /api/v1/auth/login
```

```json
{
  "email": "customer1@elite.dev",
  "password": "password"
}
```

### Response — 200

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "name": "Customer One",
    "email": "customer1@elite.dev",
    "role": "CUSTOMER"
  }
}
```

### Erros

```text
400 VALIDATION_ERROR
401 INVALID_CREDENTIALS
```

---

## 8.2 GET /auth/me

Retorna o usuário autenticado.

### Autenticação

```text
ORGANIZER
CUSTOMER
GATE
```

### Request

```http
GET /api/v1/auth/me
Authorization: Bearer <jwt>
```

### Response — 200

```json
{
  "id": "uuid",
  "name": "Customer One",
  "email": "customer1@elite.dev",
  "role": "CUSTOMER"
}
```

---

# 9. Catálogo Externo

O frontend nunca chamará a TMDb diretamente para fluxos de domínio.

Fluxo:

```text
Frontend
   ↓
Elite Dev API
   ↓
CatalogModule
   ↓
TMDb
```

Isso mantém a integração externa encapsulada no backend.

---

## 9.1 GET /catalog/movies

Pesquisa filmes na TMDb.

### Autenticação

```text
ORGANIZER
```

### Request

```http
GET /api/v1/catalog/movies?query=interstellar&page=1
```

### Query Parameters

| Campo | Tipo | Obrigatório | Regra |
|---|---|---:|---|
| `query` | string | sim | mínimo 2 caracteres |
| `page` | number | não | padrão `1` |

### Response — 200

```json
{
  "items": [
    {
      "externalId": "157336",
      "title": "Interstellar",
      "description": "A team of explorers travel through a wormhole...",
      "imageUrl": "https://image.tmdb.org/...",
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

### Erros

```text
400 VALIDATION_ERROR
401 UNAUTHORIZED
403 FORBIDDEN
502 CATALOG_PROVIDER_UNAVAILABLE
```

---

# 10. Eventos

Estados:

```text
DRAFT
PUBLISHED
CANCELLED
COMPLETED
```

No MVP, o fluxo essencial é:

```text
DRAFT → PUBLISHED
```

---

## 10.1 POST /events

Cria um evento.

### Autenticação

```text
ORGANIZER
```

### Request

```http
POST /api/v1/events
```

```json
{
  "externalCatalogId": "157336",
  "title": "Interstellar",
  "description": "A team of explorers travel through a wormhole...",
  "imageUrl": "https://image.tmdb.org/...",
  "startsAt": "2026-09-20T22:00:00.000Z",
  "location": "Cine Elite - Sala 1",
  "capacity": 120,
  "price": "45.90"
}
```

### Observação

Os dados do catálogo selecionado são enviados como snapshot para criação do evento interno.

O backend deverá validar e persistir os dados necessários.

### Response — 201

```json
{
  "id": "event-uuid",
  "organizerId": "organizer-uuid",
  "externalCatalogId": "157336",
  "title": "Interstellar",
  "description": "A team of explorers travel through a wormhole...",
  "imageUrl": "https://image.tmdb.org/...",
  "startsAt": "2026-09-20T22:00:00.000Z",
  "location": "Cine Elite - Sala 1",
  "capacity": 120,
  "price": "45.90",
  "status": "DRAFT",
  "createdAt": "2026-08-15T21:00:00.000Z",
  "updatedAt": "2026-08-15T21:00:00.000Z"
}
```

### Erros

```text
400 VALIDATION_ERROR
401 UNAUTHORIZED
403 FORBIDDEN
```

---

## 10.2 PATCH /events/:eventId

Atualiza um evento do organizador.

### Autenticação

```text
ORGANIZER
```

### Regra

No MVP, campos operacionais só poderão ser alterados enquanto o evento estiver em `DRAFT`.

### Request

```http
PATCH /api/v1/events/event-uuid
```

```json
{
  "startsAt": "2026-09-21T22:00:00.000Z",
  "location": "Cine Elite - Sala 2",
  "capacity": 150,
  "price": "49.90"
}
```

Todos os campos são opcionais.

### Response — 200

Retorna o evento atualizado.

### Erros

```text
400 VALIDATION_ERROR
403 EVENT_NOT_OWNED_BY_ORGANIZER
404 EVENT_NOT_FOUND
409 EVENT_ALREADY_PUBLISHED
```

---

## 10.3 POST /events/:eventId/publish

Publica um evento.

### Autenticação

```text
ORGANIZER
```

### Request

```http
POST /api/v1/events/event-uuid/publish
```

Sem body.

### Response — 200

```json
{
  "id": "event-uuid",
  "status": "PUBLISHED",
  "published": true
}
```

### Regras

O evento deve:

```text
existir
pertencer ao organizador
estar em DRAFT
ter data futura
ter capacidade > 0
ter preço >= 0
```

### Erros

```text
403 EVENT_NOT_OWNED_BY_ORGANIZER
404 EVENT_NOT_FOUND
409 EVENT_ALREADY_PUBLISHED
422 VALIDATION_ERROR
```

---

## 10.4 GET /organizer/events

Lista os eventos do organizador autenticado.

### Autenticação

```text
ORGANIZER
```

### Request

```http
GET /api/v1/organizer/events?status=PUBLISHED&page=1&limit=20
```

### Query Parameters

| Campo | Tipo | Obrigatório |
|---|---|---:|
| `status` | EventStatus | não |
| `page` | number | não |
| `limit` | number | não |

### Response — 200

```json
{
  "items": [
    {
      "id": "event-uuid",
      "title": "Interstellar",
      "startsAt": "2026-09-20T22:00:00.000Z",
      "location": "Cine Elite - Sala 1",
      "capacity": 120,
      "price": "45.90",
      "status": "PUBLISHED"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

## 10.5 GET /events

Lista eventos publicados para navegação.

### Autenticação

```text
Pública
```

### Request

```http
GET /api/v1/events?search=interstellar&page=1&limit=20
```

### Query Parameters

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| `search` | string | não | pesquisa por título |
| `page` | number | não | padrão `1` |
| `limit` | number | não | padrão `20` |

### Regra

Somente eventos:

```text
status = PUBLISHED
```

devem ser retornados.

### Response — 200

```json
{
  "items": [
    {
      "id": "event-uuid",
      "title": "Interstellar",
      "imageUrl": "https://image.tmdb.org/...",
      "startsAt": "2026-09-20T22:00:00.000Z",
      "location": "Cine Elite - Sala 1",
      "price": "45.90",
      "capacity": 120,
      "availableTickets": 42
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### Observação

`availableTickets` é um valor derivado.

Ele não precisa existir como coluna persistida.

---

## 10.6 GET /events/:eventId

Retorna detalhes de um evento publicado.

### Autenticação

```text
Pública
```

### Request

```http
GET /api/v1/events/event-uuid
```

### Response — 200

```json
{
  "id": "event-uuid",
  "title": "Interstellar",
  "description": "A team of explorers travel through a wormhole...",
  "imageUrl": "https://image.tmdb.org/...",
  "startsAt": "2026-09-20T22:00:00.000Z",
  "location": "Cine Elite - Sala 1",
  "capacity": 120,
  "availableTickets": 42,
  "price": "45.90",
  "status": "PUBLISHED"
}
```

### Erros

```text
404 EVENT_NOT_FOUND
```

Eventos não publicados não deverão ser expostos por esta rota pública.

---

# 11. Reservas

A reserva registra a intenção de compra.

Estados:

```text
PENDING_PAYMENT
PAID
PAYMENT_FAILED
CANCELLED
```

A criação de uma reserva **não garante estoque permanentemente**.

A confirmação da disponibilidade acontece na operação de pagamento aprovado.

Isso evita a necessidade de implementar inventory hold e expiração no MVP.

---

## 11.1 POST /reservations

Cria uma reserva pendente de pagamento.

### Autenticação

```text
CUSTOMER
```

### Request

```http
POST /api/v1/reservations
```

```json
{
  "eventId": "event-uuid",
  "quantity": 2
}
```

### Regras

```text
quantity > 0

evento existe

evento está PUBLISHED

evento ainda não começou
```

A disponibilidade pode ser verificada neste ponto para feedback rápido, mas deverá ser validada novamente na confirmação do pagamento.

### Response — 201

```json
{
  "id": "reservation-uuid",
  "eventId": "event-uuid",
  "customerId": "customer-uuid",
  "quantity": 2,
  "unitPrice": "45.90",
  "totalAmount": "91.80",
  "status": "PENDING_PAYMENT",
  "createdAt": "2026-08-15T21:00:00.000Z"
}
```

### Erros

```text
400 VALIDATION_ERROR
403 FORBIDDEN
404 EVENT_NOT_FOUND
409 EVENT_NOT_PUBLISHED
409 EVENT_ALREADY_STARTED
409 EVENT_SOLD_OUT
```

---

## 11.2 GET /reservations/:reservationId

Retorna uma reserva do cliente autenticado.

### Autenticação

```text
CUSTOMER
```

### Response — 200

```json
{
  "id": "reservation-uuid",
  "eventId": "event-uuid",
  "quantity": 2,
  "unitPrice": "45.90",
  "totalAmount": "91.80",
  "status": "PENDING_PAYMENT",
  "payment": null,
  "createdAt": "2026-08-15T21:00:00.000Z"
}
```

### Erros

```text
403 RESERVATION_NOT_OWNED_BY_CUSTOMER
404 RESERVATION_NOT_FOUND
```

---

# 12. Pagamento Simulado

O pagamento será simulado.

Para tornar os dois cenários facilmente demonstráveis durante a avaliação, o Fake Payment Provider aceitará explicitamente um cenário.

Valores:

```text
APPROVE
DECLINE
```

Essa propriedade existe exclusivamente para simulação no MVP.

---

## 12.1 POST /reservations/:reservationId/payment

Processa o pagamento da reserva.

### Autenticação

```text
CUSTOMER
```

### Request — pagamento aprovado

```http
POST /api/v1/reservations/reservation-uuid/payment
```

```json
{
  "simulation": "APPROVE"
}
```

### Fluxo APPROVE

```text
validar reserva
      ↓
iniciar transação
      ↓
lock pessimista no Event
      ↓
recalcular disponibilidade
      ↓
capacidade suficiente?
      │
      ├── não → EVENT_SOLD_OUT
      │
      ▼
Payment APPROVED
      ↓
Reservation PAID
      ↓
criar N Tickets
      ↓
COMMIT
```

### Response — 200

```json
{
  "reservation": {
    "id": "reservation-uuid",
    "status": "PAID",
    "quantity": 2,
    "totalAmount": "91.80"
  },
  "payment": {
    "id": "payment-uuid",
    "status": "APPROVED",
    "provider": "FAKE",
    "amount": "91.80"
  },
  "tickets": [
    {
      "id": "ticket-uuid-1",
      "status": "VALID"
    },
    {
      "id": "ticket-uuid-2",
      "status": "VALID"
    }
  ]
}
```

---

### Request — pagamento recusado

```json
{
  "simulation": "DECLINE"
}
```

### Response — 200

Pagamento recusado é um resultado válido de negócio, não uma falha técnica HTTP.

```json
{
  "reservation": {
    "id": "reservation-uuid",
    "status": "PAYMENT_FAILED",
    "quantity": 2,
    "totalAmount": "91.80"
  },
  "payment": {
    "id": "payment-uuid",
    "status": "DECLINED",
    "provider": "FAKE",
    "amount": "91.80"
  },
  "tickets": []
}
```

### Erros

```text
400 VALIDATION_ERROR
403 RESERVATION_NOT_OWNED_BY_CUSTOMER
404 RESERVATION_NOT_FOUND
409 RESERVATION_ALREADY_PAID
409 RESERVATION_NOT_PAYABLE
409 EVENT_SOLD_OUT
```

---

# 13. Ingressos

Estados:

```text
VALID
USED
CANCELLED
```

Uma reserva com quantidade `N` gera `N` tickets independentes após pagamento aprovado.

---

## 13.1 GET /me/tickets

Lista os ingressos do cliente autenticado.

### Autenticação

```text
CUSTOMER
```

### Request

```http
GET /api/v1/me/tickets?page=1&limit=20
```

### Response — 200

```json
{
  "items": [
    {
      "id": "ticket-uuid",
      "status": "VALID",
      "event": {
        "id": "event-uuid",
        "title": "Interstellar",
        "imageUrl": "https://image.tmdb.org/...",
        "startsAt": "2026-09-20T22:00:00.000Z",
        "location": "Cine Elite - Sala 1"
      },
      "createdAt": "2026-08-15T21:10:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

## 13.2 GET /me/tickets/:ticketId

Retorna um ingresso do cliente autenticado.

### Autenticação

```text
CUSTOMER
```

### Response — 200

```json
{
  "id": "ticket-uuid",
  "status": "VALID",
  "secureCode": "secure-random-code",
  "shareUrl": "https://app.example.com/tickets/share/share-token",
  "qrPayload": "secure-random-code",
  "validatedAt": null,
  "event": {
    "id": "event-uuid",
    "title": "Interstellar",
    "startsAt": "2026-09-20T22:00:00.000Z",
    "location": "Cine Elite - Sala 1"
  }
}
```

### Decisão

O backend retorna:

```text
qrPayload
```

e o frontend renderiza visualmente o QR Code.

Assim, o backend continua sendo responsável pelo token seguro, enquanto a geração gráfica permanece simples no frontend.

### Erros

```text
403 FORBIDDEN
404 TICKET_NOT_FOUND
```

---

# 14. Compartilhamento

O compartilhamento utiliza `shareToken`, não `secureCode`.

Isso evita expor diretamente o código usado pela portaria na URL pública.

---

## 14.1 GET /tickets/share/:shareToken

Exibe informações públicas necessárias para utilização do ingresso compartilhado.

### Autenticação

```text
Pública
```

### Request

```http
GET /api/v1/tickets/share/share-token
```

### Response — 200

```json
{
  "ticket": {
    "status": "VALID",
    "qrPayload": "secure-random-code",
    "event": {
      "title": "Interstellar",
      "startsAt": "2026-09-20T22:00:00.000Z",
      "location": "Cine Elite - Sala 1"
    }
  }
}
```

### Segurança

A resposta pública não deverá expor:

```text
customerId
email
reservationId
payment
```

### Erros

```text
404 TICKET_NOT_FOUND
```

---

# 15. Portaria

Endpoints de portaria exigem role:

```text
GATE
```

---

## 15.1 POST /gate/validate

Valida um ingresso.

### Autenticação

```text
GATE
```

### Request

```http
POST /api/v1/gate/validate
```

```json
{
  "eventId": "event-uuid",
  "code": "secure-random-code"
}
```

O campo `code` pode ter sido obtido por:

```text
leitura da câmera
ou
digitação manual
```

O backend não precisa distinguir a origem.

---

## 15.2 Resultado VALID

### Response — 200

```json
{
  "result": "VALID",
  "ticket": {
    "id": "ticket-uuid",
    "status": "USED",
    "validatedAt": "2026-09-20T21:45:12.000Z"
  },
  "event": {
    "id": "event-uuid",
    "title": "Interstellar"
  }
}
```

A operação:

```text
VALID → USED
```

deve ser atômica.

---

## 15.3 Resultado INVALID

### Response — 200

```json
{
  "result": "INVALID"
}
```

Esse resultado ocorre quando o código não identifica um ingresso válido.

---

## 15.4 Resultado ALREADY_USED

### Response — 200

```json
{
  "result": "ALREADY_USED",
  "ticket": {
    "id": "ticket-uuid",
    "status": "USED",
    "validatedAt": "2026-09-20T21:40:00.000Z"
  }
}
```

---

## 15.5 Resultado WRONG_EVENT

### Response — 200

```json
{
  "result": "WRONG_EVENT",
  "ticket": {
    "id": "ticket-uuid"
  }
}
```

### Decisão

Os quatro resultados esperados pela portaria são respostas válidas de domínio e usam HTTP `200`.

```text
VALID
INVALID
ALREADY_USED
WRONG_EVENT
```

HTTP de erro será reservado para problemas técnicos, autenticação ou payload inválido.

---

# 16. Concorrência da Portaria

A API deverá garantir que:

```text
Gate A → mesmo code
Gate B → mesmo code
```

não produza:

```text
A → VALID
B → VALID
```

Resultado correto:

```text
A → VALID
B → ALREADY_USED
```

A implementação utilizará transação e controle atômico no PostgreSQL/TypeORM.

---

# 17. Matriz de Permissões

| Endpoint | Public | Organizer | Customer | Gate |
|---|---:|---:|---:|---:|
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ |
| `GET /auth/me` | ❌ | ✅ | ✅ | ✅ |
| `GET /catalog/movies` | ❌ | ✅ | ❌ | ❌ |
| `POST /events` | ❌ | ✅ | ❌ | ❌ |
| `PATCH /events/:id` | ❌ | ✅ | ❌ | ❌ |
| `POST /events/:id/publish` | ❌ | ✅ | ❌ | ❌ |
| `GET /organizer/events` | ❌ | ✅ | ❌ | ❌ |
| `GET /events` | ✅ | ✅ | ✅ | ✅ |
| `GET /events/:id` | ✅ | ✅ | ✅ | ✅ |
| `POST /reservations` | ❌ | ❌ | ✅ | ❌ |
| `GET /reservations/:id` | ❌ | ❌ | ✅ | ❌ |
| `POST /reservations/:id/payment` | ❌ | ❌ | ✅ | ❌ |
| `GET /me/tickets` | ❌ | ❌ | ✅ | ❌ |
| `GET /me/tickets/:id` | ❌ | ❌ | ✅ | ❌ |
| `GET /tickets/share/:token` | ✅ | ✅ | ✅ | ✅ |
| `POST /gate/validate` | ❌ | ❌ | ❌ | ✅ |

---

# 18. Paginação

Endpoints de listagem utilizarão:

```text
page
limit
```

Exemplo:

```http
GET /api/v1/events?page=2&limit=20
```

Resposta:

```json
{
  "items": [],
  "pagination": {
    "page": 2,
    "limit": 20,
    "totalItems": 54,
    "totalPages": 3
  }
}
```

### Limites sugeridos

```text
default limit = 20

maximum limit = 100
```

---

# 19. Ordenação

Ordenação inicial definida pelo backend.

### Eventos públicos

```text
startsAt ASC
```

### Eventos do organizador

```text
createdAt DESC
```

### Meus ingressos

```text
event.startsAt ASC
```

Não será criada uma linguagem genérica de ordenação no MVP.

---

# 20. DTOs Principais

Estrutura conceitual:

```text
LoginDto

SearchMoviesQueryDto

CreateEventDto
UpdateEventDto

ListEventsQueryDto

CreateReservationDto

SimulatePaymentDto

ValidateTicketDto
```

Exemplo:

```ts
export class CreateReservationDto {
  @IsUUID()
  eventId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
```

---

# 21. Segurança

A API deverá:

- validar JWT;
- aplicar RBAC no backend;
- validar DTOs;
- nunca retornar `passwordHash`;
- não confiar em IDs de usuário enviados pelo frontend;
- obter `customerId` e `organizerId` a partir do JWT;
- usar `secureCode` imprevisível;
- usar `shareToken` independente;
- limitar informações expostas em rota pública de compartilhamento;
- não registrar tokens completos em logs.

Exemplo incorreto:

```json
{
  "customerId": "user-supplied-id",
  "eventId": "event-id"
}
```

para criar uma reserva.

O correto:

```text
customerId = request.user.sub
```

---

# 22. Ownership

Além do RBAC, será validada propriedade dos recursos.

Exemplo:

```text
ORGANIZER A
não pode editar
Event do ORGANIZER B
```

Assim:

```text
role == ORGANIZER
```

não é suficiente.

Também:

```text
event.organizerId == authenticatedUser.id
```

---

# 23. Idempotência

O MVP não implementará uma infraestrutura genérica de `Idempotency-Key`.

Entretanto, operações críticas deverão proteger seus estados.

### Pagamento

Uma reserva já `PAID` não deverá emitir novos tickets.

```text
PAID
  ↓
nova chamada de pagamento
  ↓
RESERVATION_ALREADY_PAID
```

### Publicação

Um evento já publicado não será publicado novamente.

```text
PUBLISHED
   ↓
publish
   ↓
EVENT_ALREADY_PUBLISHED
```

### Validação

Um ingresso `USED` nunca retorna `VALID` novamente.

---

# 24. Swagger / OpenAPI

O backend deverá expor documentação Swagger durante desenvolvimento e avaliação.

Endpoint sugerido:

```text
/api/docs
```

Exemplo:

```text
http://localhost:3001/api/docs
```

O Swagger deverá documentar:

- endpoints;
- DTOs;
- autenticação Bearer;
- enums;
- responses principais.

Essa documentação complementa, mas não substitui, este `API.md`.

---

# 25. CORS

O backend deverá aceitar requisições do frontend configurado.

Variável sugerida:

```text
FRONTEND_URL
```

Exemplo local:

```text
http://localhost:3000
```

Evitar configuração irrestrita em produção quando não necessária.

---

# 26. Fluxo Completo via API

## Organizador

```text
POST /auth/login
        ↓
GET /catalog/movies
        ↓
POST /events
        ↓
PATCH /events/:id
        ↓
POST /events/:id/publish
```

---

## Cliente

```text
GET /events
        ↓
GET /events/:id
        ↓
POST /auth/login
        ↓
POST /reservations
        ↓
POST /reservations/:id/payment
        ↓
GET /me/tickets
        ↓
GET /me/tickets/:id
```

---

## Compartilhamento

```text
GET /me/tickets/:id
        ↓
shareUrl
        ↓
GET /tickets/share/:shareToken
```

---

## Portaria

```text
POST /auth/login
        ↓
seleciona evento
        ↓
lê QR / digita código
        ↓
POST /gate/validate
```

---

# 27. Cenários Críticos de Aceite

## Compra aprovada

```text
POST /reservations
→ 201 PENDING_PAYMENT

POST /reservations/:id/payment
simulation = APPROVE

→ Payment APPROVED
→ Reservation PAID
→ N Tickets criados
```

---

## Pagamento recusado

```text
POST /reservations/:id/payment
simulation = DECLINE

→ Payment DECLINED
→ Reservation PAYMENT_FAILED
→ tickets = []
```

---

## Último ingresso concorrente

```text
available = 1

Customer A → APPROVE
Customer B → APPROVE
```

Resultado:

```text
um → PAID

outro → 409 EVENT_SOLD_OUT
```

---

## Primeira validação

```text
POST /gate/validate

→ VALID
```

Ticket passa para:

```text
USED
```

---

## Segunda validação

Mesmo código:

```text
POST /gate/validate

→ ALREADY_USED
```

---

## Evento incorreto

```text
ticket.eventId = Event A

gate eventId = Event B

→ WRONG_EVENT
```

---

# 28. Endpoints do MVP

Resumo:

```text
AUTH

POST   /auth/login
GET    /auth/me


CATALOG

GET    /catalog/movies


EVENTS

POST   /events
PATCH  /events/:eventId
POST   /events/:eventId/publish
GET    /organizer/events

GET    /events
GET    /events/:eventId


RESERVATIONS

POST   /reservations
GET    /reservations/:reservationId


PAYMENTS

POST   /reservations/:reservationId/payment


TICKETS

GET    /me/tickets
GET    /me/tickets/:ticketId
GET    /tickets/share/:shareToken


GATE

POST   /gate/validate
```

---

# 29. Fora do Escopo da API

Não serão implementados no MVP:

```text
password recovery

email delivery

real payment gateway

refund

ticket resale

ticket transfer

seat selection

generic admin API

inventory hold

webhooks

payment retries

native app endpoints
```

---

# 30. Decisões do Contrato

## API-001 — REST

**Decisão:** REST/JSON.

**Motivo:** simples, adequado ao escopo e integração direta entre Next.js e NestJS.

---

## API-002 — Versionamento

**Decisão:**

```text
/api/v1
```

**Motivo:** deixar explícito o contrato e permitir evolução futura.

---

## API-003 — Pagamento separado da reserva

**Decisão:**

```text
POST /reservations
        ↓
POST /reservations/:id/payment
```

**Motivo:** representar claramente os estados `PENDING_PAYMENT`, `PAID` e `PAYMENT_FAILED`.

---

## API-004 — Estoque confirmado no pagamento

**Decisão:** uma reserva pendente não mantém um hold permanente de ingressos.

A capacidade é revalidada atomicamente quando o pagamento é aprovado.

**Motivo:** evitar sistema de expiração de holds no MVP.

---

## API-005 — Simulação explícita

**Decisão:**

```json
{
  "simulation": "APPROVE"
}
```

ou:

```json
{
  "simulation": "DECLINE"
}
```

**Motivo:** tornar cenários de sucesso e recusa determinísticos e fáceis de avaliar.

---

## API-006 — Resultados da portaria como domínio

**Decisão:**

```text
VALID
INVALID
ALREADY_USED
WRONG_EVENT
```

retornam `200`.

**Motivo:** são resultados esperados do processo de validação, e não erros técnicos da API.

---

## API-007 — QR renderizado pelo frontend

**Decisão:** a API retorna `qrPayload`.

**Motivo:** o backend controla o token seguro; o frontend cuida apenas da representação visual.

---

## API-008 — shareToken diferente de secureCode

**Decisão:** compartilhar um ingresso não expõe o token de validação diretamente na URL.

**Motivo:** separar a identificação pública de compartilhamento da credencial usada na portaria.

---

# 31. Próxima Etapa

Com os três contratos definidos:

```text
PRD.md
      ↓
o que construir

ARCHITECTURE.md
      ↓
como estruturar

DATABASE.md
      ↓
como persistir

API.md
      ↓
como frontend e backend conversam
```

o projeto possui contexto suficiente para iniciar a implementação.

A próxima etapa será:

```text
setup do repositório
      ↓
backend NestJS
      ↓
PostgreSQL + TypeORM
      ↓
frontend Next.js
```

A implementação deverá seguir incrementalmente os fluxos definidos nos documentos, evitando gerar toda a aplicação de uma única vez.
