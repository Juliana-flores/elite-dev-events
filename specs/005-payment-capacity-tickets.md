# SPEC-005 — Payment, Capacity and Ticket Issuance

## Source requirements

```text
RF-010 — Impedir overselling
RF-012 — Pagamento simulado
RF-013 — Gerar ingresso
RF-014 — QR Code seguro
```

## Goal

Confirmar pagamento de forma determinística, proteger capacidade sob concorrência e emitir exatamente `N` tickets quando aprovado.

## Dependencies

```text
SPEC-004
```

---

## In scope

- Payment entity/migration;
- Ticket entity/migration;
- `PaymentProvider`;
- `FakePaymentProvider`;
- `APPROVE`;
- `DECLINE`;
- pessimistic lock no Event;
- revalidação de capacidade;
- atualização da reserva;
- emissão atômica de N tickets;
- `secureCode`;
- `shareToken`;
- `qrPayload`.

## Out of scope

- payment gateway real;
- webhook;
- retry;
- refund;
- inventory hold;
- envio por email.

---

## Critical invariants

```text
confirmedTickets <= Event.capacity
```

```text
Payment DECLINED → zero Tickets
```

```text
Reservation PAID → Ticket count == Reservation.quantity
```

---

## Transaction — approved payment

```text
BEGIN
 ↓
lock Event (pessimistic_write)
 ↓
recalculate confirmed tickets
 ↓
enough capacity?
 ├─ no → ROLLBACK / EVENT_SOLD_OUT
 └─ yes
      ↓
   Payment APPROVED
      ↓
   Reservation PAID
      ↓
   create N Tickets
      ↓
   COMMIT
```

---

## Payment decline

```text
Payment DECLINED
Reservation PAYMENT_FAILED
Tickets = 0
```

Não deve consumir capacidade.

---

## API contract

### POST `/api/v1/reservations/:reservationId/payment`

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

---

## Database impact

Criar:

```text
payments
tickets
```

Unique:

```text
Payment.reservationId
Ticket.secureCode
Ticket.shareToken
```

---

## Backend tasks

- [ ] Payment entity + migration;
- [ ] Ticket entity + migration;
- [ ] FakePaymentProvider;
- [ ] payment orchestration;
- [ ] lock Event;
- [ ] confirmed count;
- [ ] atomic state update;
- [ ] generate N tickets;
- [ ] secure random `secureCode`;
- [ ] secure random `shareToken`;
- [ ] prevent duplicate payment;
- [ ] Swagger.

---

## Frontend tasks

- [ ] checkout;
- [ ] botão/cenário approve;
- [ ] botão/cenário decline;
- [ ] feedback `PAYMENT_FAILED`;
- [ ] navegar para tickets após aprovação;
- [ ] tratar `EVENT_SOLD_OUT`.

---

## Tests

### Unit

- provider APPROVE;
- provider DECLINE;
- ticket token generation;
- payment state rules.

### Integration

- approved gera N tickets;
- declined gera 0;
- duplicate payment não duplica tickets;
- unique tokens;
- transaction rollback em falha.

### Concurrency

Com disponibilidade `1`:

- disparar pagamentos concorrentes;
- exatamente um deve resultar em `PAID`;
- nenhum estado final pode ultrapassar capacity.

---

## Acceptance criteria

- [ ] APPROVE gera payment `APPROVED`;
- [ ] reservation vira `PAID`;
- [ ] N tickets são criados;
- [ ] DECLINE gera `PAYMENT_FAILED`;
- [ ] DECLINE gera zero tickets;
- [ ] pagamento repetido não duplica tickets;
- [ ] concorrência não produz overselling;
- [ ] ticket possui `secureCode` e `shareToken` únicos;
- [ ] `secureCode` não é ID incremental.
