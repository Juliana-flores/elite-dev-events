# Architecture — Elite Dev Events

## 1. Objetivo

Este documento descreve a arquitetura técnica do **Elite Dev Events** e registra as principais decisões utilizadas para transformar os requisitos definidos em `docs/PRD.md` em uma solução implementável.

A arquitetura prioriza:

- simplicidade;
- separação clara de responsabilidades;
- consistência de dados;
- segurança;
- facilidade de teste;
- rastreabilidade das decisões;
- entrega do fluxo principal de ponta a ponta.

---

## 2. Visão Geral

A aplicação será composta por três elementos principais:

```text
┌───────────────────────────────┐
│           Frontend            │
│     Next.js + TypeScript      │
└───────────────┬───────────────┘
                │
                │ HTTP / REST
                ▼
┌───────────────────────────────┐
│            Backend            │
│      NestJS + TypeScript      │
│                               │
│ Auth                          │
│ Users                         │
│ Catalog                       │
│ Events                        │
│ Reservations                  │
│ Payments                      │
│ Tickets                       │
│ Gate                          │
└───────┬─────────────────┬─────┘
        │                 │
        │ TypeORM         │ HTTP
        ▼                 ▼
┌───────────────┐   ┌───────────────┐
│  PostgreSQL   │   │   TMDb API    │
└───────────────┘   └───────────────┘
```

---

## 3. Estilo Arquitetural

### Decisão

O backend será implementado como um **Monólito Modular**.

```text
Backend
│
├── Auth
├── Users
├── Catalog
├── Events
├── Reservations
├── Payments
├── Tickets
└── Gate
```

Cada módulo terá responsabilidades e dependências claramente definidas, porém todos serão executados inicialmente dentro da mesma aplicação NestJS.

### Motivo

O domínio e o prazo do projeto não justificam microserviços nesta etapa.

Microserviços adicionariam complexidade em:

- infraestrutura;
- comunicação entre serviços;
- observabilidade;
- consistência distribuída;
- deploy;
- tratamento de falhas;
- configuração de ambientes.

Para o MVP, o monólito modular oferece melhor relação entre clareza arquitetural e velocidade de entrega.

### Evolução

A separação por módulos permite extrair componentes para serviços independentes no futuro caso existam necessidades reais de escala, disponibilidade ou isolamento.

---

## 4. Stack Oficial

### Frontend

```text
Next.js
React
TypeScript
```

### Backend

```text
Node.js
NestJS
TypeScript
```

### Persistência

```text
PostgreSQL
TypeORM
```

### Autenticação

```text
JWT
```

### API externa

```text
TMDb API
```

### Infraestrutura local

```text
Docker Compose
```

### Deploy previsto

```text
Frontend: Vercel
Backend: Railway / Render ou equivalente
Database: PostgreSQL gerenciado
```

---

## 5. Frontend

O frontend será responsável por:

- interface;
- navegação;
- formulários;
- gerenciamento da sessão;
- consumo da API;
- apresentação de erros;
- renderização do QR Code;
- leitura do QR Code pela câmera;
- experiências específicas para cada perfil.

O frontend **não será a fronteira de segurança** da aplicação.

Exemplo:

```text
Frontend

Cliente não vê botão "Criar evento"
          ↓
melhora UX

Backend
          ↓
RolesGuard verifica autorização
          ↓
garante segurança
```

Mesmo que um usuário tente chamar a API diretamente, o backend deverá rejeitar ações não autorizadas.

---

## 6. Backend

O backend será responsável por:

- autenticação;
- autorização;
- regras de negócio;
- integração externa;
- persistência;
- consistência;
- concorrência;
- reservas;
- pagamento simulado;
- emissão de ingressos;
- compartilhamento;
- validação na portaria.

Estrutura inicial:

