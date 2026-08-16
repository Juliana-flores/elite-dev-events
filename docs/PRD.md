# Product Requirements Document — Elite Dev Events

## 1. Visão do Produto

O **Elite Dev Events** é uma plataforma web de eventos e ingressos.

A aplicação deve permitir que:

- um **Organizador** crie e publique eventos a partir de um catálogo externo;
- um **Cliente** encontre eventos, reserve ingressos, realize um pagamento simulado e receba um ingresso digital;
- um usuário de **Portaria** valide o ingresso apresentado na entrada do evento.

O fluxo principal do produto é:

```text
Catálogo externo
      ↓
Criação do evento
      ↓
Publicação
      ↓
Reserva
      ↓
Pagamento
      ↓
Emissão do ingresso
      ↓
QR Code
      ↓
Validação na portaria
```

---

## 2. Objetivo

Entregar uma aplicação funcional de ponta a ponta que demonstre:

- entendimento do problema;
- modelagem consistente das regras de negócio;
- organização arquitetural;
- segurança básica;
- tratamento de concorrência;
- integração com serviço externo;
- boa experiência de uso;
- documentação das decisões tomadas durante o desenvolvimento.

O foco do MVP será a **completude do fluxo principal**, evitando adicionar funcionalidades que comprometam a entrega do núcleo da aplicação.

---

## 3. Perfis de Usuário

A aplicação terá três perfis.

### 3.1 Organizador

Responsável pela criação e gerenciamento dos eventos.

Pode:

- autenticar-se;
- pesquisar conteúdos no catálogo externo;
- criar eventos;
- definir data, horário, local, capacidade e preço;
- publicar eventos;
- visualizar e gerenciar seus eventos.

### 3.2 Cliente

Responsável pela reserva e compra de ingressos.

Pode:

- autenticar-se;
- visualizar eventos publicados;
- pesquisar eventos;
- visualizar detalhes;
- selecionar quantidade de ingressos;
- criar reserva;
- realizar pagamento simulado;
- visualizar seus ingressos;
- acessar o QR Code;
- compartilhar um ingresso por link.

### 3.3 Portaria

Responsável pela validação dos ingressos na entrada do evento.

Pode:

- autenticar-se;
- selecionar o evento em atendimento;
- escanear QR Code;
- informar manualmente o código do ingresso;
- validar ingressos;
- visualizar o resultado da validação.

---

## 4. Escopo do MVP

O MVP contempla:

- autenticação;
- autorização baseada em papéis;
- integração com catálogo externo;
- criação e publicação de eventos;
- listagem de eventos publicados;
- detalhes do evento;
- busca por nome;
- reserva por quantidade de ingressos;
- controle de capacidade;
- pagamento simulado;
- emissão de ingresso;
- geração de QR Code;
- área "Meus Ingressos";
- compartilhamento por link;
- leitura de QR Code pela câmera;
- entrada manual do código;
- validação do ingresso;
- proteção contra utilização duplicada.

---

## 5. Decisões de Escopo

### 5.1 Catálogo externo

Para o MVP será utilizada a **TMDb API**.

O catálogo externo será utilizado apenas como fonte de informações para auxiliar a criação do evento.

Ao selecionar um filme, o organizador cria uma entidade interna de evento contendo informações próprias da plataforma.

Exemplo:

```text
TMDb
 ↓
Filme
 ↓
Organizador seleciona
 ↓
Criação do Event interno
```

A indisponibilidade futura da TMDb não deverá remover eventos já cadastrados internamente.

### 5.2 Modelo de ingressos

O MVP utilizará **ingressos por quantidade**, em vez de mapa de assentos.

Exemplo:

```text
Disponíveis: 100

Quantidade:
[-] 2 [+]

Preço unitário: R$ 50,00
Total: R$ 100,00
```

Mapa de assentos poderá ser implementado posteriormente como funcionalidade opcional.

### 5.3 Pagamento

O pagamento será simulado pela aplicação.

Deverão existir pelo menos dois resultados:

```text
APPROVED
DECLINED
```

Não haverá transação financeira real.

---

# 6. Requisitos Funcionais

## RF-001 — Autenticação

O sistema deve permitir login de usuários cadastrados.

Cada usuário deverá possuir um papel:

```text
ORGANIZER
CUSTOMER
GATE
```

