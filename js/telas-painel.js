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

  // Próximas sessões: uma linha por sessão (data, hora e sala; paciente quando é a equipe)
  function listaSessoes(sessoes, mostrarPaciente) {
    var html = '<section class="cartao" aria-labelledby="titulo-sessoes"><div class="cabecalho-cartao"><h2 id="titulo-sessoes">Próximas sessões</h2><a href="#/agenda">Agenda</a></div>';
    if (!sessoes.length) return html + '<p class="vazio">Nenhuma sessão agendada.</p></section>';
    return html + '<ul class="lista-itens">' + sessoes.slice(0, 5).map(function (s) {
      var caso = PEP.util.porId(PEP.db.casos, s.casoId);
      return '<li><div class="resto"><strong>' + PEP.util.diaRelativo(s.data) + ', ' + esc(s.hora) + (s.sala ? ' · ' + esc(s.sala) : '') + '</strong>' +
        (mostrarPaciente ? '<small><a href="#/caso/' + caso.id + '/sessoes">' + esc(PEP.ui.nomePacienteDoCaso(caso)) + '</a></small>' : '') + '</div>' +
        (s.confirmada ? '<span class="etiqueta validada">Confirmada</span>' : '<span class="etiqueta rascunho">A confirmar</span>') + '</li>';
    }).join('') + '</ul></section>';
  }

  // ---------- Pendências ----------
  // Tudo o que pede ação vira um item de uma lista só (antes eram vários avisos empilhados no topo).
  // Cada item: { tipo: 'perigo' | 'alerta' | 'info', titulo (HTML), texto (HTML) }
  function item(tipo, titulo, texto) { return { tipo: tipo, titulo: titulo, texto: texto || '' }; }
  function linkCaso(c, aba, sufixo) {
    return '<a href="#/caso/' + c.id + (aba ? '/' + aba : '') + '">' + esc(PEP.ui.nomePacienteDoCaso(c)) + (sufixo || '') + '</a>';
  }

  // Avaliações de risco em aberto nos casos (aguardando a ciência da supervisão vem primeiro)
  function pendenciasRisco(casos, souSupervisor) {
    var ids = casos.map(function (c) { return c.id; });
    var abertos = PEP.db.riscos.filter(function (r) { return ids.indexOf(r.casoId) !== -1 && !r.encerradoEm; });
    var caso = function (r) { return PEP.util.porId(PEP.db.casos, r.casoId); };
    return abertos.filter(function (r) { return !r.cienciaEm; }).map(function (r) {
      return item('perigo', linkCaso(caso(r), 'risco'), 'Avaliação de risco ' + esc(r.nivel) + ' (' + data(r.em) + ') ' +
        (souSupervisor ? 'aguardando a sua ciência.' : 'aguardando a ciência da supervisão.'));
    }).concat(abertos.filter(function (r) { return r.cienciaEm; }).map(function (r) {
      return item('alerta', linkCaso(caso(r), 'risco'), 'Risco em acompanhamento (' + esc(r.nivel) + '): retome nas próximas sessões.');
    }));
  }

  // Transição de semestre: caso em andamento cuja dupla não tem mais estagiário com vínculo ativo
  function pendenciasSemDupla(u) {
    return PEP.regras.casosSemDuplaAtiva(u).map(function (c) {
      return item('perigo', linkCaso(c), 'Caso sem dupla ativa (o estágio terminou): faça a passagem para outra dupla no Resumo, em "Passagem do caso".');
    });
  }

  // Na tela de alocação (supervisão e técnica), o mesmo aviso aparece em destaque
  PEP.telas.alertaSemDupla = function (u) {
    var l = PEP.regras.casosSemDuplaAtiva(u);
    if (!l.length) return '';
    return '<div class="aviso perigo" role="note"><strong>Caso sem dupla ativa (o estágio terminou):</strong> ' + l.map(function (c) {
      return '<a href="#/caso/' + c.id + '">' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</a>';
    }).join(', ') + '. Faça a passagem para outra dupla (resumo do caso e quadro "Passagem do caso") para o atendimento continuar.</div>';
  };

  function pendenciasDosCasos(casos) {
    var l = [];
    casos.filter(PEP.regras.emRiscoDeAbandono).forEach(function (c) {
      l.push(item('perigo', linkCaso(c, 'sessoes'), 'Risco de abandono: ' + PEP.regras.faltasSeguidas(c) + ' faltas seguidas. Registre a tentativa de contato antes de liberar a vaga.'));
    });
    var ids = casos.map(function (c) { return c.id; }), hoje = PEP.util.hoje();
    var nomesFalta = {};
    PEP.lista('motivosFaltaPaciente').forEach(function (m) { nomesFalta[m.id] = m.nome; });
    var caso = function (s) { return PEP.util.porId(PEP.db.casos, s.casoId); };
    PEP.db.sessoes.filter(function (s) { return ids.indexOf(s.casoId) !== -1 && s.avisoPaciente && s.data >= hoje; }).forEach(function (s) {
      l.push(item('info', linkCaso(caso(s), 'sessoes'), 'Falta avisada pelo paciente para ' + data(s.data) + ' (' + esc((nomesFalta[s.motivoFalta] || '').toLowerCase()) + '). Se puder, ofereça outro horário.'));
    });
    casos.forEach(function (c) {
      PEP.regras.sessoesSemEvolucao(c).forEach(function (s) {
        l.push(item('alerta', linkCaso(c, 'evolucoes'), 'Evolução atrasada: sessão de ' + data(s.data) + ', mais de ' + PEP.regra('prazoEvolucaoHoras') + ' h sem registro.'));
      });
    });
    presencasPendentes(casos).forEach(function (s) {
      l.push(item('info', linkCaso(caso(s), 'sessoes'), 'Presença pendente: sessão de ' + data(s.data) + '.'));
    });
    return l;
  }

  function painelEstagiario(u) {
    var casos = PEP.regras.casosVisiveis(u);
    var ativos = casos.filter(function (c) { return c.status === 'ativo'; });
    var ids = casos.map(function (c) { return c.id; });
    var minhas = PEP.db.evolucoes.filter(function (e) { return ids.indexOf(e.casoId) !== -1 && e.autorId === u.id; });
    var devolvidas = minhas.filter(function (e) { return e.status === 'devolvida'; });
    var rascunhos = minhas.filter(function (e) { return e.status === 'rascunho'; });
    var sessoes = proximasSessoes(ativos);
    var caso = function (e) { return PEP.util.porId(PEP.db.casos, e.casoId); };

    var pend = pendenciasRisco(ativos, false)
      .concat(devolvidas.map(function (e) { return item('alerta', linkCaso(caso(e), 'evolucoes'), 'Evolução de ' + data(e.data) + ' devolvida. Supervisão: ' + esc(e.comentarioSupervisor)); }))
      .concat(pendenciasDosCasos(ativos))
      .concat(rascunhos.map(function (e) { return item('info', linkCaso(caso(e), 'evolucoes'), 'Rascunho de evolução de ' + data(e.data) + '.'); }));

    var html = '<h1>Olá, ' + esc(u.nome) + '</h1><p class="subtitulo">' + esc(PEP.regras.descricaoUsuario(u)) + '</p>';
    if (!PEP.regras.alocacaoDoEstagiario(u.id)) {
      html += '<div class="aviso info">Você não tem vínculo de estágio ativo neste semestre, por isso não vê casos. O acesso aos prontuários nasce e termina com o vínculo.</div>';
    }
    return html + PEP.ui.numeros([[ativos.length, 'casos ativos'], [devolvidas.length + rascunhos.length, 'evoluções a terminar'], [sessoes.length, 'próximas sessões']]) +
      '<div class="grade-2">' + PEP.ui.listaPendencias(pend) + listaSessoes(sessoes, true) + '</div>';
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

    var pend = pendenciasRisco(ativos, true).concat(pendenciasSemDupla(u)).concat(pendenciasDosCasos(ativos))
      .concat(cheios.map(function (g) { return item('alerta', '<strong>' + esc(g.nome) + '</strong>', 'Mais de ' + max + ' estagiários no grupo. Referência da Res. CFP 05/2025, art. 5º (hoje suspenso por liminar do STF).'); }));

    var validar = '<section class="cartao" aria-labelledby="titulo-validar"><div class="cabecalho-cartao"><h2 id="titulo-validar">Para validar</h2><a href="#/supervisao">Validação</a></div>' +
      (fila.length ? '<ul class="lista-itens">' + fila.map(function (e) {
        var c = PEP.util.porId(PEP.db.casos, e.casoId);
        return '<li><div class="resto">' + linkCaso(c, 'evolucoes') + '<small>Enviada por ' + esc(PEP.ui.nomeUsuario(e.autorId)) + ' · sessão de ' + data(e.data) + '</small></div>' +
          '<span class="etiqueta enviada">Na supervisão</span></li>';
      }).join('') + '</ul>' : '<p class="vazio">Nenhuma evolução aguardando.</p>') + '</section>';

    return '<h1>Olá, ' + esc(u.nome) + '</h1><p class="subtitulo">' + esc(PEP.regras.descricaoUsuario(u)) + ' · ' + esc(u.crp) + '</p>' +
      PEP.ui.numeros([[fila.length, 'evoluções para validar'], [ativos.length, 'casos ativos'], [nEst, 'estagiários']]) +
      '<div class="grade-2">' + PEP.ui.listaPendencias(pend) + validar + '</div>' +
      '<div class="cartao">' + PEP.grafico.atendimentosPorMes(PEP.regras.indicadores(u).porMes, 'Atendimentos por mês nos meus grupos') + '</div>';
  }

  function painelTecnico(u) {
    var fila = PEP.db.inscricoes.filter(function (i) { return i.status === 'aguardando'; });
    var dup = fila.filter(function (i) { return i.duplicidade; });
    var urgentes = fila.filter(function (i) { return i.sinalUrgencia; });
    var semGrupo = PEP.db.casos.filter(function (c) { return c.status === 'aguardando-alocacao'; });
    var pedidos = PEP.db.solicitacoes.filter(function (s) { return s.status !== 'entregue'; });
    var lgpd = PEP.db.pedidosTitular.filter(function (p) { return p.status === 'aberto'; });
    var ativos = PEP.db.casos.filter(function (c) { return c.status === 'ativo'; });
    // Risco: para a técnica, só a contagem (o detalhe fica no caso, com justificativa de acesso);
    // o caso com risco visto na triagem e ainda sem grupo aparece pelo nome, para alocar com prioridade
    var abertos = PEP.db.riscos.filter(function (r) { return !r.encerradoEm; });
    var triagemComRisco = semGrupo.filter(function (c) { return PEP.regras.riscosAbertos(c).length; });

    var pend = triagemComRisco.map(function (c) {
      return item('perigo', '<a href="#/alocacao">' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</a>', 'Risco visto na triagem, caso ainda sem grupo: aloque com prioridade e avise a supervisão.');
    });
    if (urgentes.length) pend.push(item('perigo', '<a href="#/fila">Fila de espera</a>', urgentes.length + ' inscrição(ões) com sinal de urgência no relato: contatar hoje, urgência não espera a fila.'));
    if (abertos.length) pend.push(item('alerta', '<strong>Avaliações de risco</strong>', abertos.length + ' em aberto na clínica, ' + abertos.filter(function (r) { return !r.cienciaEm; }).length + ' aguardando a ciência da supervisão.'));
    pend = pend.concat(pendenciasSemDupla(u)).concat(pendenciasDosCasos(ativos));
    if (dup.length) pend.push(item('alerta', '<a href="#/fila">Fila de espera</a>', dup.length + ' inscrição(ões) com CPF já cadastrado: confira antes de triar.'));
    if (semGrupo.length) pend.push(item('info', '<a href="#/alocacao">Alocação</a>', semGrupo.length + ' caso(s) aguardando dupla ou trio.'));
    if (pedidos.length || lgpd.length) pend.push(item('info', '<a href="#/solicitacoes">Pedidos dos pacientes</a>', pedidos.length + ' pedido(s) de cópia do prontuário e ' + lgpd.length + ' pedido(s) LGPD em aberto.'));

    return '<h1>Olá, ' + esc(u.nome) + '</h1><p class="subtitulo">' + esc(PEP.regras.descricaoUsuario(u)) + ' · ' + esc(u.crp) + '</p>' +
      PEP.ui.numeros([[fila.length, 'na fila de espera'], [semGrupo.length, 'aguardando alocação'], [pedidos.length + lgpd.length, 'pedidos dos pacientes']]) +
      PEP.ui.listaPendencias(pend) +
      '<div class="cartao">' + PEP.grafico.atendimentosPorMes(PEP.regras.indicadores(u).porMes, 'Atendimentos por mês no Serviço-Escola') + '</div>';
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
    var html = '<h1>Olá, ' + esc(p ? (p.nomeSocial || p.nome) : '') + '</h1><p class="subtitulo">Este é o seu espaço na clínica-escola de Psicologia.</p>' +
      '<div class="cartao"><h2>Próximas sessões</h2>';
    if (!sessoes.length) html += '<p class="vazio">Nenhuma sessão agendada.</p>';
    // As 3 próximas; o resto fica em "Sessões" (menu)
    sessoes.slice(0, 3).forEach(function (s) {
      html += '<div class="sessao-paciente"><div class="linha entre"><strong>' + PEP.util.diaRelativo(s.data) + ', ' + esc(s.hora) + (s.sala ? ' · ' + esc(s.sala) : '') + '</strong>' +
        (s.confirmada ? '<span class="etiqueta validada">Presença confirmada</span>' :
          '<button class="botao pequeno" data-acao="confirmar-sessao" data-id="' + s.id + '">Confirmar presença</button>') + '</div>' +
        PEP.telas.avisoFaltaPaciente(s) + '</div>';
    });
    var ids = casos.map(function (c) { return c.id; });
    var avisadas = PEP.db.sessoes.filter(function (s) { return ids.indexOf(s.casoId) !== -1 && s.avisoPaciente && s.data >= PEP.util.hoje(); });
    var temPlano = casos.some(function (c) { return PEP.regras.planoAtual(c); });
    html += (avisadas.length ? '<p class="pequeno"><strong>Você avisou que não vai:</strong> ' + avisadas.map(function (s) { return data(s.data) + ' às ' + esc(s.hora); }).join(', ') + '.</p>' : '') +
      (sessoes.length > 3 ? '<p><a href="#/agenda">Ver todas as ' + sessoes.length + ' sessões</a></p>' : '') +
      '<p class="suave pequeno" style="margin:0">Não vai poder vir? Use "Não vou poder ir" na sessão: a falta avisada não conta como abandono.</p></div>' +
      '<div class="aviso perigo" role="note"><strong>Em crise, não espere a sessão:</strong> ' + PEP.telas.contatosUrgencia(true) + '. Mensagens pelo sistema não são acompanhadas em tempo real.' +
      (temPlano ? ' <a href="#/meu-plano">Abrir meu plano de segurança</a>.' : '') + '</div>' +
      '<p class="suave pequeno">Você tem direito de acesso ao seu prontuário (menu "Prontuário") e aos seus dados ("Meus dados", pela LGPD). ' +
      '<a href="https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf" target="_blank" rel="noopener">Código de Ética do psicólogo (CFP)</a>.</p>';
    return html;
  }

  function painelDirecao(u) {
    // Números agregados (com o banco ligado, vêm de app.indicadores(): a direção não lê casos nem a fila)
    var ind = PEP.telas.indicadoresAtuais(u) || { casosAtivos: '…', naFila: '…' };
    var alocados = PEP.db.alocacoes.filter(PEP.regras.alocacaoAtiva).length;
    var semGrupo = PEP.regras.estagiariosSemGrupo().length;
    return '<h1>Olá, ' + esc(u.nome) + '</h1><p class="subtitulo">' + esc(PEP.regras.descricaoUsuario(u)) + '</p>' +
      '<p class="suave pequeno">Seu perfil vê só <strong>dados agregados</strong>. Prontuários e nomes de pacientes ficam restritos à equipe de cada caso, por sigilo.</p>' +
      PEP.ui.numeros([[ind.casosAtivos, 'casos ativos'], [ind.naFila, 'pessoas na fila'], [alocados, 'estagiários alocados'], [semGrupo, 'estudantes sem grupo']]) +
      (ind.porMes ? '<div class="cartao">' + PEP.grafico.atendimentosPorMes(ind.porMes, 'Atendimentos por mês no Serviço-Escola') + '</div>' : '');
  }

  // Último acesso e tentativas sem sucesso desde então (aparece no painel até a pessoa fechar)
  function avisoUltimoAcesso() {
    var a = PEP.estado.lerUltimoAcesso();
    if (!a) return '';
    return '<div class="aviso ' + (a.falhas ? 'alerta' : 'info') + ' pequeno" role="status" id="aviso-acesso"><div class="linha entre"><span>Seu último acesso foi em ' + data(a.em) + '.' +
      (a.falhas ? ' <strong>Desde então, ' + a.falhas + ' tentativa(s) de entrar com o seu usuário não deram certo.</strong> Se não foi você, troque a senha em <a href="#/conta">Minha conta</a> e avise a técnica.' : '') +
      '</span><button class="botao secundario pequeno" data-acao="fechar-aviso-acesso">Fechar</button></div></div>';
  }

  PEP.telas.painel = function (u) {
    var aviso = avisoUltimoAcesso();
    if (u.perfil === 'estagiario') return aviso + painelEstagiario(u);
    if (u.perfil === 'supervisor') return aviso + painelSupervisor(u);
    if (u.perfil === 'tecnico') return aviso + painelTecnico(u);
    if (u.perfil === 'paciente') return aviso + painelPaciente(u);
    return aviso + painelDirecao(u);
  };

  // ---------- Busca de paciente (página "Buscar" de quem atende) ----------
  // Procura só entre os casos que a pessoa já pode ver; no modo discreto, o resultado mostra as iniciais
  PEP.telas.busca = function (u) {
    if (['estagiario', 'supervisor', 'tecnico'].indexOf(u.perfil) === -1) return PEP.ui.semPermissao();
    var termo = PEP.telas._busca || '', n = PEP.revisor.normalizar(termo).trim();
    // O termo fica só na memória da tela, nunca no endereço da página (o endereço vai para o histórico do navegador)
    var html = '<h1>Buscar paciente</h1><form data-form="busca" role="search" class="busca-pagina" novalidate>' +
      '<label for="busca-paciente" class="sr-only">Nome do paciente ou código do caso</label>' +
      '<input id="busca-paciente" name="termo" type="search" placeholder="Nome ou código do caso" maxlength="60" autocomplete="off" enterkeyhint="search" value="' + esc(termo) + '">' +
      '<button class="botao" type="submit">Buscar</button></form>';
    if (n.length < 2) return html + '<p class="suave">Digite pelo menos 2 letras do nome. A busca procura só entre os casos que você acompanha.</p>';
    var bate = function (t) { return PEP.revisor.normalizar(t || '').indexOf(n) !== -1; };
    var casos = PEP.regras.casosVisiveis(u).filter(function (c) {
      var p = PEP.ui.pacienteDoCaso(c);
      return bate(p.nome) || bate(p.nomeSocial) || bate(c.id);
    });
    var fila = PEP.regras.podeGerirFila(u) ? PEP.db.inscricoes.filter(function (i) { return i.status === 'aguardando' && bate(i.nome); }) : [];
    html += '<p class="suave" role="status">' + (casos.length + fila.length) + ' resultado(s) para "' + esc(termo) + '".</p>';
    if (casos.length) {
      html += '<div class="cartao"><h2>Casos</h2><ul class="lista-busca">' + casos.map(function (c) {
        var g = PEP.util.porId(PEP.db.grupos, c.grupoId), s = PEP.util.porId(PEP.db.subgrupos, c.subgrupoId);
        return '<li><a href="#/caso/' + c.id + '">' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</a> ' + PEP.ui.etiquetaCaso(c) +
          ' <span class="suave pequeno">caso ' + esc(c.id) + (g ? ' · ' + esc(g.nome) : '') + (s ? ' · ' + esc(s.nome) : '') + '</span></li>';
      }).join('') + '</ul></div>';
    }
    if (fila.length) {
      html += '<div class="cartao"><h2>Na fila de espera</h2><ul class="lista-busca">' + fila.map(function (i) {
        return '<li><a href="#/triagem/' + i.id + '">' + esc(PEP.ui.nomeInscricao(i)) + '</a> <span class="suave pequeno">inscrita em ' + data(i.data) + '</span></li>';
      }).join('') + '</ul></div>';
    }
    if (!casos.length && !fila.length) html += '<p class="vazio">Nenhum paciente com esse nome entre os casos que você acompanha.</p>';
    return html;
  };

  PEP.telas._proximasSessoes = proximasSessoes;
})();