```text
backend/
└── src/
    ├── modules/
    │   ├── auth/
    │   ├── users/
    │   ├── catalog/
    │   ├── events/
    │   ├── reservations/
    │   ├── payments/
    │   ├── tickets/
    │   └── gate/
    │
    ├── database/
    │   ├── migrations/
    │   ├── seeds/
    │   └── data-source.ts
    │
    ├── common/
    │   ├── decorators/
    │   ├── guards/
    │   ├── filters/
    │   ├── interceptors/
    │   └── exceptions/
    │
    ├── config/
    ├── app.module.ts
    └── main.ts
```

---

## 7. Responsabilidade dos Módulos

### 7.1 AuthModule

Responsável por:

- login;
- validação das credenciais;
- hash/validação de senha;
- geração de JWT;
- identificação do usuário autenticado.

Fluxo:

```text
POST /auth/login
      │
      ▼
buscar usuário
      │
      ▼
validar senha
      │
      ▼
gerar JWT
      │
      ▼
retornar sessão
```

---

### 7.2 UsersModule

Responsável por:

- usuários;
- papéis;
- consulta das informações básicas da conta.

Papéis:

```text
ORGANIZER
CUSTOMER
GATE
```

---

### 7.3 CatalogModule

Responsável por encapsular integrações com catálogos externos.

Inicialmente:

```text
CatalogModule
     │
     ▼
CatalogService
     │
     ▼
TmdbProvider
     │
     ▼
TMDb API
```

O restante da aplicação não deverá depender diretamente da implementação da TMDb.

Isso permite futura evolução:

```text
CatalogService
   ├── TmdbProvider
   └── TicketmasterProvider
```

sem obrigar o `EventsModule` a conhecer detalhes de cada integração.

---

### 7.4 EventsModule

Responsável por:

- criação de eventos;
- edição;
- publicação;
- consulta;
- capacidade;
- disponibilidade.

O evento interno será independente do registro original da TMDb.

---

### 7.5 ReservationsModule

Responsável por:

- criação de reservas;
- quantidade solicitada;
- cálculo do valor;
- estado da reserva;
- coordenação da operação de compra;
- proteção contra overselling.

---

### 7.6 PaymentsModule

Responsável pela abstração do pagamento.

Contrato conceitual:

```ts
export interface PaymentProvider {
  pay(input: PaymentInput): Promise<PaymentResult>;
}
```

Implementação inicial:

```text
PaymentProvider
      │
      ▼
FakePaymentProvider
```

A regra de negócio não deverá depender diretamente do mecanismo usado para simular o pagamento.

---

### 7.7 TicketsModule

Responsável por:

- emissão de ingressos;
- código seguro;
- QR Code;
- consulta de ingressos;
- "Meus Ingressos";
- compartilhamento por link.

---

### 7.8 GateModule

Responsável pelo caso de uso de validação na entrada do evento.

Resultados possíveis:

```text
VALID
INVALID
ALREADY_USED
WRONG_EVENT
```

A validação deverá ocorrer sempre no backend.

---

## 8. Persistência com TypeORM

O backend utilizará **TypeORM** como camada de mapeamento objeto-relacional.

Fluxo:

```text
Controller
    ↓
Service
    ↓
Repository / EntityManager
    ↓
TypeORM
    ↓
PostgreSQL
```

### Uso de Repository

Para operações simples:

```ts
const eventRepository = this.dataSource.getRepository(Event);
```

ou injeção via NestJS:

```ts
@InjectRepository(Event)
private readonly eventRepository: Repository<Event>;
```

### Uso de EntityManager

Operações que precisam compartilhar a mesma transação utilizarão o `EntityManager` recebido pela transação.

```ts
await this.dataSource.transaction(async (manager) => {
  const eventRepository = manager.getRepository(Event);
  const ticketRepository = manager.getRepository(Ticket);

  // operações atômicas
});
```

Durante uma transação crítica, evitar misturar repositories globais com o `EntityManager` transacional.

---

## 9. Configuração do TypeORM

O NestJS utilizará configuração centralizada:

```ts
TypeOrmModule.forRoot({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  synchronize: false,
});
```

### Decisão

```text
synchronize = false
```

O schema será gerenciado por **migrations versionadas**.

