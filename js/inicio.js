/* =========================================================
   inicio.js — navegação por hash (#/rota), título de cada
   tela, primeiro acesso (senha provisória e termo), aviso de
   inatividade e inicialização.
   Os dados vêm de dados/dados-iniciais.json, por isso o site
   precisa ser aberto por um servidor (GitHub Pages ou Live Server).
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.app = (function () {
  var ultimaRotaAuditada = '';
  var navegou = true;
  var primeiraTela = true; // na abertura, o foco fica no começo da página (o 1º Tab vai para "Pular para o conteúdo")

  // Rotas abertas (não precisam de login)
  var PUBLICAS = { entrar: 1, inscricao: 1, 'inscricao-ok': 1, sobre: 1, privacidade: 1, termos: 1, acessibilidade: 1, regras: 1, acesso: 1 };
  // Páginas informativas que continuam abertas durante o primeiro acesso
  var INFORMATIVAS = { sobre: 1, privacidade: 1, termos: 1, acessibilidade: 1, regras: 1 };

  // Títulos da aba: nunca levam nome de paciente
  var TITULOS = {
    entrar: 'Entrar', inscricao: 'Fila de espera', 'inscricao-ok': 'Inscrição recebida', sobre: 'Sobre o projeto', privacidade: 'Aviso de privacidade',
    termos: 'Termos de uso', acessibilidade: 'Acessibilidade', regras: 'Regras e leis', acesso: 'Leitura do prontuário', painel: 'Painel', casos: 'Casos',
    caso: 'Prontuário', imprimir: 'Cópia do prontuário', supervisao: 'Validação de evoluções', fila: 'Fila de espera', triagem: 'Triagem', alocacao: 'Alocação',
    agenda: 'Agenda', indicadores: 'Indicadores', solicitacoes: 'Acesso do paciente', 'meu-prontuario': 'Meu prontuário', 'meus-dados': 'Meus dados (LGPD)',
    'meu-plano': 'Meu plano de segurança',
    auditoria: 'Auditoria', 'pedidos-lgpd': 'Pedidos LGPD', conta: 'Minha conta', estudantes: 'Estudantes', paciente: 'Editar cadastro',
    'trocar-senha': 'Primeiro acesso', termo: 'Termo de responsabilidade'
  };

  function lerRota() {
    var partes = (window.location.hash || '#/entrar').replace(/^#\/?/, '').split('/');
    return { nome: partes[0] || 'entrar', p1: partes[1] || '', p2: partes[2] || '' };
  }

  // Registra na auditoria cada abertura de prontuário (uma vez por navegação)
  function auditarAbertura(u, rota) {
    if (!navegou || rota.nome !== 'caso') return;
    if (rota.p1 === ultimaRotaAuditada) return;
    ultimaRotaAuditada = rota.p1;
    var c = PEP.util.porId(PEP.db.casos, rota.p1);
    if (!c) return;
    // A técnica sem motivo vê só a capa do caso: o evento é registrado quando ela informa o motivo
    if (PEP.regras.podeVerCaso(u, c) && PEP.regras.precisaJustificar(u, c)) { ultimaRotaAuditada = ''; return; }
    PEP.estado.registrarAuditoria(PEP.regras.podeVerCaso(u, c) ? 'Abriu o prontuário' : 'Tentativa de acesso negada ao prontuário', c.id);
  }

  function conteudo(u, rota) {
    var T = PEP.telas;
    switch (rota.nome) {
      case 'entrar': return T.entrar();
      case 'inscricao': return T.inscricao();
      case 'inscricao-ok': return T.inscricaoConcluida();
      case 'sobre': return T.sobre();
      case 'privacidade': return T.privacidade();
      case 'termos': return T.termos();
      case 'acessibilidade': return T.acessibilidade();
      case 'regras': return T.regras();
      case 'acesso': return T.acessoLink(rota.p1);
      case 'trocar-senha': return T.trocarSenhaObrigatoria(u);
      case 'termo': return T.termo(u);
      case 'painel': return T.painel(u);
      case 'casos': return T.casos(u);
      case 'caso': return T.caso(u, rota.p1, rota.p2 || 'resumo');
      case 'imprimir': return T.imprimir(u, rota.p1);
      case 'supervisao': return T.supervisao(u);
      case 'fila': return T.fila(u);
      case 'triagem': return T.triagem(u, rota.p1);
      case 'paciente': return T.editarPaciente(u, rota.p1);
      case 'alocacao': return T.alocacao(u);
      case 'estudantes': return T.estudantes(u);
      case 'agenda': return T.agenda(u, rota.p1, rota.p2);
      case 'indicadores': return T.indicadores(u);
      case 'solicitacoes': return T.solicitacoes(u);
      case 'pedidos-lgpd': return T.pedidosLgpd(u);
      case 'meu-prontuario': return T.meuProntuario(u);
      case 'meus-dados': return T.meusDados(u);
      case 'meu-plano': return T.meuPlano(u);
      case 'auditoria': return T.auditoria(u);
      case 'conta': return T.conta(u);
      default: return '<h1>Página não encontrada</h1><a href="#/painel">Voltar ao painel</a>';
    }
  }

  function renderizar() {
    if (!PEP.db) return; // o JSON ainda não terminou de carregar
    var u = PEP.estado.usuarioAtual();
    var rota = lerRota();
    if (!u && !PUBLICAS[rota.nome]) { window.location.hash = '#/entrar'; rota = lerRota(); }
    if (u && rota.nome === 'entrar') { window.location.hash = '#/painel'; rota = lerRota(); }
    // Primeiro acesso: troca da senha provisória e aceite do termo vêm antes de tudo
    var pendencia = PEP.estado.pendenciaDeAcesso(u);
    if (pendencia && rota.nome !== pendencia && !INFORMATIVAS[rota.nome]) { window.location.hash = '#/' + pendencia; rota = lerRota(); }
    if (!pendencia && (rota.nome === 'trocar-senha' || rota.nome === 'termo')) { window.location.hash = '#/painel'; rota = lerRota(); }

    if (rota.nome === 'caso') auditarAbertura(u, rota);
    else if (navegou) ultimaRotaAuditada = '';
    if (navegou) carregarDoServidor(u, rota);

    PEP.ui.desenharTopo(u);
    PEP.ui.desenharMenu(u, window.location.hash);
    PEP.ui.desenharRodape();
    PEP.ui.definirTitulo(TITULOS[rota.nome] || '');
    var app = document.getElementById('app');
    try {
      app.innerHTML = conteudo(u, rota);
    } catch (erro) {
      app.innerHTML = '<h1>Erro ao montar a tela</h1><div class="aviso perigo">Use "Sair" e entre de novo. Se continuar, restaure os dados de demonstração.</div>';
      if (window.console) console.error(erro);
    }
    if (navegou) {
      window.scrollTo(0, 0);
      if (!primeiraTela) app.focus({ preventScroll: true });
      var anuncio = document.getElementById('anuncio');
      if (anuncio) anuncio.textContent = 'Página: ' + (TITULOS[rota.nome] || '');
    }
    navegou = false;
    primeiraTela = false;
  }

  // ---------- Inatividade: aviso 1 minuto antes de encerrar (WCAG 2.2, critério 2.2.1) ----------
  // No aviso, o texto que estava sendo escrito numa evolução é guardado como rascunho (só o autor vê).
  var rascunhosGuardados = null;
  function verificarInatividade() {
    var aviso = document.getElementById('aviso-sessao');
    var inativo = PEP.estado.tempoInativo();
    if (inativo === null) { aviso.hidden = true; rascunhosGuardados = null; return; }
    var limite = PEP.regra('inatividadeMinutos') * 60000;
    if (inativo >= limite) { aviso.hidden = true; rascunhosGuardados = null; renderizar(); return; }
    var faltam = Math.ceil((limite - inativo) / 1000);
    if (faltam <= 60) {
      if (rascunhosGuardados === null) rascunhosGuardados = PEP.acoes._guardarRascunhosAbertos();
      aviso.hidden = false;
      document.getElementById('aviso-sessao-texto').textContent = 'Por segurança, sua sessão vai encerrar em ' + faltam + ' segundos por falta de uso.' +
        (rascunhosGuardados ? ' O texto que você estava escrevendo foi guardado como rascunho.' : '');
    } else { aviso.hidden = true; rascunhosGuardados = null; }
  }

  function continuarSessao() {
    PEP.estado.marcarAtividade(true);
    document.getElementById('aviso-sessao').hidden = true;
    rascunhosGuardados = null;
    PEP.ui.toast('Sessão mantida.');
  }

  // Banco ligado: os indicadores vêm prontos do servidor (app.indicadores). Busca ao abrir a tela
  // de indicadores ou o painel da direção; a tela mostra "Carregando…" até chegar.
  function carregarDoServidor(u, rota) {
    var ad = PEP.repo.adaptador();
    if (!ad.remoto || !u || !ad.indicadores) return;
    if (rota.nome === 'meus-dados' && u.perfil === 'paciente' && !PEP.telas._acessosRemotos) {
      ad.acessosAoMeuProntuario().then(function (l) { PEP.telas._acessosRemotos = l; renderizar(); },
        function () { PEP.ui.toast('Não foi possível carregar a lista de acessos.'); });
    }
    var precisa = rota.nome === 'indicadores' || (rota.nome === 'painel' && u.perfil === 'direcao');
    if (!precisa || PEP.telas._indicadoresRemotos) return;
    ad.indicadores().then(function (ind) { PEP.telas._indicadoresRemotos = ind; renderizar(); },
      function () { PEP.ui.toast('Não foi possível carregar os indicadores do servidor.'); });
  }

  ['click', 'keydown', 'touchstart'].forEach(function (tipo) {
    document.addEventListener(tipo, function () { PEP.estado.marcarAtividade(); }, { passive: true });
  });
  setInterval(function () { if (PEP.db) verificarInatividade(); }, 5000);

  window.addEventListener('hashchange', function () {
    navegou = true;
    document.getElementById('toast').classList.remove('visivel');
    var rota = lerRota();
    if (rota.nome !== 'solicitacoes') PEP.telas._ultimoLink = null;
    if (rota.nome !== 'auditoria') PEP.telas._verificacao = null;
    if (rota.nome !== 'acesso') PEP.telas._linkLiberado = null;
    if (rota.nome !== 'estudantes') PEP.telas._importacao = null;
    if (rota.nome !== 'indicadores' && rota.nome !== 'painel') PEP.telas._indicadoresRemotos = null; // ao voltar, busca números novos
    if (rota.nome !== 'meus-dados') PEP.telas._acessosRemotos = null;
    renderizar();
  });

  // A ação que já registrou a abertura (ex.: motivo da técnica) avisa, para não registrar duas vezes
  function marcarAberturaRegistrada(casoId) { ultimaRotaAuditada = casoId; navegou = true; }

  return { renderizar: renderizar, continuarSessao: continuarSessao, marcarAberturaRegistrada: marcarAberturaRegistrada };
})();

// Inicialização: primeiro lê o JSON de dados, depois desenha a tela
PEP.carregarDadosJson()
  .then(function () {
    PEP.estado.carregar();
    // Banco ligado e sessão aberta: busca de novo os dados que o usuário pode ver
    var ad = PEP.repo.adaptador();
    return ad.remoto && ad.temSessao() ? ad.carregar() : null;
  })
  .then(function () { PEP.app.renderizar(); })
  .catch(function (erro) {
    document.getElementById('app').innerHTML =
      '<h1>Não foi possível abrir</h1><div class="aviso perigo"><strong>Não foi possível ler os dados (dados/dados-iniciais.json).</strong> ' +
      'Abra o site por um servidor (ex.: GitHub Pages ou a extensão Live Server), não com duplo clique no arquivo.</div>';
    if (window.console) console.error(erro);
  });
