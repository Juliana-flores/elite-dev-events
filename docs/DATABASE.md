# Database Design — Elite Dev Events

## 1. Objetivo

Este documento define o modelo de persistência do **Elite Dev Events**, incluindo:

- entidades;
- relacionamentos;
- enums;
- constraints;
- índices;
- migrations;
- estratégia de concorrência;
- comportamento transacional;
- invariantes do domínio;
- dados iniciais.

O banco deverá preservar especialmente:

```text
confirmedTickets <= Event.capacity
```

e:

```text
um Ticket só pode passar de VALID para USED uma vez
```

---

## 2. Tecnologia

### Banco

```text
PostgreSQL
```

### ORM

```text
TypeORM
```

### Motivos

TypeORM foi escolhido por oferecer integração direta com NestJS e controle explícito sobre:

- entities;
- repositories;
- relacionamentos;
- migrations;
- transactions;
- `EntityManager`;
- `QueryRunner`;
- pessimistic locking;
- queries SQL quando necessário.

Essas capacidades são relevantes para as duas operações mais críticas:

```text
compra / controle de capacidade

validação única do ingresso
```

---

## 3. Modelo Conceitual

Entidades:

```text
User
Event
Reservation
Payment
Ticket
```

Relacionamentos:

```text
User (ORGANIZER)
      │
      └── cria
           │
           ▼
         Event
           │
           └── possui
                │
                ▼
           Reservation
                │
                ├── Payment
                │
                └── Ticket 1..N

User (CUSTOMER)
      │
      └── cria
           │
           ▼
      Reservation
```

Usuários `GATE` executam validações, mas não precisam possuir relação direta com os tickets no modelo do MVP.

---

## 4. Diagrama ER

```text
┌────────────────────┐
│        User        │
├────────────────────┤
│ id PK              │
│ name               │
│ email UNIQUE       │
│ passwordHash       │
│ role               │
│ createdAt          │
│ updatedAt          │
└─────────┬──────────┘
          │
          │ organizerId
          ▼
┌────────────────────┐
│       Event        │
├────────────────────┤
│ id PK              │
│ organizerId FK     │
│ externalCatalogId  │
│ title              │
│ description        │
│ imageUrl           │
│ startsAt           │
│ location           │
│ capacity           │
│ price              │
│ status             │
│ createdAt          │
│ updatedAt          │
└─────────┬──────────┘
          │
          │ eventId
          ▼
┌────────────────────┐
│    Reservation     │
├────────────────────┤
│ id PK              │
│ customerId FK      │
│ eventId FK         │
│ quantity           │
│ unitPrice          │
│ totalAmount        │
│ status             │
│ createdAt          │
│ updatedAt          │
└───────┬─────┬──────┘
        │     │
        │     └────────────────────┐
        ▼                          ▼
┌───────────────────┐    ┌────────────────────┐
│      Payment      │    │       Ticket       │
├───────────────────┤    ├────────────────────┤
│ id PK             │    │ id PK              │
│ reservationId FK  │    │ reservationId FK   │
│ amount            │    │ eventId FK         │
│ status            │    │ customerId FK      │
│ provider          │    │ secureCode UNIQUE  │
│ createdAt         │    │ shareToken UNIQUE  │
│ updatedAt         │    │ status             │
└───────────────────┘    │ validatedAt        │
                         │ createdAt           │
                         │ updatedAt           │
                         └────────────────────┘
```

---

## 5. Organização da Persistência

Estrutura prevista:

```text
backend/
└── src/
    ├── database/
    │   ├── data-source.ts
    │   ├── migrations/
    │   └── seeds/
    │
    └── modules/
        ├── users/
        │   └── entities/
        │       └── user.entity.ts
        │
        ├── events/
        │   └── entities/
        │       └── event.entity.ts
        │
        ├── reservations/
        │   └── entities/
        │       └── reservation.entity.ts
        │
        ├── payments/
        │   └── entities/
        │       └── payment.entity.ts
        │
        └── tickets/
            └── entities/
                └── ticket.entity.ts
```

