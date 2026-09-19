/* ==========================================================================
   comum.js — funcoes usadas por todas as paginas do site
   --------------------------------------------------------------------------
   JavaScript puro (sem bibliotecas). Cuida de:
     - abrir/fechar o menu no celular;
     - buscar os dados da empresa na API e preencher os textos da pagina;
     - montar os links do WhatsApp;
     - funcoes de apoio (escapar HTML, formatar preco em reais).
   ========================================================================== */

/**
 * Transforma caracteres perigosos em entidades HTML.
 *
 * REGRA DE SEGURANCA DO PROJETO: todo texto que vem do banco de dados passa
 * por aqui antes de ir para a tela. Assim, se alguem cadastrar um produto
 * chamado "<script>...</script>", o navegador mostra o texto, nao executa.
 *
 * @param {*} valor texto vindo da API
 * @returns {string} texto seguro para colocar no HTML
 */
function escaparHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formata um numero no padrao brasileiro de moeda: 389.9 -> "R$ 389,90".
 * @param {number} valor
 * @returns {string}
 */
function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor) || 0);
}

/**
 * Faz uma requisicao GET na API e devolve o JSON.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function buscarJson(url) {
  const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    throw new Error(corpo.erro || 'Não foi possível carregar as informações.');
  }
  return resposta.json();
}

/* --------------------------------------------------------------------------
   Dados da empresa (endereco, horario, WhatsApp...)
   -------------------------------------------------------------------------- */

/** Guarda os dados ja baixados para nao pedir de novo a cada uso. */
let dadosEmpresa = null;

/**
 * Baixa (uma unica vez) os dados da empresa em GET /api/empresa.
 * @returns {Promise<object>}
 */
async function obterEmpresa() {
  if (!dadosEmpresa) {
    dadosEmpresa = await buscarJson('/api/empresa');
  }
  return dadosEmpresa;
}

/**
 * Monta o endereco do WhatsApp com a mensagem ja escrita.
 * @param {object} empresa dados vindos da API
 * @param {string} [mensagem] mensagem personalizada (ex.: nome do produto)
 * @returns {string}
 */
function montarLinkWhatsapp(empresa, mensagem) {
  const texto = mensagem || empresa.mensagemWhatsapp;
  return 'https://wa.me/' + empresa.telefone.whatsapp + '?text=' + encodeURIComponent(texto);
}

/**
 * Preenche na pagina todos os elementos marcados com data-empresa="campo",
 * os links marcados com data-whatsapp e as listas de horario/pagamento.
 * @param {object} empresa
 */
function preencherDadosNaPagina(empresa) {
  const campos = {
    nome: empresa.nome,
    slogan: empresa.slogan,
    promocao: empresa.promocao,
    endereco: empresa.endereco.completo,
    bairro: empresa.endereco.bairro,
    cidade: empresa.endereco.cidade + ' – ' + empresa.endereco.estado,
    cnpj: empresa.cnpj,
    proprietario: empresa.proprietario,
    telefone: empresa.telefone.exibicao
  };

  document.querySelectorAll('[data-empresa]').forEach(function (elemento) {
    const chave = elemento.getAttribute('data-empresa');
    if (campos[chave] !== undefined) {
      // textContent nunca interpreta HTML: seguro por natureza.
      elemento.textContent = campos[chave];
    }
  });

  // Links do WhatsApp (botao flutuante, botoes de contato...).
  document.querySelectorAll('[data-whatsapp]').forEach(function (link) {
    const mensagem = link.getAttribute('data-whatsapp-mensagem');
    link.href = montarLinkWhatsapp(empresa, mensagem);
  });

  // Links de telefone (tel:) para o celular discar com um toque.
  document.querySelectorAll('[data-telefone-link]').forEach(function (link) {
    link.href = empresa.telefone.link;
  });

  // Lista de horarios de funcionamento.
  document.querySelectorAll('[data-lista-horario]').forEach(function (lista) {
    lista.innerHTML = empresa.horario
      .map(function (item) {
        return '<li><strong>' + escaparHtml(item.dias) + '</strong><span>' + escaparHtml(item.horas) + '</span></li>';
      })
      .join('');
  });

  // Lista de formas de pagamento.
  document.querySelectorAll('[data-lista-pagamentos]').forEach(function (lista) {
    lista.innerHTML = empresa.formasPagamento
      .map(function (forma) {
        return '<li>' + escaparHtml(forma) + '</li>';
      })
      .join('');
  });
}

/* --------------------------------------------------------------------------
   Menu responsivo (hamburguer)
   -------------------------------------------------------------------------- */

/**
 * Liga o botao hamburguer ao menu. No computador o menu ja fica visivel
 * pelo CSS; este codigo so importa no celular.
 */
function iniciarMenu() {
  const botao = document.querySelector('[data-botao-menu]');
  const menu = document.querySelector('[data-menu]');
  if (!botao || !menu) return;

  botao.addEventListener('click', function () {
    const aberto = menu.classList.toggle('menu--aberto');
    // aria-expanded avisa o leitor de tela se o menu esta aberto ou fechado.
    botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  });

  // Fecha o menu ao escolher uma pagina.
  menu.addEventListener('click', function (evento) {
    if (evento.target.matches('.menu__link')) {
      menu.classList.remove('menu--aberto');
      botao.setAttribute('aria-expanded', 'false');
    }
  });
}

/* --------------------------------------------------------------------------
   Inicializacao
   -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', function () {
  iniciarMenu();

  obterEmpresa()
    .then(preencherDadosNaPagina)
    .catch(function (erro) {
      // Se a API falhar, o site continua legivel: o HTML ja traz os textos
      // fixos (endereco, telefone) como reserva.
      console.warn('Não foi possível carregar os dados da empresa:', erro.message);
    });
});
