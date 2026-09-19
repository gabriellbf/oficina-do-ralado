# Oficina do Ralado — site institucional e painel do proprietário

Projeto de extensão do curso de **Análise e Desenvolvimento de Sistemas**, desenvolvido para a
**Oficina do Ralado**, borracharia e oficina de pequenos serviços automotivos localizada no bairro
Santa Amélia, em Belo Horizonte (MG).

O objetivo é dar presença digital à empresa: divulgar serviços e preços, facilitar o contato pelo
WhatsApp e permitir que o próprio proprietário, **Sr. Renê Ribeiro Soares**, atualize os preços do
site pelo celular, sem depender de ninguém.

| Dado | Valor |
| --- | --- |
| Empresa | Oficina do Ralado |
| Ramo | Baterias • Pneus • Serviços • Lâmpadas de farol |
| Proprietário | Renê Ribeiro Soares |
| Endereço | Av. Guarapari, 546 – Loja 03, Santa Amélia, Belo Horizonte – MG, CEP 31800-500 |
| WhatsApp | (31) 99982-5481 |
| CNPJ | 22.072.206/0001-60 |

---

## 1. Tecnologias utilizadas

| Camada | Tecnologia | Por que foi escolhida |
| --- | --- | --- |
| Servidor | **Node.js 20+** com **Express 5** | Simples, gratuito e roda em qualquer hospedagem |
| Front-end | **HTML5 + CSS3 + JavaScript puro** | Sem framework: menos peso, mais fácil de explicar e de manter |
| Banco de dados | **SQLite** com `better-sqlite3` | Um único arquivo, sem servidor de banco para configurar |
| Senhas | `bcrypt` | Guarda a senha como *hash*, nunca em texto puro |
| Sessão | `express-session` | Cookie `httpOnly`, `sameSite=lax` e `secure` em produção |
| Proteção HTTP | `helmet` | Cabeçalhos de segurança (CSP, nosniff, anti-clickjacking) |
| Força bruta | `express-rate-limit` | Máximo de 5 tentativas de login a cada 15 minutos |
| Testes | **Jest + Supertest** | 85 testes automatizados cobrindo API, login e segurança |
| Evidências | **Playwright** | Gera os prints das telas automaticamente |

O layout usa as cores da fachada da loja: **azul-marinho `#1F2A6B`** e **amarelo `#F5C400`**.

---

## 2. Como instalar e rodar