---

## 6. Estratégia de Identificadores

Todas as entidades utilizarão UUID.

```ts
@PrimaryGeneratedColumn('uuid')
id: string;
```

Motivos:

- evitar enumeração trivial;
- manter padrão único entre entidades;
- facilitar geração independente;
- não depender de sequência global.

Mesmo assim:

```text
Ticket.id ≠ Ticket.secureCode
```

O identificador interno e o código público de validação terão responsabilidades distintas.

---

## 7. User

Campos:

```text
User
├── id
├── name
├── email
├── passwordHash
├── role
├── createdAt
└── updatedAt
```

Enum:

```ts
export enum UserRole {
  ORGANIZER = 'ORGANIZER',
  CUSTOMER = 'CUSTOMER',
  GATE = 'GATE',
}
```

Entity inicial:

```ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
  })
  role: UserRole;

  @OneToMany(() => Event, (event) => event.organizer)
  events: Event[];

  @OneToMany(
    () => Reservation,
    (reservation) => reservation.customer,
  )
  reservations: Reservation[];

  @OneToMany(() => Ticket, (ticket) => ticket.customer)
  tickets: Ticket[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
```

### Regras

```text
email UNIQUE

passwordHash nunca contém senha em texto puro
```

O email deverá ser normalizado antes de persistir:

```text
Juliana@Test.com
        ↓
juliana@test.com
```

---

## 8. Event

Representa um evento interno da aplicação.

Campos:

```text
Event
├── id
├── organizerId
├── externalCatalogId
├── title
├── description
├── imageUrl
├── startsAt
├── location
├── capacity
├── price
├── status
├── createdAt
└── updatedAt
```

Enum:

```ts
export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}
```

Entity:

```ts
@Entity('events')
@Index(['status', 'startsAt'])
@Index(['organizerId'])
@Check(`"capacity" > 0`)
@Check(`"price" >= 0`)
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizerId: string;

  @ManyToOne(() => User, (user) => user.events, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'organizerId' })
  organizer: User;

  @Column()
  externalCatalogId: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('text', { nullable: true })
  imageUrl: string | null;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column()
  location: string;

  @Column('integer')
  capacity: number;

  @Column('numeric', {
    precision: 10,
    scale: 2,
  })
  price: string;

  @Column({
    type: 'enum',
    enum: EventStatus,
    enumName: 'event_status',
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @OneToMany(
    () => Reservation,
    (reservation) => reservation.event,
  )
  reservations: Reservation[];

  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets: Ticket[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
```

### Snapshot da TMDb

Quando um filme é selecionado:

```text
TMDb
 ↓
Movie
 ↓
criação
 ↓
Event interno
```

Persistir:

```text
externalCatalogId
title
description
imageUrl
```

O evento passa a existir independentemente da TMDb.

---

## 9. Reservation

Representa a intenção de compra de uma quantidade de ingressos.

Campos:

```text
Reservation
├── id
├── customerId
├── eventId
├── quantity
├── unitPrice
├── totalAmount
├── status
├── createdAt
└── updatedAt
```

Enum:

```ts
export enum ReservationStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CANCELLED = 'CANCELLED',
}
```

Entity:

```ts
@Entity('reservations')
@Index(['customerId'])
@Index(['eventId'])
@Index(['status'])
@Check(`"quantity" > 0`)
@Check(`"unitPrice" >= 0`)
@Check(`"totalAmount" >= 0`)
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  customerId: string;

  @Column('uuid')
  eventId: string;

  @Column('integer')
  quantity: number;

  @Column('numeric', {
    precision: 10,
    scale: 2,
  })
  unitPrice: string;

  @Column('numeric', {
    precision: 12,
    scale: 2,
  })
  totalAmount: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    enumName: 'reservation_status',
    default: ReservationStatus.PENDING_PAYMENT,
  })
  status: ReservationStatus;

  @ManyToOne(
    () => User,
    (user) => user.reservations,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @ManyToOne(
    () => Event,
    (event) => event.reservations,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @OneToOne(
    () => Payment,
    (payment) => payment.reservation,
  )
  payment: Payment | null;

  @OneToMany(
    () => Ticket,
    (ticket) => ticket.reservation,
  )
  tickets: Ticket[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
```

