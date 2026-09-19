# Rastreabilidade dos requisitos

Este documento liga cada requisito do projeto ao lugar exato onde ele foi implementado e ao teste
que comprova o funcionamento. Serve como checklist de entrega.

---

## Requisitos Funcionais

### RF01 — Página inicial

> Apresentar a oficina: identidade visual, promoção, história, destaques, horário e endereço, com
> botão de WhatsApp.

| Item | Onde está |
| --- | --- |
| Cabeçalho com nome e slogan nas cores da marca | [`public/index.html`](../public/index.html) (bloco `<header class="cabecalho">`) |
| Cores da fachada (azul `#1F2A6B` / amarelo `#F5C400`) | [`public/css/estilo.css`](../public/css/estilo.css) — variáveis `--azul` e `--amarelo` |
| Banner da promoção | `public/index.html` → `<div class="banner-promo">`, texto vindo de `empresa.promocao` |
| História da oficina | `public/index.html` → seção “Nossa história”, marcada com `<!-- TODO: texto do Sr. Renê -->` |
| Destaques (Baterias, Pneus, Serviços, Lâmpadas) | `public/index.html` → seção “O que fazemos”, ícones SVG embutidos |
| Horário e endereço | `public/index.html` → seção com `data-lista-horario` e `data-empresa="endereco"` |
| Botão grande “Chamar no WhatsApp” | `public/index.html` → `.botao--whatsapp.botao--grande` (3 ocorrências) |
| Origem dos dados | [`config/empresa.js`](../config/empresa.js) → `GET /api/empresa` → [`public/js/comum.js`](../public/js/comum.js) |

**Teste:** `tests/api-publica.test.js` → *“GET /api/empresa devolve os dados cadastrais da oficina”*.

---

### RF02 — Página de serviços

> Listar os serviços ativos, mostrando “Sob consulta” quando não há valor.

| Item | Onde está |
| --- | --- |
| Página | [`public/servicos.html`](../public/servicos.html) |
| Montagem da lista | [`public/js/servicos.js`](../public/js/servicos.js) → `montarCartaoServico()` |
| API (só ativos) | [`src/rotas/publicas.js`](../src/rotas/publicas.js) → `GET /api/servicos` |
| Consulta SQL | [`src/repositorio.js`](../src/repositorio.js) → `listarServicosPublicos()` (`WHERE ativo = 1`) |
| “Sob consulta” quando `valor` é `NULL` | `public/js/servicos.js` → `textoDoValor()` |

**Testes:** `tests/api-publica.test.js` → *“NAO devolve servicos ocultos”* e
*“servico sem valor volta como null”*.

---

### RF03 — Catálogo de produtos

> Cards com preço em reais, filtro por categoria e busca por nome; botão de WhatsApp por produto.

| Item | Onde está |
| --- | --- |
| Página | [`public/catalogo.html`](../public/catalogo.html) |
| Cards e preço `Intl.NumberFormat('pt-BR')` | [`public/js/catalogo.js`](../public/js/catalogo.js) → `montarCartaoProduto()` / `formatarPreco()` |
| Botões de filtro por categoria | `public/catalogo.html` → `[data-filtros]`; lógica em `iniciarFiltrosDeCategoria()` |
| Busca por nome | `public/catalogo.html` → `[data-form-busca]`; lógica em `iniciarBusca()` (espera 350 ms ao digitar) |
| API com filtros | `src/rotas/publicas.js` → `GET /api/produtos?categoria=&busca=` |
| Consulta SQL parametrizada | `src/repositorio.js` → `listarProdutosPublicos()` |
| Botão “Perguntar no WhatsApp” com o nome do produto | `public/js/catalogo.js` → variável `mensagem` |

**Testes:** `tests/api-publica.test.js` → *“filtra por categoria”*, *“busca por parte do nome”*,
*“combina categoria e busca”*, *“categoria inexistente responde 400”*.
**Print:** `docs/prints/03-catalogo-filtro-bateria.png`.

---

### RF04 — Página de contato

> Endereço, mapa do Google, horário, formas de pagamento, WhatsApp e telefone clicável.

