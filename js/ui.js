/* =========================================================
   ui.js — topo (marca e menu da conta), navegação por perfil
   (barra embaixo no celular, coluna à esquerda no computador),
   rodapé, página "Mais" e pequenos componentes.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.ui = (function () {
  var esc = function (t) { return PEP.util.esc(t); };
  function el(id) { return document.getElementById(id); }

  // Ícones de traço (desenhados para o projeto; herdam a cor do texto)
  var ICONES = {
    inicio: '<path d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
    casos: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    agenda: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    validar: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.8-5.2"/>',
    fila: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r="1.1"/><circle cx="4.8" cy="12" r="1.1"/><circle cx="4.8" cy="17.5" r="1.1"/>',
    pessoas: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5a6 6 0 0 1 12 0"/><path d="M15.5 5.5a3.3 3.3 0 0 1 0 6.3M17.5 13.8a6 6 0 0 1 3.5 5.7"/>',
    indicadores: '<path d="M4 20h16"/><path d="M7 16.5v-5M12 16.5V7M17 16.5v-8"/>',
    auditoria: '<path d="M12 3.5 19 6v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z"/><path d="m9 12 2.2 2.2L15 10.5"/>',
    pedidos: '<path d="M4 13.5 6.5 5h11l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M4 13.5h4.5l1 2.5h5l1-2.5H20"/>',
    plano: '<path d="M12 20s-7.5-4.6-8.5-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8.5 2.8C19.5 15.4 12 20 12 20z"/>',
    prontuario: '<path d="M6.5 3.5h7l4 4V20a.5.5 0 0 1-.5.5H6.5A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z"/><path d="M13.5 3.5V8H18M9 12.5h6M9 16h6"/>',
    dados: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    estudantes: '<circle cx="10" cy="8.5" r="3.3"/><path d="M4 19.5a6 6 0 0 1 12 0M19 8v6M16 11h6"/>',
    conta: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
    acessibilidade: '<circle cx="12" cy="4.8" r="1.6"/><path d="M5 8.5c2.3.7 4.6 1 7 1s4.7-.3 7-1M12 9.5V14m0 0-3 6m3-6 3 6"/>',
    mais: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>'
  };
  function icone(nome) {
    return '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONES[nome] || '') + '</svg>';
  }
  // Marca do Vinculum: dois anéis entrelaçados (o símbolo fica no index.html)
  function aneis() { return '<svg class="aneis" viewBox="0 0 42 28" aria-hidden="true" focusable="false"><use href="#aneis"></use></svg>'; }

  // Navegação de cada perfil: cada um vê só o que precisa (princípio da necessidade).
  // [endereço, nome, ícone, outros endereços que deixam o item marcado]
  // No celular cabem 5 itens na barra; se houver mais, os 4 primeiros ficam e o resto vai para "Mais".
  var MENUS = {
    estagiario: [['#/painel', 'Início', 'inicio'], ['#/casos', 'Casos', 'casos', ['#/caso/', '#/documento/']], ['#/agenda', 'Agenda', 'agenda'], ['#/busca', 'Buscar', 'buscar']],
    supervisor: [['#/painel', 'Início', 'inicio'], ['#/supervisao', 'Validação', 'validar'], ['#/casos', 'Casos', 'casos', ['#/caso/', '#/documento/', '#/imprimir/']],
      ['#/agenda', 'Agenda', 'agenda'], ['#/alocacao', 'Duplas e trios', 'pessoas'], ['#/indicadores', 'Indicadores', 'indicadores'], ['#/busca', 'Buscar', 'buscar']],
    tecnico: [['#/painel', 'Início', 'inicio'], ['#/fila', 'Fila', 'fila', ['#/triagem/']], ['#/casos', 'Casos', 'casos', ['#/caso/', '#/documento/', '#/imprimir/', '#/paciente/']],
      ['#/agenda', 'Agenda', 'agenda'], ['#/alocacao', 'Alocação', 'pessoas'], ['#/solicitacoes', 'Pedidos', 'pedidos', ['#/pedidos-lgpd']],
      ['#/indicadores', 'Indicadores', 'indicadores'], ['#/auditoria', 'Auditoria', 'auditoria'], ['#/busca', 'Buscar', 'buscar']],
    paciente: [['#/painel', 'Início', 'inicio'], ['#/agenda', 'Sessões', 'agenda'], ['#/meu-prontuario', 'Prontuário', 'prontuario'],
      ['#/meu-plano', 'Meu plano', 'plano'], ['#/meus-dados', 'Meus dados', 'dados']],
    direcao: [['#/painel', 'Início', 'inicio'], ['#/indicadores', 'Indicadores', 'indicadores'], ['#/alocacao', 'Grupos', 'pessoas'], ['#/estudantes', 'Estudantes', 'estudantes']]
  };
  var CABEM_NA_BARRA = 5;
  function itensExtras(u) {
    var itens = MENUS[u.perfil] || [];
    return itens.length > CABEM_NA_BARRA ? itens.slice(CABEM_NA_BARRA - 1) : [];
  }

  // Nome do paciente nas telas: no modo discreto (js/privacidade.js), só as iniciais e um código
  function discreto() { return PEP.privacidade && PEP.privacidade.discreto(); }
  function nomePaciente(p, codigo) {
    if (!p) return '—';
    var n = p.nomeSocial || p.nome;
    return discreto() ? PEP.privacidade.iniciais(n) + (codigo ? ' · ' + codigo : '') : n;
  }
  function nomeInscricao(i) { return discreto() ? PEP.privacidade.iniciais(i.nome) + ' · ' + i.id : i.nome; }

  function nomeUsuario(id) {
    if (id === 'visitante') return 'Visitante';
    var u = PEP.util.porId(PEP.db.usuarios, id);
    if (!u) return id || '—';
    if (u.nome) return u.nome;
    var p = PEP.regras.pacienteDoUsuario(u);
    return p ? nomePaciente(p, p.id) : u.login;
  }

  function pacienteDoCaso(caso) { return PEP.util.porId(PEP.db.pacientes, caso.pacienteId); }
  function nomePacienteDoCaso(caso) { return nomePaciente(pacienteDoCaso(caso), caso.id); }
  function idade(p) { return PEP.util.idade(p.dataNascimento); }

  // ---------- Menu da conta (preferências da tela, Minha conta e Sair) ----------
  // Fica num botão só no topo, para o topo caber no celular. Abre e fecha com clique,
  // fecha com Esc (o foco volta ao botão), ao clicar fora, ao sair dele com Tab e ao trocar de tela.
  var contaAberta = false, ultimoUsuario = null;

  function itemAlternar(acao, nome, ligado) {
    return '<li><button type="button" class="item-conta" data-acao="' + acao + '" aria-pressed="' + (ligado ? 'true' : 'false') + '">' + nome +
      '<span class="estado" aria-hidden="true">' + (ligado ? 'ligado' : 'desligado') + '</span></button></li>';
  }
  function preferenciasDeTela() {
    return '<li><div class="linha-fonte"><span id="rotulo-fonte">Tamanho do texto</span><span class="botoes" role="group" aria-labelledby="rotulo-fonte">' +
      '<button type="button" class="botao-acess" data-acao="fonte-menor">A−<span class="sr-only"> diminuir o texto</span></button>' +
      '<button type="button" class="botao-acess" data-acao="fonte-maior">A+<span class="sr-only"> aumentar o texto</span></button></span></div></li>' +
      itemAlternar('alto-contraste', 'Alto contraste', document.documentElement.classList.contains('contraste')) +
      '<li><button type="button" class="item-conta" data-acao="vlibras">Libras (VLibras)</button></li>';
  }

  function desenharTopo(u) {
    var topo = el('topo');
    if ((u && u.id) !== ultimoUsuario) { contaAberta = false; ultimoUsuario = u && u.id; }
    // Se o foco estava num botão do topo, volta para o mesmo botão depois de redesenhar
    var ativo = document.activeElement, focoAcao = ativo && topo.contains(ativo) ? (ativo.getAttribute('data-acao') || ativo.id) : null;
    var html = '<a class="marca-topo" href="' + (u ? '#/painel' : '#/entrar') + '">' + aneis() + '<span>Vinculum</span><span class="sr-only">: início</span></a>' +
      '<div class="topo-direita">';
    if (u) {
      var nome = nomeUsuario(u.id);
      html += '<button type="button" class="botao-conta" id="botao-conta" data-acao="menu-conta" aria-expanded="' + contaAberta + '" aria-controls="menu-conta">' +
        '<span class="avatar" aria-hidden="true">' + esc(String(nome).charAt(0).toUpperCase()) + '</span><span class="nome-conta">' + esc(nome) + '</span>' +
        '<span class="sr-only">Conta e preferências</span></button>' +
        '<div class="menu-conta" id="menu-conta"' + (contaAberta ? '' : ' hidden') + '>' +
        '<div class="menu-conta-quem"><strong>' + esc(nome) + '</strong><span>' + esc(PEP.regras.nomePerfil(u.perfil)) + '</span></div><ul>' +
        itemAlternar('modo-discreto', 'Modo discreto', discreto()) +
        '<li><button type="button" class="item-conta" data-acao="cobrir-tela">Cobrir a tela</button></li>' +
        preferenciasDeTela() +
        '<li><a class="item-conta" href="#/conta">Minha conta</a></li>' +
        '<li><button type="button" class="item-conta sair" data-acao="sair">Sair</button></li></ul></div>';
    } else {
      html += '<button type="button" class="botao-conta" id="botao-conta" data-acao="menu-conta" aria-expanded="' + contaAberta + '" aria-controls="menu-conta">' +
        icone('acessibilidade') + '<span class="texto-botao">Acessibilidade</span></button>' +
        '<div class="menu-conta" id="menu-conta"' + (contaAberta ? '' : ' hidden') + '><ul>' + preferenciasDeTela() + '</ul></div>';
    }
    topo.innerHTML = html + '</div>';
    if (focoAcao) {
      var volta = topo.querySelector('[data-acao="' + focoAcao + '"]') || el(focoAcao);
      if (volta) volta.focus();
    }
  }

  function alternarConta(abrir) {
    contaAberta = typeof abrir === 'boolean' ? abrir : !contaAberta;
    var b = el('botao-conta'), m = el('menu-conta');
    if (b) b.setAttribute('aria-expanded', contaAberta ? 'true' : 'false');
    if (m) m.hidden = !contaAberta;
  }
  function fecharConta(devolverFoco) {
    if (!contaAberta) return;
    alternarConta(false);
    if (devolverFoco && el('botao-conta')) el('botao-conta').focus();
  }
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && contaAberta) fecharConta(true); });
  document.addEventListener('click', function (ev) {
    if (contaAberta && ev.target.closest && !ev.target.closest('.topo-direita')) fecharConta(false);
  });
  document.addEventListener('focusin', function (ev) {
    if (contaAberta && ev.target.closest && !ev.target.closest('.topo-direita') && !ev.target.closest('.cortina')) fecharConta(false);
  });

  // ---------- Navegação ----------
  function marcado(item, rotaAtual) {
    if (rotaAtual.indexOf(item[0]) === 0) return true;
    return (item[3] || []).some(function (r) { return rotaAtual.indexOf(r) === 0; });
  }
  function link(item, ativo) {
    return '<a href="' + item[0] + '"' + (ativo ? ' class="ativo" aria-current="page"' : '') + '>' + icone(item[2]) + '<span>' + esc(item[1]) + '</span></a>';
  }

  function desenharMenu(u, rotaAtual) {
    var menu = el('menu');
    var semMenu = !u || !!PEP.estado.pendenciaDeAcesso(u);
    document.body.classList.toggle('com-barra', !semMenu);
    document.querySelector('.layout').classList.toggle('sem-menu', semMenu);
    if (semMenu) { menu.innerHTML = ''; return; }
    var itens = MENUS[u.perfil] || [];
    var extras = itensExtras(u);
    var html = itens.map(function (item, i) {
      var extra = extras.length && i >= CABEM_NA_BARRA - 1;
      return '<li' + (extra ? ' class="so-largo"' : '') + '>' + link(item, marcado(item, rotaAtual)) + '</li>';
    }).join('');
    if (extras.length) {
      var maisAtivo = rotaAtual.indexOf('#/mais') === 0 || extras.some(function (item) { return marcado(item, rotaAtual); });
      html += '<li class="so-estreito">' + link(['#/mais', 'Mais', 'mais'], maisAtivo) + '</li>';
    }
    menu.innerHTML = '<ul>' + html + '</ul>';
  }

  // Página "Mais": o que não coube na barra de baixo, a conta e as páginas informativas
  function telaMais(u) {
    var linha = function (href, nome, ic) { return '<li><a href="' + href + '">' + icone(ic) + '<span>' + esc(nome) + '</span><span class="seta" aria-hidden="true">›</span></a></li>'; };
    var extras = itensExtras(u);
    return '<h1>Mais</h1>' +
      (extras.length ? '<ul class="lista-mais">' + extras.map(function (i) { return linha(i[0], i[1], i[2]); }).join('') + '</ul>' : '') +
      '<ul class="lista-mais">' + linha('#/conta', 'Minha conta', 'conta') + '</ul>' +
      '<h2>Sobre o Vinculum</h2><ul class="lista-mais">' + linha('#/sobre', 'Sobre o projeto', 'info') + linha('#/privacidade', 'Aviso de privacidade', 'dados') +
      linha('#/termos', 'Termos de uso', 'prontuario') + linha('#/acessibilidade', 'Acessibilidade', 'acessibilidade') + linha('#/regras', 'Regras e leis', 'auditoria') + '</ul>';
  }

  function desenharRodape() {
    var r = el('rodape');
    if (!r || r.innerHTML) return;
    r.innerHTML = '<div class="rodape-dentro"><nav aria-label="Informações do site"><a href="#/sobre">Sobre</a><a href="#/privacidade">Privacidade</a>' +
      '<a href="#/termos">Termos de uso</a><a href="#/acessibilidade">Acessibilidade</a><a href="#/regras">Regras e leis</a></nav>' +
      '<p>Protótipo acadêmico · PIC de ADS · Faculdade de Ciências Médicas da Santa Casa de São Paulo · dados fictícios. ' +
      'Dúvidas sobre seus dados: <a href="#/privacidade#encarregado">fale com o encarregado</a>.</p></div>';
  }

  function definirTitulo(texto) {
    // Título neutro: nunca nome de paciente na aba do navegador
    document.title = (texto ? texto + ' — ' : '') + 'Vinculum · Prontuário da Clínica-Escola';
  }

  // Abas que rolam para o lado (celular): a aba atual fica visível sem mexer na rolagem da página
  function mostrarAbaAtual() {
    document.querySelectorAll('.abas').forEach(function (nav) {
      var a = nav.querySelector('.ativa');
      if (!a || nav.scrollWidth <= nav.clientWidth) return;
      var n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
      // Só rola se a aba atual estiver cortada à direita; deixa um pedaço da próxima à vista
      if (r.right > n.right) nav.scrollLeft += r.right - n.right + 40;
    });
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

  // Números em destaque numa linha só: lista de [valor, rótulo]
  function numeros(lista) {
    return '<div class="cartao numeros' + (lista.length === 4 ? ' quatro' : '') + '">' + lista.map(function (n) {
      return '<div><strong>' + esc(n[0]) + '</strong><span>' + esc(n[1]) + '</span></div>';
    }).join('') + '</div>';
  }
  function numero(valor, rotulo) {
    return '<div class="cartao"><div class="numero">' + esc(valor) + '</div><div class="numero-rotulo">' + esc(rotulo) + '</div></div>';
  }

  // Lista de pendências: [{ tipo: 'perigo'|'alerta'|'info', titulo (HTML já escapado), texto }]
  function listaPendencias(itens, titulo) {
    var html = '<section class="cartao" aria-labelledby="titulo-pendencias"><div class="cabecalho-cartao"><h2 id="titulo-pendencias">' + esc(titulo || 'Pendências') + '</h2>' +
      (itens.length ? '<span class="contador" aria-label="' + itens.length + ' pendência(s)">' + itens.length + '</span>' : '') + '</div>';
    if (!itens.length) return html + '<p class="vazio">Tudo em dia.</p></section>';
    return html + '<ul class="lista-itens">' + itens.map(function (i) {
      return '<li class="' + i.tipo + '"><span class="sinal" aria-hidden="true"></span><div class="resto">' + i.titulo +
        (i.texto ? '<small>' + i.texto + '</small>' : '') + '</div></li>';
    }).join('') + '</ul></section>';
  }

  function semPermissao(motivo) {
    return '<h1>Acesso não permitido</h1><div class="aviso perigo">' + esc(motivo || 'Seu perfil não tem acesso a esta área.') + '</div>' +
      '<a class="botao secundario" href="#/painel">Voltar ao início</a>';
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
    var t = el('toast');
    t.textContent = mensagem;
    t.classList.add('visivel');
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { t.classList.remove('visivel'); }, 3500);
  }

  return {
    nomeUsuario: nomeUsuario, pacienteDoCaso: pacienteDoCaso, nomePacienteDoCaso: nomePacienteDoCaso, nomePaciente: nomePaciente, nomeInscricao: nomeInscricao, idade: idade,
    desenharTopo: desenharTopo, desenharMenu: desenharMenu, desenharRodape: desenharRodape, definirTitulo: definirTitulo, mostrarAbaAtual: mostrarAbaAtual,
    alternarConta: alternarConta, fecharConta: fecharConta, telaMais: telaMais, icone: icone, aneis: aneis,
    etiquetaEvolucao: etiquetaEvolucao, etiquetaCaso: etiquetaCaso, numero: numero, numeros: numeros, listaPendencias: listaPendencias, semPermissao: semPermissao,
    opcoes: opcoes, toast: toast
  };
})();
