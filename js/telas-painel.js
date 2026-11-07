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

  // Sessões que já passaram e ainda estão sem presença registrada
  function presencasPendentes(casos) {
    var ids = casos.map(function (c) { return c.id; });
    var hoje = PEP.util.hoje();
    return PEP.db.sessoes.filter(function (s) { return ids.indexOf(s.casoId) !== -1 && s.presenca === 'agendada' && s.data < hoje; });
  }

  function listaSessoes(sessoes, mostrarPaciente) {
    if (!sessoes.length) return '<p class="vazio">Nenhuma sessão agendada.</p>';
    return '<ul>' + sessoes.slice(0, 6).map(function (s) {
      var caso = PEP.util.porId(PEP.db.casos, s.casoId);
      return '<li>' + data(s.data) + ' às ' + esc(s.hora) +
        (mostrarPaciente ? ' — <a href="#/caso/' + caso.id + '/sessoes">' + esc(PEP.ui.nomePacienteDoCaso(caso)) + '</a>' : '') +
        (s.confirmada ? ' <span class="etiqueta validada">confirmada</span>' : ' <span class="etiqueta rascunho">a confirmar</span>') + '</li>';
    }).join('') + '</ul><a class="pequeno" href="#/agenda">Ver agenda completa</a>';
  }

  // Avaliações de risco em aberto nos casos (aguardando a ciência da supervisão vem primeiro)
  function alertasRisco(casos, souSupervisor) {
    var ids = casos.map(function (c) { return c.id; });
    var abertos = PEP.db.riscos.filter(function (r) { return ids.indexOf(r.casoId) !== -1 && !r.encerradoEm; });
    var semCiencia = abertos.filter(function (r) { return !r.cienciaEm; });
    var html = '';
    var link = function (r) {
      var c = PEP.util.porId(PEP.db.casos, r.casoId);
      return '<a href="#/caso/' + c.id + '/risco">' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</a> (risco ' + esc(r.nivel) + ', ' + data(r.em) + ')';
    };
    if (semCiencia.length) {
      html += '<div class="aviso perigo" role="note"><strong>' + (souSupervisor ? 'Avaliação de risco aguardando a sua ciência:' : 'Avaliação de risco aguardando a ciência da supervisão:') + '</strong> ' +
        semCiencia.map(link).join(', ') + '.</div>';
    }
    var acompanhando = abertos.filter(function (r) { return r.cienciaEm; });
    if (acompanhando.length) html += '<div class="aviso alerta pequeno"><strong>Risco em acompanhamento:</strong> ' + acompanhando.map(link).join(', ') + '. Retome nas próximas sessões.</div>';
    return html;
  }

  function alertas(casos) {
    var html = '';
    var risco = casos.filter(PEP.regras.emRiscoDeAbandono);
    if (risco.length) {
      html += '<div class="aviso alerta"><strong>Risco de abandono:</strong> ' + risco.map(function (c) {
        return '<a href="#/caso/' + c.id + '/sessoes">' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</a> (' + PEP.regras.faltasSeguidas(c) + ' faltas seguidas)';
      }).join(', ') + '. Registre a tentativa de contato antes de liberar a vaga.</div>';
    }
    var ids = casos.map(function (c) { return c.id; }), hoje = PEP.util.hoje();
    var nomesFalta = {};
    PEP.lista('motivosFaltaPaciente').forEach(function (m) { nomesFalta[m.id] = m.nome; });
    var avisadas = PEP.db.sessoes.filter(function (s) { return ids.indexOf(s.casoId) !== -1 && s.avisoPaciente && s.data >= hoje; });
    if (avisadas.length) {
      html += '<div class="aviso info pequeno"><strong>Falta avisada pelo paciente:</strong> ' + avisadas.map(function (s) {
        var c = PEP.util.porId(PEP.db.casos, s.casoId);
        return '<a href="#/caso/' + c.id + '/sessoes">' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' · ' + data(s.data) + '</a> (' + esc((nomesFalta[s.motivoFalta] || '').toLowerCase()) + ')';
      }).join(', ') + '. Se puder, ofereça outro horário.</div>';
    }
    var atrasadas = [];
    casos.forEach(function (c) { PEP.regras.sessoesSemEvolucao(c).forEach(function (s) { atrasadas.push(s); }); });
    if (atrasadas.length) {
      html += '<div class="aviso alerta pequeno"><strong>Evolução atrasada (mais de ' + PEP.regra('prazoEvolucaoHoras') + ' h depois da sessão):</strong> ' + atrasadas.map(function (s) {
        var c = PEP.util.porId(PEP.db.casos, s.casoId);
        return '<a href="#/caso/' + c.id + '/evolucoes">' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' · ' + data(s.data) + '</a>';
      }).join(', ') + '. Registro atrasado é risco para o cuidado e para a formação.</div>';
    }
    var pend = presencasPendentes(casos);
    if (pend.length) {
      html += '<div class="aviso info pequeno"><strong>Presença pendente:</strong> ' + pend.map(function (s) {
        var c = PEP.util.porId(PEP.db.casos, s.casoId);
        return '<a href="#/caso/' + c.id + '/sessoes">' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' · ' + data(s.data) + '</a>';
      }).join(', ') + '.</div>';
    }
    return html;
  }

  function painelEstagiario(u) {
    var casos = PEP.regras.casosVisiveis(u);
    var ativos = casos.filter(function (c) { return c.status === 'ativo'; });
    var ids = casos.map(function (c) { return c.id; });
    var minhas = PEP.db.evolucoes.filter(function (e) { return ids.indexOf(e.casoId) !== -1 && e.autorId === u.id; });
    var devolvidas = minhas.filter(function (e) { return e.status === 'devolvida'; });
    var rascunhos = minhas.filter(function (e) { return e.status === 'rascunho'; });
    var sessoes = proximasSessoes(ativos);

    var html = '<h1>Olá, ' + esc(u.nome) + '</h1><p class="suave">' + esc(PEP.regras.descricaoUsuario(u)) + '</p>';
    if (!PEP.regras.alocacaoDoEstagiario(u.id)) {
      html += '<div class="aviso info">Você não tem vínculo de estágio ativo neste semestre, por isso não vê casos. O acesso aos prontuários nasce e termina com o vínculo.</div>';
    }
    html += alertasRisco(ativos, false) + alertas(ativos) +
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
    var nEst = grupos.reduce(function (t, g) { return t + PEP.regras.estagiariosDoGrupo(g.id).length; }, 0);
    var max = PEP.regra('maxEstagiariosPorGrupo');
    var cheios = grupos.filter(function (g) { return PEP.regras.estagiariosDoGrupo(g.id).length > max; });

    var html = '<h1>Olá, ' + esc(u.nome) + '</h1><p class="suave">' + esc(PEP.regras.descricaoUsuario(u)) + ' · ' + esc(u.crp) + '</p>' +
      alertasRisco(ativos, true) + alertas(ativos) +
      (cheios.length ? '<div class="aviso alerta pequeno">Grupo com mais de ' + max + ' estagiários: ' + cheios.map(function (g) { return esc(g.nome); }).join(', ') + '. Referência da Res. CFP 05/2025, art. 5º (hoje suspenso por liminar do STF).</div>' : '') +
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
    var dup = fila.filter(function (i) { return i.duplicidade; });
    var semGrupo = PEP.db.casos.filter(function (c) { return c.status === 'aguardando-alocacao'; });
    var pedidos = PEP.db.solicitacoes.filter(function (s) { return s.status !== 'entregue'; });
    var lgpd = PEP.db.pedidosTitular.filter(function (p) { return p.status === 'aberto'; });
    var ativos = PEP.db.casos.filter(function (c) { return c.status === 'ativo'; });
    // Risco: para a técnica, só a contagem (o detalhe fica no caso, com justificativa de acesso);
    // o caso com risco visto na triagem e ainda sem grupo aparece pelo nome, para alocar com prioridade
    var abertos = PEP.db.riscos.filter(function (r) { return !r.encerradoEm; });
    var triagemComRisco = semGrupo.filter(function (c) { return PEP.regras.riscosAbertos(c).length; });

    return '<h1>Olá, ' + esc(u.nome) + '</h1><p class="suave">' + esc(PEP.regras.descricaoUsuario(u)) + ' · ' + esc(u.crp) + '</p>' +
      (triagemComRisco.length ? '<div class="aviso perigo" role="note"><strong>Risco visto na triagem, caso ainda sem grupo:</strong> ' + triagemComRisco.map(function (c) {
        return '<a href="#/alocacao">' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</a>';
      }).join(', ') + '. Aloque com prioridade e avise a supervisão.</div>' : '') +
      (abertos.length ? '<div class="aviso alerta pequeno">' + abertos.length + ' avaliação(ões) de risco em aberto na clínica, ' +
        abertos.filter(function (r) { return !r.cienciaEm; }).length + ' aguardando a ciência da supervisão.</div>' : '') +
      alertas(ativos) +
      (fila.some(function (i) { return i.sinalUrgencia; }) ? '<div class="aviso perigo" role="note"><strong>' + fila.filter(function (i) { return i.sinalUrgencia; }).length +
        ' inscrição(ões) com sinal de urgência no relato.</strong> <a href="#/fila">Contatar hoje</a>: urgência não espera a fila.</div>' : '') +
      (dup.length ? '<div class="aviso alerta pequeno"><strong>' + dup.length + ' inscrição(ões) com CPF já cadastrado.</strong> <a href="#/fila">Conferir na fila</a> antes de triar.</div>' : '') +
      '<div class="grade">' + PEP.ui.numero(fila.length, 'pessoas na fila de espera') +
      PEP.ui.numero(semGrupo.length, 'casos aguardando alocação') +
      PEP.ui.numero(pedidos.length, 'pedidos de acesso ao prontuário') +
      PEP.ui.numero(lgpd.length, 'pedidos LGPD em aberto') + '</div>' +
      '<div class="grade-2">' +
      '<div class="cartao"><h2>Fila de espera</h2>' + (fila.length ? '<ul>' + fila.slice(0, 5).map(function (i) {
        return '<li>' + esc(PEP.ui.nomeInscricao(i)) + ' · desde ' + data(i.data) + (i.duplicidade ? ' <span class="etiqueta alerta">CPF já cadastrado</span>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="vazio">Fila vazia.</p>') + '<a class="botao pequeno" href="#/fila">Ver fila e triar</a></div>' +
      '<div class="cartao"><h2>Pedidos dos titulares</h2>' + (pedidos.length || lgpd.length ? '<ul>' +
        pedidos.map(function (s) { var p = PEP.util.porId(PEP.db.pacientes, s.pacienteId); return '<li>Cópia do prontuário · ' + esc(PEP.ui.nomePaciente(p, p.id)) + ' · ' + data(s.em) + '</li>'; }).join('') +
        lgpd.map(function (p) { return '<li>LGPD (' + esc(p.tipo) + ') · ' + data(p.em) + '</li>'; }).join('') + '</ul>' : '<p class="vazio">Nenhum pedido pendente.</p>') +
      '<div class="linha"><a class="botao pequeno" href="#/solicitacoes">Acesso ao prontuário</a><a class="botao secundario pequeno" href="#/pedidos-lgpd">Pedidos LGPD</a></div></div></div>';
  }

  // Paciente: "Não vou poder ir" (motivo de lista fechada; sem texto livre: mensagem pelo sistema
  // não é acompanhada em tempo real, e uma crise não pode ficar esperando alguém ler)
  PEP.telas.avisoFaltaPaciente = function (s) {
    var opcoes = PEP.lista('motivosFaltaPaciente').map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.nome) + '</option>'; }).join('');
    return '<details class="aviso-falta"><summary>Não vou poder ir</summary><div class="linha" style="margin-top:.4rem">' +
      '<label class="pequeno" for="mf-' + s.id + '">Motivo</label><select id="mf-' + s.id + '" style="width:auto">' + opcoes + '</select>' +
      '<button class="botao secundario pequeno" data-acao="avisar-falta" data-id="' + s.id + '">Avisar a clínica</button></div>' +
      '<p class="suave pequeno" style="margin:.3rem 0 0">A falta avisada não conta como abandono. Se for uma crise, não espere a sessão: CVV 188 · SAMU 192.</p></details>';
  };

  function painelPaciente(u) {
    var casos = PEP.db.casos.filter(function (c) { return c.pacienteId === u.pacienteId && c.status === 'ativo'; });
    var sessoes = proximasSessoes(casos);
    var p = PEP.regras.pacienteDoUsuario(u);
    var html = '<h1>Olá, ' + esc(p ? (p.nomeSocial || p.nome) : '') + '</h1><p class="suave">Este é o seu espaço na clínica-escola de Psicologia.</p>' +
      '<div class="cartao"><h2>Próximas sessões</h2>';
    if (!sessoes.length) html += '<p class="vazio">Nenhuma sessão agendada.</p>';
    sessoes.forEach(function (s) {
      html += '<div class="sessao-paciente"><div class="linha entre"><span>' + data(s.data) + ' às ' + esc(s.hora) + '</span>' +
        (s.confirmada ? '<span class="etiqueta validada">Presença confirmada</span>' :
          '<button class="botao pequeno" data-acao="confirmar-sessao" data-id="' + s.id + '">Confirmar presença</button>') + '</div>' +
        PEP.telas.avisoFaltaPaciente(s) + '</div>';
    });
    var ids = casos.map(function (c) { return c.id; });
    var avisadas = PEP.db.sessoes.filter(function (s) { return ids.indexOf(s.casoId) !== -1 && s.avisoPaciente && s.data >= PEP.util.hoje(); });
    var temPlano = casos.some(function (c) { return PEP.regras.planoAtual(c); });
    html += (avisadas.length ? '<p class="pequeno"><strong>Você avisou que não vai:</strong> ' + avisadas.map(function (s) { return data(s.data) + ' às ' + esc(s.hora); }).join(', ') + '.</p>' : '') +
      '<p class="suave pequeno">Não vai poder vir? Use "Não vou poder ir" na sessão: a falta avisada não conta como abandono.</p></div>' +
      (temPlano ? '<div class="cartao"><h2>Meu plano de segurança</h2><p>O plano que você fez com quem te atende, para ler quando sentir que uma crise está começando.</p>' +
        '<a class="botao" href="#/meu-plano">Abrir meu plano</a></div>' : '') +
      '<div class="aviso perigo pequeno" role="note"><strong>Em crise, não espere a sessão:</strong> ' + PEP.telas.contatosUrgencia(true) + '. Mensagens pelo sistema não são acompanhadas em tempo real.</div>' +
      '<div class="grade-2"><div class="cartao"><h2>Seu prontuário é seu</h2><p>Você tem direito de acesso ao seu prontuário, a qualquer momento.</p>' +
      '<a class="botao" href="#/meu-prontuario">Pedir cópia do meu prontuário</a></div>' +
      '<div class="cartao"><h2>Seus dados e seus direitos</h2><p>Veja os dados que a clínica guarda, seus consentimentos e faça pedidos pela LGPD.</p>' +
      '<a class="botao secundario" href="#/meus-dados">Meus dados (LGPD)</a> ' +
      '<a href="https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf" target="_blank" rel="noopener">Código de Ética (CFP)</a></div></div>';
    return html;
  }

  function painelDirecao(u) {
    // Números agregados (com o banco ligado, vêm de app.indicadores(): a direção não lê casos nem a fila)
    var ind = PEP.telas.indicadoresAtuais(u) || { casosAtivos: '…', naFila: '…' };
    var ativos = ind.casosAtivos, fila = ind.naFila;
    var alocados = PEP.db.alocacoes.filter(PEP.regras.alocacaoAtiva).length;
    var semGrupo = PEP.regras.estagiariosSemGrupo().length;
    return '<h1>Olá, ' + esc(u.nome) + '</h1><p class="suave">' + esc(PEP.regras.descricaoUsuario(u)) + '</p>' +
      '<div class="aviso info">Seu perfil vê só <strong>dados agregados</strong>. Prontuários e nomes de pacientes ficam restritos à equipe de cada caso, por sigilo.</div>' +
      '<div class="grade">' + PEP.ui.numero(ativos, 'casos ativos') + PEP.ui.numero(fila, 'pessoas na fila') +
      PEP.ui.numero(alocados, 'estagiários alocados') + PEP.ui.numero(semGrupo, 'estudantes sem grupo') + '</div>' +
      '<div class="linha"><a class="botao" href="#/indicadores">Ver indicadores</a><a class="botao secundario" href="#/alocacao">Grupos de estágio</a>' +
      '<a class="botao secundario" href="#/estudantes">Importar estudantes</a></div>';
  }

  PEP.telas.painel = function (u) {
    if (u.perfil === 'estagiario') return painelEstagiario(u);
    if (u.perfil === 'supervisor') return painelSupervisor(u);
    if (u.perfil === 'tecnico') return painelTecnico(u);
    if (u.perfil === 'paciente') return painelPaciente(u);
    return painelDirecao(u);
  };

  PEP.telas._proximasSessoes = proximasSessoes;
})();
