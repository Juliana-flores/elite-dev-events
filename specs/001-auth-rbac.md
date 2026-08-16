# SPEC-001 — Authentication and RBAC

## Source requirements

```text
RF-001 — Autenticação
RF-002 — Controle por papel
```

## Goal

Permitir login seguro e proteger endpoints de acordo com:

```text
ORGANIZER
CUSTOMER
GATE
```

## Dependencies

```text
User entity
PostgreSQL
TypeORM
```

Nenhuma feature de negócio anterior é necessária.

---

## In scope

- User entity e migration;
- seed inicial dos quatro usuários exigidos;
- password hashing;
- login por email/password;
- JWT;
- `GET /auth/me`;
- `JwtAuthGuard`;
- decorator/guard de roles;
- tratamento de `401` e `403`;
- sessão básica no frontend;
- redirecionamento/experiência por role.

## Out of scope

- cadastro público;
- password recovery;
- refresh token;
- OAuth;
- MFA.

---

## Business rules

### BR-001

Email é único.

### BR-002

Senha nunca é persistida em texto puro.

### BR-003

JWT deve conter:

```text
sub
role
```

### BR-004

Role é validada no backend.

### BR-005

Frontend pode esconder ações, mas isso não substitui guard.

---

## API contracts

### POST `/api/v1/auth/login`

Request:

```json
{
  "email": "customer1@elite.dev",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "name": "Customer One",
    "email": "customer1@elite.dev",
    "role": "CUSTOMER"
  }
}
```

### GET `/api/v1/auth/me`

Bearer token obrigatório.

---

## Database impact

Criar:

```text
users
```

Campos conforme `docs/DATABASE.md`.

Migration obrigatória.

Seed:

```text
1 ORGANIZER
2 CUSTOMER
1 GATE
```

---

## Backend tasks

- [ ] configurar TypeORM;
- [ ] criar `User` entity;
- [ ] migration `users`;
- [ ] criar seed;
- [ ] implementar hashing;
- [ ] implementar `AuthService`;
- [ ] implementar login;
- [ ] implementar JWT strategy;
- [ ] implementar `JwtAuthGuard`;
- [ ] implementar `@Roles`;
- [ ] implementar `RolesGuard`;
- [ ] implementar `/auth/me`;
- [ ] padronizar erros de auth;
- [ ] documentar Swagger.

---

## Frontend tasks

- [ ] tela de login;
- [ ] chamada para `/auth/login`;
- [ ] armazenamento da sessão conforme estratégia escolhida;
- [ ] estado do usuário autenticado;
- [ ] proteção de rotas/telas;
- [ ] tratamento de credenciais inválidas.

---

## Tests

### Unit

- hash/validation de senha;
- login válido;
- login inválido;
- RolesGuard.

### Integration

- usuário seeded consegue autenticar;
- rota protegida sem token retorna `401`;
- role errada retorna `403`;
- `/auth/me` retorna usuário correto;
- `passwordHash` nunca aparece na resposta.

---

## Acceptance criteria

- [ ] organizer autentica;
- [ ] customer autentica;
- [ ] gate autentica;
- [ ] credenciais inválidas retornam `401 INVALID_CREDENTIALS`;
- [ ] endpoint protegido rejeita usuário anônimo;
- [ ] endpoint role-protected rejeita role incorreta;
- [ ] JWT identifica `sub` e `role`;
- [ ] senha no banco está hasheada;
- [ ] frontend possui fluxo funcional de login.

---

## Definition of Done

Todos os acceptance criteria atendidos, migrations aplicáveis do zero, seed executável, testes relevantes passando e Swagger atualizado.
