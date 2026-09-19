/**
 * Validacao das entradas recebidas pela API.
 *
 * Regra do projeto: NADA que vem do navegador e gravado sem passar por aqui.
 * Cada funcao devolve { valido, erro, dados } — quando invalido, a rota
 * responde 400 com a mensagem em portugues que esta em "erro".
 */

const { CATEGORIAS } = require('./db');

const TAMANHO_MAXIMO_NOME = 100;
const TAMANHO_MAXIMO_DESCRICAO = 500;

/** Resposta curta de erro. */
function invalido(erro) {
  return { valido: false, erro, dados: null };
}

/** Resposta curta de sucesso. */
function valido(dados) {
  return { valido: true, erro: null, dados };
}

/**
 * Converte o texto recebido em string limpa (sem espacos nas pontas).
 * Qualquer valor que nao seja texto vira string vazia.
 */
function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Converte para numero aceitando tanto 12.5 quanto "12,50".
 * Devolve null quando nao e um numero valido.
 */
function numero(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }
  if (typeof valor === 'string' && valor.trim() !== '') {
    const convertido = Number(valor.trim().replace(',', '.'));
    return Number.isFinite(convertido) ? convertido : null;
  }
  return null;
}

/**
 * Normaliza o campo "ativo" (aceita true/false, 1/0, "1"/"0").
 * @param {*} valor
 * @param {0|1} padrao valor usado quando o campo nao foi enviado
 * @returns {0|1|null} null quando o valor enviado e invalido
 */
function ativo(valor, padrao) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  if (valor === true || valor === 1 || valor === '1' || valor === 'true') return 1;
  if (valor === false || valor === 0 || valor === '0' || valor === 'false') return 0;
  return null;
}

/**
 * Valida o corpo de um produto (POST e PUT usam a mesma regra).
 * @param {object} corpo req.body
 */
function validarProduto(corpo) {
  if (!corpo || typeof corpo !== 'object') {
    return invalido('Nenhum dado foi enviado.');
  }

  const nome = texto(corpo.nome);
  if (nome === '') {
    return invalido('O nome do produto é obrigatório.');
  }
  if (nome.length > TAMANHO_MAXIMO_NOME) {
    return invalido(`O nome do produto deve ter no máximo ${TAMANHO_MAXIMO_NOME} caracteres.`);
  }

  const descricao = texto(corpo.descricao);
  if (descricao.length > TAMANHO_MAXIMO_DESCRICAO) {
    return invalido(`A descrição deve ter no máximo ${TAMANHO_MAXIMO_DESCRICAO} caracteres.`);
  }

  const categoria = texto(corpo.categoria).toLowerCase();
  if (!CATEGORIAS.includes(categoria)) {
    return invalido(`A categoria deve ser uma destas: ${CATEGORIAS.join(', ')}.`);
  }

  const preco = numero(corpo.preco);
  if (preco === null) {
    return invalido('O preço é obrigatório e deve ser um número.');
  }
  if (preco < 0) {
    return invalido('O preço não pode ser negativo.');
  }

  const estaAtivo = ativo(corpo.ativo, 1);
  if (estaAtivo === null) {
    return invalido('O campo "ativo" deve ser verdadeiro ou falso.');
  }

  return valido({
    nome,
    descricao: descricao || null,
    categoria,
    // Arredonda para 2 casas para nao gravar 10.000000000000002.
    preco: Math.round(preco * 100) / 100,
    ativo: estaAtivo
  });
}

/**
 * Valida o corpo de um servico.
 * O valor pode ser vazio/null: significa "Sob consulta" no site.
 * @param {object} corpo req.body
 */
function validarServico(corpo) {
  if (!corpo || typeof corpo !== 'object') {
    return invalido('Nenhum dado foi enviado.');
  }

  const tipo = texto(corpo.tipo);
  if (tipo === '') {
    return invalido('O nome do serviço é obrigatório.');
  }
  if (tipo.length > TAMANHO_MAXIMO_NOME) {
    return invalido(`O nome do serviço deve ter no máximo ${TAMANHO_MAXIMO_NOME} caracteres.`);
  }

  const descricao = texto(corpo.descricao);
  if (descricao.length > TAMANHO_MAXIMO_DESCRICAO) {
    return invalido(`A descrição deve ter no máximo ${TAMANHO_MAXIMO_DESCRICAO} caracteres.`);
  }

  // Campo vazio = sob consulta.
  const vazio = corpo.valor === undefined || corpo.valor === null || corpo.valor === '';
  let valor = null;
  if (!vazio) {
    valor = numero(corpo.valor);
    if (valor === null) {
      return invalido('O valor deve ser um número ou ficar em branco para "Sob consulta".');
    }
    if (valor < 0) {
      return invalido('O valor não pode ser negativo.');
    }
    valor = Math.round(valor * 100) / 100;
  }

  const estaAtivo = ativo(corpo.ativo, 1);
  if (estaAtivo === null) {
    return invalido('O campo "ativo" deve ser verdadeiro ou falso.');
  }

  return valido({ tipo, descricao: descricao || null, valor, ativo: estaAtivo });
}

/**
 * Valida o :id recebido na URL.
 * @param {string} valorBruto
 * @returns {number|null} id valido ou null
 */
function validarId(valorBruto) {
  const id = Number(valorBruto);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

/**
 * Valida usuario e senha enviados no login.
 * @param {object} corpo
 */
function validarLogin(corpo) {
  if (!corpo || typeof corpo !== 'object') {
    return invalido('Informe usuário e senha.');
  }
  const usuario = texto(corpo.usuario);
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';

  if (usuario === '' || senha === '') {
    return invalido('Informe usuário e senha.');
  }
  if (usuario.length > TAMANHO_MAXIMO_NOME || senha.length > 200) {
    return invalido('Usuário ou senha em formato inválido.');
  }
  return valido({ usuario, senha });
}

module.exports = {
  validarProduto,
  validarServico,
  validarId,
  validarLogin,
  TAMANHO_MAXIMO_NOME,
  TAMANHO_MAXIMO_DESCRICAO
};
