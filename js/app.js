/* =========================================================
   app.js — navegação por hash (#/rota) e inicialização.
   O hash funciona no GitHub Pages e abrindo o arquivo direto.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.app = (function () {
  var ultimaRotaAuditada = '';
  var navegou = true;

  // Rotas abertas (não precisam de perfil)
  var PUBLICAS = { entrar: true, inscricao: true, 'inscricao-ok': true, sobre: true };

  function lerRota() {
    var partes = (window.location.hash || '#/entrar').replace(/^#\/?/, '').split('/');
    return { nome: partes[0] || 'entrar', p1: partes[1] || '', p2: partes[2] || '' };
  }

  // Registra na auditoria cada abertura de prontuário (uma vez por navegação)
  function auditarAbertura(u, rota) {
    if (!navegou || rota.nome !== 'caso') return;
    var chave = rota.p1;
    if (chave === ultimaRotaAuditada) return;
    ultimaRotaAuditada = chave;
    var c = PEP.util.porId(PEP.db.casos, rota.p1);
    if (!c) return;
    PEP.estado.registrarAuditoria(PEP.regras.podeVerCaso(u, c) ? 'Abriu o prontuário' : 'Tentativa de acesso negada ao prontuário', c.id);
  }

  function conteudo(u, rota) {
    var T = PEP.telas;
    switch (rota.nome) {
      case 'entrar': return T.entrar();
      case 'inscricao': return T.inscricao();
      case 'inscricao-ok': return T.inscricaoConcluida();
      case 'sobre': return T.sobre();
      case 'painel': return T.painel(u);
      case 'casos': return T.casos(u);
      case 'caso': return T.caso(u, rota.p1, rota.p2 || 'resumo');
      case 'imprimir': return T.imprimir(u, rota.p1);
      case 'supervisao': return T.supervisao(u);
      case 'fila': return T.fila(u);
      case 'triagem': return T.triagem(u, rota.p1);
      case 'alocacao': return T.alocacao(u);
      case 'agenda': return T.agenda(u);
      case 'indicadores': return T.indicadores(u);
      case 'solicitacoes': return T.solicitacoes(u);
      case 'meu-prontuario': return T.meuProntuario(u);
      case 'auditoria': return T.auditoria(u);
      default: return '<h1>Página não encontrada</h1><a href="#/painel">Voltar ao painel</a>';
    }
  }

  function renderizar() {
    var u = PEP.estado.usuarioAtual();
    var rota = lerRota();
    if (!u && !PUBLICAS[rota.nome]) {
      window.location.hash = '#/entrar';
      rota = lerRota();
    }
    if (rota.nome === 'caso') auditarAbertura(u, rota);
    else if (navegou) ultimaRotaAuditada = '';

    PEP.ui.desenharTopo(u);
    PEP.ui.desenharMenu(u, window.location.hash);
    var app = document.getElementById('app');
    try {
      app.innerHTML = conteudo(u, rota);
    } catch (erro) {
      app.innerHTML = '<div class="aviso perigo">Erro ao montar a tela. Use "Trocar perfil" e tente de novo.</div>';
      if (window.console) console.error(erro);
    }
    if (navegou) {
      window.scrollTo(0, 0);
      app.focus();
    }
    navegou = false;
  }

  window.addEventListener('hashchange', function () { navegou = true; renderizar(); });

  return { renderizar: renderizar };
})();

// Inicialização
PEP.estado.carregar();
PEP.app.renderizar();