### Critérios de aceite

- credenciais válidas autenticam o usuário;
- credenciais inválidas são rejeitadas;
- rotas protegidas exigem autenticação;
- o backend identifica o usuário autenticado em cada requisição protegida.

---

## RF-002 — Autorização por perfil

O sistema deve restringir funcionalidades de acordo com o papel do usuário.

### Exemplos

Um cliente não pode:

- criar eventos;
- editar eventos;
- validar ingressos.

Um usuário de portaria não pode:

- publicar eventos;
- realizar reservas.

---

## RF-003 — Consultar catálogo externo

O Organizador deve poder pesquisar filmes utilizando a TMDb.

Dados relevantes:

- identificador externo;
- título;
- descrição;
- imagem;
- data de lançamento.

Falhas na API externa devem ser tratadas sem causar erro não controlado na aplicação.

---

## RF-004 — Criar evento

O Organizador deve poder criar um evento utilizando um item do catálogo externo.

Deve informar:

- data;
- horário;
- local;
- capacidade;
- preço.

O evento deverá ser associado ao Organizador que o criou.

---

## RF-005 — Publicar evento

Eventos recém-criados podem permanecer em estado de rascunho.

Estados mínimos:

```text
DRAFT
PUBLISHED
```

Somente eventos `PUBLISHED` poderão ser visualizados pelos clientes.

---

## RF-006 — Listar eventos

Clientes devem conseguir visualizar eventos publicados.

Cada evento deverá apresentar pelo menos:

- imagem;
- nome;
- data;
- local;
- preço.

---

## RF-007 — Buscar eventos

Clientes devem conseguir pesquisar eventos pelo nome.

Filtros adicionais podem ser implementados posteriormente.

---

## RF-008 — Visualizar detalhes do evento

A página do evento deverá exibir:

- título;
- imagem;
- descrição;
- data;
- horário;
- local;
- preço;
- quantidade disponível;
- seleção da quantidade de ingressos.

---

## RF-009 — Criar reserva

O Cliente deve poder reservar uma quantidade de ingressos.

Dados mínimos:

```text
eventId
quantity
```

### Regras

- a quantidade deve ser maior que zero;
- o evento precisa estar publicado;
- deve existir disponibilidade;
- a reserva deve pertencer ao usuário autenticado.

---

## RF-010 — Controlar capacidade

O sistema não poderá vender mais ingressos do que a capacidade definida para o evento.

Regra:

```text
soldTickets + requestedTickets <= capacity
```

A aplicação deve impedir condições de corrida.

Exemplo:

```text
Capacidade: 100
Vendidos: 99

Cliente A compra 1
Cliente B compra 1 simultaneamente

Resultado:

um pagamento pode prosseguir
o outro deve receber indisponibilidade

Nunca:

101 ingressos vendidos
```

---

## RF-011 — Processar pagamento

A aplicação deverá executar um pagamento simulado.

Possíveis resultados:

```text
APPROVED
DECLINED
```

Se aprovado:

```text
Reserva
   ↓
Pagamento aprovado
   ↓
Ingresso emitido
```

Se recusado:

```text
Reserva
   ↓
Pagamento recusado
   ↓
Nenhum ingresso emitido
```

---

## RF-012 — Emitir ingresso

Ingressos deverão ser criados somente após confirmação do pagamento.

Cada ingresso será associado a:

- cliente;
- evento;
- reserva.

---

## RF-013 — Gerar código seguro

Cada ingresso deverá possuir um código não previsível.

Não utilizar identificadores sequenciais como mecanismo de segurança.

Exemplo aceitável:

```text
UUID aleatório
```

ou:

```text
token criptograficamente seguro
```

---

## RF-014 — Gerar QR Code

O sistema deverá gerar um QR Code correspondente ao código seguro do ingresso.

O QR Code será utilizado pela portaria para iniciar a validação.

---

## RF-015 — Meus Ingressos

Clientes devem possuir uma área chamada **Meus Ingressos**.

Cada ingresso deve apresentar:

- evento;
- data;
- local;
- status;
- QR Code.

---

## RF-016 — Compartilhar ingresso

O Cliente deve conseguir gerar ou utilizar um link compartilhável.

Exemplo conceitual:

```text
/tickets/share/{shareToken}
```

