# Feature Specifications — Elite Dev Events

## Objetivo

A pasta `specs/` transforma requisitos do PRD em unidades implementáveis.

Uma spec deve ser pequena o suficiente para:

- ser compreendida integralmente;
- possuir acceptance criteria claros;
- ser implementada e revisada isoladamente;
- produzir commits rastreáveis.

---

## Mapeamento

| Spec | Requisitos | Capability | Prioridade |
|---|---|---|---|
| `001-auth-rbac.md` | RF-001, RF-002 | Authentication + RBAC | P0 |
| `002-catalog.md` | RF-003 | TMDb Catalog | P0 |
| `003-events.md` | RF-004 a RF-008 | Event Management + Discovery | P0 |
| `004-reservations.md` | RF-009, RF-011 | Reservation Lifecycle | P0 |
| `005-payment-capacity-tickets.md` | RF-010, RF-012 a RF-014 | Capacity + Payment + Ticket Issuance | P0 |
| `006-ticket-wallet-sharing.md` | RF-015, RF-016 | Ticket Wallet + Sharing | P0 |
| `007-gate-validation.md` | RF-017 a RF-019 | Gate Validation | P0 |

---

## Ordem de execução

```text
001 Auth/RBAC
      ↓
002 Catalog
      ↓
003 Events
      ↓
004 Reservations
      ↓
005 Payment + Capacity + Ticket Issuance
      ↓
006 Wallet + Sharing
      ↓
007 Gate Validation
```

Frontend e backend podem evoluir na mesma spec, desde que o contrato esteja definido.

---

## Template

Cada spec deve conter:

```text
Source requirements
Goal
Dependencies
In scope
Out of scope
Business rules
API contracts
Database impact
Backend tasks
Frontend tasks
Tests
Acceptance criteria
Definition of done
```

---

## Regra de execução

Antes de implementar uma spec:

1. leia documentos globais;
2. leia somente a spec atual e dependências relevantes;
3. decomponha em tarefas;
4. implemente incrementalmente;
5. execute testes;
6. valide acceptance criteria;
7. atualize documentação impactada;
8. só então avance para a próxima spec.

---

## Não transformar specs em código

Specs descrevem comportamento e contratos.

Detalhes locais de implementação devem ficar no código, exceto quando representarem decisão arquitetural importante.