Não utilizaremos `synchronize: true` como estratégia de gerenciamento de banco.

---

## 10. Banco de Dados

Tecnologia:

```text
PostgreSQL
```

Principais entidades:

```text
User
Event
Reservation
Payment
Ticket
```

A modelagem completa está definida em:

```text
docs/DATABASE.md
```

O banco será considerado a **fonte de verdade** da aplicação.

---

## 11. Integração com TMDb

A TMDb será utilizada como catálogo para auxiliar a criação de eventos.

```text
Organizador
     │
     ▼
Frontend
     │
     ▼
Backend
     │
     ▼
CatalogModule
     │
     ▼
TmdbProvider
     │
     ▼
TMDb API
```

Ao selecionar um filme:

```text
TMDb Movie
    │
    ▼
dados copiados
    │
    ▼
Event interno
    │
    ▼
PostgreSQL
```

Serão persistidos localmente dados relevantes, como:

```text
externalCatalogId
title
description
imageUrl
```

Depois da criação, o evento interno não dependerá da disponibilidade da TMDb para continuar funcionando.

---

## 12. Autenticação

A autenticação será baseada em:

```text
email + password
        ↓
JWT
```

O token deverá conter pelo menos:

```json
{
  "sub": "user-id",
  "role": "CUSTOMER"
}
```

As senhas serão armazenadas apenas como hash.

---

## 13. Autorização — RBAC

Será utilizado **Role-Based Access Control**.

Fluxo:

```text
Request
  │
  ▼
JwtAuthGuard
  │
  ▼
RolesGuard
  │
  ▼
Controller
```

Matriz inicial:

| Operação | Organizer | Customer | Gate |
|---|---:|---:|---:|
| Criar evento | ✅ | ❌ | ❌ |
| Publicar evento | ✅ | ❌ | ❌ |
| Listar eventos | ✅ | ✅ | ✅ |
| Criar reserva | ❌ | ✅ | ❌ |
| Ver meus ingressos | ❌ | ✅ | ❌ |
| Validar ingresso | ❌ | ❌ | ✅ |

---

## 14. Fluxo de Criação de Evento

```text
Organizador
      │
      ▼
Pesquisa filme
      │
      ▼
CatalogModule
      │
      ▼
TMDb
      │
      ▼
Seleciona filme
      │
      ▼
Informa:
- data
- local
- capacidade
- preço
      │
      ▼
EventsModule
      │
      ▼
Event DRAFT
      │
      ▼
Publicação
      │
      ▼
Event PUBLISHED
```

---

## 15. Fluxo de Reserva

```text
Customer
   │
   ▼
seleciona quantidade
   │
   ▼
ReservationsModule
   │
   ▼
verifica evento
   │
   ▼
inicia transação
   │
   ▼
bloqueia Event
   │
   ▼
verifica disponibilidade
   │
   ▼
processa pagamento
   │
   ▼
confirma reserva
   │
   ▼
emite N tickets
   │
   ▼
commit
```

Estados:

```text
PENDING_PAYMENT
PAID
PAYMENT_FAILED
CANCELLED
```

---

## 16. Concorrência e Overselling

Uma regra crítica é:

```text
confirmedTickets <= Event.capacity
```

Cenário:

```text
capacity = 100
sold = 99

Cliente A → 1 ingresso
Cliente B → 1 ingresso
```

Somente uma compra poderá ser confirmada.

### Estratégia

Utilizar transação + pessimistic lock no registro do evento.

Conceitualmente:

```ts
await this.dataSource.transaction(async (manager) => {
  const event = await manager
    .getRepository(Event)
    .createQueryBuilder('event')
    .setLock('pessimistic_write')
    .where('event.id = :eventId', { eventId })
    .getOneOrFail();

  // recalcular disponibilidade com o lock adquirido
});
```

Fluxo:

```text
BEGIN
  ↓
SELECT Event FOR UPDATE
  ↓
calcular vendidos
  ↓
sold + requested <= capacity?
  ├── não → ROLLBACK / EVENT_SOLD_OUT
  └── sim
        ↓
      confirmar compra
        ↓
      criar tickets
        ↓
      COMMIT
```