O token não deverá ser previsível.

---

## RF-017 — Validar ingresso

A Portaria deve conseguir validar o ingresso utilizando:

1. leitura do QR Code pela câmera;
2. código informado manualmente.

---

## RF-018 — Resultado da validação

A validação deverá retornar claramente um dos seguintes resultados:

```text
VALID
INVALID
ALREADY_USED
WRONG_EVENT
```

### VALID

Ingresso existe, pertence ao evento e ainda não foi utilizado.

### INVALID

Código não corresponde a um ingresso válido.

### ALREADY_USED

Ingresso já foi validado anteriormente.

### WRONG_EVENT

Ingresso existe, porém pertence a outro evento.

---

## RF-019 — Uso único do ingresso

Um ingresso validado não poderá ser utilizado novamente.

Primeira validação:

```text
VALID
```

Após a validação:

```text
status = USED
validatedAt = current timestamp
```

Segunda tentativa:

```text
ALREADY_USED
```

A alteração deverá ser protegida contra requisições concorrentes.

---

# 7. Requisitos Não Funcionais

## RNF-001 — Segurança

- senhas devem ser armazenadas utilizando hash;
- endpoints protegidos exigem autenticação;
- autorização deve ocorrer também no backend;
- tokens de ingressos não devem ser previsíveis;
- entradas do usuário devem ser validadas;
- informações sensíveis não devem ser expostas em respostas da API.

## RNF-002 — Integridade de dados

Operações críticas deverão preservar consistência, principalmente:

- reserva;
- controle de estoque;
- pagamento;
- emissão de ingresso;
- validação.

## RNF-003 — Concorrência

A aplicação deve impedir:

- overselling;
- dupla validação de ingresso.

## RNF-004 — Tratamento de erros

A aplicação deverá tratar pelo menos:

- falha na API externa;
- usuário não autorizado;
- evento inexistente;
- evento não publicado;
- capacidade insuficiente;
- pagamento recusado;
- ingresso inexistente;
- ingresso já utilizado;
- ingresso pertencente a outro evento.

## RNF-005 — Responsividade

A aplicação deverá funcionar adequadamente em desktop e dispositivos móveis.

A tela de portaria deverá ser especialmente adequada para uso em smartphones.

---

# 8. Modelo de Domínio Inicial

Entidades principais:

```text
User
Event
Reservation
Payment
Ticket
```

Relacionamento conceitual:

```text
User (Organizer)
      │
      └── Event
            │
            └── Reservation
                  │
                  ├── Payment
                  │
                  └── Ticket

User (Customer)
      │
      └── Reservation
```

A modelagem definitiva será documentada em `docs/DATABASE.md`.

---

# 9. Stack Proposta

## Frontend

```text
Next.js
React
TypeScript
```

## Backend

```text
Node.js
NestJS
TypeScript
```

## Banco de dados

```text
PostgreSQL
```

## ORM

```text
TypeORM
```

## Autenticação

```text
JWT
```

## API externa

```text
TMDb API
```

## Ambiente local

```text
Docker Compose
```

As escolhas desta seção são decisões do projeto e não requisitos obrigatórios do desafio, exceto pelas restrições gerais de tecnologia informadas no enunciado.

---

# 10. Dados de Teste

A aplicação deverá fornecer dados iniciais para avaliação.

Criar via seed:

- 1 Organizador;
- 2 Clientes;
- 1 usuário de Portaria;
- pelo menos 1 evento publicado;
- ingressos disponíveis no evento.

Credenciais de teste deverão ser documentadas no README.

---

# 11. Fluxos Críticos

## Organizador

```text
Login
 ↓
Consultar TMDb
 ↓
Selecionar filme
 ↓
Criar evento
 ↓
Definir data/local/capacidade/preço
 ↓
Publicar
```

## Cliente — pagamento aprovado

```text
Login
 ↓
Visualizar eventos
 ↓
Selecionar evento
 ↓
Escolher quantidade
 ↓
Reservar
 ↓
Pagamento APPROVED
 ↓
Ingresso
 ↓
QR Code
```

## Cliente — pagamento recusado

```text
Reserva
 ↓
Pagamento DECLINED
 ↓
Mensagem de recusa
 ↓
Nenhum ingresso emitido
```

## Portaria

