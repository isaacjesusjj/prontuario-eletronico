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

  function carregar() {
    var salvo = ler(CHAVE_DADOS);
    if (salvo) {
      try { PEP.db = JSON.parse(salvo); return; } catch (e) { /* dados corrompidos: recomeça */ }
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
    usuarioAtual: usuarioAtual, entrar: entrar, sair: sair,
    registrarAuditoria: registrarAuditoria
  };
})();
