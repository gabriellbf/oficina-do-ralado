/* ==========================================================================
   painel.js — painel administrativo da Oficina do Ralado
   --------------------------------------------------------------------------
   Conversa com as rotas protegidas /api/admin/*. Se o cookie de sessao nao
   existir mais, o servidor responde 401 e mandamos o usuario para o login.

   O painel foi pensado para o celular do proprietario:
     - o caminho mais curto (mudar um preco) esta direto no cartao do item;
     - os textos dos botoes sao simples: "Salvar preço", "Esconder do site";
     - toda acao termina com uma mensagem clara de sucesso ou de erro.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Funcoes de apoio
   -------------------------------------------------------------------------- */

/**
 * Escapa caracteres de HTML. Mesma funcao de /js/comum.js, repetida aqui para
 * o painel nao precisar carregar o JavaScript do site publico.
 * @param {*} valor
 * @returns {string}
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
 * Formata um numero para aparecer dentro do campo de preco: 489.9 -> "489,90".
 * @param {number} valor
 * @returns {string}
 */
function paraCampo(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}

/** Formata um numero como moeda brasileira. */
function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}

const recado = document.getElementById('recado');

/**
 * Mostra uma mensagem no topo do painel.
 * @param {string} texto
 * @param {'sucesso'|'erro'} tipo
 */
