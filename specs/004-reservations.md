# SPEC-004 — Reservation Lifecycle

## Source requirements

```text
RF-009 — Criar reserva
RF-011 — Ciclo da reserva
```

## Goal

Permitir que um cliente crie uma reserva `PENDING_PAYMENT` com snapshot de preço e quantidade.

## Dependencies

```text
SPEC-001
SPEC-003
```

---

## In scope

- Reservation entity/migration;
- criação de reserva;
- snapshot de preço;
- cálculo de total;
- ownership;
- consulta de reserva própria;
- estado inicial `PENDING_PAYMENT`;
- feedback preliminar de disponibilidade.

## Out of scope

- confirmação de pagamento;
- emissão de ticket;
- consumo definitivo de capacidade;
- hold de inventário;
- expiração.

Esses comportamentos são concluídos na `SPEC-005`.

---

## Business rules

### BR-001

Somente `CUSTOMER` cria reserva.

### BR-002

`quantity > 0`.

### BR-003

Evento precisa estar:

```text
PUBLISHED
```

### BR-004

Evento não pode já ter iniciado.

### BR-005

Preço é capturado no momento da reserva:

```text
unitPrice = current Event.price
totalAmount = unitPrice * quantity
```

### BR-006

`customerId` vem do JWT.

### BR-007

Uma reserva pendente **não mantém inventory hold permanente**.

---

## API contracts

### POST `/api/v1/reservations`

```json
{
  "eventId": "uuid",
  "quantity": 2
}
```

### GET `/api/v1/reservations/:reservationId`

Somente owner customer.

---

## Database impact

Criar:

```text
reservations
```

Índices:

```text
customerId
eventId
status
```

---

## Backend tasks

- [ ] entity;
- [ ] migration;
- [ ] create reservation DTO;
- [ ] validação de evento;
- [ ] snapshot de preço;
- [ ] cálculo monetário seguro;
- [ ] ownership;
- [ ] consulta;
- [ ] Swagger.

---

## Frontend tasks

- [ ] seletor de quantidade no detalhe;
- [ ] exibição do total;
- [ ] criação de reserva;
- [ ] estado de checkout `PENDING_PAYMENT`;
- [ ] erros de indisponibilidade/evento.

---

## Tests

- quantity zero falha;
- draft falha;
- evento iniciado falha;
- snapshot de preço é preservado;
- total correto;
- customer não consulta reserva alheia.

---

## Acceptance criteria

- [ ] cliente cria reserva válida;
- [ ] status inicial é `PENDING_PAYMENT`;
- [ ] total é calculado no backend;
- [ ] preço posterior do evento não altera reserva;
- [ ] customerId não pode ser falsificado pelo payload;
- [ ] reserva de outro cliente não é acessível.
