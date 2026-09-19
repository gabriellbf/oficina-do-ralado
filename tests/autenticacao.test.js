/**
 * Testes de login, sessao e protecao das rotas do painel.
 */

const request = require('supertest');
const { criarAmbiente, USUARIO_TESTE, SENHA_TESTE } = require('./ajuda');

let db;
let app;

beforeEach(() => {
  ({ db, app } = criarAmbiente());
});

afterEach(() => {
  db.close();
});

describe('POST /api/login', () => {
  test('usuario e senha corretos entram no painel', async () => {
    const resposta = await request(app).post('/api/login').send({ usuario: USUARIO_TESTE, senha: SENHA_TESTE });

    expect(resposta.status).toBe(200);
    expect(resposta.body.ok).toBe(true);
    expect(resposta.body.usuario).toBe(USUARIO_TESTE);
    // O cookie de sessao precisa ser httpOnly e sameSite=lax.
    const cookie = resposta.headers['set-cookie'].join(';');
    expect(cookie).toContain('oficina.sid');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  test('senha errada responde 401 e nao cria sessao', async () => {
    const resposta = await request(app).post('/api/login').send({ usuario: USUARIO_TESTE, senha: 'senha-errada' });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toBe('Usuário ou senha incorretos.');
    expect(resposta.headers['set-cookie']).toBeUndefined();
  });

  test('usuario inexistente responde 401 com a MESMA mensagem (nao entrega quais usuarios existem)', async () => {
    const resposta = await request(app).post('/api/login').send({ usuario: 'ninguem', senha: SENHA_TESTE });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toBe('Usuário ou senha incorretos.');
  });

  test('campos em branco respondem 400', async () => {
    const resposta = await request(app).post('/api/login').send({ usuario: '', senha: '' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('Informe usuário e senha.');
  });

  test('a senha e guardada como hash bcrypt, nunca em texto puro', () => {
    const registro = db.prepare('SELECT senha_hash FROM usuario WHERE usuario = ?').get(USUARIO_TESTE);

    expect(registro.senha_hash).not.toBe(SENHA_TESTE);
    expect(registro.senha_hash).toMatch(/^\$2[aby]\$/); // formato do bcrypt
  });
});

describe('GET /api/sessao', () => {
  test('sem login informa que nao esta autenticado', async () => {
    const resposta = await request(app).get('/api/sessao');

    expect(resposta.status).toBe(200);
    expect(resposta.body.autenticado).toBe(false);
  });

  test('depois do login informa o usuario conectado', async () => {
    const agente = request.agent(app);
    await agente.post('/api/login').send({ usuario: USUARIO_TESTE, senha: SENHA_TESTE });

    const resposta = await agente.get('/api/sessao');

    expect(resposta.body.autenticado).toBe(true);
    expect(resposta.body.usuario).toBe(USUARIO_TESTE);
  });
});

describe('POST /api/logout', () => {
  test('encerra a sessao e o acesso ao painel e perdido', async () => {
    const agente = request.agent(app);
    await agente.post('/api/login').send({ usuario: USUARIO_TESTE, senha: SENHA_TESTE });

    expect((await agente.get('/api/admin/produtos')).status).toBe(200);

    await agente.post('/api/logout');

    expect((await agente.get('/api/admin/produtos')).status).toBe(401);
  });
});

describe('Protecao das rotas /api/admin/*', () => {
  const rotas = [
    ['get', '/api/admin/produtos'],
    ['post', '/api/admin/produtos'],
    ['put', '/api/admin/produtos/1'],
    ['delete', '/api/admin/produtos/1'],
    ['get', '/api/admin/servicos'],
    ['post', '/api/admin/servicos'],
    ['put', '/api/admin/servicos/1'],
    ['delete', '/api/admin/servicos/1']
  ];

  test.each(rotas)('%s %s sem sessao responde 401', async (metodo, caminho) => {
    const resposta = await request(app)[metodo](caminho).send({ nome: 'Teste', categoria: 'outro', preco: 10 });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toBe('Você precisa entrar no painel para fazer isso.');
  });

  test('sem sessao o banco NAO e alterado', async () => {
    const antes = db.prepare('SELECT COUNT(*) AS total FROM produto').get().total;

    await request(app).post('/api/admin/produtos').send({ nome: 'Invasor', categoria: 'outro', preco: 1 });
    await request(app).delete('/api/admin/produtos/1');

    const depois = db.prepare('SELECT COUNT(*) AS total FROM produto').get().total;
    expect(depois).toBe(antes);
  });
});

describe('Protecao das PAGINAS do painel', () => {
  test('abrir /admin/ sem login redireciona para a tela de login', async () => {
    const resposta = await request(app).get('/admin/');

    expect(resposta.status).toBe(302);
    expect(resposta.headers.location).toBe('/admin/login.html');
  });

  test('a tela de login continua acessivel para todo mundo', async () => {
    const resposta = await request(app).get('/admin/login.html');

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('Painel da Oficina do Ralado');
  });

  test('depois de logar a pagina do painel abre normalmente', async () => {
    const agente = request.agent(app);
    await agente.post('/api/login').send({ usuario: USUARIO_TESTE, senha: SENHA_TESTE });

    const resposta = await agente.get('/admin/');

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('Produtos do catálogo');
  });
});