### Snapshot de preço

O valor deve ser capturado no momento da reserva.

```text
Event.price = 50
        ↓
Reservation.unitPrice = 50
```

Se posteriormente o evento passar para R$ 60, a reserva continua com R$ 50.

```text
totalAmount = unitPrice × quantity
```

---

## 10. Payment

No MVP, uma reserva terá no máximo um pagamento.

Campos:

```text
Payment
├── id
├── reservationId
├── amount
├── status
├── provider
├── createdAt
└── updatedAt
```

Enum:

```ts
export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
}
```

Entity:

```ts
@Entity('payments')
@Index(['status'])
@Check(`"amount" >= 0`)
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  reservationId: string;

  @Column('numeric', {
    precision: 12,
    scale: 2,
  })
  amount: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    default: 'FAKE',
  })
  provider: string;

  @OneToOne(
    () => Reservation,
    (reservation) => reservation.payment,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
```

### Trade-off

```text
Reservation 1 ─── 1 Payment
```

Retries de pagamento não fazem parte do MVP.

Caso sejam adicionados futuramente, a unicidade de `reservationId` deverá ser revista e poderá surgir uma entidade `PaymentAttempt`.

---

## 11. Ticket

Cada ingresso será um registro independente.

```text
Reservation
quantity = 3
     │
     ├── Ticket A
     ├── Ticket B
     └── Ticket C
```

Isso permite:

- QR individual;
- compartilhamento individual;
- validação individual;
- estado individual.

Campos:

```text
Ticket
├── id
├── reservationId
├── eventId
├── customerId
├── secureCode
├── shareToken
├── status
├── validatedAt
├── createdAt
└── updatedAt
```

Enum:

```ts
export enum TicketStatus {
  VALID = 'VALID',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
}
```

Entity:

```ts
@Entity('tickets')
@Index(['reservationId'])
@Index(['eventId'])
@Index(['customerId'])
@Index(['status'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  reservationId: string;

  @Column('uuid')
  eventId: string;

  @Column('uuid')
  customerId: string;

  @Column({ unique: true })
  secureCode: string;

  @Column({ unique: true })
  shareToken: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    enumName: 'ticket_status',
    default: TicketStatus.VALID,
  })
  status: TicketStatus;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  validatedAt: Date | null;

  @ManyToOne(
    () => Reservation,
    (reservation) => reservation.tickets,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @ManyToOne(
    () => Event,
    (event) => event.tickets,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @ManyToOne(
    () => User,
    (user) => user.tickets,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
```

---

## 12. Redundância Controlada em Ticket

`Ticket` contém diretamente:

```text
reservationId
eventId
customerId
```

Mesmo sendo possível descobrir `eventId` e `customerId` através de `Reservation`.

Motivos:

- simplificar "Meus Ingressos";
- facilitar validação na portaria;
- permitir índices diretos;
- reduzir joins em operações críticas.

Invariantes:

```text
Ticket.eventId == Reservation.eventId

Ticket.customerId == Reservation.customerId
```

Esses valores serão derivados internamente durante a emissão e nunca enviados livremente pelo cliente.

---

## 13. Valores Monetários

PostgreSQL:

```text
NUMERIC(10,2)
NUMERIC(12,2)
```

TypeORM:

```ts
@Column('numeric', {
  precision: 10,
  scale: 2,
})
price: string;
```

Evitar:

```ts
price: number;
```

para não introduzir perda silenciosa de precisão.

A camada de domínio poderá posteriormente utilizar:

- `decimal.js`;
- transformer controlado;
- Value Object `Money`.

