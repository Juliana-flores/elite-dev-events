# Engineering Guardrails — Elite Dev Events

## 1. Objetivo

Este documento define regras que não podem ser violadas durante a implementação, incluindo por agentes de IA.

Guardrails existem para impedir que velocidade de geração comprometa:

- requisitos;
- segurança;
- consistência;
- testes;
- contratos;
- rastreabilidade.

---

## 2. Guardrails de requisitos

### G-001 — Não alterar requisitos silenciosamente

Nenhum código pode redefinir um requisito para facilitar implementação.

Se `PRD.md`, `API.md`, `DATABASE.md`, `DECISIONS.md` ou uma spec divergirem, o conflito deve ser reportado.

### G-002 — Spec atual limita o escopo

O agente deve implementar somente a capability solicitada e dependências estritamente necessárias.

### G-003 — Acceptance criteria são imutáveis durante a execução

Não alterar acceptance criteria apenas porque a implementação falhou.

Mudanças exigem decisão humana explícita.

---

## 3. Guardrails de testes

### G-004 — Nunca enfraquecer teste para fazê-lo passar

Proibido:

- remover assertion;
- trocar uma expectativa correta por outra mais permissiva;
- pular teste (`skip`, `only` indevido);
- reduzir cenário de concorrência;
- mockar a própria regra que está sendo testada;
- alterar fixture para evitar o bug.

### G-005 — Teste que falha primeiro aponta para implementação

Quando um teste existente falhar após mudança:

```text
investigar implementação
        ↓
corrigir implementação
```

Não:

```text
alterar teste
        ↓
declarar sucesso
```

### G-006 — Testes de avaliação externos são somente leitura para a IA implementadora

O agente principal não deve receber acesso ao repositório privado de evals.

---

## 4. Guardrails de persistência

### G-007 — `synchronize: false`

Nunca ativar:

```ts
synchronize: true
```

como solução para migration ausente.

### G-008 — Mudança de schema exige migration

Alterar entity sem migration correspondente é mudança incompleta quando o schema persistido é afetado.

### G-009 — Banco é fonte de verdade para concorrência

Não usar apenas:

- variável em memória;
- mutex local;
- contador local;

para proteger overselling ou dupla validação.

---

## 5. Guardrails de capacidade

### G-010 — Nunca vender acima da capacidade

Invariante:

```text
confirmedTickets <= Event.capacity
```

deve permanecer verdadeiro mesmo com requisições simultâneas.

### G-011 — Revalidar capacidade na confirmação

Uma checagem feita ao criar `PENDING_PAYMENT` não é suficiente.

A disponibilidade deve ser recalculada dentro da transação que confirma pagamento/tickets.

---

## 6. Guardrails de ticket

### G-012 — Ticket somente após pagamento aprovado

Nunca emitir ticket quando:

```text
Payment.status != APPROVED
```

### G-013 — Quantidade paga deve corresponder aos tickets emitidos

Para uma reserva `PAID`:

```text
Reservation.quantity == numberOfTickets
```

### G-014 — Código público não pode ser previsível

Não utilizar:

```text
1
2
3
```

ou IDs sequenciais como credencial de validação.

### G-015 — `secureCode` e `shareToken` são conceitos separados

Não reutilizar automaticamente o mesmo valor para ambos.

---

## 7. Guardrails de portaria

### G-016 — Validação ocorre no backend

Decodificar QR no frontend não significa validar o ingresso.

### G-017 — Uso único é atômico

A transição:

```text
VALID → USED
```

deve acontecer no máximo uma vez.

### G-018 — Resultados de domínio

A portaria deve distinguir:

```text
VALID
INVALID
ALREADY_USED
WRONG_EVENT
```

---

## 8. Guardrails de autenticação e autorização

### G-019 — Frontend não é fronteira de segurança

Esconder botão não substitui autorização no backend.

### G-020 — Identidade vem do JWT

Não confiar em:

```text
customerId
organizerId
```

enviados pelo cliente para atribuir ownership.

Utilizar:

```text
request.user.sub
```

### G-021 — Role não substitui ownership

Um `ORGANIZER` não pode editar evento de outro organizador.

### G-022 — Senhas somente como hash

Nunca:

- logar senha;
- persistir texto puro;
- retornar `passwordHash`.

---

## 9. Guardrails de API

### G-023 — Contrato versionado

Rotas do MVP seguem:

```text
/api/v1
```

### G-024 — Mudança de contrato exige atualização de `API.md`

Renomear payload, endpoint, status ou enum sem atualizar documentação é proibido.

### G-025 — Erros de domínio utilizam códigos estáveis

O frontend não deve depender da comparação de mensagens humanas quando existe `code`.

---

## 10. Guardrails de integração externa

### G-026 — Frontend não depende diretamente da TMDb para regra de negócio

A integração passa pelo backend/CatalogModule.

### G-027 — Evento interno mantém snapshot

Eventos existentes não podem depender de uma nova chamada à TMDb para exibir seus dados básicos.

### G-028 — Falha externa deve ser tratada

Erro da TMDb não deve produzir erro não controlado.

---

## 11. Guardrails de código

### G-029 — Não desabilitar ferramentas para esconder problemas

Não utilizar como correção:

```text
eslint-disable global
@ts-ignore indiscriminado
any indiscriminado
```

### G-030 — Não criar abstração sem necessidade da spec

Evitar infraestrutura genérica prematura.

### G-031 — Controllers finos

Controllers:

- recebem request;
- validam fronteira;
- chamam caso de uso/service;
- retornam response.

Regras de domínio não devem ficar espalhadas em controllers.

### G-032 — Transações críticas ficam explícitas

Operações multi-entidade que precisam ser atômicas devem tornar a transaction visível no código.

---

## 12. Guardrails de segurança operacional

### G-033 — Segredos fora do Git

Nunca versionar:

```text
JWT_SECRET real
DATABASE_URL com credencial real
TMDB_API_KEY real
```

### G-034 — `.env.example` não contém segredos reais

Apenas nomes e valores fictícios.

### G-035 — Logs não expõem credenciais

Evitar logar:

- JWT completo;
- senha;
- API key;
- token completo quando desnecessário.

---

## 13. Checklist antes de concluir uma spec

- [ ] acceptance criteria permanecem inalterados;
- [ ] código compila;
- [ ] lint passa;
- [ ] testes relevantes passam;
- [ ] migrations existem quando necessárias;
- [ ] API.md foi atualizado se contrato mudou;
- [ ] DATABASE.md foi atualizado se persistência mudou;
- [ ] DECISIONS.md foi atualizado se houve nova decisão relevante;
- [ ] AI_USAGE.md foi atualizado se IA participou significativamente;
- [ ] nenhum segredo foi versionado;
- [ ] nenhuma regra crítica foi deslocada apenas para o frontend.