```text
Login
 ↓
Selecionar evento
 ↓
Escanear QR
 ↓
VALID
 ↓
Ingresso marcado como USED
```

## Tentativa de reutilização

```text
Ingresso USED
 ↓
Nova validação
 ↓
ALREADY_USED
```

## Evento incorreto

```text
Ingresso do Evento A
 ↓
Validação no Evento B
 ↓
WRONG_EVENT
```

---

# 12. Critérios de Aceite do MVP

- [ ] usuário consegue fazer login;
- [ ] aplicação diferencia os três papéis;
- [ ] Organizador consulta a TMDb;
- [ ] Organizador cria evento;
- [ ] Organizador publica evento;
- [ ] Cliente visualiza eventos publicados;
- [ ] Cliente pesquisa eventos;
- [ ] Cliente visualiza detalhes;
- [ ] Cliente seleciona quantidade;
- [ ] Cliente cria reserva;
- [ ] sistema impede venda acima da capacidade;
- [ ] pagamento pode ser aprovado;
- [ ] pagamento pode ser recusado;
- [ ] pagamento recusado não gera ingresso;
- [ ] pagamento aprovado gera ingresso;
- [ ] ingresso possui QR Code;
- [ ] Cliente visualiza "Meus Ingressos";
- [ ] ingresso possui link de compartilhamento;
- [ ] Portaria consegue escanear QR Code;
- [ ] Portaria consegue digitar código manualmente;
- [ ] ingresso válido retorna `VALID`;
- [ ] código inválido retorna `INVALID`;
- [ ] ingresso utilizado retorna `ALREADY_USED`;
- [ ] ingresso de outro evento retorna `WRONG_EVENT`;
- [ ] o mesmo ingresso não pode ser validado duas vezes.

---

# 13. Fora do Escopo

Não faz parte do MVP:

- nota fiscal;
- revenda de ingressos;
- aplicativo nativo;
- recuperação de senha;
- envio de ingresso por e-mail;
- pagamento financeiro real;
- mapa de assentos.

---

# 14. Funcionalidades Opcionais

Após o fluxo principal estar completo:

### Prioridade P1

- filtros avançados;
- testes automatizados;
- Docker Compose;
- dashboard do Organizador;
- melhor tratamento de estados e erros.

### Prioridade P2

- cancelamento;
- devolução de ingresso ao estoque;
- mapa de assentos;
- disponibilidade em tempo real;
- melhorias avançadas de UI/UX.

---

# 15. Documentação do Projeto

A documentação será organizada em:

```text
docs/
├── PRD.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── DECISIONS.md
└── AI_USAGE.md
```

### PRD.md

Define o produto e seus requisitos.

### ARCHITECTURE.md

Documenta arquitetura, componentes e decisões estruturais.

### DATABASE.md

Documenta entidades, relacionamentos e decisões de persistência.

### API.md

Define contratos e endpoints da API.

### DECISIONS.md

Registra decisões arquiteturais relevantes e seus trade-offs.

### AI_USAGE.md

Registra como ferramentas de IA foram utilizadas durante o desenvolvimento.

---

# 16. Estratégia de Implementação

Prioridade:

```text
P0 — necessário para o MVP
P1 — importante
P2 — diferencial
```

Ordem prevista:

```text
1. Requisitos
2. Arquitetura
3. Modelo de domínio
4. Banco de dados
5. Contratos da API
6. Setup dos projetos
7. Autenticação
8. Integração TMDb
9. Gestão de eventos
10. Reserva
11. Controle de capacidade
12. Pagamento
13. Ingressos
14. QR Code
15. Compartilhamento
16. Portaria
17. Testes
18. Refinamento da interface
19. Deploy
```

---

# 17. Definição de Sucesso

O MVP será considerado concluído quando um avaliador conseguir executar sem intervenção manual o fluxo:

```text
Organizador cria evento
          ↓
Organizador publica
          ↓
Cliente encontra evento
          ↓
Cliente reserva
          ↓
Pagamento é aprovado
          ↓
Ingresso é emitido
          ↓
QR Code é apresentado
          ↓
Portaria valida
          ↓
Ingresso é marcado como usado
          ↓
Nova tentativa é rejeitada
```

A prioridade do projeto será sempre manter esse fluxo completo e consistente antes de adicionar funcionalidades opcionais.