function mostrarRecado(texto, tipo) {
  recado.textContent = texto;
  recado.className = 'aviso recado ' + (tipo === 'erro' ? 'aviso--erro' : 'aviso--sucesso');
  recado.classList.remove('escondido');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Esconde a mensagem atual. */
function limparRecado() {
  recado.classList.add('escondido');
  recado.textContent = '';
}

/**
 * Faz uma chamada na API do painel tratando os erros mais comuns.
 * @param {string} url
 * @param {{metodo?: string, corpo?: object}} [opcoes]
 * @returns {Promise<any>}
 */
async function chamarApi(url, opcoes = {}) {
  const configuracao = { method: opcoes.metodo || 'GET', headers: { Accept: 'application/json' } };

  if (opcoes.corpo) {
    configuracao.headers['Content-Type'] = 'application/json';
    configuracao.body = JSON.stringify(opcoes.corpo);
  }

  const resposta = await fetch(url, configuracao);

  // Sessao expirada ou usuario deslogado: volta para o login.
  if (resposta.status === 401) {
    window.location.href = '/admin/login.html';
    throw new Error('Sessão expirada.');
  }

  const corpo = await resposta.json().catch(function () {
    return {};
  });

  if (!resposta.ok) {
    throw new Error(corpo.erro || 'Não foi possível concluir a operação.');
  }
  return corpo;
}

/* --------------------------------------------------------------------------
   Estado da tela
   -------------------------------------------------------------------------- */

/** Listas carregadas do servidor (usadas ao editar e ao esconder/mostrar). */
const dados = { produtos: [], servicos: [] };

/** Id do item sendo editado em cada formulario (null = cadastro novo). */
const editando = { produto: null, servico: null };

/** Nome bonito de cada categoria. */
const NOME_CATEGORIA = { bateria: 'Bateria', pneu: 'Pneu', lampada: 'Lâmpada', outro: 'Outro' };

/* --------------------------------------------------------------------------
   Desenho das listas
   -------------------------------------------------------------------------- */

/**
 * Monta o cartao de um produto no painel.
 * @param {object} produto
 * @returns {string}
 */
function montarItemProduto(produto) {
  const oculto = produto.ativo === 0;

  return (
    '<article class="item' +
    (oculto ? ' item--oculto' : '') +
    '" data-tipo="produto" data-id="' +
    produto.id +
    '">' +
    '<div class="item__cabecalho">' +
    '<h3 class="item__nome">' +
    escaparHtml(produto.nome) +
    '</h3>' +
    '<span class="item__situacao' +
    (oculto ? ' item__situacao--oculto' : '') +
    '">' +
    (oculto ? 'Escondido' : 'No site') +
    '</span>' +
    '</div>' +
    '<p class="item__descricao">' +
    escaparHtml(NOME_CATEGORIA[produto.categoria] || 'Produto') +
    ' — preço atual ' +
    escaparHtml(formatarPreco(produto.preco)) +
    '</p>' +
    // Caminho rapido: trocar o preco sem abrir formulario nenhum.
    '<div class="linha-preco">' +
    '<div class="linha-preco__campo">' +
    '<label for="preco-produto-' +
    produto.id +
    '">Preço (R$)</label>' +
    '<input type="text" inputmode="decimal" id="preco-produto-' +
    produto.id +
    '" value="' +
    escaparHtml(paraCampo(produto.preco)) +
    '" data-campo-preco />' +
    '</div>' +
    '<button class="botao" type="button" data-acao="salvar-preco">Salvar preço</button>' +
    '</div>' +
    '<div class="item__acoes">' +
    '<button class="botao botao--neutro botao--pequeno" type="button" data-acao="editar">Editar tudo</button>' +
    '<button class="botao botao--neutro botao--pequeno" type="button" data-acao="alternar">' +
    (oculto ? 'Mostrar no site' : 'Esconder do site') +
    '</button>' +
    '<button class="botao botao--perigo botao--pequeno" type="button" data-acao="excluir">Excluir</button>' +
    '</div>' +
    '</article>'
  );
}

/**
 * Monta o cartao de um servico no painel.
 * @param {object} servico
 * @returns {string}
 */
function montarItemServico(servico) {
  const oculto = servico.ativo === 0;
  const semValor = servico.valor === null || servico.valor === undefined;

  return (
    '<article class="item' +
    (oculto ? ' item--oculto' : '') +
    '" data-tipo="servico" data-id="' +
    servico.id +
    '">' +
    '<div class="item__cabecalho">' +
    '<h3 class="item__nome">' +
    escaparHtml(servico.tipo) +
    '</h3>' +
    '<span class="item__situacao' +
    (oculto ? ' item__situacao--oculto' : '') +
    '">' +
    (oculto ? 'Escondido' : 'No site') +
    '</span>' +
    '</div>' +
    '<p class="item__descricao">Valor atual: ' +
    (semValor ? 'Sob consulta' : escaparHtml(formatarPreco(servico.valor))) +
    '</p>' +
    '<div class="linha-preco">' +
    '<div class="linha-preco__campo">' +
    '<label for="preco-servico-' +
    servico.id +
    '">Valor (R$)</label>' +
    '<input type="text" inputmode="decimal" id="preco-servico-' +
    servico.id +
    '" value="' +
    (semValor ? '' : escaparHtml(paraCampo(servico.valor))) +
    '" placeholder="vazio = sob consulta" data-campo-preco />' +
    '</div>' +
    '<button class="botao" type="button" data-acao="salvar-preco">Salvar valor</button>' +
    '</div>' +
    '<div class="item__acoes">' +
    '<button class="botao botao--neutro botao--pequeno" type="button" data-acao="editar">Editar tudo</button>' +
    '<button class="botao botao--neutro botao--pequeno" type="button" data-acao="alternar">' +
    (oculto ? 'Mostrar no site' : 'Esconder do site') +
    '</button>' +
    '<button class="botao botao--perigo botao--pequeno" type="button" data-acao="excluir">Excluir</button>' +
    '</div>' +
    '</article>'
  );
}

/** Busca os produtos no servidor e desenha a lista. */
async function carregarProdutos() {
  const container = document.getElementById('lista-produtos');
  try {
    dados.produtos = await chamarApi('/api/admin/produtos');
    container.innerHTML = dados.produtos.length
      ? dados.produtos.map(montarItemProduto).join('')
      : '<p class="aviso">Nenhum produto cadastrado ainda.</p>';
  } catch (erro) {
    container.innerHTML = '<p class="aviso aviso--erro">' + escaparHtml(erro.message) + '</p>';
  }
}

/** Busca os servicos no servidor e desenha a lista. */
async function carregarServicos() {
  const container = document.getElementById('lista-servicos');
  try {
    dados.servicos = await chamarApi('/api/admin/servicos');
    container.innerHTML = dados.servicos.length
      ? dados.servicos.map(montarItemServico).join('')
      : '<p class="aviso">Nenhum serviço cadastrado ainda.</p>';
  } catch (erro) {
    container.innerHTML = '<p class="aviso aviso--erro">' + escaparHtml(erro.message) + '</p>';
  }
}

/* --------------------------------------------------------------------------
   Acoes dos cartoes (salvar preco, editar, esconder, excluir)
   -------------------------------------------------------------------------- */

/**
 * Encontra o item carregado na memoria pelo tipo e pelo id.
 * @param {'produto'|'servico'} tipo
 * @param {number} id
 */
function acharItem(tipo, id) {
  const lista = tipo === 'produto' ? dados.produtos : dados.servicos;
  return lista.find(function (item) {
    return item.id === id;
  });
}

/**
 * Envia um item completo para o servidor (PUT), depois recarrega a lista.
 * @param {'produto'|'servico'} tipo
 * @param {object} item corpo ja montado
 */
async function salvarItem(tipo, item) {
  const caminho = tipo === 'produto' ? 'produtos' : 'servicos';
  await chamarApi('/api/admin/' + caminho + '/' + item.id, { metodo: 'PUT', corpo: item });
  if (tipo === 'produto') {
    await carregarProdutos();
  } else {
    await carregarServicos();
  }
}

/**
 * Trata os cliques nos botoes dos cartoes (um so "escutador" para toda a lista).
 * @param {Event} evento
 */
async function aoClicarNaLista(evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;

  const cartao = botao.closest('.item');
  const tipo = cartao.getAttribute('data-tipo');
  const id = Number(cartao.getAttribute('data-id'));
  const item = acharItem(tipo, id);
  if (!item) return;

  const acao = botao.getAttribute('data-acao');
  limparRecado();

  try {
    /* ---- Salvar apenas o preco (caminho mais rapido do painel) ---- */
    if (acao === 'salvar-preco') {
      const campo = cartao.querySelector('[data-campo-preco]');
      const digitado = campo.value.trim();

      if (tipo === 'produto') {
        await salvarItem('produto', {
          id: item.id,
          nome: item.nome,
          descricao: item.descricao,
          categoria: item.categoria,
          preco: digitado,
          ativo: item.ativo
        });
        mostrarRecado('Preço de "' + item.nome + '" salvo com sucesso!', 'sucesso');
      } else {
        await salvarItem('servico', {
          id: item.id,
          tipo: item.tipo,
          descricao: item.descricao,
          valor: digitado, // vazio = sob consulta
          ativo: item.ativo
        });
        mostrarRecado('Valor de "' + item.tipo + '" salvo com sucesso!', 'sucesso');
      }
      return;
    }

    /* ---- Esconder / mostrar no site ---- */
    if (acao === 'alternar') {
      const novoAtivo = item.ativo === 1 ? 0 : 1;
      const nome = tipo === 'produto' ? item.nome : item.tipo;

      if (tipo === 'produto') {
        await salvarItem('produto', {
          id: item.id,
          nome: item.nome,
          descricao: item.descricao,
          categoria: item.categoria,
          preco: item.preco,
          ativo: novoAtivo
        });
      } else {
        await salvarItem('servico', {
          id: item.id,
          tipo: item.tipo,
          descricao: item.descricao,
          valor: item.valor,
          ativo: novoAtivo
        });
      }

      mostrarRecado(
        novoAtivo === 1 ? '"' + nome + '" voltou a aparecer no site.' : '"' + nome + '" foi escondido do site.',
        'sucesso'
      );
      return;
    }

    /* ---- Abrir o formulario completo ---- */
    if (acao === 'editar') {
      if (tipo === 'produto') {
        abrirFormularioProduto(item);
      } else {
        abrirFormularioServico(item);
      }
      return;
    }

    /* ---- Excluir (sempre com confirmacao) ---- */
    if (acao === 'excluir') {
      const nome = tipo === 'produto' ? item.nome : item.tipo;
      const confirmou = window.confirm('Tem certeza que deseja EXCLUIR "' + nome + '"?\n\nIsso não pode ser desfeito.');
      if (!confirmou) return;

      const caminho = tipo === 'produto' ? 'produtos' : 'servicos';
      await chamarApi('/api/admin/' + caminho + '/' + id, { metodo: 'DELETE' });

      if (tipo === 'produto') {
        await carregarProdutos();
      } else {
        await carregarServicos();
      }
      mostrarRecado('"' + nome + '" foi excluído.', 'sucesso');
    }
  } catch (erro) {
    mostrarRecado(erro.message, 'erro');
  }
}

/* --------------------------------------------------------------------------
   Formularios de cadastro e edicao
   -------------------------------------------------------------------------- */

const formProduto = document.getElementById('form-produto');
const formServico = document.getElementById('form-servico');

/**
 * Abre o formulario de produto. Sem argumento = cadastro novo.
 * @param {object} [produto]
 */
function abrirFormularioProduto(produto) {
  editando.produto = produto ? produto.id : null;
  document.getElementById('titulo-form-produto').textContent = produto ? 'Editar produto' : 'Novo produto';
  document.getElementById('produto-nome').value = produto ? produto.nome : '';
  document.getElementById('produto-categoria').value = produto ? produto.categoria : 'bateria';
  document.getElementById('produto-preco').value = produto ? paraCampo(produto.preco) : '';
  document.getElementById('produto-descricao').value = produto && produto.descricao ? produto.descricao : '';

  formProduto.classList.remove('escondido');
  formProduto.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('produto-nome').focus();
}

/**
 * Abre o formulario de servico. Sem argumento = cadastro novo.
 * @param {object} [servico]
 */
function abrirFormularioServico(servico) {
  editando.servico = servico ? servico.id : null;
  document.getElementById('titulo-form-servico').textContent = servico ? 'Editar serviço' : 'Novo serviço';
  document.getElementById('servico-tipo').value = servico ? servico.tipo : '';
  document.getElementById('servico-valor').value =
    servico && servico.valor !== null && servico.valor !== undefined ? paraCampo(servico.valor) : '';
  document.getElementById('servico-descricao').value = servico && servico.descricao ? servico.descricao : '';

  formServico.classList.remove('escondido');
  formServico.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('servico-tipo').focus();
}

/** Fecha um dos formularios. */
function fecharFormulario(qual) {
  editando[qual] = null;
  (qual === 'produto' ? formProduto : formServico).classList.add('escondido');
}

formProduto.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  limparRecado();

  const corpo = {
    nome: document.getElementById('produto-nome').value,
    categoria: document.getElementById('produto-categoria').value,
    preco: document.getElementById('produto-preco').value,
    descricao: document.getElementById('produto-descricao').value,
    // Ao editar mantemos a situacao atual; ao cadastrar o item ja nasce visivel.
    ativo: editando.produto ? (acharItem('produto', editando.produto) || { ativo: 1 }).ativo : 1
  };

  try {
    if (editando.produto) {
      await chamarApi('/api/admin/produtos/' + editando.produto, { metodo: 'PUT', corpo: corpo });
      mostrarRecado('Produto atualizado com sucesso!', 'sucesso');
    } else {
      await chamarApi('/api/admin/produtos', { metodo: 'POST', corpo: corpo });
      mostrarRecado('Produto cadastrado com sucesso!', 'sucesso');
    }
    fecharFormulario('produto');
    await carregarProdutos();
  } catch (erro) {
    mostrarRecado(erro.message, 'erro');
  }
});