| Item | Onde está |
| --- | --- |
| Página | [`public/contato.html`](../public/contato.html) |
| Endereço | `<address data-empresa="endereco">` |
| Mapa incorporado | `<iframe class="mapa" src="https://www.google.com/maps?q=...&output=embed">` com `loading="lazy"` |
| CSP liberando só o Google Maps | [`src/app.js`](../src/app.js) → `frameSrc: ["'self'", 'https://www.google.com']` |
| Horário | `<ul data-lista-horario>` preenchido por `comum.js` |
| Formas de pagamento | `<ul data-lista-pagamentos>` preenchido por `comum.js` |
| Telefone clicável | `<a href="tel:+5531999825481" data-telefone-link>` |

**Print:** `docs/prints/04-contato.png`.

---

### RF05 — Autenticação do proprietário

> Login com usuário e senha; rotas e páginas do painel protegidas.

| Item | Onde está |
| --- | --- |
| Tela de login | [`public/admin/login.html`](../public/admin/login.html) + [`login.js`](../public/admin/login.js) |
| `POST /api/login` | [`src/rotas/autenticacao.js`](../src/rotas/autenticacao.js) |
| `POST /api/logout` e `GET /api/sessao` | mesmo arquivo |
| Senha em hash bcrypt | [`src/seed.js`](../src/seed.js) → `bcrypt.hashSync()`; conferência com `bcrypt.compare()` |
| Middleware que protege `/api/admin/*` (401) | [`src/middlewares/autenticacao.js`](../src/middlewares/autenticacao.js) |
| Proteção das páginas `/admin` (redireciona ao login) | `src/app.js` → `app.use('/admin', ...)` |
| Cookie de sessão seguro | `src/app.js` → `httpOnly`, `sameSite: 'lax'`, `secure` em produção |

**Testes:** `tests/autenticacao.test.js` (20 testes) — login correto, senha errada (401), logout,
todas as rotas admin sem sessão (401), redirecionamento das páginas.
**Prints:** `docs/prints/05-login-painel.png`.

---

### RF06 — Painel de gerenciamento

> Cadastrar, editar, ocultar/mostrar e excluir produtos e serviços.

| Item | Onde está |
| --- | --- |
| Painel com abas Produtos/Serviços | [`public/admin/index.html`](../public/admin/index.html) |
| Lógica da tela | [`public/admin/painel.js`](../public/admin/painel.js) |
| Estilo pensado para celular | [`public/admin/admin.css`](../public/admin/admin.css) |
| API CRUD de produtos | [`src/rotas/admin.js`](../src/rotas/admin.js) → `GET/POST /api/admin/produtos`, `PUT/DELETE .../:id` |
| API CRUD de serviços | mesmo arquivo → `.../servicos` |
| Ocultar/mostrar (campo `ativo`) | `painel.js` → ação `alternar`; botões “Esconder do site” / “Mostrar no site” |
| Excluir com confirmação | `painel.js` → `window.confirm()` antes do `DELETE` |
| Validações com erro 400 em português | [`src/validacao.js`](../src/validacao.js) |

**Testes:** `tests/admin-crud.test.js` (35 testes) — CRUD completo e todas as validações.
**Prints:** `docs/prints/06-painel-editar-preco-celular.png` e `07-painel-preco-salvo-celular.png`.

---

## Requisitos Não Funcionais

### RNF01 — Responsivo / mobile-first ✅

| Evidência | Onde |
| --- | --- |
| CSS escrito primeiro para o celular; `@media (min-width: ...)` amplia | `public/css/estilo.css` (breakpoints em 620px, 760px e 900px) |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | todas as páginas |
| Menu hambúrguer no celular, menu horizontal no computador | `.botao-menu` / `.menu` + `iniciarMenu()` em `comum.js` |
| Grade que vai de 1 para 2 e 3/4 colunas | `.grade`, `.grade--tres`, `.grade--quatro` |
| Alvos de toque de no mínimo 44–48 px | `.botao { min-height: 48px }`, `.filtro { min-height: 44px }` |
| Prints em 1366px e 390px | `docs/prints/01-...` e `docs/prints/02-...` |

---

### RNF02 — Desempenho (Lighthouse mobile ≥ 85) ✅ — **100 obtido**

