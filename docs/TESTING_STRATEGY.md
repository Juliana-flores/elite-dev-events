# Testing Strategy — Elite Dev Events

## 1. Objetivo

A estratégia de testes possui duas metas diferentes:

1. apoiar desenvolvimento e qualidade do código;
2. avaliar a aplicação de forma independente da IA que a implementou.

Por isso os testes são divididos em duas camadas.

---

## 2. Camada A — Testes do repositório principal

Ficam junto ao código e são visíveis para desenvolvedores e agentes.

Incluem:

```text
unit tests
integration tests
basic e2e tests
```

Objetivos:

- validar unidades e módulos;
- prevenir regressões;
- permitir TDD quando útil;
- servir como documentação executável;
- demonstrar qualidade ao avaliador.

A IA pode:

- criar esses testes;
- executar;
- corrigir implementação com base neles.

A IA não pode:

- enfraquecer assertions;
- remover cenário válido;
- pular teste para concluir tarefa.

---

## 3. Camada B — Repositório privado de evaluation tests

Repositório sugerido:

```text
elite-dev-events-evals
```

Visibilidade:

```text
PRIVATE
```

Esse repositório não deve ser fornecido como contexto à IA implementadora.

### Propósito

Testar o sistema como caixa-preta.

### Permitido observar

- HTTP API;
- browser;
- respostas;
- comportamento concorrente;
- estado publicamente observável.

### Não deve importar

```text
ReservationService
EventService
TicketService
TypeORM entities
repositories internos
```

Isso evita acoplamento dos evals à implementação.

---

## 4. Estrutura sugerida do repositório de evals

```text
elite-dev-events-evals/
│
├── api/
│   ├── auth.e2e.ts
│   ├── events.e2e.ts
│   ├── payments.e2e.ts
│   ├── overselling.e2e.ts
│   └── gate-validation.e2e.ts
│
├── browser/
│   └── critical-flow.e2e.ts
│
├── helpers/
│
├── package.json
└── README.md
```

---

## 5. Casos obrigatórios para evals independentes

### EVAL-001 — RBAC

Confirmar que cliente não cria evento.

### EVAL-002 — Ownership

Confirmar que organizador A não altera evento de organizador B.

### EVAL-003 — Payment decline

```text
DECLINE
→ PAYMENT_FAILED
→ zero tickets
```

### EVAL-004 — Ticket quantity

```text
quantity = 3
→ exactly 3 tickets
```

### EVAL-005 — Overselling concorrente

Criar cenário:

```text
available = 1
```

Disparar múltiplos pagamentos concorrentes.

Esperar exatamente uma confirmação.

### EVAL-006 — Gate first use

```text
VALID
```

### EVAL-007 — Gate reuse

Mesmo código:

```text
ALREADY_USED
```

### EVAL-008 — Gate concurrency

Duas validações simultâneas:

```text
exactly one VALID
exactly one ALREADY_USED
```

### EVAL-009 — Wrong event

Ingresso A validado em B:

```text
WRONG_EVENT
```

### EVAL-010 — Share privacy

Rota pública de compartilhamento não expõe:

```text
email
customerId
payment details
password data
```

---

## 6. Distribuição de testes no repositório principal

### Backend

Prioridade para:

```text
auth service
roles guard
catalog adapter
events service
reservation rules
payment provider
ticket generation
gate validation
```

### Integração

Utilizar PostgreSQL de teste quando o comportamento depende de:

- transaction;
- unique constraint;
- pessimistic lock;
- migration.

Mocks não são suficientes para provar concorrência real.

### Frontend

Testar principalmente:

- rendering de estados;
- formulários críticos;
- handling de erros conhecidos;
- componentes de portaria.

---

## 7. Concorrência

Testes de overselling e dupla validação são testes de banco/integration/e2e, não apenas unitários.

Uma implementação que passa apenas com repository mock ainda não prova a invariante.

---

## 8. Política para testes gerados por IA

A IA pode sugerir casos de teste, mas:

- acceptance criteria vêm da spec;
- resultados esperados não são definidos pela implementação atual;
- teste não é alterado apenas porque falhou;
- bugs encontrados pelos evals devem gerar correção de implementação.

---

## 9. CI futura

Repositório principal:

```text
lint
typecheck
unit
integration
build
```

Eval repository:

```text
start application
seed
run black-box tests
```

O pipeline de evals pode permanecer privado.

---

## 10. Definition of Done

Uma spec não está pronta apenas porque compila.

Ela precisa:

```text
implementation
+
visible tests
+
guardrails satisfeitos
+
acceptance criteria atendidos
```

Os evals independentes funcionam como uma validação adicional e não como substituto dos testes do projeto.
