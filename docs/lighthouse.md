# Auditoria Lighthouse — evidência dos RNF02 e RNF04

Medição feita com **Lighthouse 12** no perfil **Mobile** (padrão da ferramenta: tela de celular,
rede 4G simulada e CPU desacelerada 4×), contra o servidor rodando localmente
(`npm start`, `http://localhost:3000`).

## Resultado

| Página | Desempenho | Acessibilidade | Boas práticas | SEO |
| --- | :---: | :---: | :---: | :---: |
| `/` (Início) | **100** | **100** | **100** | **100** |
| `/catalogo.html` | **100** | **100** | **100** | **100** |
| `/servicos.html` | **100** | **100** | **100** | **100** |
| `/contato.html` | **100** | **100** | **100** | **100** |
| `/admin/login.html` | **100** | **100** | **100** | 60 ¹ |

¹ O painel usa `<meta name="robots" content="noindex, nofollow">` de propósito: a área do
proprietário **não deve** aparecer no Google. O Lighthouse penaliza isso na nota de SEO, mas
neste caso é o comportamento correto.

## Metas do projeto

| Requisito | Meta | Resultado | Situação |
| --- | --- | --- | --- |
| RNF02 — Desempenho | Lighthouse mobile ≥ 85 | 100 em todas as páginas | ✅ Atingido |
| RNF04 — Acessibilidade | Lighthouse ≥ 90 | 100 em todas as páginas | ✅ Atingido |

## O que foi feito para chegar nesses números

**Desempenho**

- Nenhuma biblioteca externa: sem React, sem jQuery, sem framework CSS.
- Fontes do próprio sistema operacional — nenhum download de fonte.
- Ícones em **SVG embutido** no HTML, sem requisições de imagem.
- O mapa do Google usa `loading="lazy"` (só carrega quando o visitante chega nele).
- Em produção (`NODE_ENV=production`), os arquivos estáticos são servidos com cache de 1 hora.
- **Correção de CLS:** a primeira medição do catálogo e dos serviços deu 83 e 78 pontos por causa
  de *Cumulative Layout Shift* de 0,55 — as listas chegam da API depois da página e empurravam o
  conteúdo para baixo. A solução foi reservar o espaço antes (`.grade--reservada` com
  `min-height` e cartões "fantasma" em `.cartao--esqueleto`, em `public/css/estilo.css`).
  O CLS caiu para **0** e as duas páginas foram para 100.

**Acessibilidade**

- HTML semântico: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<address>`.
- `lang="pt-BR"` em todas as páginas.
- Contraste AA: texto branco sobre o azul `#1F2A6B` e texto azul-escuro sobre o amarelo `#F5C400`.
  O botão do WhatsApp usa um verde escurecido (`#0B6B4E`) justamente para passar no contraste com
  o texto branco.
- Foco sempre visível (`:focus-visible` com contorno amarelo).
- Link "Pular para o conteúdo" no topo de cada página.
- `aria-expanded` no menu hambúrguer, `aria-pressed` nos filtros do catálogo,
  `aria-live`/`aria-busy` nas listas carregadas por JavaScript e `aria-current="page"` no menu.
- `<label>` associado a todos os campos de formulário, inclusive no painel.
- Alvos de toque com no mínimo 44–48 px de altura.
- `@media (prefers-reduced-motion: reduce)` respeita quem desliga animações.

## Como repetir a medição

```bash
npm start
```

Com o site no ar, em outro terminal:

```bash
npx lighthouse http://localhost:3000/ --view
```

Ou use o próprio Google Chrome: tecle `F12` → aba **Lighthouse** → **Analyze page load**.
