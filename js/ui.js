/* =========================================================
   ui.js — topo, barra de acessibilidade, menu por perfil,
   rodapé e pequenos componentes.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.ui = (function () {
  var esc = function (t) { return PEP.util.esc(t); };

  // Menu de cada perfil: cada um vê só o que precisa (princípio da necessidade)
  var MENUS = {
    estagiario: [['#/painel', 'Painel'], ['#/casos', 'Meus casos'], ['#/agenda', 'Agenda'], ['#/conta', 'Minha conta']],
    supervisor: [['#/painel', 'Painel'], ['#/supervisao', 'Validação'], ['#/casos', 'Casos dos meus grupos'], ['#/alocacao', 'Duplas e trios'],
      ['#/agenda', 'Agenda'], ['#/indicadores', 'Indicadores'], ['#/conta', 'Minha conta']],
    tecnico: [['#/painel', 'Painel'], ['#/fila', 'Fila de espera'], ['#/casos', 'Casos'], ['#/alocacao', 'Alocação'], ['#/agenda', 'Agenda'],
      ['#/solicitacoes', 'Acesso do paciente'], ['#/pedidos-lgpd', 'Pedidos LGPD'], ['#/indicadores', 'Indicadores'], ['#/auditoria', 'Auditoria'], ['#/conta', 'Minha conta']],
    paciente: [['#/painel', 'Início'], ['#/agenda', 'Minhas sessões'], ['#/meu-plano', 'Meu plano de segurança'], ['#/meu-prontuario', 'Meu prontuário'],
      ['#/meus-dados', 'Meus dados (LGPD)'], ['#/conta', 'Minha conta']],
    direcao: [['#/painel', 'Painel'], ['#/indicadores', 'Indicadores'], ['#/alocacao', 'Grupos de estágio'], ['#/estudantes', 'Estudantes'], ['#/conta', 'Minha conta']]
  };

  function nomeUsuario(id) {
    if (id === 'visitante') return 'Visitante';
    var u = PEP.util.porId(PEP.db.usuarios, id);
    if (!u) return id || '—';
    if (u.nome) return u.nome;
    var p = PEP.regras.pacienteDoUsuario(u);
    return p ? p.nome : u.login;
  }

  function pacienteDoCaso(caso) { return PEP.util.porId(PEP.db.pacientes, caso.pacienteId); }
  function nomePacienteDoCaso(caso) { var p = pacienteDoCaso(caso); return p ? (p.nomeSocial || p.nome) : '—'; }
  function idade(p) { return PEP.util.idade(p.dataNascimento); }

  function barraAcessibilidade() {
    return '<div class="barra-acess" role="group" aria-label="Acessibilidade">' +
      '<button type="button" class="botao-acess" data-acao="fonte-menor">A−<span class="sr-only"> diminuir o texto</span></button>' +
      '<button type="button" class="botao-acess" data-acao="fonte-maior">A+<span class="sr-only"> aumentar o texto</span></button>' +
      '<button type="button" class="botao-acess" data-acao="alto-contraste" aria-pressed="' + (document.documentElement.classList.contains('contraste') ? 'true' : 'false') + '">Contraste</button>' +
      '<button type="button" class="botao-acess" data-acao="vlibras">Libras</button></div>';
  }

  function desenharTopo(u) {
    var topo = document.getElementById('topo');
    var html = '<a class="marca" href="' + (u ? '#/painel' : '#/entrar') + '">' +
      '<span class="marca-icone" aria-hidden="true">V</span>' +
      '<span><span class="marca-nome">Vínculo</span><span class="marca-sub">Prontuário da Clínica-Escola de Psicologia</span></span></a>' +
      '<div class="topo-direita">' + barraAcessibilidade();
    if (u) {
      html += '<div class="usuario-atual"><span>' + esc(nomeUsuario(u.id)) + '</span>' +
        '<span class="selo-perfil">' + esc(PEP.regras.nomePerfil(u.perfil)) + '</span>' +
        '<button class="botao secundario pequeno" data-acao="sair">Sair</button></div>';
    }
    topo.innerHTML = html + '</div>';
  }

  function desenharMenu(u, rotaAtual) {
    var menu = document.getElementById('menu');
    if (!u || PEP.estado.pendenciaDeAcesso(u)) { menu.innerHTML = ''; return; }
    var itens = MENUS[u.perfil] || [];
    menu.innerHTML = itens.map(function (item) {
      var ativo = rotaAtual.indexOf(item[0]) === 0 || (item[0] === '#/casos' && rotaAtual.indexOf('#/caso/') === 0);
      return '<a href="' + item[0] + '"' + (ativo ? ' class="ativo" aria-current="page"' : '') + '>' + item[1] + '</a>';
    }).join('');
  }

  function desenharRodape() {
    var r = document.getElementById('rodape');
    if (!r || r.innerHTML) return;
    r.innerHTML = '<nav aria-label="Informações do site"><a href="#/sobre">Sobre o projeto</a><a href="#/privacidade">Aviso de privacidade</a>' +
      '<a href="#/termos">Termos de uso</a><a href="#/acessibilidade">Acessibilidade</a><a href="#/regras">Regras e leis</a></nav>' +
      '<p>Protótipo acadêmico · PIC de ADS · Faculdade de Ciências Médicas da Santa Casa de São Paulo · dados 100% fictícios. ' +
      'Dúvidas sobre seus dados: <a href="#/privacidade#encarregado">fale com o encarregado</a>.</p>';
  }

  function definirTitulo(texto) {
    // Título neutro: nunca nome de paciente na aba do navegador
    document.title = (texto ? texto + ' — ' : '') + 'Vínculo · Prontuário da Clínica-Escola';
  }

  function etiquetaEvolucao(status) {
    return '<span class="etiqueta ' + status + '">' + esc(PEP.lista('statusEvolucao')[status] || status) + '</span>';
  }

  function etiquetaCaso(caso) {
    if (caso.status === 'encerrado') {
      var enc = PEP.regras.encerramentoDoCaso(caso);
      return '<span class="etiqueta rascunho">Encerrado' + (enc ? ' · ' + esc(enc.tipo) : '') + '</span>';
    }
    if (caso.status === 'aguardando-alocacao') return '<span class="etiqueta enviada">Aguardando alocação</span>';
    if (PEP.regras.emRiscoDeAbandono(caso)) return '<span class="etiqueta perigo">Risco de abandono</span>';
    return '<span class="etiqueta validada">Ativo</span>';
  }

  function numero(valor, rotulo) {
    return '<div class="cartao"><div class="numero">' + esc(valor) + '</div><div class="numero-rotulo">' + esc(rotulo) + '</div></div>';
  }

  function semPermissao(motivo) {
    return '<h1>Acesso não permitido</h1><div class="aviso perigo">' + esc(motivo || 'Seu perfil não tem acesso a esta área.') + '</div>' +
      '<a class="botao secundario" href="#/painel">Voltar ao painel</a>';
  }

  // Lista de opções para <select> a partir de uma lista do JSON
  function opcoes(itens, selecionado) {
    return itens.map(function (i) {
      var valor = typeof i === 'string' ? i : (i.valor || i.id);
      var nome = typeof i === 'string' ? i : i.nome;
      return '<option value="' + esc(valor) + '"' + (valor === selecionado ? ' selected' : '') + '>' + esc(nome) + '</option>';
    }).join('');
  }

  var temporizador = null;
  function toast(mensagem) {
    var el = document.getElementById('toast');
    el.textContent = mensagem;
    el.classList.add('visivel');
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { el.classList.remove('visivel'); }, 3500);
  }

  return {
    nomeUsuario: nomeUsuario, pacienteDoCaso: pacienteDoCaso, nomePacienteDoCaso: nomePacienteDoCaso, idade: idade,
    desenharTopo: desenharTopo, desenharMenu: desenharMenu, desenharRodape: desenharRodape, definirTitulo: definirTitulo,
    etiquetaEvolucao: etiquetaEvolucao, etiquetaCaso: etiquetaCaso, numero: numero, semPermissao: semPermissao,
    opcoes: opcoes, toast: toast
  };
})();