Pré-requisito: [Node.js 20 ou superior](https://nodejs.org).

```bash
npm install
cp .env.example .env
npm run seed
npm start
```

No Windows (PowerShell), troque o `cp` por:

```bash
copy .env.example .env
```

Depois abra no navegador:

- Site: <http://localhost:3000>
- Painel do proprietário: <http://localhost:3000/admin/login.html>

O usuário e a senha do painel são os que estiverem no arquivo `.env`
(`ADMIN_USER` e `ADMIN_PASSWORD`).

### Variáveis de ambiente (`.env`)

| Variável | Para que serve | Exemplo |
| --- | --- | --- |
| `PORT` | Porta em que o site roda | `3000` |
| `SESSION_SECRET` | Segredo que assina o cookie de sessão | valor aleatório longo |
| `ADMIN_USER` | Usuário do painel | `admin` |
| `ADMIN_PASSWORD` | Senha do painel (usada pelo `npm run seed`) | senha forte |
| `DATABASE_PATH` | Caminho do arquivo do banco | `./data/oficina.db` |

> ⚠️ O arquivo `.env` contém senhas e **nunca deve ser enviado ao GitHub**. Ele já está no `.gitignore`.
> Para gerar um `SESSION_SECRET` seguro:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Outros comandos

| Comando | O que faz |
| --- | --- |
| `npm start` | Sobe o site |
| `npm run dev` | Sobe o site reiniciando sozinho a cada alteração |
| `npm run seed` | Cria as tabelas e insere os dados de exemplo |
| `npm test` | Roda os 85 testes automatizados |
| `npm run test:coverage` | Roda os testes e mostra a cobertura de código |
| `npm run screenshots` | Gera os prints das telas em `docs/prints/` |

---

## 3. Estrutura de pastas

```
oficina-do-ralado/
├── config/
│   └── empresa.js            Dados da empresa (endereço, horário, pagamentos, WhatsApp)
├── src/
│   ├── server.js             Ponto de entrada: sobe o servidor e roda o seed se preciso
│   ├── app.js                Monta o Express (helmet, sessão, rotas, arquivos estáticos)
│   ├── db.js                 Abre o SQLite e cria as tabelas
│   ├── seed.js               Dados de exemplo + criação do usuário administrador
│   ├── validacao.js          Valida TUDO que chega do navegador
│   ├── repositorio.js        Consultas SQL (sempre parametrizadas)
│   ├── middlewares/
│   │   └── autenticacao.js   Bloqueia /api/admin/* sem sessão
│   └── rotas/
│       ├── publicas.js       GET /api/empresa, /api/produtos, /api/servicos
│       ├── autenticacao.js   POST /api/login, /api/logout, GET /api/sessao
│       └── admin.js          CRUD protegido de produtos e serviços
├── public/                   Tudo o que o navegador baixa
│   ├── index.html            RF01 — Início
│   ├── servicos.html         RF02 — Serviços
│   ├── catalogo.html         RF03 — Catálogo com filtro e busca
│   ├── contato.html          RF04 — Contato, mapa e pagamentos
│   ├── css/estilo.css        Estilo do site (mobile-first)
│   ├── js/                   comum.js, catalogo.js, servicos.js
│   ├── img/                  Ícone do site (pronta para receber fotos reais)
│   └── admin/                RF05/RF06 — login.html, index.html, painel.js, admin.css
├── tests/                    Testes automatizados (Jest + Supertest)
├── scripts/screenshots.js    Gera as evidências visuais com Playwright
├── docs/                     Manual do usuário, deploy, roteiro de teste e prints
└── data/                     Banco SQLite (não vai para o GitHub)
```

> O cabeçalho e o rodapé aparecem repetidos nos quatro arquivos HTML. Isso é proposital: o site é
> estático, sem sistema de templates, e assim cada página funciona sozinha — o que é mais simples
> de ler e de apresentar.

---

## 4. Banco de dados

Três tabelas, criadas automaticamente por `src/db.js`:

**produto**

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | INTEGER | chave primária |
| `nome` | TEXT | obrigatório, até 100 caracteres |
| `descricao` | TEXT | opcional |
| `categoria` | TEXT | `bateria`, `pneu`, `lampada` ou `outro` |
| `preco` | REAL | obrigatório, `>= 0` |
| `ativo` | INTEGER | `1` aparece no site, `0` fica escondido |
| `atualizado_em` | TEXT | data/hora da última alteração |

**servico**

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | INTEGER | chave primária |
| `tipo` | TEXT | obrigatório |
| `descricao` | TEXT | opcional |
| `valor` | REAL | pode ser `NULL` → o site mostra “Sob consulta” |
| `ativo` | INTEGER | `1` aparece no site, `0` fica escondido |
| `atualizado_em` | TEXT | data/hora da última alteração |

**usuario**

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | INTEGER | chave primária |
| `usuario` | TEXT | único |
| `senha_hash` | TEXT | hash bcrypt — a senha real não é guardada |

Ao iniciar, o servidor verifica se o banco está vazio e, se estiver, roda o seed sozinho. Isso é
necessário porque a hospedagem gratuita apaga o disco a cada novo deploy.

---

## 5. Rotas da API

### Públicas (não exigem login)

| Método | Rota | O que devolve |
| --- | --- | --- |
| `GET` | `/api/empresa` | Nome, endereço, horário, formas de pagamento e link do WhatsApp |
| `GET` | `/api/produtos` | Produtos **ativos**. Aceita `?categoria=` e `?busca=` |
| `GET` | `/api/servicos` | Serviços **ativos** (`valor: null` = sob consulta) |
| `GET` | `/api/categorias` | Lista de categorias aceitas |

### Sessão

| Método | Rota | O que faz |
| --- | --- | --- |
| `POST` | `/api/login` | Entra no painel (`{ usuario, senha }`). 401 se errado, 429 se exceder tentativas |
| `POST` | `/api/logout` | Sai do painel |
| `GET` | `/api/sessao` | Informa se o navegador ainda está logado |

### Painel (exigem sessão — sem ela, **401**)

| Método | Rota | O que faz |
| --- | --- | --- |
| `GET` | `/api/admin/produtos` | Lista todos (inclusive os escondidos) |
| `POST` | `/api/admin/produtos` | Cadastra (201) |
| `PUT` | `/api/admin/produtos/:id` | Altera |
| `DELETE` | `/api/admin/produtos/:id` | Exclui |
| `GET` | `/api/admin/servicos` | Lista todos |
| `POST` | `/api/admin/servicos` | Cadastra (201) |
| `PUT` | `/api/admin/servicos/:id` | Altera |
| `DELETE` | `/api/admin/servicos/:id` | Exclui |

Erros de validação respondem **400** com uma mensagem em português, por exemplo:

```json
{ "erro": "O preço não pode ser negativo." }
```

---

## 6. Medidas de segurança adotadas

| Risco | O que foi feito | Onde está no código |
| --- | --- | --- |
| Senha vazar do banco | Senha guardada como hash **bcrypt** (custo 10) | `src/seed.js`, `src/rotas/autenticacao.js` |
| Sequestro de sessão | Cookie `httpOnly` (JS não lê), `sameSite=lax`, `secure` em produção, expira em 8h | `src/app.js` |
| *Session fixation* | A sessão é regenerada logo após o login | `src/rotas/autenticacao.js` |
| Força bruta no login | Máximo de **5 tentativas por IP a cada 15 minutos** (429) | `src/rotas/autenticacao.js` |
| Descobrir usuários válidos | Usuário inexistente e senha errada devolvem a **mesma** mensagem e demoram o mesmo tempo | `src/rotas/autenticacao.js` |
| Acesso indevido ao painel | Middleware bloqueia `/api/admin/*` (401) e as páginas de `/admin` (redireciona ao login) | `src/middlewares/autenticacao.js`, `src/app.js` |
| **SQL Injection** | Todas as consultas usam parâmetros (`?`); nunca há texto do usuário concatenado no SQL | `src/repositorio.js` |
| **XSS** | Todo texto vindo do banco passa por `escaparHtml()` antes de ir para a tela | `public/js/comum.js`, `public/admin/painel.js` |
| Dados inválidos | Nome, preço e categoria validados no servidor antes de gravar | `src/validacao.js` |
| Scripts de terceiros | **CSP** permite scripts apenas do próprio site; a única origem externa liberada é o mapa do Google | `src/app.js` |
| Clickjacking / sniffing | Cabeçalhos do `helmet` (`X-Frame-Options`, `nosniff`, `Referrer-Policy`) | `src/app.js` |
| Excesso de dados | Corpo da requisição limitado a 64 kB | `src/app.js` |
| Vazamento de tecnologia | `x-powered-by` desativado | `src/app.js` |
| Senhas no repositório | `.env` no `.gitignore`; só o `.env.example` é versionado | `.gitignore` |

Todos esses pontos têm teste automatizado em `tests/seguranca.test.js`,
`tests/autenticacao.test.js` e `tests/limite-login.test.js`.

---

## 7. Testes

```bash
npm test
npm run test:coverage
```

São **85 testes** em 5 arquivos:

| Arquivo | O que verifica |
| --- | --- |
| `tests/api-publica.test.js` | API só devolve itens ativos, filtro por categoria, busca, 400 em categoria inválida |
| `tests/autenticacao.test.js` | Login correto, senha errada (401), sessão, logout, `/api/admin/*` sem sessão (401) |
| `tests/limite-login.test.js` | Bloqueio com 429 após 5 tentativas |
| `tests/admin-crud.test.js` | CRUD completo de produtos e serviços + validações (400) |
| `tests/seguranca.test.js` | SQL Injection, XSS, cabeçalhos do helmet, JSON inválido |

Os testes usam um banco **em memória** (`:memory:`), então nunca alteram o banco de
desenvolvimento.

---

## 8. Documentação complementar

| Documento | Para quem |
| --- | --- |
| [`docs/manual-do-usuario.md`](docs/manual-do-usuario.md) | Sr. Renê — passo a passo sem termos técnicos |
| [`docs/deploy-render.md`](docs/deploy-render.md) | Quem for publicar o site no Render |
| [`docs/roteiro-teste-piloto.md`](docs/roteiro-teste-piloto.md) | Teste com usuários reais |
| [`docs/requisitos.md`](docs/requisitos.md) | Rastreabilidade RF01–RF06 e RNF01–RNF05 (checklist de entrega) |
| [`docs/lighthouse.md`](docs/lighthouse.md) | Auditoria de desempenho e acessibilidade (RNF02 e RNF04) |
| [`docs/prints/`](docs/prints) | Evidências visuais geradas por `npm run screenshots` |

---

## 9. Pendências

- [ ] Confirmar com o Sr. Renê o **horário de funcionamento** e as **formas de pagamento**
      (valores de exemplo em `config/empresa.js`, marcados com `// TODO`).
- [ ] Substituir o texto provisório de **“Nossa história”** em `public/index.html`
      (marcado com `<!-- TODO: texto do Sr. Renê -->`).
- [ ] Confirmar os **preços reais** de produtos e serviços (os do seed são exemplos).
- [ ] Adicionar **fotos reais** da oficina na pasta `public/img/`.