| Evidência | Onde |
| --- | --- |
| Relatório completo | [`docs/lighthouse.md`](lighthouse.md) |
| Sem framework, sem biblioteca externa, sem fonte baixada | `public/` inteiro |
| Ícones SVG embutidos (zero requisição de imagem) | HTML das páginas |
| Mapa com `loading="lazy"` | `public/contato.html` |
| Cache de 1h em produção | `src/app.js` → `express.static(..., { maxAge: '1h' })` |
| Correção do CLS (0,55 → 0) | `public/css/estilo.css` → `.grade--reservada` e `.cartao--esqueleto` |
| Busca com espera de 350 ms (menos requisições) | `public/js/catalogo.js` → `iniciarBusca()` |

---

### RNF03 — Segurança ✅

| Medida | Onde | Teste |
| --- | --- | --- |
| Senha em hash **bcrypt** | `src/seed.js`, `src/rotas/autenticacao.js` | `autenticacao.test.js` → *“a senha e guardada como hash bcrypt”* |
| **Sessão** com cookie `httpOnly` + `sameSite=lax` + `secure` | `src/app.js` | `autenticacao.test.js` → verificação do `Set-Cookie` |
| Sessão regenerada após o login | `src/rotas/autenticacao.js` | — |
| **Validação** de todas as entradas | `src/validacao.js` | `admin-crud.test.js` (17 casos de 400) |
| **Helmet** (CSP, nosniff, X-Frame-Options) | `src/app.js` | `seguranca.test.js` → *“Cabecalhos de seguranca”* |
| **Rate limit** 5 tentativas / 15 min | `src/rotas/autenticacao.js` | `limite-login.test.js` → 429 |
| Queries **sempre parametrizadas** | `src/repositorio.js` | `seguranca.test.js` → *“Tentativas de SQL Injection”* |
| **Escape de HTML** no front | `public/js/comum.js`, `public/admin/painel.js` | `seguranca.test.js` → *“Tentativas de XSS”* |
| `.env` fora do Git | `.gitignore` | — |

---

### RNF04 — Acessibilidade (Lighthouse ≥ 90) ✅ — **100 obtido**

| Evidência | Onde |
| --- | --- |
| Relatório | [`docs/lighthouse.md`](lighthouse.md) |
| `lang="pt-BR"`, `meta description` e Open Graph | todas as páginas públicas |
| HTML semântico (`header`, `nav`, `main`, `article`, `address`, `footer`) | todas as páginas |
| Contraste AA (inclusive o verde escurecido do WhatsApp) | `public/css/estilo.css` → `--verde-whats: #0b6b4e` |
| Foco visível | `:focus-visible` com contorno amarelo |
| Link “Pular para o conteúdo” | `.pular-conteudo` em todas as páginas |
| `aria-expanded`, `aria-pressed`, `aria-current`, `aria-live`, `aria-busy` | `comum.js`, `catalogo.js`, HTML |
| `<label>` em todos os campos | formulários do catálogo e do painel |
| Ícones decorativos com `aria-hidden="true"` | SVGs embutidos |
| `prefers-reduced-motion` respeitado | fim de `estilo.css` |

---

### RNF05 — Usabilidade do painel (alterar preço em < 2 min) ✅

| Evidência | Onde |
| --- | --- |
| Campo de preço **direto no cartão**, sem abrir formulário | `public/admin/painel.js` → `montarItemProduto()` (bloco `.linha-preco`) |
| Caminho completo: `/admin` → login → digitar → **Salvar preço** (4 toques) | — |
| Botões grandes (mín. 48 px) e poucos campos | `public/admin/admin.css` |
| Textos simples: “Salvar preço”, “Esconder do site”, “Editar tudo” | `painel.js` |
| Mensagem clara de sucesso/erro com rolagem até o topo | `painel.js` → `mostrarRecado()` |
| Aceita vírgula (`419,90`) como o dono digita | `src/validacao.js` → `numero()` |
| Manual sem termos técnicos | [`docs/manual-do-usuario.md`](manual-do-usuario.md) |
| Medição com o usuário real | [`docs/roteiro-teste-piloto.md`](roteiro-teste-piloto.md) → Tarefa D |
| Prints da operação no celular | `docs/prints/06-...` e `07-...` |
