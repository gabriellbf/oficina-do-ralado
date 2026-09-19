/**
 * Dados cadastrais da Oficina do Ralado.
 *
 * Este e o UNICO arquivo que precisa ser editado quando alguma informacao
 * institucional mudar (horario, formas de pagamento, endereco, telefone).
 * O servidor expoe estes dados em GET /api/empresa e as paginas do site
 * preenchem os textos automaticamente a partir dessa resposta.
 */

const empresa = {
  nome: 'Oficina do Ralado',
  slogan: 'Baterias • Pneus • Serviços • Lâmpadas de farol',
  proprietario: 'Renê Ribeiro Soares',
  cnpj: '22.072.206/0001-60',

  endereco: {
    logradouro: 'Av. Guarapari, 546 – Loja 03',
    bairro: 'Santa Amélia',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    cep: '31800-500',
    // Texto completo usado no rodapé e na página de contato.
    completo: 'Av. Guarapari, 546 – Loja 03, Santa Amélia, Belo Horizonte – MG, CEP 31800-500'
  },

  // Telefone/WhatsApp. O numero "limpo" (so digitos, com DDI 55) monta o link wa.me.
  telefone: {
    exibicao: '(31) 99982-5481',
    // 55 (Brasil) + 31 (DDD) + numero
    whatsapp: '5531999825481',
    // Link tel: para o celular discar com um toque.
    link: 'tel:+5531999825481'
  },

  // Mensagem que ja vem escrita quando o cliente abre o WhatsApp pelo site.
  mensagemWhatsapp: 'Olá! Vim pelo site da Oficina do Ralado e gostaria de mais informações.',

  // Banner exibido no topo da pagina inicial.
  promocao: 'Promoção de baterias e lâmpadas de farol',

  // TODO: confirmar com o Sr. Renê
  // Valores de exemplo enquanto o horario oficial nao e confirmado.
  horario: [
    { dias: 'Segunda a sexta', horas: '8h às 18h' },
    { dias: 'Sábado', horas: '8h às 12h' },
    { dias: 'Domingo e feriados', horas: 'Fechado' }
  ],

  // TODO: confirmar com o Sr. Renê
  // Formas de pagamento de exemplo enquanto nao sao confirmadas.
  formasPagamento: ['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito']
};

/**
 * Monta o link do WhatsApp ja com a mensagem preenchida.
 * @param {string} [mensagem] mensagem alternativa (ex.: nome de um produto)
 * @returns {string} URL completa do wa.me
 */
function linkWhatsapp(mensagem) {
  const texto = mensagem || empresa.mensagemWhatsapp;
  return `https://wa.me/${empresa.telefone.whatsapp}?text=${encodeURIComponent(texto)}`;
}

module.exports = { empresa, linkWhatsapp };