---

## 17. Pagamento

A cobrança será simulada e síncrona.

```text
Reservation
    │
    ▼
PaymentService
    │
    ▼
PaymentProvider
    │
    ▼
FakePaymentProvider
```

Resultado:

```text
          Payment
             │
       ┌─────┴─────┐
       │           │
   APPROVED     DECLINED
       │           │
       ▼           ▼
 reservation   reservation
    PAID       PAYMENT_FAILED
       │
       ▼
  emit tickets
```

Ingresso nunca será emitido após pagamento recusado.

---

## 18. Emissão de Ingressos

Após aprovação:

```text
Reservation PAID
       │
       ▼
TicketsService
       │
       ├── cria N Tickets
       ├── gera secureCode
       └── gera shareToken
```

Uma reserva de quantidade 3 resulta em:

```text
Reservation
quantity = 3
     │
     ├── Ticket A
     ├── Ticket B
     └── Ticket C
```

Cada ingresso possui ciclo de vida próprio.

---

## 19. Segurança do Ingresso

O código público de validação será diferente da chave primária.

```text
Ticket.id
   ≠
Ticket.secureCode
```

`secureCode` deverá ser imprevisível e único.

O QR Code será apenas a representação desse código seguro.

```text
secureCode
    │
    ▼
QR Code
    │
    ▼
GateModule
    │
    ▼
PostgreSQL
```

O QR Code não será considerado válido apenas por conseguir ser decodificado.

---

## 20. Compartilhamento

Cada ingresso terá um token independente de compartilhamento:

```text
/tickets/share/{shareToken}
```

O `shareToken` deverá:

- ser único;
- ser imprevisível;
- não expor um ID sequencial;
- ser diferente do `secureCode`.

---

## 21. Validação na Portaria

Fluxo:

```text
Gate User
   │
   ▼
Seleciona evento
   │
   ▼
QR / código manual
   │
   ▼
GateModule
   │
   ▼
Ticket existe?
   ├── não → INVALID
   │
   ▼
Evento correto?
   ├── não → WRONG_EVENT
   │
   ▼
Já utilizado?
   ├── sim → ALREADY_USED
   │
   ▼
VALID → USED
   │
   ▼
VALID
```

---

## 22. Prevenção de Dupla Validação

Duas requisições simultâneas não podem validar o mesmo ingresso.

```text
Gate A ───────┐
              ├── mesmo Ticket
Gate B ───────┘
```

Resultado esperado:

```text
A → VALID
B → ALREADY_USED
```

Nunca:

```text
A → VALID
B → VALID
```

### Estratégia

A alteração `VALID → USED` deverá ser atômica.

Pode ser implementada com `pessimistic_write`:

```ts
await this.dataSource.transaction(async (manager) => {
  const ticket = await manager
    .getRepository(Ticket)
    .createQueryBuilder('ticket')
    .setLock('pessimistic_write')
    .where('ticket.secureCode = :secureCode', { secureCode })
    .getOne();

  // validação e alteração de estado
});
```

Ou através de update condicional quando apropriado.

---

## 23. Tratamento de Erros

Formato conceitual:

```json
{
  "statusCode": 409,
  "code": "EVENT_SOLD_OUT",
  "message": "There are not enough tickets available"
}
```

Códigos de domínio sugeridos:

```text
INVALID_CREDENTIALS
FORBIDDEN
EVENT_NOT_FOUND
EVENT_NOT_PUBLISHED
EVENT_SOLD_OUT
PAYMENT_DECLINED
TICKET_NOT_FOUND
TICKET_ALREADY_USED
WRONG_EVENT
```

O frontend poderá utilizar `code` para determinar mensagens e comportamentos específicos.

---

## 24. Validação de Entrada

DTOs serão utilizados como fronteira de entrada.

Exemplos:

```text
quantity > 0
capacity > 0
price >= 0
email válido
startsAt válido
```

