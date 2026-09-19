/**
 * Middleware de autenticacao.
 *
 * Toda rota /api/admin/* passa por aqui. Se nao existir uma sessao valida,
 * a requisicao e recusada com 401 (nao autorizado) antes de chegar ao banco.
 */

/**
 * Bloqueia o acesso de quem nao esta logado.
 */
function exigirLogin(req, res, next) {
  if (req.session && req.session.usuarioId) {
    return next();
  }
  return res.status(401).json({ erro: 'Você precisa entrar no painel para fazer isso.' });
}

module.exports = { exigirLogin };
