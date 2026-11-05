/* =========================================================
   estado.js — guarda os dados da demonstração no navegador
   (localStorage) e oferece funções utilitárias.
   Em um sistema real, isso seria um banco de dados no servidor.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.util = (function () {
  // Escapa texto antes de colocar no HTML (evita injeção de código)
  function esc(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function porId(lista, id) {
    for (var i = 0; i < lista.length; i++) { if (lista[i].id === id) return lista[i]; }
    return null;
  }

  function novoId(prefixo) {
    return prefixo + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function doisDigitos(n) { return n < 10 ? '0' + n : '' + n; }

  // Data de hoje no formato AAAA-MM-DD
  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + doisDigitos(d.getMonth() + 1) + '-' + doisDigitos(d.getDate());
  }

  // Data e hora agora no formato AAAA-MM-DDTHH:MM
  function agora() {
    var d = new Date();
    return hoje() + 'T' + doisDigitos(d.getHours()) + ':' + doisDigitos(d.getMinutes());
  }

  // "2026-08-19" -> "19/08/2026"; "2026-08-19T16:10" -> "19/08/2026 16:10"
  function formatarData(texto) {
    if (!texto) return '—';
    var partes = String(texto).split('T');
    var d = partes[0].split('-');
    if (d.length !== 3) return texto;
    var data = d[2] + '/' + d[1] + '/' + d[0];
    return partes[1] ? data + ' ' + partes[1] : data;
  }

  return { esc: esc, porId: porId, novoId: novoId, hoje: hoje, agora: agora, formatarData: formatarData };
})();

PEP.estado = (function () {
  var CHAVE_DADOS = 'vinculo-dados-v1';
  var CHAVE_USUARIO = 'vinculo-usuario-v1';
  var memoriaUsuario = null; // reserva caso o navegador bloqueie o armazenamento

  function ler(chave) {
    try { return window.localStorage.getItem(chave); } catch (e) { return null; }
  }
  function gravar(chave, valor) {
    try { window.localStorage.setItem(chave, valor); } catch (e) { /* segue só em memória */ }
  }
  function remover(chave) {
    try { window.localStorage.removeItem(chave); } catch (e) { /* ignora */ }
  }

  // Versão do arquivo dados/dados-iniciais.json (campo _meta.versao).
  // Quando o grupo muda o JSON e troca a versão, o navegador descarta a
  // cópia antiga guardada e carrega os dados novos.
  function versaoDoJson() {
    var d = PEP._dadosJson;
    return d && d._meta ? d._meta.versao : '';
  }

  function carregar() {
    var salvo = ler(CHAVE_DADOS);
    if (salvo) {
      try {
        var dados = JSON.parse(salvo);
        if (dados && dados._meta && dados._meta.versao === versaoDoJson()) { PEP.db = dados; return; }
      } catch (e) { /* dados corrompidos: recomeça */ }
    }
    PEP.db = PEP.criarDadosIniciais();
    salvar();
  }

  function salvar() { gravar(CHAVE_DADOS, JSON.stringify(PEP.db)); }

  function restaurar() {
    PEP.db = PEP.criarDadosIniciais();
    salvar();
  }

  function usuarioAtual() {
    var id = ler(CHAVE_USUARIO) || memoriaUsuario;
    return id ? PEP.util.porId(PEP.db.usuarios, id) : null;
  }

  function entrar(usuarioId) {
    memoriaUsuario = usuarioId;
    gravar(CHAVE_USUARIO, usuarioId);
    registrarAuditoria('Entrou no sistema', '—');
  }

  function sair() {
    registrarAuditoria('Saiu do sistema', '—');
    memoriaUsuario = null;
    remover(CHAVE_USUARIO);
  }

  // Login: confere usuário e senha.
  // SIMULAÇÃO: num sistema real, a conferência acontece no servidor,
  // que guarda só o hash da senha (a senha nunca vem para o navegador).
  var tentativas = 0;
  var bloqueadoAte = 0;
  var MAX_TENTATIVAS = 5;

  function autenticar(login, senha) {
    if (Date.now() < bloqueadoAte) return { ok: false, motivo: 'bloqueado' };
    var alvo = String(login || '').trim().toLowerCase();
    var achado = null;
    for (var i = 0; i < PEP.db.usuarios.length; i++) {
      if (String(PEP.db.usuarios[i].login || '').toLowerCase() === alvo) { achado = PEP.db.usuarios[i]; break; }
    }
    if (!achado || achado.senha !== senha) {
      tentativas++;
      // Registra a tentativa, nunca a senha digitada
      registrarAuditoria('Tentativa de login sem sucesso', alvo || '—');
      if (tentativas >= MAX_TENTATIVAS) {
        tentativas = 0;
        bloqueadoAte = Date.now() + 30000; // bloqueio temporário de 30 segundos
        return { ok: false, motivo: 'bloqueado' };
      }
      // Mensagem genérica: não revela se o erro foi no usuário ou na senha
      return { ok: false, motivo: 'invalido' };
    }
    tentativas = 0;
    entrar(achado.id);
    return { ok: true, usuario: achado };
  }

  // Trilha de auditoria: quem fez o quê, quando e em qual caso.
  // Nunca guarda conteúdo clínico, só a ação e o identificador.
  function registrarAuditoria(acao, alvo) {
    var u = usuarioAtual();
    PEP.db.auditoria.push({
      id: PEP.util.novoId('au'),
      em: PEP.util.agora(),
      usuarioId: u ? u.id : 'visitante',
      acao: acao,
      alvo: alvo || '—'
    });
    salvar();
  }

  return {
    carregar: carregar, salvar: salvar, restaurar: restaurar,
    usuarioAtual: usuarioAtual, entrar: entrar, sair: sair, autenticar: autenticar,
    registrarAuditoria: registrarAuditoria
  };
})();