formServico.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  limparRecado();

  const corpo = {
    tipo: document.getElementById('servico-tipo').value,
    valor: document.getElementById('servico-valor').value,
    descricao: document.getElementById('servico-descricao').value,
    ativo: editando.servico ? (acharItem('servico', editando.servico) || { ativo: 1 }).ativo : 1
  };

  try {
    if (editando.servico) {
      await chamarApi('/api/admin/servicos/' + editando.servico, { metodo: 'PUT', corpo: corpo });
      mostrarRecado('Serviço atualizado com sucesso!', 'sucesso');
    } else {
      await chamarApi('/api/admin/servicos', { metodo: 'POST', corpo: corpo });
      mostrarRecado('Serviço cadastrado com sucesso!', 'sucesso');
    }
    fecharFormulario('servico');
    await carregarServicos();
  } catch (erro) {
    mostrarRecado(erro.message, 'erro');
  }
});

/* --------------------------------------------------------------------------
   Abas, sair e inicializacao
   -------------------------------------------------------------------------- */

/**
 * Troca a aba visivel.
 * @param {'produtos'|'servicos'} qual
 */
function trocarAba(qual) {
  const ehProdutos = qual === 'produtos';
  document.getElementById('aba-produtos').setAttribute('aria-selected', ehProdutos ? 'true' : 'false');
  document.getElementById('aba-servicos').setAttribute('aria-selected', ehProdutos ? 'false' : 'true');
  document.getElementById('painel-produtos').classList.toggle('escondido', !ehProdutos);
  document.getElementById('painel-servicos').classList.toggle('escondido', ehProdutos);
  limparRecado();
}

