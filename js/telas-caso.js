/* =========================================================
   telas-caso.js — prontuário do caso (parte 1):
   cabeçalho, abas, resumo/anamnese/consentimentos e evoluções.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };
  var R = function () { return PEP.regras; };

  // Abas do prontuário (6): a "Área restrita" junta o registro de supervisão e a avaliação psicológica,
  // que ficam fora do prontuário e da cópia do paciente; cada parte só aparece para quem pode ver.
  // O encerramento não é aba: abre pelo botão no fim do Resumo (é usado uma vez por caso).
  function partesRestritas(u, caso) {
    var l = [];
    if (R().podeVerOrientacoes(u, caso)) l.push(['supervisao', 'Supervisão']);
    if (R().podeVerAreaRestrita(u, caso)) l.push(['restrita', 'Avaliação psicológica']);
    return l;
  }
  function abasDoCaso(u, caso) {
    var abas = [['resumo', 'Resumo', ['encerramento']], ['evolucoes', 'Evoluções'], ['risco', 'Risco'], ['sessoes', 'Sessões'], ['documentos', 'Documentos']];
    var restritas = partesRestritas(u, caso);
    if (restritas.length) abas.push([restritas[0][0], 'Área restrita', restritas.map(function (r) { return r[0]; })]);
    return abas;
  }
  // Rotas que a pessoa pode abrir neste caso (as abas e as partes que ficam dentro delas)
  function rotasPermitidas(u, caso) {
    return ['resumo', 'evolucoes', 'risco', 'sessoes', 'documentos', 'encerramento'].concat(partesRestritas(u, caso).map(function (r) { return r[0]; }));
  }

  function cabecalho(u, caso) {
    var p = PEP.ui.pacienteDoCaso(caso);
    var g = R().grupoDoCaso(caso);
    var sg = R().subgrupoDoCaso(caso);
    var equipe = R().estagiariosDoCaso(caso).map(PEP.ui.nomeUsuario).join(', ') || '—';
    var podePdf = u.perfil === 'tecnico' || R().ehSupervisorDoCaso(u, caso);
    return '<header class="cabecalho-caso"><a href="#/casos" class="voltar">‹ Casos</a>' +
      '<h1>' + esc(PEP.ui.nomePacienteDoCaso(caso)) + '</h1>' +
      '<p class="resumo-caso">' + esc(PEP.ui.idade(p)) + ' anos · ' + (g ? esc(g.nome) + (sg ? ', ' + esc(sg.nome) : '') : 'sem grupo') +
      ' · supervisão: ' + esc(PEP.ui.nomeUsuario(R().supervisorDoCaso(caso)) || '—') + '</p>' +
      '<div class="linha">' + PEP.ui.etiquetaCaso(caso) + seloRisco(caso) +
      (podePdf ? '<a class="botao secundario pequeno" href="#/imprimir/' + caso.id + '">Cópia em PDF</a>' : '') + '</div>' +
      '<p class="equipe">Caso ' + esc(caso.id) + ' · início ' + data(caso.inicio) + ' · estagiários: ' + esc(equipe) + '</p></header>';
  }

  // Selo no cabeçalho: risco em aberto aparece em toda aba do caso (sem detalhes, com link para a aba)
  function seloRisco(caso) {
    var abertos = R().riscosAbertos(caso);
    if (!abertos.length) return '';
    var semCiencia = abertos.some(function (r) { return !r.cienciaEm; });
    return '<a class="etiqueta perigo" href="#/caso/' + caso.id + '/risco">' + (semCiencia ? 'Risco · aguardando ciência' : 'Risco em acompanhamento') + '</a>';
  }

  function abas(u, caso, atual) {
    return '<nav class="abas" aria-label="Seções do prontuário">' + abasDoCaso(u, caso).map(function (a) {
      var ativa = a[0] === atual || (a[2] || []).indexOf(atual) !== -1;
      return '<a href="#/caso/' + caso.id + '/' + a[0] + '"' + (ativa ? ' class="ativa" aria-current="page"' : '') + '>' + a[1] + '</a>';
    }).join('') + '</nav>';
  }

  // Dentro da Área restrita: escolha entre supervisão e avaliação (quando a pessoa vê as duas)
  PEP.telas.seletorRestrito = function (u, caso, atual) {
    var partes = partesRestritas(u, caso);
    if (partes.length < 2) return '';
    return '<nav class="seletor" aria-label="Partes da área restrita" style="margin-bottom:1rem">' + partes.map(function (r) {
      return '<a href="#/caso/' + caso.id + '/' + r[0] + '"' + (r[0] === atual ? ' class="ativo" aria-current="page"' : '') + '>' + r[1] + '</a>';
    }).join('') + '</nav>';
  };

  function linhaAssinaturas(tipo, id) {
    var lista = tipo === 'evolucao' ? R().assinaturasVigentes(PEP.util.porId(PEP.db.evolucoes, id)) : R().assinaturasDe(tipo, id);
    if (!lista.length) return '';
    return '<div class="assinaturas">Assinado por: ' + lista.map(function (s) {
      return esc(PEP.ui.nomeUsuario(s.usuarioId)) + ' (' + (s.papel === 'supervisor' ? 'supervisão' : 'estagiário') + ') em ' + data(s.em);
    }).join(' · ') + '</div>';
  }

  // ---------- Aba: resumo, anamnese e consentimentos ----------
  var CAMPOS_ANAMNESE = [['demanda', 'Avaliação de demanda'], ['objetivos', 'Objetivos do trabalho'], ['queixa', 'Queixa principal'],
    ['sintomas', 'Sintomas relatados'], ['historicoFamiliar', 'Histórico familiar'], ['medicacoes', 'Medicações'], ['historicoClinico', 'Histórico clínico']];

  function blocoAnamnese(u, caso) {
    var a = R().anamneseAtual(caso);
    var versoes = R().anamnesesDoCaso(caso);
    var html = '<div class="cartao"><div class="linha entre"><h2>Avaliação de demanda, objetivos e anamnese</h2>' +
      (a.versao ? '<span class="suave pequeno">Versão ' + a.versao + ' · ' + esc(PEP.ui.nomeUsuario(a.autorId)) + ' em ' + data(a.em) + '</span>' : '') + '</div>' +
      '<div class="grade-2">' + CAMPOS_ANAMNESE.map(function (c) {
        return '<p><strong>' + c[1] + '</strong><br>' + esc(a[c[0]] || '—') + '</p>';
      }).join('') + '</div>' + (a.id ? linhaAssinaturas('anamnese', a.id) : '');

    if (a.id && R().podeAssinarAnamnese(u, caso) && !R().assinadoPeloSupervisor('anamnese', a.id)) {
      html += '<button class="botao pequeno" style="margin-top:.6rem" data-acao="assinar-anamnese" data-id="' + a.id + '">Assinar versão ' + a.versao + ' (supervisão)</button>';
    }
    if (R().podeEditarAnamnese(u, caso)) {
      html += '<details style="margin-top:.8rem"><summary><strong>Atualizar anamnese, demanda e objetivos</strong></summary>' +
        '<p class="suave pequeno" style="margin-top:.5rem">Salvar cria uma nova versão; as anteriores ficam guardadas. Registre o necessário: o paciente pode ler o prontuário.</p>' +
        '<div class="grade-2" id="form-anamnese">' + CAMPOS_ANAMNESE.map(function (c) {
          return '<div class="campo"><label for="an-' + c[0] + '">' + c[1] + (c[0] === 'demanda' || c[0] === 'objetivos' ? ' *' : '') + '</label>' +
            '<textarea id="an-' + c[0] + '" style="min-height:80px" maxlength="' + PEP.regra('anamneseCampoMaxCaracteres') + '">' + esc(a[c[0]] || '') + '</textarea></div>';
        }).join('') + '</div>' +
        '<button class="botao pequeno" data-acao="salvar-anamnese" data-caso="' + caso.id + '">Salvar nova versão</button></details>';
    }
    if (versoes.length > 1) {
      html += '<details style="margin-top:.8rem"><summary>Versões anteriores (' + (versoes.length - 1) + ')</summary>' +
        versoes.slice(0, -1).reverse().map(function (v) {
          return '<div class="adendo"><strong>Versão ' + v.versao + '</strong> · ' + esc(PEP.ui.nomeUsuario(v.autorId)) + ' em ' + data(v.em) +
            '<br><strong>Demanda:</strong> ' + esc(v.demanda) + '<br><strong>Objetivos:</strong> ' + esc(v.objetivos) + '</div>';
        }).join('') + '</details>';
    }
    return html + '</div>';
  }

  function blocoConsentimentos(u, caso) {
    var html = '<div class="cartao"><h2>Consentimentos (um por finalidade)</h2><div class="tabela-rolagem"><table>' +
      '<caption class="sr-only">Situação de cada consentimento do caso</caption><thead><tr><th scope="col">Finalidade</th><th scope="col">Situação</th><th scope="col">Registro</th><th scope="col"></th></tr></thead><tbody>';
    PEP.lista('finalidadesConsentimento').forEach(function (f) {
      var c = R().consentimentoAtual(caso, f.id);
      var hist = R().historicoConsentimento(caso, f.id);
      var situacao = c && c.concedido ? '<span class="etiqueta validada">sim</span>' : '<span class="etiqueta rascunho">não</span>';
      var revogado = hist.length > 1 && c && !c.concedido ? ' <span class="suave pequeno">(revogado)</span>' : '';
      var acao = '';
      if (u.perfil === 'tecnico' && caso.status !== 'encerrado' && !(f.obrigatoria && c && c.concedido)) {
        acao = '<button class="botao secundario pequeno" data-acao="registrar-consentimento" data-caso="' + caso.id + '" data-fin="' + f.id + '" data-valor="' + (c && c.concedido ? 'nao' : 'sim') + '">' +
          (c && c.concedido ? 'Registrar revogação' : 'Registrar concessão') + '</button>';
      }
      html += '<tr><td>' + esc(f.nome) + (f.obrigatoria ? ' <span class="suave pequeno">(necessário para atender)</span>' : '') + '</td><td>' + situacao + revogado + '</td>' +
        '<td class="pequeno">' + (c ? data(c.em) + ' · ' + esc(PEP.ui.nomeUsuario(c.registradoPor)) + ' · termo ' + esc(c.termoVersao) : '—') + '</td><td>' + acao + '</td></tr>';
    });
    return html + '</tbody></table></div><p class="suave pequeno">Todo meio de registro ou observação precisa ser informado ao paciente desde o início (Código de Ética, art. 14). ' +
      'Revogar é um direito do paciente (LGPD, art. 8º, § 5º) e vira um novo registro: o histórico não se apaga.</p></div>';
  }

  // Acesso do paciente ao portal (técnica): confirmar sessões, avisar falta, plano de segurança, cópia, LGPD
  function blocoPortal(p) {
    var conta = R().contaDoPaciente(p);
    var html = PEP.telas.senhaGeradaAgora() + '<div class="caixa-campos"><strong>Acesso ao portal do paciente:</strong> ';
    if (!conta) {
      return html + 'ainda não tem. <button class="botao secundario pequeno" data-acao="criar-acesso-portal" data-id="' + p.id + '">Criar acesso ao portal</button>' +
        '<span class="suave pequeno"> Usa o e-mail do cadastro; a senha provisória aparece uma vez.</span></div>';
    }
    return html + 'usuário <strong>' + esc(conta.login) + '</strong> · ' + (conta.ativo ? 'ativo' : '<span class="etiqueta perigo">desativado</span>') +
      (conta.senhaProvisoria ? ' <span class="etiqueta alerta">senha provisória</span>' : '') + ' <span class="linha" style="display:inline-flex">' + PEP.telas.botoesConta(conta) + '</span></div>';
  }

  // ---------- Passagem do caso (transição de semestre) ----------
  function nomeDupla(subId) {
    var s = PEP.util.porId(PEP.db.subgrupos, subId), g = s && PEP.util.porId(PEP.db.grupos, s.grupoId);
    return s ? (g ? g.nome + ' · ' : '') + s.nome : '—';
  }
  function formularioPassagem(u, caso, itens) {
    var destinos = R().duplasDestino(u, caso), resumo = R().resumoValidado(caso);
    var bloqueado = itens.some(function (i) { return i.bloqueia && !i.ok; });
    if (!destinos.length) {
      return '<p class="vazio">Nenhuma outra dupla ou trio' + (u.perfil === 'tecnico' ? '' : ' do grupo') + ' com estagiário em vínculo ativo. ' +
        'As duplas do novo semestre são formadas em <a href="#/alocacao">' + (u.perfil === 'tecnico' ? 'Alocação' : 'Duplas e trios') + '</a>.</p>';
    }
    return '<details' + (R().semDuplaAtiva(caso) ? ' open' : '') + '><summary><strong>Passar o caso para outra dupla</strong></summary>' +
      '<form data-form="passar-caso" data-caso="' + caso.id + '" id="form-passagem" novalidate style="margin-top:.6rem">' +
      '<div class="campo"><label for="pc-destino">Nova dupla ou trio</label><select id="pc-destino" name="destino">' + destinos.map(function (s) {
        return '<option value="' + s.id + '">' + esc(nomeDupla(s.id)) + ' (' + R().estagiariosDoSubgrupo(s.id).map(function (id) { return esc(PEP.ui.nomeUsuario(id)); }).join(', ') + ')</option>';
      }).join('') + '</select></div>' +
      (resumo ? '<p class="pequeno">Vai junto o resumo de transferência validado em ' + data(resumo.data) + '.</p>' :
        '<div class="campo"><label for="pc-justificativa">Por que passar sem o resumo de transferência validado</label>' +
        '<textarea id="pc-justificativa" name="justificativa" maxlength="500" style="min-height:70px" aria-describedby="pc-justificativa-dica"></textarea>' +
        '<span class="dica" id="pc-justificativa-dica">Ex.: a dupla saiu antes do fim do semestre. Sem dados clínicos.</span></div>') +
      '<label class="check"><input type="checkbox" id="pc-avisado" name="avisado"> <span>O paciente foi avisado da troca de dupla (e do novo horário, se mudar).</span></label>' +
      '<div class="linha" style="margin-top:.6rem"><button class="botao" type="submit"' + (bloqueado ? ' disabled aria-describedby="pc-bloqueio"' : '') + '>Passar o caso</button></div>' +
      (bloqueado ? '<p class="pequeno" id="pc-bloqueio">Resolva antes o item marcado com ✗.</p>' : '') + '</form></details>';
  }
  function blocoPassagem(u, caso) {
    var passa = R().podePassarCaso(u, caso), daEquipe = R().ehEstagiarioDoCaso(u, caso), historico = R().transferenciasDoCaso(caso);
    if (!historico.length && !(caso.status === 'ativo' && (passa || daEquipe))) return '';
    var html = '<div class="cartao" id="passagem"><h2>Passagem do caso</h2>';
    if (caso.status === 'ativo' && R().semDuplaAtiva(caso)) {
      html += '<div class="aviso perigo" role="note">A dupla deste caso não tem mais estagiário com vínculo ativo (o estágio terminou). ' +
        (passa ? 'Passe o caso para outra dupla para o atendimento continuar.' : 'A supervisão passa o caso para outra dupla.') + '</div>';
    }
    if (caso.status === 'ativo' && (passa || daEquipe)) {
      var itens = R().checklistPassagem(caso);
      html += '<p class="suave pequeno">Antes de o estágio terminar ou de o caso mudar de dupla, confira:</p><ul class="checklist">' + itens.map(function (i) {
        var classe = i.ok ? 'ok' : i.bloqueia ? 'bloqueia' : 'atencao';
        var rotulo = i.ok ? 'Feito' : i.bloqueia ? 'Impede a passagem' : 'Atenção';
        return '<li class="' + classe + '"><span class="marca" aria-hidden="true">' + (i.ok ? '✓' : i.bloqueia ? '✗' : '!') + '</span><span class="sr-only">' + rotulo + ': </span>' + esc(i.texto) + '</li>';
      }).join('') + '</ul>';
      if (passa) html += formularioPassagem(u, caso, itens);
    }
    if (historico.length) {
      html += '<h3>Passagens registradas</h3><ul>' + historico.map(function (t) {
        return '<li>' + data(t.em) + ' · de ' + esc(nomeDupla(t.deSubgrupoId)) + ' para ' + esc(nomeDupla(t.paraSubgrupoId)) + ' · por ' + esc(PEP.ui.nomeUsuario(t.registradoPor)) +
          (t.resumoId ? ' · com resumo de transferência validado' : ' · sem resumo: ' + esc(t.justificativa)) + '</li>';
      }).join('') + '</ul>';
    }
    return html + '</div>';
  }

  function abaResumo(u, caso) {
    var p = PEP.ui.pacienteDoCaso(caso);
    var canal = PEP.lista('canaisLembrete').filter(function (c) { return c.valor === p.canalLembrete; })[0];
    // Modo discreto: nome por iniciais, contatos ocultos (o cadastro completo continua em "Editar cadastro")
    var disc = PEP.privacidade.discreto(), oculto = '<span class="suave">oculto no modo discreto</span>';
    return '<div class="cartao"><div class="linha entre"><h2>Identificação</h2>' +
      (R().podeEditarCadastro(u) ? '<a class="botao secundario pequeno" href="#/paciente/' + p.id + '/editar">Editar cadastro</a>' : '') + '</div>' +
      '<div class="grade-2"><p><strong>Nome:</strong> ' + (disc ? esc(PEP.ui.nomePaciente(p, caso.id)) : esc(p.nome) + (p.nomeSocial ? '<br><strong>Nome social:</strong> ' + esc(p.nomeSocial) : '')) +
      '<br><strong>Nascimento:</strong> ' + data(p.dataNascimento) + ' (' + esc(PEP.ui.idade(p)) + ' anos)' +
      '<br><strong>CPF:</strong> ' + esc(PEP.validar.ocultarCpf(p.cpf)) + '</p>' +
      '<p><strong>Telefone:</strong> ' + (disc ? oculto : esc(PEP.validar.formatarTelefone(p.telefone))) + '<br><strong>E-mail:</strong> ' + (disc ? oculto : esc(p.email || '—')) +
      (p.responsavelNome ? '<br><strong>Responsável legal:</strong> ' + (disc ? esc(PEP.privacidade.iniciais(p.responsavelNome)) : esc(p.responsavelNome)) : '') +
      '<br><strong>Contato de emergência:</strong> ' + (!p.emergenciaNome ? '—' : disc ? oculto : esc(p.emergenciaNome) + (p.emergenciaVinculo ? ' (' + esc(p.emergenciaVinculo) + ')' : '') +
        ', ' + esc(PEP.validar.formatarTelefone(p.emergenciaTelefone))) +
      '<br><strong>Lembretes:</strong> ' + esc(canal ? canal.nome : '—') +
      '<br><strong>Guarda mínima do prontuário até:</strong> ' + data(R().guardaAte(caso)) + '</p></div>' +
      (PEP.ui.idade(p) < 18 ? '<div class="aviso info pequeno">Paciente menor de idade: atendimento autorizado pelo responsável. Ao responsável, comunica-se só o essencial para o cuidado (Código de Ética, arts. 8º e 13).</div>' : '') +
      (u.perfil === 'tecnico' ? blocoPortal(p) : '') + '</div>' +
      blocoAnamnese(u, caso) + blocoConsentimentos(u, caso) + blocoPassagem(u, caso) + blocoEncerramento(u, caso);
  }

  // Fim do Resumo: o encerramento abre numa tela própria (antes era uma aba)
  function blocoEncerramento(u, caso) {
    var e = R().encerramentoDoCaso(caso);
    if (caso.status === 'encerrado' && e) {
      return '<div class="cartao linha entre"><span>Caso encerrado em ' + data(e.data) + '.</span>' +
        '<a class="botao secundario pequeno" href="#/caso/' + caso.id + '/encerramento">Ver o registro do encerramento</a></div>';
    }
    if (!R().podeEncerrar(u, caso)) return '';
    return '<div class="cartao linha entre"><span>Alta, desistência ou encaminhamento para outro serviço.</span>' +
      '<a class="botao secundario pequeno" href="#/caso/' + caso.id + '/encerramento">Encerrar ou encaminhar</a></div>';
  }

  // ---------- Aba: evoluções ----------
  // Limite de tamanho (regras.evolucaoMaxCaracteres): o prontuário é conciso, e o paciente pode lê-lo
  function atributosLimite(id) { return 'maxlength="' + PEP.regra('evolucaoMaxCaracteres') + '" data-contador="' + id + '-contador" data-revisor="' + id + '-revisor"'; }

  // Revisor de escrita (js/revisor.js) e prévia de como o paciente lê o registro na cópia
  function ferramentasDeEscrita(id, texto) {
    return '<div class="linha" style="margin-top:.3rem"><button type="button" class="botao secundario pequeno" data-acao="ver-como-paciente" data-alvo="' + id + '" aria-expanded="false" aria-controls="' + id + '-previa">Ver como o paciente lê</button></div>' +
      '<div id="' + id + '-revisor" role="region" aria-label="Revisor de escrita">' + (texto ? PEP.revisor.html(PEP.revisor.analisar(texto)) : '') + '</div>' +
      '<div id="' + id + '-previa"></div>';
  }
  function contador(id, texto) {
    return '<span class="dica" id="' + id + '-contador">' + String(texto || '').length + ' de ' + PEP.regra('evolucaoMaxCaracteres') + ' caracteres</span>';
  }

  function adendos(e) {
    return R().adendosDe(e.id).map(function (ad) {
      return '<div class="adendo"><strong>Adendo</strong> · ' + esc(ad.motivo) + ' · ' + esc(PEP.ui.nomeUsuario(ad.autorId)) + ' em ' + data(ad.em) +
        '<br>' + esc(ad.texto) + '</div>';
    }).join('');
  }

  function cartaoEvolucao(u, caso, e) {
    var html = '<div class="cartao evolucao ' + e.status + '"><div class="linha entre"><strong>' + data(e.data) + ' · ' + esc(PEP.ui.nomeUsuario(e.autorId)) +
      (e.tipo === 'transferencia' ? ' · Resumo de transferência' : '') + '</strong>' + PEP.ui.etiquetaEvolucao(e.status) + '</div>';
    var ehAutor = e.autorId === u.id;

    if ((e.status === 'rascunho' || e.status === 'devolvida') && ehAutor && R().podeEscreverEvolucao(u, caso)) {
      if (e.comentarioSupervisor && e.status === 'devolvida') html += '<div class="comentario-sup"><strong>Supervisão:</strong> ' + esc(e.comentarioSupervisor) + '</div>';
      html += '<div class="campo" style="margin-top:.6rem"><label for="ev-' + e.id + '">Texto da evolução</label>' +
        '<textarea id="ev-' + e.id + '" ' + atributosLimite('ev-' + e.id) + '>' + esc(e.texto) + '</textarea>' + contador('ev-' + e.id, e.texto) +
        ferramentasDeEscrita('ev-' + e.id, e.texto) + '</div>' +
        '<div class="linha"><button class="botao secundario pequeno" data-acao="salvar-evolucao" data-id="' + e.id + '" data-modo="rascunho">Salvar rascunho</button>' +
        '<button class="botao pequeno" data-acao="salvar-evolucao" data-id="' + e.id + '" data-modo="enviar">Assinar e enviar à supervisão</button></div>';
      return html + '</div>';
    }

    html += '<div class="texto">' + esc(e.texto) + '</div>';
    if (e.comentarioSupervisor && e.status === 'devolvida') html += '<div class="comentario-sup"><strong>Supervisão:</strong> ' + esc(e.comentarioSupervisor) + '</div>';
    html += linhaAssinaturas('evolucao', e.id) + adendos(e);

    if (e.status === 'enviada' && R().podeValidar(u, caso)) {
      html += PEP.revisor.html(PEP.revisor.analisar(e.texto), true) +
        '<div class="campo" style="margin-top:.6rem"><label for="com-' + e.id + '">Comentário para o estagiário (obrigatório para devolver)</label>' +
        '<textarea id="com-' + e.id + '" style="min-height:70px"></textarea></div>' +
        '<div class="linha"><button class="botao pequeno" data-acao="validar-evolucao" data-id="' + e.id + '">Validar e assinar</button>' +
        '<button class="botao secundario pequeno" data-acao="devolver-evolucao" data-id="' + e.id + '">Devolver com comentário</button></div>';
    }

    if (e.status === 'validada' && R().podeAdendo(u, caso)) {
      html += '<details style="margin-top:.6rem"><summary>Adicionar adendo (correção ou complemento)</summary>' +
        '<div class="campo" style="margin-top:.5rem"><label for="admot-' + e.id + '">Motivo</label><select id="admot-' + e.id + '">' +
        PEP.ui.opcoes(PEP.lista('motivosAdendo')) + '</select></div>' +
        '<div class="campo"><label for="adtxt-' + e.id + '">Texto do adendo</label><textarea id="adtxt-' + e.id + '" style="min-height:70px"></textarea></div>' +
        '<button class="botao pequeno" data-acao="adicionar-adendo" data-id="' + e.id + '">Registrar adendo</button></details>';
    }
    return html + '</div>';
  }


  // Resumo de transferência (fim do estágio): rascunho gerado com o que o prontuário já tem; o estagiário
  // completa as seções de _config.listas.secoesResumoTransferencia e a supervisão valida (Res. CFP 05/2025, art. 19)
  function cartaoNovoResumo(caso) {
    if (R().resumosDaPassagem(caso).length) {
      return '<p class="suave pequeno">O resumo de transferência desta passagem já foi escrito: está na lista abaixo.</p>';
    }
    var modelo = R().modeloResumoTransferencia(caso);
    return '<details class="cartao" id="resumo-transferencia"><summary><strong>Resumo de transferência</strong> <span class="suave pequeno">(fim do estágio: para a próxima dupla)</span></summary>' +
      '<p class="dica" id="nova-transf-dica">Período, sessões, demanda e objetivos já vêm do prontuário. Complete: ' + PEP.lista('secoesResumoTransferencia').map(esc).join(', ') +
      '. A supervisão valida e a nova dupla lê antes da primeira sessão. Não repita aqui o relato de risco: ele está na aba Risco.</p>' +
      '<div class="campo"><label for="nova-transf">Texto do resumo</label>' +
      '<textarea id="nova-transf" aria-describedby="nova-transf-dica" style="min-height:220px" ' + atributosLimite('nova-transf') + '>' + esc(modelo) + '</textarea>' +
      contador('nova-transf', modelo) + ferramentasDeEscrita('nova-transf', '') + '</div>' +
      '<div class="linha"><button class="botao secundario pequeno" data-acao="nova-evolucao" data-caso="' + caso.id + '" data-tipo="transferencia" data-modo="rascunho">Salvar rascunho</button>' +
      '<button class="botao pequeno" data-acao="nova-evolucao" data-caso="' + caso.id + '" data-tipo="transferencia" data-modo="enviar">Assinar e enviar à supervisão</button></div></details>';
  }

  function abaEvolucoes(u, caso) {
    var lista = PEP.db.evolucoes.filter(function (e) {
      if (e.casoId !== caso.id) return false;
      if (e.status === 'rascunho') return e.autorId === u.id; // rascunho é só de quem escreve
      return true;
    }).sort(function (a, b) { return b.data.localeCompare(a.data); });

    var html = '<div class="aviso info pequeno"><strong>Lembrete:</strong> o paciente pode pedir cópia do prontuário. Registre tema, intervenção e plano — não o relato detalhado. ' +
      'Depois de validada, a evolução fica bloqueada: correção só por adendo.</div>';

    var atrasadas = R().sessoesSemEvolucao(caso);
    if (atrasadas.length && caso.status === 'ativo' && R().ehEstagiarioDoCaso(u, caso)) {
      html += '<div class="aviso alerta pequeno">Sessão sem evolução há mais de ' + PEP.regra('prazoEvolucaoHoras') + ' h: ' + atrasadas.map(function (s) { return data(s.data); }).join(', ') + '.</div>';
    }

    if (R().podeEscreverEvolucao(u, caso)) {
      var sessoes = PEP.db.sessoes.filter(function (s) {
        return s.casoId === caso.id && s.presenca === 'presente' && !PEP.db.evolucoes.some(function (e) { return e.sessaoId === s.id; });
      });
      html += '<details class="cartao"><summary><strong>Nova evolução</strong></summary>' +
        '<div class="campo" style="margin-top:.6rem"><label for="nova-sessao">Sessão</label><select id="nova-sessao">' +
        sessoes.map(function (s) { return '<option value="' + s.id + '">' + data(s.data) + ' às ' + esc(s.hora) + '</option>'; }).join('') +
        '<option value="">Sem sessão vinculada</option></select></div>' +
        '<div class="campo"><label for="nova-texto">Texto</label><span class="dica" id="nova-texto-dica">Modelo: tema trabalhado · intervenção · resposta do paciente · plano para a próxima sessão.</span>' +
        '<div class="linha" style="margin:.2rem 0 .4rem"><span class="suave pequeno">Inserir modelo:</span>' + PEP.lista('modelosEvolucao').map(function (m) {
          return '<button type="button" class="botao secundario pequeno" data-acao="inserir-modelo" data-alvo="nova-texto" data-modelo="' + esc(m.id) + '">' + esc(m.nome) + '</button>';
        }).join('') + '</div>' +
        '<textarea id="nova-texto" aria-describedby="nova-texto-dica" ' + atributosLimite('nova-texto') + '></textarea>' + contador('nova-texto', '') +
        ferramentasDeEscrita('nova-texto', '') + '</div>' +
        '<div class="linha"><button class="botao secundario pequeno" data-acao="nova-evolucao" data-caso="' + caso.id + '" data-modo="rascunho">Salvar rascunho</button>' +
        '<button class="botao pequeno" data-acao="nova-evolucao" data-caso="' + caso.id + '" data-modo="enviar">Assinar e enviar à supervisão</button></div></details>';
      html += cartaoNovoResumo(caso);
    }

    if (!lista.length) html += '<p class="vazio">Nenhuma evolução registrada.</p>';
    return html + lista.map(function (e) { return cartaoEvolucao(u, caso, e); }).join('');
  }

  // ---------- Tela principal do caso ----------
  PEP.telas.caso = function (u, casoId, aba) {
    var caso = PEP.util.porId(PEP.db.casos, casoId);
    if (!caso) return '<h1>Caso não encontrado</h1>';
    if (!R().podeVerCaso(u, caso)) {
      return PEP.ui.semPermissao('Você não está alocado(a) neste caso. Estagiários só acessam os casos da própria dupla ou trio, enquanto o vínculo de estágio estiver ativo; supervisores, os casos dos seus grupos.');
    }
    if (rotasPermitidas(u, caso).indexOf(aba) === -1) aba = 'resumo';
    // Técnica fora da equipe do caso: o conteúdo clínico só abre com o motivo do acesso registrado
    if (R().precisaJustificar(u, caso)) return cabecalho(u, caso) + abas(u, caso, aba) + PEP.telas.formularioJustificativa(caso, '#/caso/' + caso.id + '/' + aba);

    var corpo;
    if (aba === 'evolucoes') corpo = abaEvolucoes(u, caso);
    else if (aba === 'resumo') corpo = abaResumo(u, caso);
    else if (aba === 'risco') corpo = PEP.telas.abaRisco(u, caso);
    else corpo = PEP.telas.casoAbaExtra(u, caso, aba);

    return cabecalho(u, caso) + abas(u, caso, aba) + corpo;
  };

  // Motivo do acesso (técnica): fica registrado, vale por algumas horas e o paciente pode ver em "Meus dados"
  PEP.telas.formularioJustificativa = function (caso, destino) {
    return '<div class="cartao" id="form-justificativa"><h2>Motivo do acesso ao prontuário</h2>' +
      '<p>Você não faz parte da equipe deste caso. Para abrir o conteúdo clínico (anamnese, evoluções, risco, documentos), registre o motivo. ' +
      'Ele vale por ' + PEP.regra('justificativaValidadeHoras') + ' horas, fica na auditoria e o paciente pode vê-lo em "Meus dados" (LGPD, arts. 9º e 18).</p>' +
      '<fieldset class="caixa-campos"><legend class="pequeno"><strong>Motivo</strong></legend>' +
      PEP.lista('motivosAcessoTecnico').map(function (m) {
        return '<label class="check"><input type="radio" name="jt-motivo" id="jt-motivo-' + m.id + '" value="' + m.id + '"> <span>' + esc(m.nome) + '</span></label>';
      }).join('') + '</fieldset>' +
      '<div class="campo"><label for="jt-detalhe">Detalhe (obrigatório em "Outro motivo")</label><input id="jt-detalhe" type="text" maxlength="200"></div>' +
      '<button class="botao" data-acao="justificar-acesso" data-caso="' + caso.id + '" data-destino="' + esc(destino) + '">Registrar o motivo e abrir</button></div>';
  };

  // Lista de casos (filtrada pela permissão)
  PEP.telas.casos = function (u) {
    if (u.perfil === 'direcao' || u.perfil === 'paciente') return PEP.ui.semPermissao('Este perfil não navega em prontuários.');
    var casos = PEP.regras.casosVisiveis(u);
    var titulo = u.perfil === 'estagiario' ? 'Meus casos' : (u.perfil === 'supervisor' ? 'Casos dos meus grupos' : 'Todos os casos');
    var html = '<h1>' + titulo + '</h1>';
    if (u.perfil === 'tecnico') html += '<p class="suave">Como responsável técnica, você vê todos os casos. Para abrir o conteúdo clínico de um caso, registre o motivo: ele fica na auditoria e o paciente pode vê-lo.</p>';
    if (!casos.length) return html + '<p class="vazio">Nenhum caso.</p>';
    return html + '<div class="grade">' + casos.map(function (c) {
      var g = PEP.regras.grupoDoCaso(c);
      return '<a class="cartao cartao-link" href="#/caso/' + c.id + '">' +
        '<span class="linha entre"><strong>' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</strong>' + PEP.ui.etiquetaCaso(c) + '</span>' +
        '<span class="suave pequeno" style="display:block;margin-top:.4rem">' + (g ? esc(g.nome) + ' · ' + esc(g.foco) : 'Aguardando alocação') + '</span></a>';
    }).join('') + '</div>';
  };
})();
