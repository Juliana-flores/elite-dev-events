# Agent Instructions — Elite Dev Events

## Purpose

Este arquivo define como agentes de IA devem trabalhar neste repositório.

A prioridade é produzir mudanças pequenas, rastreáveis e consistentes com os contratos existentes.

---

## 1. Read before coding

Para qualquer implementação, leia nesta ordem:

```text
docs/PRD.md
docs/ARCHITECTURE.md
docs/DATABASE.md
docs/API.md
docs/DECISIONS.md
docs/GUARDRAILS.md
specs/<SPEC_ATUAL>.md
```

Não assuma detalhes relevantes que não estejam presentes nesses artefatos.

---

## 2. Source hierarchy

```text
PRD
 ↓
Architecture
 ↓
Database + API
 ↓
Decisions
 ↓
Current Spec
 ↓
Code
```

Essa hierarquia organiza o contexto.

Se documentos se contradisserem, **não escolha silenciosamente um deles**.

Reporte o conflito e aguarde resolução.

---

## 3. Work protocol

Antes de editar código:

1. identifique a spec atual;
2. liste acceptance criteria;
3. identifique módulos e arquivos afetados;
4. apresente plano curto;
5. implemente apenas o escopo necessário;
6. execute verificações;
7. compare resultado com acceptance criteria;
8. reporte mudanças e pendências.

---

## 4. Scope discipline

Não implementar feature P1/P2 enquanto uma spec P0 estiver sendo executada, exceto dependência técnica indispensável.

Não introduzir:

- framework adicional;
- fila;
- cache;
- microserviço;
- abstração genérica;
- tabela nova;

sem necessidade clara da spec ou decisão aprovada.

---

## 5. Tests

Testes do repositório principal podem ser criados e executados normalmente.

Nunca:

- remover assertion para fazer teste passar;
- usar `skip` para concluir tarefa;
- alterar expected result porque a implementação produz outro resultado;
- reduzir concorrência do teste para esconder race condition.

Se um teste correto falhar, corrija implementação.

Testes de evaluation externos não fazem parte do contexto do agente implementador.

---

## 6. Database

Obrigatório:

```text
PostgreSQL
TypeORM
synchronize: false
migrations versionadas
```

Mudança em entity que altera schema deve incluir migration.

Operações críticas de concorrência devem depender do banco, não apenas de estado em memória.

---

## 7. Security

Nunca:

- persistir senha em texto puro;
- retornar passwordHash;
- confiar em customerId/organizerId fornecido pelo cliente;
- versionar secrets;
- considerar QR decodificado como automaticamente válido.

Autorização ocorre no backend.

Ownership deve ser validado além de role.

---

## 8. Critical invariants

Preservar sempre:

```text
confirmedTickets <= Event.capacity
```

```text
Ticket somente após Payment APPROVED
```

```text
Reservation.quantity == tickets emitted
para Reservation PAID
```

```text
Ticket VALID → USED
no máximo uma vez
```

---

## 9. API contracts

Não renomear endpoint, field ou enum da API sem:

1. justificar;
2. atualizar `docs/API.md`;
3. verificar impacto no frontend;
4. registrar decisão quando relevante.

---

## 10. Documentation updates

Atualize:

### `DATABASE.md`

quando alterar:

- entity;
- relacionamento;
- constraint;
- index;
- transaction strategy.

### `API.md`

quando alterar contrato HTTP.

### `DECISIONS.md`

quando houver nova decisão estrutural ou trade-off significativo.

### `AI_USAGE.md`

quando IA tiver participação significativa na feature ou decisão.

---

## 11. Definition of Done per spec

Antes de declarar conclusão:

- [ ] todos os acceptance criteria foram atendidos;
- [ ] build passa;
- [ ] lint passa;
- [ ] testes relevantes passam;
- [ ] migrations foram adicionadas quando necessárias;
- [ ] nenhum teste foi enfraquecido;
- [ ] documentação impactada foi atualizada;
- [ ] nenhuma mudança fora de escopo foi introduzida;
- [ ] nenhum segredo foi adicionado;
- [ ] diferenças conhecidas foram reportadas.

---

## 12. Expected change style

Preferir commits pequenos e descritivos.

Exemplos:

```text
feat(auth): implement JWT login
feat(events): add event publishing flow
test(gate): cover duplicate ticket validation
docs(spec): complete auth RBAC acceptance criteria
```

Evitar commits genéricos como:

```text
update
fix stuff
changes
```
