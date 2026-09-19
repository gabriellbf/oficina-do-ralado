/* ==========================================================================
   catalogo.js — monta o catalogo de produtos (/catalogo.html)
   --------------------------------------------------------------------------
   Busca os produtos em GET /api/produtos, aplicando os filtros escolhidos:
     ?categoria=bateria   botoes de categoria
     ?busca=45            campo de busca por nome
   ========================================================================== */

/** Estado atual dos filtros da tela. */
const filtroAtual = { categoria: 'todos', busca: '' };

/** Nome bonito de cada categoria, para mostrar na etiqueta do cartao. */
const NOME_CATEGORIA = {
  bateria: 'Bateria',
  pneu: 'Pneu',
  lampada: 'Lâmpada',
  outro: 'Outros'
};

/**
 * Monta o HTML de um cartao de produto.
 * Todo texto vindo do banco passa por escaparHtml (proteção contra XSS).
 * @param {{id:number, nome:string, descricao:string|null, categoria:string, preco:number}} produto
 * @param {object} empresa dados da empresa (para montar o link do WhatsApp)
 * @returns {string}
 */
function montarCartaoProduto(produto, empresa) {
  const mensagem =
    'Olá! Vim pelo site da Oficina do Ralado e gostaria de saber sobre o produto: ' + produto.nome;
  const link = montarLinkWhatsapp(empresa, mensagem);
  const etiqueta = NOME_CATEGORIA[produto.categoria] || 'Produto';

  return (
    '<article class="cartao">' +
    '<span class="cartao__etiqueta">' +
    escaparHtml(etiqueta) +
    '</span>' +
    '<h2 class="cartao__titulo">' +
    escaparHtml(produto.nome) +
    '</h2>' +
    '<p class="cartao__texto">' +
    escaparHtml(produto.descricao || '') +
    '</p>' +
    '<p class="cartao__preco">' +
    escaparHtml(formatarPreco(produto.preco)) +
    '</p>' +
    '<div class="cartao__rodape">' +
    '<a class="botao botao--whatsapp botao--bloco botao--pequeno" href="' +
    escaparHtml(link) +
    '">Perguntar no WhatsApp</a>' +
    '</div>' +
    '</article>'
  );
}

/**
 * Monta o endereco da API com os filtros atuais.
 * @returns {string}
 */
function montarUrlDaBusca() {
  const parametros = new URLSearchParams();
  if (filtroAtual.categoria && filtroAtual.categoria !== 'todos') {
    parametros.set('categoria', filtroAtual.categoria);
  }
  if (filtroAtual.busca) {
    parametros.set('busca', filtroAtual.busca);
  }
  const consulta = parametros.toString();
  return '/api/produtos' + (consulta ? '?' + consulta : '');
}

/** Busca os produtos na API e desenha a lista na tela. */
async function carregarProdutos() {
  const container = document.getElementById('lista-produtos');
  if (!container) return;

  try {
    const [produtos, empresa] = await Promise.all([buscarJson(montarUrlDaBusca()), obterEmpresa()]);

    if (produtos.length === 0) {
      container.innerHTML =
        '<p class="aviso">Nenhum produto encontrado com esse filtro. ' +
        'Tente outra categoria ou pergunte no WhatsApp.</p>';
      return;
    }

    container.innerHTML = produtos
      .map(function (produto) {
        return montarCartaoProduto(produto, empresa);
      })
      .join('');
  } catch (erro) {
    container.innerHTML =
      '<p class="aviso aviso--erro">Não foi possível carregar o catálogo agora. ' +
      'Atualize a página ou chame a gente no WhatsApp.</p>';
    console.error(erro);
  }
}

/** Liga os botoes de categoria. */
function iniciarFiltrosDeCategoria() {
  const grupo = document.querySelector('[data-filtros]');
  if (!grupo) return;

  grupo.addEventListener('click', function (evento) {
    const botao = evento.target.closest('.filtro');
    if (!botao) return;

    filtroAtual.categoria = botao.getAttribute('data-categoria');

    // aria-pressed marca visualmente e avisa o leitor de tela qual filtro está ligado.
    grupo.querySelectorAll('.filtro').forEach(function (outro) {
      outro.setAttribute('aria-pressed', outro === botao ? 'true' : 'false');
    });

    carregarProdutos();
  });
}

/** Liga o campo de busca (ao enviar o formulario e enquanto digita). */
function iniciarBusca() {
  const formulario = document.querySelector('[data-form-busca]');
  const campo = document.getElementById('busca');
  if (!formulario || !campo) return;

  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();
    filtroAtual.busca = campo.value.trim();
    carregarProdutos();
  });

  // Espera o usuario parar de digitar por 350ms antes de consultar a API,
  // para nao mandar uma requisicao a cada letra.
  let temporizador = null;
  campo.addEventListener('input', function () {
    clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      filtroAtual.busca = campo.value.trim();
      carregarProdutos();
    }, 350);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  iniciarFiltrosDeCategoria();
  iniciarBusca();
  carregarProdutos();
});