Isso não é obrigatório para o primeiro incremento.

---

## 14. Datas

Campos:

```text
startsAt
validatedAt
createdAt
updatedAt
```

serão armazenados como:

```text
TIMESTAMP WITH TIME ZONE
```

TypeORM:

```ts
@Column({ type: 'timestamptz' })
startsAt: Date;
```

Internamente, trabalhar com UTC e converter para o timezone de apresentação no frontend.

---

## 15. Constraints

### User

```text
email UNIQUE
```

### Event

```text
capacity > 0

price >= 0
```

### Reservation

```text
quantity > 0

unitPrice >= 0

totalAmount >= 0
```

### Payment

```text
amount >= 0

reservationId UNIQUE
```

### Ticket

```text
secureCode UNIQUE

shareToken UNIQUE
```

As constraints serão implementadas por decorators TypeORM e/ou migrations SQL quando necessário.

---

## 16. Índices

### User

```text
UNIQUE(email)
```

### Event

```text
INDEX(status, startsAt)

INDEX(organizerId)
```

Suporta:

```text
eventos publicados
eventos futuros
eventos do organizador
```

### Reservation

```text
INDEX(customerId)

INDEX(eventId)

INDEX(status)
```

### Payment

```text
UNIQUE(reservationId)

INDEX(status)
```

### Ticket

```text
UNIQUE(secureCode)

UNIQUE(shareToken)

INDEX(customerId)

INDEX(eventId)

INDEX(reservationId)

INDEX(status)
```

---

## 17. Integridade Referencial

```text
User.id
   │
   ├── Event.organizerId
   ├── Reservation.customerId
   └── Ticket.customerId

Event.id
   │
   ├── Reservation.eventId
   └── Ticket.eventId

Reservation.id
   │
   ├── Payment.reservationId
   └── Ticket.reservationId
```

O MVP utilizará `RESTRICT` para exclusões relacionadas a registros financeiros/operacionais relevantes.

A preferência é mudança de estado, não exclusão física.

---

## 18. Política de Exclusão

Evitar:

```sql
DELETE FROM events
```

Preferir:

```text
PUBLISHED
    ↓
CANCELLED
```

Aplica-se principalmente a:

```text
Event
Reservation
Payment
Ticket
```

Motivos:

- rastreabilidade;
- debugging;
- histórico;
- consistência.

---

## 19. Regra de Disponibilidade

A fonte de verdade de capacidade é:

```text
Event.capacity
```

Não será criado inicialmente:

```text
Event.availableTickets
```

como contador independente.

Disponibilidade:

```text
available = capacity - confirmedTickets
```

`confirmedTickets` corresponde aos ingressos efetivamente emitidos/confirmados.

---

## 20. Problema de Overselling

Estado:

```text
capacity = 100
sold = 99
```

Duas requisições:

```text
A → 1 ingresso
B → 1 ingresso
```

Sem sincronização:

```text
A lê sold = 99
B lê sold = 99

A confirma
B confirma

sold = 101
```

Inválido.

---

## 21. Estratégia de Concorrência na Compra

A linha do evento será utilizada como ponto de serialização.

TypeORM:

```ts
await dataSource.transaction(async (manager) => {
  const event = await manager
    .getRepository(Event)
    .createQueryBuilder('event')
    .setLock('pessimistic_write')
    .where('event.id = :eventId', { eventId })
    .getOneOrFail();

  // recalcular quantidade confirmada
  // validar capacidade
  // confirmar a operação
});
```

Equivalente conceitual:

```sql
SELECT *
FROM events
WHERE id = ?
FOR UPDATE;
```

Fluxo:

```text
BEGIN

bloquear Event

calcular confirmedTickets

IF confirmedTickets + requested > capacity
    ROLLBACK
    EVENT_SOLD_OUT

processar compra

COMMIT
```

---

## 22. Exemplo de Concorrência

```text
capacity = 100
sold = 99
```

Transaction A:

