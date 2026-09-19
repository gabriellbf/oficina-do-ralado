/* ==========================================================================
   servicos.js — monta a lista da pagina /servicos.html
   Busca os dados em GET /api/servicos (somente servicos ativos).
   ========================================================================== */

/**
 * Transforma o valor do servico no texto que aparece na tela.
 *  - null  -> "Sob consulta"
 *  - 0     -> "Cortesia"
 *  - outro -> "R$ 35,00"
 * @param {number|null} valor
 * @returns {{texto: string, classe: string}}
 */
function textoDoValor(valor) {
  if (valor === null || valor === undefined) {
    return { texto: 'Sob consulta', classe: 'cartao__preco cartao__preco--consulta' };
  }
  if (Number(valor) === 0) {
    return { texto: 'Cortesia', classe: 'cartao__preco cartao__preco--consulta' };
  }
  return { texto: 'A partir de ' + formatarPreco(valor), classe: 'cartao__preco' };
}

/**
 * Monta o HTML de um cartao de servico.
 * Todo texto vindo do banco passa por escaparHtml (proteção contra XSS).
 * @param {{id: number, tipo: string, descricao: string|null, valor: number|null}} servico
 * @param {object} empresa dados da empresa (para montar o link do WhatsApp)
 * @returns {string}
 */
function montarCartaoServico(servico, empresa) {
  const valor = textoDoValor(servico.valor);
  const mensagem = 'Olá! Vim pelo site da Oficina do Ralado e gostaria de saber sobre: ' + servico.tipo;
  const link = montarLinkWhatsapp(empresa, mensagem);

  return (
    '<article class="cartao">' +
    '<h2 class="cartao__titulo">' +
    escaparHtml(servico.tipo) +
    '</h2>' +
    '<p class="cartao__texto">' +
    escaparHtml(servico.descricao || '') +
    '</p>' +
    '<p class="' +
    valor.classe +
    '">' +
    escaparHtml(valor.texto) +
    '</p>' +
    '<div class="cartao__rodape">' +
    '<a class="botao botao--whatsapp botao--bloco botao--pequeno" href="' +
    escaparHtml(link) +
    '">Pedir orçamento no WhatsApp</a>' +
    '</div>' +
    '</article>'
  );
}

/** Busca os servicos na API e desenha a lista. */
async function carregarServicos() {
  const container = document.getElementById('lista-servicos');
  if (!container) return;

  try {
    // Pede os dois em paralelo: a lista de servicos e os dados da empresa.
    const [servicos, empresa] = await Promise.all([buscarJson('/api/servicos'), obterEmpresa()]);

    if (servicos.length === 0) {
      container.setAttribute('aria-busy', 'false');
      container.innerHTML = '<p class="aviso">Nenhum serviço cadastrado no momento.</p>';
      return;
    }

    container.innerHTML = servicos
      .map(function (servico) {
        return montarCartaoServico(servico, empresa);
      })
      .join('');
    container.setAttribute('aria-busy', 'false');
  } catch (erro) {
    container.setAttribute('aria-busy', 'false');
    container.innerHTML =
      '<p class="aviso aviso--erro">Não foi possível carregar os serviços agora. ' +
      'Atualize a página ou chame a gente no WhatsApp.</p>';
    console.error(erro);
  }
}

document.addEventListener('DOMContentLoaded', carregarServicos);
