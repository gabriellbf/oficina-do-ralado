/**
 * Consultas ao banco de dados.
 *
 * Todas as queries usam parametros (?) — nunca concatenamos texto vindo do
 * usuario dentro do SQL. Isso e o que protege o sistema contra SQL Injection.
 */

const { agora } = require('./db');

/* ------------------------------------------------------------------ */
/* Produtos                                                            */
/* ------------------------------------------------------------------ */

/**
 * Lista produtos para o site publico (apenas os ativos).
 * @param {import('better-sqlite3').Database} db
 * @param {{categoria?: string, busca?: string}} [filtros]
 */
function listarProdutosPublicos(db, filtros = {}) {
  let sql = 'SELECT id, nome, descricao, categoria, preco FROM produto WHERE ativo = 1';
  const parametros = [];

  if (filtros.categoria) {
    sql += ' AND categoria = ?';
    parametros.push(filtros.categoria);
  }
  if (filtros.busca) {
    // LIKE com parametro: o texto digitado nunca vira codigo SQL.
    sql += ' AND LOWER(nome) LIKE ?';
    parametros.push(`%${String(filtros.busca).toLowerCase()}%`);
  }

  sql += ' ORDER BY categoria, nome';
  return db.prepare(sql).all(...parametros);
}

/** Lista todos os produtos (painel administrativo: ativos e ocultos). */
function listarProdutosAdmin(db) {
  return db
    .prepare('SELECT id, nome, descricao, categoria, preco, ativo, atualizado_em FROM produto ORDER BY categoria, nome')
    .all();
}

/** Busca um produto pelo id. Devolve undefined se nao existir. */
function buscarProduto(db, id) {
  return db
    .prepare('SELECT id, nome, descricao, categoria, preco, ativo, atualizado_em FROM produto WHERE id = ?')
    .get(id);
}

/** Cria um produto e devolve o registro salvo. */
function criarProduto(db, dados) {
  const info = db
    .prepare(
      `INSERT INTO produto (nome, descricao, categoria, preco, ativo, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(dados.nome, dados.descricao, dados.categoria, dados.preco, dados.ativo, agora());
  return buscarProduto(db, info.lastInsertRowid);
}

/** Atualiza um produto. Devolve o registro atualizado ou undefined. */
function atualizarProduto(db, id, dados) {
  const info = db
    .prepare(
      `UPDATE produto
          SET nome = ?, descricao = ?, categoria = ?, preco = ?, ativo = ?, atualizado_em = ?
        WHERE id = ?`
    )
    .run(dados.nome, dados.descricao, dados.categoria, dados.preco, dados.ativo, agora(), id);
  if (info.changes === 0) return undefined;
  return buscarProduto(db, id);
}

/** Exclui um produto. Devolve true se algo foi apagado. */
function excluirProduto(db, id) {
  return db.prepare('DELETE FROM produto WHERE id = ?').run(id).changes > 0;
}

/* ------------------------------------------------------------------ */
/* Servicos                                                            */
/* ------------------------------------------------------------------ */

/** Lista servicos para o site publico (apenas os ativos). */
function listarServicosPublicos(db) {
  return db.prepare('SELECT id, tipo, descricao, valor FROM servico WHERE ativo = 1 ORDER BY id').all();
}

/** Lista todos os servicos (painel administrativo). */
function listarServicosAdmin(db) {
  return db
    .prepare('SELECT id, tipo, descricao, valor, ativo, atualizado_em FROM servico ORDER BY id')
    .all();
}

/** Busca um servico pelo id. */
function buscarServico(db, id) {
  return db
    .prepare('SELECT id, tipo, descricao, valor, ativo, atualizado_em FROM servico WHERE id = ?')
    .get(id);
}

/** Cria um servico e devolve o registro salvo. */
function criarServico(db, dados) {
  const info = db
    .prepare(
      `INSERT INTO servico (tipo, descricao, valor, ativo, atualizado_em)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(dados.tipo, dados.descricao, dados.valor, dados.ativo, agora());
  return buscarServico(db, info.lastInsertRowid);
}

/** Atualiza um servico. */
function atualizarServico(db, id, dados) {
  const info = db
    .prepare(
      `UPDATE servico
          SET tipo = ?, descricao = ?, valor = ?, ativo = ?, atualizado_em = ?
        WHERE id = ?`
    )
    .run(dados.tipo, dados.descricao, dados.valor, dados.ativo, agora(), id);
  if (info.changes === 0) return undefined;
  return buscarServico(db, id);
}

/** Exclui um servico. */
function excluirServico(db, id) {
  return db.prepare('DELETE FROM servico WHERE id = ?').run(id).changes > 0;
}

/* ------------------------------------------------------------------ */
/* Usuarios                                                            */
/* ------------------------------------------------------------------ */

/** Busca o usuario do painel pelo nome de login. */
function buscarUsuario(db, usuario) {
  return db.prepare('SELECT id, usuario, senha_hash FROM usuario WHERE usuario = ?').get(usuario);
}

module.exports = {
  listarProdutosPublicos,
  listarProdutosAdmin,
  buscarProduto,
  criarProduto,
  atualizarProduto,
  excluirProduto,
  listarServicosPublicos,
  listarServicosAdmin,
  buscarServico,
  criarServico,
  atualizarServico,
  excluirServico,
  buscarUsuario
};
