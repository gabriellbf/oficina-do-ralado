/**
 * Populacao inicial do banco (npm run seed).
 *
 * Cria as tabelas (se ainda nao existirem), insere produtos e servicos de
 * exemplo e cadastra o usuario administrador a partir das variaveis de
 * ambiente ADMIN_USER e ADMIN_PASSWORD.
 *
 * Tambem e chamado automaticamente pelo servidor quando o banco esta vazio,
 * porque na hospedagem gratuita (Render) o disco e apagado a cada deploy.
 */

require('dotenv').config();

const bcrypt = require('bcrypt');
const { abrirBanco, agora } = require('./db');

/** Custo do hash do bcrypt. 10 e o padrao recomendado. */
const CUSTO_BCRYPT = 10;

/*
 * ATENCAO: os precos abaixo sao APENAS EXEMPLO, para demonstrar o site.
 * Os valores reais devem ser cadastrados pelo Sr. Renê no painel
 * administrativo (/admin) ou confirmados antes da publicacao.
 */
const PRODUTOS_EXEMPLO = [
  {
    nome: 'Bateria 45Ah',
    descricao: 'Bateria automotiva 45Ah com 12 meses de garantia. Indicada para carros de passeio populares.',
    categoria: 'bateria',
    preco: 389.9 // preco de exemplo
  },
  {
    nome: 'Bateria 60Ah',
    descricao: 'Bateria automotiva 60Ah com 18 meses de garantia. Indicada para carros médios e utilitários.',
    categoria: 'bateria',
    preco: 489.9 // preco de exemplo
  },
  {
    nome: 'Pneu aro 13',
    descricao: 'Pneu novo aro 13 (175/70 R13). Montagem e balanceamento inclusos.',
    categoria: 'pneu',
    preco: 279.9 // preco de exemplo
  },
  {
    nome: 'Pneu aro 14',
    descricao: 'Pneu novo aro 14 (185/65 R14). Montagem e balanceamento inclusos.',
    categoria: 'pneu',
    preco: 329.9 // preco de exemplo
  },
  {
    nome: 'Lâmpada de farol H4',
    descricao: 'Lâmpada halógena H4 12V para farol alto e baixo. Par.',
    categoria: 'lampada',
    preco: 49.9 // preco de exemplo
  },
  {
    nome: 'Lâmpada de farol H7',
    descricao: 'Lâmpada halógena H7 12V para farol baixo. Par.',
    categoria: 'lampada',
    preco: 54.9 // preco de exemplo
  }
];

/*
 * Servicos de exemplo. Quando o valor e null, o site mostra "Sob consulta".
 */
const SERVICOS_EXEMPLO = [
  {
    tipo: 'Conserto de pneu furado',
    descricao: 'Remendo ou vulcanização do pneu furado, com remoção do objeto e teste de vazamento.',
    valor: 35 // valor de exemplo
  },
  {
    tipo: 'Troca de pneu',
    descricao: 'Desmontagem, montagem e balanceamento da roda.',
    valor: 40 // valor de exemplo
  },
  {
    tipo: 'Troca e teste de bateria',
    descricao: 'Teste da bateria e do alternador e instalação da bateria nova.',
    valor: null // sob consulta: depende do modelo do veículo
  },
  {
    tipo: 'Troca de lâmpada de farol',
    descricao: 'Substituição de lâmpada de farol alto, baixo ou lanterna.',
    valor: 25 // valor de exemplo
  },
  {
    tipo: 'Calibragem de pneus',
    descricao: 'Ajuste da pressão dos quatro pneus e do estepe.',
    valor: 0 // cortesia para clientes
  }
];

/**
 * Insere os dados de exemplo e o usuario administrador.
 * @param {import('better-sqlite3').Database} db banco ja aberto
 * @param {{usuario?: string, senha?: string, silencioso?: boolean}} [opcoes]
 */
function semear(db, opcoes = {}) {
  const usuarioAdmin = opcoes.usuario || process.env.ADMIN_USER || 'admin';
  const senhaAdmin = opcoes.senha || process.env.ADMIN_PASSWORD || 'trocar-esta-senha';
  const log = opcoes.silencioso ? () => {} : console.log;

  const data = agora();

  const inserirProduto = db.prepare(
    `INSERT INTO produto (nome, descricao, categoria, preco, ativo, atualizado_em)
     VALUES (@nome, @descricao, @categoria, @preco, 1, @atualizado_em)`
  );
  const inserirServico = db.prepare(
    `INSERT INTO servico (tipo, descricao, valor, ativo, atualizado_em)
     VALUES (@tipo, @descricao, @valor, 1, @atualizado_em)`
  );

  // transaction() garante que ou tudo e gravado, ou nada e gravado.
  const gravarTudo = db.transaction(() => {
    for (const produto of PRODUTOS_EXEMPLO) {
      inserirProduto.run({ ...produto, atualizado_em: data });
    }
    for (const servico of SERVICOS_EXEMPLO) {
      inserirServico.run({ ...servico, atualizado_em: data });
    }
  });

  gravarTudo();
  log(`Seed: ${PRODUTOS_EXEMPLO.length} produtos e ${SERVICOS_EXEMPLO.length} serviços inseridos.`);

  // Usuario administrador: a senha nunca e gravada em texto puro.
  const jaExiste = db.prepare('SELECT id FROM usuario WHERE usuario = ?').get(usuarioAdmin);
  if (jaExiste) {
    log(`Seed: usuário "${usuarioAdmin}" já existia, mantido como está.`);
  } else {
    const hash = bcrypt.hashSync(senhaAdmin, CUSTO_BCRYPT);
    db.prepare('INSERT INTO usuario (usuario, senha_hash) VALUES (?, ?)').run(usuarioAdmin, hash);
    log(`Seed: usuário administrador "${usuarioAdmin}" criado.`);
  }
}

// Permite rodar "npm run seed" direto pelo terminal.
if (require.main === module) {
  const db = abrirBanco();
  semear(db);
  db.close();
  console.log('Seed concluído.');
}

module.exports = { semear, PRODUTOS_EXEMPLO, SERVICOS_EXEMPLO };
