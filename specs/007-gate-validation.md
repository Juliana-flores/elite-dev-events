# SPEC-007 — Gate Ticket Validation

## Source requirements

```text
RF-017 — Validar ingresso
RF-018 — Status da validação
RF-019 — Uso único
```

## Goal

Permitir que usuário `GATE` valide ingressos por QR ou código manual, garantindo uso único mesmo sob concorrência.

## Dependencies

```text
SPEC-005
SPEC-006
```

---

## In scope

- tela mobile-first de portaria;
- seleção de evento;
- leitura de câmera;
- fallback manual;
- endpoint de validação;
- atomic `VALID → USED`;
- resultados:
  - `VALID`
  - `INVALID`
  - `ALREADY_USED`
  - `WRONG_EVENT`.

## Out of scope

- modo offline;
- sincronização entre dispositivos offline;
- impressão;
- auditoria genérica.

---

## Business rules

### BR-001

Somente `GATE` valida.

### BR-002

Código desconhecido:

```text
INVALID
```

### BR-003

Ticket de outro evento:

```text
WRONG_EVENT
```

### BR-004

Ticket já utilizado:

```text
ALREADY_USED
```

### BR-005

Ticket correto e ainda válido:

```text
VALID
```

e persiste:

```text
status = USED
validatedAt = now()
```

### BR-006

A transição precisa ser atômica.

---

## API contract

### POST `/api/v1/gate/validate`

```json
{
  "eventId": "event-uuid",
  "code": "secure-code"
}
```

Resultados de domínio usam HTTP `200`.

---

## Atomicity

Cenário:

```text
Gate A ─┐
        ├─ same ticket
Gate B ─┘
```

Resultado obrigatório:

```text
exactly one VALID
all subsequent attempts ALREADY_USED
```

Implementação pode usar:

```text
pessimistic_write
```

ou update condicional equivalente, desde que a invariante seja comprovada.

---

## Backend tasks

- [ ] `GateModule`;
- [ ] validate DTO;
- [ ] role guard;
- [ ] lookup por secureCode;
- [ ] wrong-event handling;
- [ ] already-used handling;
- [ ] atomic transition;
- [ ] validatedAt;
- [ ] response discriminada;
- [ ] Swagger.

---

## Frontend tasks

- [ ] tela mobile-first;
- [ ] selecionar evento;
- [ ] câmera QR;
- [ ] fallback código manual;
- [ ] resultado visual claro;
- [ ] permitir próxima leitura rapidamente.

---

## Tests

### Integration

- unknown → INVALID;
- wrong event → WRONG_EVENT;
- first valid → VALID;
- second → ALREADY_USED;
- validatedAt preenchido.

### Concurrency

Duas validações simultâneas do mesmo código:

```text
1 VALID
1 ALREADY_USED
```

Nunca duas `VALID`.

---

## Acceptance criteria

- [ ] gate autentica e acessa tela;
- [ ] customer/organizer recebem 403;
- [ ] QR pode ser lido pela câmera;
- [ ] código pode ser digitado;
- [ ] código inexistente retorna INVALID;
- [ ] evento errado retorna WRONG_EVENT;
- [ ] primeira validação retorna VALID;
- [ ] ticket vira USED;
- [ ] segunda validação retorna ALREADY_USED;
- [ ] concorrência nunca gera duas validações válidas.
