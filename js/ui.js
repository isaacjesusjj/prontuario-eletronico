/* =========================================================
   ui.js — topo, menu por perfil e pequenos componentes.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.ui = (function () {
  var esc = function (t) { return PEP.util.esc(t); };

  // Menu de cada perfil: cada um vê só o que precisa (princípio da necessidade)
  var MENUS = {
    estagiario: [['#/painel', 'Painel'], ['#/casos', 'Meus casos'], ['#/agenda', 'Agenda'], ['#/sobre', 'Sobre']],
    supervisor: [['#/painel', 'Painel'], ['#/supervisao', 'Validação'], ['#/casos', 'Casos dos meus grupos'], ['#/alocacao', 'Duplas e trios'], ['#/agenda', 'Agenda'], ['#/indicadores', 'Indicadores'], ['#/sobre', 'Sobre']],
    tecnico: [['#/painel', 'Painel'], ['#/fila', 'Fila de espera'], ['#/casos', 'Casos'], ['#/alocacao', 'Alocação'], ['#/agenda', 'Agenda'], ['#/solicitacoes', 'Acesso do paciente'], ['#/indicadores', 'Indicadores'], ['#/auditoria', 'Auditoria'], ['#/sobre', 'Sobre']],
    paciente: [['#/painel', 'Início'], ['#/agenda', 'Minhas sessões'], ['#/meu-prontuario', 'Meu prontuário'], ['#/sobre', 'Sobre']],
    direcao: [['#/painel', 'Painel'], ['#/indicadores', 'Indicadores'], ['#/alocacao', 'Grupos de estágio'], ['#/sobre', 'Sobre']]
  };

  function nomeUsuario(id) {
    var u = PEP.util.porId(PEP.db.usuarios, id);
    return u ? u.nome : (id === 'visitante' ? 'Visitante' : id);
  }

  function pacienteDoCaso(caso) { return PEP.util.porId(PEP.db.pacientes, caso.pacienteId); }

  function nomePacienteDoCaso(caso) {
    var p = pacienteDoCaso(caso);
    return p ? p.nome : '—';
  }

  function desenharTopo(u) {
    var topo = document.getElementById('topo');
    var html = '<a class="marca" href="' + (u ? '#/painel' : '#/entrar') + '">' +
      '<span class="marca-icone" aria-hidden="true">V</span>' +
      '<span><span class="marca-nome">Vínculo</span><span class="marca-sub">Prontuário da Clínica-Escola de Psicologia</span></span></a>';
    if (u) {
      html += '<div class="usuario-atual"><span>' + esc(u.nome) + '</span>' +
        '<span class="selo-perfil">' + esc(PEP.regras.nomePerfil(u.perfil)) + '</span>' +
        '<button class="botao secundario pequeno" data-acao="sair">Trocar perfil</button></div>';
    }
    topo.innerHTML = html;
  }

  function desenharMenu(u, rotaAtual) {
    var menu = document.getElementById('menu');
    if (!u) { menu.innerHTML = ''; return; }
    var itens = MENUS[u.perfil] || [];
    menu.innerHTML = itens.map(function (item) {
      var ativo = rotaAtual.indexOf(item[0]) === 0 || (item[0] === '#/casos' && rotaAtual.indexOf('#/caso/') === 0);
      return '<a href="' + item[0] + '"' + (ativo ? ' class="ativo" aria-current="page"' : '') + '>' + item[1] + '</a>';
    }).join('');
  }

  function etiquetaEvolucao(status) {
    var nomes = { rascunho: 'Rascunho', enviada: 'Enviada à supervisão', devolvida: 'Devolvida', validada: 'Validada · bloqueada' };
    return '<span class="etiqueta ' + status + '">' + (nomes[status] || status) + '</span>';
  }

  function etiquetaCaso(caso) {
    if (caso.status === 'encerrado') {
      var tipo = caso.encerramento ? caso.encerramento.tipo : '';
      return '<span class="etiqueta rascunho">Encerrado' + (tipo ? ' · ' + esc(tipo) : '') + '</span>';
    }
    if (caso.status === 'aguardando-alocacao') return '<span class="etiqueta enviada">Aguardando alocação</span>';
    if (PEP.regras.emRiscoDeAbandono(caso)) return '<span class="etiqueta perigo">Risco de abandono</span>';
    return '<span class="etiqueta validada">Ativo</span>';
  }

  function numero(valor, rotulo) {
    return '<div class="cartao"><div class="numero">' + esc(valor) + '</div><div class="numero-rotulo">' + esc(rotulo) + '</div></div>';
  }

  function semPermissao(motivo) {
    return '<div class="aviso perigo"><strong>Acesso não permitido.</strong> ' + esc(motivo || 'Seu perfil não tem acesso a esta área.') + '</div>' +
      '<a class="botao secundario" href="#/painel">Voltar ao painel</a>';
  }

  var temporizador = null;
  function toast(mensagem) {
    var el = document.getElementById('toast');
    el.textContent = mensagem;
    el.classList.add('visivel');
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { el.classList.remove('visivel'); }, 2800);
  }

  return {
    nomeUsuario: nomeUsuario, pacienteDoCaso: pacienteDoCaso, nomePacienteDoCaso: nomePacienteDoCaso,
    desenharTopo: desenharTopo, desenharMenu: desenharMenu,
    etiquetaEvolucao: etiquetaEvolucao, etiquetaCaso: etiquetaCaso,
    numero: numero, semPermissao: semPermissao, toast: toast
  };
})();