O backend deverá validar todos os dados recebidos, independentemente das validações existentes no frontend.

---

## 25. Configuração e Segredos

Variáveis previstas:

```text
DATABASE_URL
JWT_SECRET
TMDB_API_KEY
```

Nunca versionar valores reais.

Arquivos:

```text
.env           → ignorado
.env.example   → versionado
```

---

## 26. Migrations

O TypeORM será utilizado com migrations versionadas.

Estrutura:

```text
backend/
└── src/
    └── database/
        ├── data-source.ts
        ├── migrations/
        └── seeds/
```

Princípios:

- `synchronize: false`;
- migrations versionadas no Git;
- nenhuma alteração estrutural manual como fonte principal do schema;
- deploy deve executar migrations de forma controlada.

---

## 27. Ambiente Local

Inicialmente, o Docker Compose será responsável pelo PostgreSQL:

```text
docker-compose.yml
        │
        ▼
PostgreSQL
```

Frontend e backend poderão ser executados via Node.js durante o desenvolvimento.

Dockerização completa pode ser adicionada posteriormente.

---

## 28. Estrutura do Repositório

```text
elite-dev-events/
│
├── frontend/
│
├── backend/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── DECISIONS.md
│   └── AI_USAGE.md
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 29. Estratégia de Testes

Prioridade alta:

```text
Auth
RBAC
Overselling
Pagamento recusado
Emissão de ingressos
Validação única
Wrong event
```

Tipos:

```text
Unit Tests
Integration Tests
```

A prioridade não é 100% de cobertura, mas comprovar as regras de maior risco.

---

## 30. Observabilidade

Eventos importantes deverão produzir logs estruturados:

```text
login
event_created
event_published
reservation_created
payment_approved
payment_declined
ticket_created
ticket_validated
ticket_validation_failed
```

Nunca registrar:

- senha;
- JWT completo;
- secureCode completo quando desnecessário;
- dados sensíveis.

---

## 31. Decisões Arquiteturais

### ADR-001 — Monólito Modular

**Decisão:** monólito modular.

**Motivo:** menor complexidade operacional com boa separação de responsabilidades.

**Alternativa descartada:** microserviços.

---

### ADR-002 — PostgreSQL

**Decisão:** PostgreSQL.

**Motivo:** consistência, transações, constraints e locking são importantes para reserva e validação.

---

### ADR-003 — TypeORM

**Decisão:** TypeORM.

**Motivo:** integração natural com NestJS e controle explícito sobre repositories, transactions, migrations e locks.

---

### ADR-004 — Reserva por quantidade

**Decisão:** quantidade de ingressos no MVP.

**Motivo:** reduzir escopo e priorizar o fluxo completo.

**Alternativa:** mapa de assentos.

---

### ADR-005 — TMDb como catálogo

**Decisão:** integrar inicialmente apenas TMDb.

**Motivo:** uma integração é suficiente para cumprir o objetivo sem duplicar complexidade.

---

### ADR-006 — Fake Payment Provider

**Decisão:** abstração `PaymentProvider` com implementação simulada.

**Motivo:** manter a regra de negócio desacoplada do mecanismo de pagamento.

---

### ADR-007 — Validação server-side

**Decisão:** a leitura do QR não determina a validade.

**Motivo:** o estado persistido do ingresso é a fonte de verdade.

---

## 32. Princípios de Implementação

```text
Regra de negócio no backend

Frontend não é fronteira de segurança

Banco é a fonte de verdade

Operações críticas são atômicas

Dependências externas são abstraídas

Migrations são versionadas

synchronize: false

Simplicidade antes de abstração prematura

Fluxo completo antes de funcionalidades opcionais
```

---

## 33. Próximos Passos

```text
PRD.md
   ↓
ARCHITECTURE.md
   ↓
DATABASE.md
   ↓
API.md
   ↓
Implementação
```

Após esta arquitetura, o próximo passo é definir os contratos HTTP entre frontend e backend em `docs/API.md`.