/** Confere se a sessao ainda vale; se nao valer, volta para o login. */
async function conferirSessao() {
  const resposta = await fetch('/api/sessao', { headers: { Accept: 'application/json' } });
  const corpo = await resposta.json();
  if (!corpo.autenticado) {
    window.location.href = '/admin/login.html';
    return false;
  }
  document.getElementById('nome-usuario').textContent = corpo.usuario;
  return true;
}

document.addEventListener('DOMContentLoaded', async function () {
  const liberado = await conferirSessao();
  if (!liberado) return;

  document.getElementById('aba-produtos').addEventListener('click', function () {
    trocarAba('produtos');
  });
  document.getElementById('aba-servicos').addEventListener('click', function () {
    trocarAba('servicos');
  });

  document.getElementById('botao-novo-produto').addEventListener('click', function () {
    abrirFormularioProduto();
  });
  document.getElementById('botao-novo-servico').addEventListener('click', function () {
    abrirFormularioServico();
  });

  document.querySelectorAll('[data-cancelar]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      fecharFormulario(botao.getAttribute('data-cancelar'));
    });
  });

  document.getElementById('lista-produtos').addEventListener('click', aoClicarNaLista);
  document.getElementById('lista-servicos').addEventListener('click', aoClicarNaLista);

  document.getElementById('botao-sair').addEventListener('click', async function () {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });

  await carregarProdutos();
  await carregarServicos();
});