```text
lock Event
sold = 99
99 + 1 <= 100
confirm
COMMIT
```

Transaction B:

```text
aguarda lock
        ↓
adquire após A
        ↓
sold = 100
100 + 1 <= 100
FALSE
        ↓
ROLLBACK
EVENT_SOLD_OUT
```

Resultado:

```text
100 ingressos
```

Nunca:

```text
101
```

---

## 23. Pagamento Simulado

No MVP:

```text
simulado
síncrono
interno
```

Fluxo:

```text
Reservation
     │
     ▼
FakePaymentProvider
     │
 ┌───┴────────┐
 │            │
DECLINED    APPROVED
 │            │
 ▼            ▼
falha      confirmação
```

Como não existe chamada financeira externa real, podemos manter o fluxo de confirmação mais simples.

---

## 24. Emissão Atômica de Ingressos

Uma reserva paga deve possuir exatamente a quantidade esperada de tickets.

```text
Reservation.quantity = 3
```

Transação:

```text
BEGIN

Reservation → PAID
Payment → APPROVED

INSERT Ticket A
INSERT Ticket B
INSERT Ticket C

COMMIT
```

Se a criação de um ticket falhar:

```text
ROLLBACK
```

Não deverá existir:

```text
Reservation.quantity = 3
Tickets = 2
```

---

## 25. Validação do Ingresso

Entrada:

```text
eventId
secureCode
```

Regras:

```text
Ticket não existe
→ INVALID

Ticket.eventId != eventId
→ WRONG_EVENT

Ticket.status == USED
→ ALREADY_USED

Ticket.status == VALID
→ marcar USED
→ VALID
```

---

## 26. Concorrência na Portaria

Problema:

```text
Gate A ───────┐
              ├── mesmo secureCode
Gate B ───────┘
```

Sem lock:

```text
A lê VALID
B lê VALID

A altera USED
B altera USED

A → VALID
B → VALID
```

Inválido.

---

## 27. Estratégia de Validação Atômica

Opção principal:

```ts
await dataSource.transaction(async (manager) => {
  const ticket = await manager
    .getRepository(Ticket)
    .createQueryBuilder('ticket')
    .setLock('pessimistic_write')
    .where('ticket.secureCode = :secureCode', {
      secureCode,
    })
    .getOne();

  if (!ticket) {
    // INVALID
  }

  // validar eventId e status
  // atualizar para USED
});
```

Outra opção possível é update condicional:

```sql
UPDATE tickets
SET
  status = 'USED',
  validated_at = NOW()
WHERE
  secure_code = ?
  AND event_id = ?
  AND status = 'VALID';
```

Se:

```text
affected = 1
```

a transição ocorreu.

Se:

```text
affected = 0
```

o serviço consulta o ticket para distinguir:

```text
INVALID
WRONG_EVENT
ALREADY_USED
```

---

## 28. Invariante de Validação

```text
VALID
  ↓
USED
```

A transição acontece no máximo uma vez.

No MVP:

```text
USED → VALID
```

não existe.

---

## 29. DataSource

Configuração conceitual para migrations:

```ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.{ts,js}'],
  migrations: ['src/database/migrations/*.{ts,js}'],
  synchronize: false,
});
```

---

## 30. Integração com NestJS

Configuração:

```ts
TypeOrmModule.forRoot({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  synchronize: false,
});
```

Nos módulos:

```ts
TypeOrmModule.forFeature([
  Event,
  Reservation,
]);
```

Injeção:

```ts
constructor(
  @InjectRepository(Event)
  private readonly eventRepository: Repository<Event>,
) {}
```

Para operações transacionais:

```ts
constructor(
  private readonly dataSource: DataSource,
) {}
```

---

## 31. Migrations

Estrutura:

```text
backend/
└── src/
    └── database/
        ├── data-source.ts
        ├── migrations/
        │   ├── 001-create-users.ts
        │   ├── 002-create-events.ts
        │   ├── 003-create-reservations.ts
        │   ├── 004-create-payments.ts
        │   └── 005-create-tickets.ts
        │
        └── seeds/
            └── seed.ts
```

