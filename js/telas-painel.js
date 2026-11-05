/* =========================================================
   telas-painel.js — painel inicial de cada perfil.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };

  function proximasSessoes(casos) {
    var ids = casos.map(function (c) { return c.id; });
    var hoje = PEP.util.hoje();
    return PEP.db.sessoes
      .filter(function (s) { return ids.indexOf(s.casoId) !== -1 && s.presenca === 'agendada' && s.data >= hoje; })
      .sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
  }

  function listaSessoes(sessoes, mostrarPaciente) {
    if (!sessoes.length) return '<p class="vazio">Nenhuma sessão agendada.</p>';
    return '<ul>' + sessoes.map(function (s) {
      var caso = PEP.util.porId(PEP.db.casos, s.casoId);
      return '<li>' + data(s.data) + ' às ' + esc(s.hora) +
        (mostrarPaciente ? ' — <a href="#/caso/' + caso.id + '">' + esc(PEP.ui.nomePacienteDoCaso(caso)) + '</a>' : '') +
        (s.confirmada ? ' <span class="etiqueta validada">confirmada</span>' : ' <span class="etiqueta rascunho">a confirmar</span>') + '</li>';
    }).join('') + '</ul>';
  }

  function alertasAbandono(casos) {
    var risco = casos.filter(PEP.regras.emRiscoDeAbandono);
    if (!risco.length) return '';
    return '<div class="aviso alerta"><strong>Risco de abandono:</strong> ' + risco.map(function (c) {
      return '<a href="#/caso/' + c.id + '/sessoes">' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</a> (' + PEP.regras.faltasSeguidas(c) + ' faltas seguidas)';
    }).join(', ') + '. Registre a tentativa de contato antes de liberar a vaga.</div>';
  }

  function painelEstagiario(u) {
    var casos = PEP.regras.casosVisiveis(u);
    var ativos = casos.filter(function (c) { return c.status === 'ativo'; });
    var ids = casos.map(function (c) { return c.id; });
    var minhas = PEP.db.evolucoes.filter(function (e) { return ids.indexOf(e.casoId) !== -1 && e.autorId === u.id; });
    var devolvidas = minhas.filter(function (e) { return e.status === 'devolvida'; });
    var rascunhos = minhas.filter(function (e) { return e.status === 'rascunho'; });
    var sessoes = proximasSessoes(ativos);

    var html = '<h1>Olá, ' + esc(u.nome) + '</h1><p class="suave">' + esc(u.descricao) + '</p>' +
      alertasAbandono(ativos) +
      '<div class="grade">' + PEP.ui.numero(ativos.length, 'casos ativos') +
      PEP.ui.numero(devolvidas.length + rascunhos.length, 'evoluções pendentes') +
      PEP.ui.numero(sessoes.length, 'próximas sessões') + '</div>';

    html += '<div class="grade-2"><div class="cartao"><h2>Evoluções pendentes</h2>';
    if (!devolvidas.length && !rascunhos.length) html += '<p class="vazio">Tudo em dia.</p>';
    devolvidas.forEach(function (e) {
      var c = PEP.util.porId(PEP.db.casos, e.casoId);
      html += '<p><span class="etiqueta devolvida">Devolvida</span> <a href="#/caso/' + c.id + '/evolucoes">' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' · ' + data(e.data) + '</a><br><span class="suave pequeno">Supervisão: ' + esc(e.comentarioSupervisor) + '</span></p>';
    });
    rascunhos.forEach(function (e) {
      var c = PEP.util.porId(PEP.db.casos, e.casoId);
      html += '<p><span class="etiqueta rascunho">Rascunho</span> <a href="#/caso/' + c.id + '/evolucoes">' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' · ' + data(e.data) + '</a></p>';
    });
    html += '</div><div class="cartao"><h2>Próximas sessões</h2>' + listaSessoes(sessoes, true) + '</div></div>';
    return html;
  }

  function painelSupervisor(u) {
    var casos = PEP.regras.casosVisiveis(u);
    var ativos = casos.filter(function (c) { return c.status === 'ativo'; });
    var ids = casos.map(function (c) { return c.id; });
    var fila = PEP.db.evolucoes.filter(function (e) { return ids.indexOf(e.casoId) !== -1 && e.status === 'enviada'; });
    var grupos = PEP.db.grupos.filter(function (g) { return g.supervisorId === u.id; });
    var nEst = grupos.reduce(function (t, g) { return t + g.subgrupos.reduce(function (s, d) { return s + d.estagiarios.length; }, 0); }, 0);

    var html = '<h1>Olá, ' + esc(u.nome) + '</h1><p class="suave">' + esc(u.descricao) + ' · ' + esc(u.crp) + '</p>' +
      alertasAbandono(ativos) +
      '<div class="grade">' + PEP.ui.numero(fila.length, 'evoluções para validar') +
      PEP.ui.numero(ativos.length, 'casos ativos nos meus grupos') + PEP.ui.numero(nEst, 'estagiários supervisionados') + '</div>' +
      '<div class="cartao"><div class="linha entre"><h2>Fila de validação</h2><a class="botao pequeno" href="#/supervisao">Abrir validação</a></div>';
    if (!fila.length) html += '<p class="vazio">Nenhuma evolução aguardando.</p>';
    fila.forEach(function (e) {
      var c = PEP.util.porId(PEP.db.casos, e.casoId);
      html += '<p><span class="etiqueta enviada">Enviada</span> <a href="#/caso/' + c.id + '/evolucoes">' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</a> · por ' + esc(PEP.ui.nomeUsuario(e.autorId)) + ' em ' + data(e.data) + '</p>';
    });
    return html + '</div>';
  }

  function painelTecnico(u) {
    var fila = PEP.db.inscricoes.filter(function (i) { return i.status === 'aguardando'; });
    var semGrupo = PEP.db.casos.filter(function (c) { return c.status === 'aguardando-alocacao'; });
    var pedidos = PEP.db.solicitacoes.filter(function (s) { return s.status !== 'entregue'; });
    var ativos = PEP.db.casos.filter(function (c) { return c.status === 'ativo'; });

    return '<h1>Olá, ' + esc(u.nome) + '</h1><p class="suave">' + esc(u.descricao) + ' · ' + esc(u.crp) + '</p>' +
      alertasAbandono(ativos) +
      '<div class="grade">' + PEP.ui.numero(fila.length, 'pessoas na fila de espera') +
      PEP.ui.numero(semGrupo.length, 'casos aguardando alocação') +
      PEP.ui.numero(pedidos.length, 'pedidos de acesso ao prontuário') + '</div>' +
      '<div class="grade-2">' +
      '<div class="cartao"><h2>Fila de espera</h2>' + (fila.length ? '<ul>' + fila.slice(0, 4).map(function (i) {
        return '<li>' + esc(i.nome) + ' · desde ' + data(i.data) + '</li>';
      }).join('') + '</ul>' : '<p class="vazio">Fila vazia.</p>') + '<a class="botao pequeno" href="#/fila">Ver fila e triar</a></div>' +
      '<div class="cartao"><h2>Acesso do paciente</h2>' + (pedidos.length ? '<ul>' + pedidos.map(function (s) {
        return '<li>' + esc(PEP.util.porId(PEP.db.pacientes, s.pacienteId).nome) + ' · ' + data(s.em) + '</li>';
      }).join('') + '</ul>' : '<p class="vazio">Nenhum pedido pendente.</p>') + '<a class="botao pequeno" href="#/solicitacoes">Atender pedidos</a></div></div>';
  }

  function painelPaciente(u) {
    var casos = PEP.db.casos.filter(function (c) { return c.pacienteId === u.pacienteId && c.status === 'ativo'; });
    var sessoes = proximasSessoes(casos);
    var html = '<h1>Olá!</h1><p class="suave">Este é o seu espaço na clínica-escola de Psicologia.</p>' +
      '<div class="cartao"><h2>Próximas sessões</h2>';
    if (!sessoes.length) html += '<p class="vazio">Nenhuma sessão agendada.</p>';
    sessoes.forEach(function (s) {
      html += '<div class="linha entre" style="margin-bottom:.5rem"><span>' + data(s.data) + ' às ' + esc(s.hora) + '</span>' +
        (s.confirmada ? '<span class="etiqueta validada">Presença confirmada</span>' :
          '<button class="botao pequeno" data-acao="confirmar-sessao" data-id="' + s.id + '">Confirmar presença</button>') + '</div>';
    });
    html += '<p class="suave pequeno">Não vai poder vir? Avise a clínica com antecedência: a falta avisada não conta como abandono.</p></div>' +
      '<div class="grade-2"><div class="cartao"><h2>Seu prontuário é seu</h2><p>Você tem direito de acesso ao seu prontuário, a qualquer momento.</p>' +
      '<a class="botao" href="#/meu-prontuario">Pedir cópia do meu prontuário</a></div>' +
      '<div class="cartao"><h2>Seus direitos</h2><p>O atendimento segue o Código de Ética Profissional do Psicólogo, que garante o sigilo.</p>' +
      '<a href="https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf" target="_blank" rel="noopener">Ler o Código de Ética (CFP)</a></div></div>';
    return html;
  }

  function painelDirecao(u) {
    var ativos = PEP.db.casos.filter(function (c) { return c.status === 'ativo'; }).length;
    var fila = PEP.db.inscricoes.filter(function (i) { return i.status === 'aguardando'; }).length;
    var alocados = PEP.db.grupos.reduce(function (t, g) { return t + g.subgrupos.reduce(function (s, d) { return s + d.estagiarios.length; }, 0); }, 0);
    return '<h1>Olá, ' + esc(u.nome) + '</h1><p class="suave">' + esc(u.descricao) + '</p>' +
      '<div class="aviso info">Seu perfil vê só <strong>dados agregados</strong>. Prontuários e nomes de pacientes ficam restritos à equipe de cada caso, por sigilo.</div>' +
      '<div class="grade">' + PEP.ui.numero(ativos, 'casos ativos') + PEP.ui.numero(fila, 'pessoas na fila') +
      PEP.ui.numero(alocados, 'estagiários alocados') + PEP.ui.numero(PEP.db.grupos.length, 'grupos de estágio') + '</div>' +
      '<div class="linha"><a class="botao" href="#/indicadores">Ver indicadores</a><a class="botao secundario" href="#/alocacao">Grupos de estágio</a></div>';
  }

  PEP.telas.painel = function (u) {
    if (u.perfil === 'estagiario') return painelEstagiario(u);
    if (u.perfil === 'supervisor') return painelSupervisor(u);
    if (u.perfil === 'tecnico') return painelTecnico(u);
    if (u.perfil === 'paciente') return painelPaciente(u);
    return painelDirecao(u);
  };

  // Exporta para reutilizar na agenda
  PEP.telas._proximasSessoes = proximasSessoes;
})();
