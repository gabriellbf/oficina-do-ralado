/* ==========================================================================
   login.js — envia o formulario de login para POST /api/login
   --------------------------------------------------------------------------
   A senha nunca fica guardada no navegador: quem controla o acesso e o
   cookie de sessao criado pelo servidor (httpOnly, ou seja, o JavaScript
   nem consegue ler esse cookie).
   ========================================================================== */

const formulario = document.getElementById('form-login');
const recado = document.getElementById('recado');
const botao = document.getElementById('botao-entrar');

/**
 * Mostra uma mensagem para o usuario.
 * @param {string} texto
 * @param {'erro'|'sucesso'} tipo
 */
function mostrarRecado(texto, tipo) {
  recado.textContent = texto;
  recado.className = 'aviso recado ' + (tipo === 'sucesso' ? 'aviso--sucesso' : 'aviso--erro');
}

formulario.addEventListener('submit', async function (evento) {
  evento.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;

  if (!usuario || !senha) {
    mostrarRecado('Preencha o usuário e a senha.', 'erro');
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Entrando...';

  try {
    const resposta = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: usuario, senha: senha })
    });

    const corpo = await resposta.json().catch(function () {
      return {};
    });

    if (resposta.ok) {
      mostrarRecado('Pronto! Abrindo o painel...', 'sucesso');
      window.location.href = '/admin/';
      return;
    }

    // 401 = usuario/senha errados; 429 = muitas tentativas seguidas.
    mostrarRecado(corpo.erro || 'Não foi possível entrar. Tente novamente.', 'erro');
  } catch (erro) {
    mostrarRecado('Sem conexão com o servidor. Verifique a internet e tente de novo.', 'erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
});
