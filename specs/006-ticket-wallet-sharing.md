# SPEC-006 — Ticket Wallet and Sharing

## Source requirements

```text
RF-015 — Meus Ingressos
RF-016 — Compartilhar ingresso
```

## Goal

Permitir que cliente visualize tickets emitidos, QR individual e compartilhe um ticket por link público seguro.

## Dependencies

```text
SPEC-005
```

---

## In scope

- listagem "Meus Ingressos";
- detalhe do ticket;
- `qrPayload`;
- renderização visual do QR no frontend;
- URL com `shareToken`;
- rota pública de compartilhamento;
- minimização dos dados públicos.

## Out of scope

- transferência de ownership;
- revenda;
- email;
- download PDF;
- Apple/Google Wallet.

---

## Business rules

### BR-001

Cliente autenticado só consulta seus tickets em `/me`.

### BR-002

QR representa `secureCode`.

### BR-003

Compartilhamento usa `shareToken`, não ID previsível.

### BR-004

Rota pública não expõe:

```text
customerId
email
reservationId
payment
password data
```

### BR-005

Compartilhar não altera ownership.

---

## API contracts

```text
GET /api/v1/me/tickets
GET /api/v1/me/tickets/:ticketId
GET /api/v1/tickets/share/:shareToken
```

---

## Backend tasks

- [ ] wallet query;
- [ ] ticket ownership;
- [ ] ticket detail;
- [ ] construir `shareUrl`;
- [ ] retornar `qrPayload`;
- [ ] public projection por `shareToken`;
- [ ] filtrar dados privados;
- [ ] Swagger.

---

## Frontend tasks

- [ ] tela Meus Ingressos;
- [ ] cards/status;
- [ ] detalhe;
- [ ] QR Code;
- [ ] copiar/compartilhar link;
- [ ] tela pública compartilhada.

---

## Tests

- customer vê próprios tickets;
- customer não vê ticket alheio;
- shareToken válido encontra ticket;
- token inválido retorna 404;
- response pública não contém dados privados;
- QR usa payload esperado.

---

## Acceptance criteria

- [ ] cliente vê todos os seus ingressos;
- [ ] cada ticket possui QR individual;
- [ ] cliente abre detalhe;
- [ ] link compartilhável funciona sem login;
- [ ] rota pública não expõe dados sensíveis;
- [ ] link não utiliza ID incremental como segurança.