Regras:

```text
synchronize: false

schema alterado por migration

migrations versionadas no Git
```

Nenhuma alteração manual no banco será considerada fonte oficial do schema.

---

## 32. Seed

Criar:

```text
1 ORGANIZER
2 CUSTOMER
1 GATE
1 Event PUBLISHED
```

Exemplo de usuários:

```text
organizer@elite.dev
customer1@elite.dev
customer2@elite.dev
gate@elite.dev
```

As senhas serão armazenadas como hash.

As credenciais de teste poderão ser documentadas no README.

Evento inicial:

```text
status = PUBLISHED
capacity > 0
startsAt no futuro
price > 0
```

---

## 33. synchronize

Não utilizar:

```ts
synchronize: true
```

como estratégia de evolução do banco.

Utilizar:

```ts
synchronize: false
```

Motivos:

- previsibilidade;
- rastreabilidade;
- migrations revisáveis;
- segurança de deploy;
- histórico da evolução do schema.

---

## 34. Dados que Não Devem Ser Versionados

Nunca versionar:

```text
DATABASE_URL real
JWT_SECRET
TMDB_API_KEY
senhas reais
tokens
dumps sensíveis
```

Utilizar:

```text
.env
```

ignorado no Git.

Versionar:

```text
.env.example
```

sem valores secretos.

---

## 35. Validações de Aplicação

Algumas regras não pertencem apenas ao banco:

```text
Event.organizer.role == ORGANIZER

Reservation.customer.role == CUSTOMER

Event.status == PUBLISHED

quantity > 0

evento ainda está disponível para compra

Payment.amount == Reservation.totalAmount

Ticket.eventId == Reservation.eventId

Ticket.customerId == Reservation.customerId
```

DTOs, services e transactions deverão preservar essas regras.

---

## 36. Invariantes do Domínio

### INV-001

```text
Event.capacity > 0
```

### INV-002

```text
Reservation.quantity > 0
```

### INV-003

```text
confirmedTickets <= Event.capacity
```

### INV-004

```text
Ticket só é emitido quando Payment == APPROVED
```

### INV-005

Para reserva paga:

```text
Reservation.quantity ==
número de Tickets emitidos
```

### INV-006

```text
Ticket.secureCode UNIQUE
```

### INV-007

```text
Ticket.shareToken UNIQUE
```

### INV-008

```text
Ticket VALID → USED
```

acontece no máximo uma vez.

### INV-009

```text
Ticket.eventId ==
Reservation.eventId
```

### INV-010

```text
Ticket.customerId ==
Reservation.customerId
```

---

## 37. Trade-offs

### Sem Inventory Hold

Não teremos inicialmente:

```text
expiresAt
inventoryHold
reservation expiration worker
```

Motivo:

o pagamento é simulado e imediato.

### Sem Venue

`location` será texto.

Não teremos:

```text
Venue
Address
City
```

no MVP.

### Sem múltiplas tentativas de pagamento

```text
Reservation 1 → 1 Payment
```

### Sem auditoria genérica

Não será criada uma tabela `AuditLog` nesta primeira versão.

Eventos críticos serão registrados através de logs.

---

## 38. Evoluções Possíveis

Fora do MVP:

```text
Venue
Seat
Sector
ReservationHold
PaymentAttempt
Refund
TicketTransfer
AuditLog
```

Essas entidades serão adicionadas apenas quando uma necessidade real justificar a complexidade adicional.

---

## 39. Resultado Esperado

A persistência deverá suportar:

```text
Customer
    │
    ▼
Reservation
    │
    ▼
Payment
    │
    ▼
N Tickets
    │
    ▼
QR individual
    │
    ▼
Validação atômica
```

preservando:

```text
não vender acima da capacidade
```

e:

```text
não validar o mesmo ingresso duas vezes
```
