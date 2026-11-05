/* =========================================================
   acoes.js — o que acontece quando o usuário clica ou envia
   um formulário. Cada botão tem data-acao="nome-da-acao".
   Toda ação importante vai para a trilha de auditoria.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

(function () {
  var U = function () { return PEP.util; };
  var R = function () { return PEP.regras; };

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }
  function marcado(id) {
    var el = document.getElementById(id);
    return !!(el && el.checked);
  }
  function usuario() { return PEP.estado.usuarioAtual(); }
  function caso(id) { return U().porId(PEP.db.casos, id); }
  function evolucao(id) { return U().porId(PEP.db.evolucoes, id); }

  // Salva, registra na auditoria, avisa e redesenha a tela
  function concluir(mensagem, acaoAuditoria, alvo) {
    if (acaoAuditoria) PEP.estado.registrarAuditoria(acaoAuditoria, alvo);
    PEP.estado.salvar();
    if (mensagem) PEP.ui.toast(mensagem);
    PEP.app.renderizar();
  }

  function removerSessoesFuturas(casoId) {
    PEP.db.sessoes = PEP.db.sessoes.filter(function (s) { return !(s.casoId === casoId && s.presenca === 'agendada'); });
  }

  PEP.acoes = {
    // ----- Entrada -----
    // Conta de demonstração: só preenche o formulário; quem entra é o botão "Entrar"
    'preencher-login': function (el) {
      var login = el.getAttribute('data-login');
      var conta = null;
      PEP.db.usuarios.forEach(function (x) { if (x.login === login) conta = x; });
      var campoUsuario = document.getElementById('lg-usuario');
      var campoSenha = document.getElementById('lg-senha');
      if (!conta || !campoUsuario || !campoSenha) return;
      campoUsuario.value = conta.login;
      campoSenha.value = conta.senha;
      document.getElementById('login-erro').hidden = true;
      document.getElementById('lg-entrar').focus();
    },
    sair: function () {
      PEP.estado.sair();
      window.location.hash = '#/entrar';
      PEP.app.renderizar();
    },
    restaurar: function () {
      if (typeof window.confirm === 'function' && !window.confirm('Restaurar os dados de demonstração? As alterações feitas serão perdidas.')) return;
      PEP.estado.restaurar();
      PEP.ui.toast('Dados de demonstração restaurados.');
      PEP.app.renderizar();
    },
    imprimir: function () {
      var c = (window.location.hash.split('/')[2] || '');
      PEP.estado.registrarAuditoria('Gerou cópia do prontuário (PDF)', c);
      if (typeof window.print === 'function') window.print();
    },

    // ----- Paciente -----
    'confirmar-sessao': function (el) {
      var s = U().porId(PEP.db.sessoes, el.getAttribute('data-id'));
      s.confirmada = true;
      concluir('Presença confirmada. Obrigado por avisar!', 'Confirmou presença na sessão', s.casoId);
    },
    'solicitar-copia': function () {
      var u = usuario();
      var casos = PEP.db.casos.filter(function (c) { return c.pacienteId === u.pacienteId; });
      if (!casos.length) return PEP.ui.toast('Nenhum prontuário encontrado.');
      var c = casos[casos.length - 1];
      PEP.db.solicitacoes.push({ id: U().novoId('sol'), pacienteId: u.pacienteId, casoId: c.id, em: U().hoje(), status: 'recebida', forma: '', entregueEm: '' });
      concluir('Pedido enviado. A equipe vai conferir sua identidade e entregar a cópia.', 'Solicitou acesso ao prontuário', c.id);
    },

    // ----- Evoluções -----
    'nova-evolucao': function (el) {
      var u = usuario(), c = caso(el.getAttribute('data-caso'));
      if (!R().podeEscreverEvolucao(u, c)) return PEP.ui.toast('Sem permissão.');
      var texto = val('nova-texto');
      if (texto.length < 10) return PEP.ui.toast('Escreva a evolução antes de salvar.');
      var enviar = el.getAttribute('data-modo') === 'enviar';
      PEP.db.evolucoes.push({
        id: U().novoId('e'), casoId: c.id, sessaoId: val('nova-sessao') || null, autorId: u.id, data: U().hoje(),
        status: enviar ? 'enviada' : 'rascunho', texto: texto,
        assinaturas: enviar ? [{ usuarioId: u.id, em: U().agora() }] : [], adendos: []
      });
      concluir(enviar ? 'Evolução assinada e enviada à supervisão.' : 'Rascunho salvo.', enviar ? 'Assinou e enviou evolução' : 'Salvou rascunho de evolução', c.id);
    },
    'salvar-evolucao': function (el) {
      var u = usuario(), e = evolucao(el.getAttribute('data-id')), c = caso(e.casoId);
      if (e.autorId !== u.id || !R().podeEscreverEvolucao(u, c) || e.status === 'validada' || e.status === 'enviada') return PEP.ui.toast('Esta evolução não pode ser editada.');
      var texto = val('ev-' + e.id);
      if (texto.length < 10) return PEP.ui.toast('Escreva a evolução antes de salvar.');
      e.texto = texto;
      if (el.getAttribute('data-modo') === 'enviar') {
        e.status = 'enviada';
        e.comentarioSupervisor = '';
        e.assinaturas = [{ usuarioId: u.id, em: U().agora() }];
        concluir('Evolução assinada e enviada à supervisão.', 'Assinou e enviou evolução', c.id);
      } else {
        concluir('Rascunho salvo.', 'Salvou rascunho de evolução', c.id);
      }
    },
    'validar-evolucao': function (el) {
      var u = usuario(), e = evolucao(el.getAttribute('data-id')), c = caso(e.casoId);
      if (!R().podeValidar(u, c) || e.status !== 'enviada') return PEP.ui.toast('Sem permissão.');
      e.status = 'validada';
      e.assinaturas.push({ usuarioId: u.id, em: U().agora() });
      concluir('Evolução validada e bloqueada.', 'Validou e assinou evolução', c.id);
    },
    'devolver-evolucao': function (el) {
      var u = usuario(), e = evolucao(el.getAttribute('data-id')), c = caso(e.casoId);
      if (!R().podeValidar(u, c) || e.status !== 'enviada') return PEP.ui.toast('Sem permissão.');
      var comentario = val('com-' + e.id);
      if (comentario.length < 5) return PEP.ui.toast('Escreva um comentário para o estagiário.');
      e.status = 'devolvida';
      e.comentarioSupervisor = comentario;
      e.assinaturas = [];
      concluir('Evolução devolvida com comentário.', 'Devolveu evolução para ajuste', c.id);
    },
    'adicionar-adendo': function (el) {
      var u = usuario(), e = evolucao(el.getAttribute('data-id')), c = caso(e.casoId);
      if (!R().podeAdendo(u, c) || e.status !== 'validada') return PEP.ui.toast('Sem permissão.');
      var texto = val('adtxt-' + e.id);
      if (texto.length < 5) return PEP.ui.toast('Escreva o texto do adendo.');
      e.adendos.push({ id: U().novoId('ad'), autorId: u.id, em: U().agora(), motivo: val('admot-' + e.id), texto: texto });
      concluir('Adendo registrado. O texto original continua intacto.', 'Registrou adendo em evolução validada', c.id);
    },

    // ----- Sessões, faltas e abandono -----
    'registrar-presenca': function (el) {
      var u = usuario(), s = U().porId(PEP.db.sessoes, el.getAttribute('data-id')), c = caso(s.casoId);
      if (!R().podeRegistrarPresenca(u, c)) return PEP.ui.toast('Sem permissão.');
      var valor = el.getAttribute('data-valor');
      // Presença ou falta só a partir do dia da sessão; a falta avisada (justificada) pode vir antes
      if (s.data > U().hoje() && valor !== 'falta-justificada') return PEP.ui.toast('Presença e falta só podem ser registradas a partir do dia da sessão.');
      s.presenca = valor;
      var msg = 'Presença registrada.';
      if (R().emRiscoDeAbandono(c)) msg = 'Duas faltas seguidas: o fluxo de abandono foi aberto.';
      concluir(msg, 'Registrou presença: ' + s.presenca, c.id);
    },
    'agendar-sessao': function (el) {
      var u = usuario(), c = caso(el.getAttribute('data-caso'));
      if (!R().podeRegistrarPresenca(u, c)) return PEP.ui.toast('Sem permissão.');
      var d = val('ag-data'), h = val('ag-hora');
      if (!d || !h) return PEP.ui.toast('Informe data e hora.');
      if (d < U().hoje()) return PEP.ui.toast('Escolha uma data a partir de hoje.');
      PEP.db.sessoes.push({ id: U().novoId('s'), casoId: c.id, data: d, hora: h, presenca: 'agendada', confirmada: false });
      concluir('Sessão agendada.', 'Agendou sessão', c.id);
    },
    'registrar-contato': function (el) {
      var u = usuario(), c = caso(el.getAttribute('data-caso'));
      if (!R().podeRegistrarPresenca(u, c)) return PEP.ui.toast('Sem permissão.');
      var resultado = val('ct-resultado');
      PEP.db.contatos.push({ id: U().novoId('ct'), casoId: c.id, em: U().hoje(), canal: val('ct-canal'), resultado: resultado, motivo: val('ct-motivo'), registradoPor: u.id });
      concluir(resultado === 'Retornará' ? 'Contato registrado. Agende a próxima sessão.' : 'Tentativa de contato registrada.', 'Registrou tentativa de contato', c.id);
    },
    'encerrar-abandono': function (el) {
      var u = usuario(), c = caso(el.getAttribute('data-caso'));
      if (!R().podeEncerrar(u, c)) return PEP.ui.toast('Sem permissão.');
      var contatos = PEP.db.contatos.filter(function (ct) { return ct.casoId === c.id; });
      if (!contatos.length) return PEP.ui.toast('Registre ao menos uma tentativa de contato antes de liberar a vaga.');
      var comMotivo = contatos.filter(function (ct) { return ct.motivo; });
      var motivo = comMotivo.length ? comMotivo[comMotivo.length - 1].motivo : 'Não informado';
      c.status = 'encerrado';
      c.encerramento = { data: U().hoje(), tipo: 'abandono', motivo: motivo,
        registro: 'Encerrado por abandono após ' + R().faltasSeguidas(c) + ' faltas seguidas e ' + contatos.length + ' tentativa(s) de contato. Vaga liberada para a fila.' };
      removerSessoesFuturas(c.id);
      concluir('Caso encerrado e vaga liberada.', 'Encerrou caso por abandono e liberou a vaga', c.id);
    },
    'encerrar-caso': function (el) {
      var u = usuario(), c = caso(el.getAttribute('data-caso'));
      if (!R().podeEncerrar(u, c)) return PEP.ui.toast('Sem permissão.');
      var motivo = val('enc-motivo');
      if (!motivo) return PEP.ui.toast('Informe o motivo do encerramento.');
      c.status = 'encerrado';
      c.encerramento = { data: U().hoje(), tipo: val('enc-tipo'), motivo: motivo, registro: val('enc-registro') || '—' };
      removerSessoesFuturas(c.id);
      concluir('Caso encerrado.', 'Encerrou caso (' + c.encerramento.tipo + ')', c.id);
    },

    // ----- Documentos, anexos, área restrita e supervisão -----
    'emitir-declaracao': function (el) {
      var u = usuario(), c = caso(el.getAttribute('data-caso'));
      if (!R().ehEstagiarioDoCaso(u, c)) return PEP.ui.toast('Sem permissão.');
      var fin = val('dc-fin'), dest = val('dc-dest');
      if (!fin || !dest) return PEP.ui.toast('Informe finalidade e destinatário.');
      PEP.db.documentos.push({ id: U().novoId('doc'), casoId: c.id, tipo: 'Declaração', titulo: 'Declaração de comparecimento',
        finalidade: fin, destinatario: dest, emitidoEm: U().hoje(), autorId: u.id, assinadoPor: [u.id] });
      concluir('Declaração criada. Falta a assinatura do supervisor.', 'Emitiu declaração (aguardando supervisor)', c.id);
    },
    'assinar-documento': function (el) {
      var u = usuario(), d = U().porId(PEP.db.documentos, el.getAttribute('data-id')), c = caso(d.casoId);
      if (!R().ehSupervisorDoCaso(u, c)) return PEP.ui.toast('Sem permissão.');
      if (d.assinadoPor.indexOf(u.id) === -1) d.assinadoPor.push(u.id);
      concluir('Documento assinado.', 'Assinou documento', c.id);
    },
    anexar: function (el) {
      var u = usuario(), c = caso(el.getAttribute('data-caso'));
      if (!R().podeVerCaso(u, c)) return PEP.ui.toast('Sem permissão.');
      var input = document.getElementById('ax-arquivo');
      var nome = input && input.files && input.files.length ? input.files[0].name : '';
      if (!nome) return PEP.ui.toast('Escolha um arquivo.');
      PEP.db.anexos.push({ id: U().novoId('a'), casoId: c.id, arquivo: nome, descricao: val('ax-desc') || '—', enviadoPor: u.id, em: U().hoje() });
      concluir('Anexo registrado (simulação: só o nome do arquivo).', 'Anexou arquivo', c.id);
    },
    'registrar-avaliacao': function (el) {
      var u = usuario(), c = caso(el.getAttribute('data-caso'));
      if (!(R().ehEstagiarioDoCaso(u, c) || R().ehSupervisorDoCaso(u, c))) return PEP.ui.toast('Sem permissão.');
      var inst = val('av-inst');
      if (!inst) return PEP.ui.toast('Informe o instrumento.');
      PEP.db.avaliacoes.push({ id: U().novoId('av'), casoId: c.id, instrumento: inst, aplicadoPor: u.id, em: U().hoje(), observacao: val('av-obs') || '—' });
      concluir('Registrado na área restrita.', 'Registrou aplicação de instrumento', c.id);
    },
    'registrar-orientacao': function (el) {
      var u = usuario(), c = caso(el.getAttribute('data-caso'));
      if (!R().podeEscreverOrientacao(u, c)) return PEP.ui.toast('Sem permissão.');
      var texto = val('or-texto');
      if (texto.length < 5) return PEP.ui.toast('Escreva a orientação.');
      PEP.db.orientacoes.push({ id: U().novoId('o'), casoId: c.id, supervisorId: u.id, em: U().agora(), texto: texto });
      concluir('Orientação registrada.', 'Registrou orientação de supervisão', c.id);
    },

    // ----- Fila, triagem e alocação -----
    'concluir-triagem': function (el) {
      var u = usuario();
      if (!R().podeGerirFila(u)) return PEP.ui.toast('Sem permissão.');
      var i = U().porId(PEP.db.inscricoes, el.getAttribute('data-id'));
      var risco = val('tr-risco') === 'risco';
      if (val('tr-destino') === 'externo') {
        i.status = 'encaminhado-externo';
        window.location.hash = '#/fila';
        return concluir('Encaminhamento externo registrado.', 'Triagem: encaminhamento externo', i.id);
      }
      var paciente = { id: U().novoId('p'), nome: val('tr-nome') || i.nome, idade: Number(val('tr-idade')) || i.idade, contato: val('tr-contato'), responsavel: val('tr-resp') };
      var grupoId = val('tr-grupo') || null;
      PEP.db.pacientes.push(paciente);
      var novo = { id: U().novoId('c'), pacienteId: paciente.id, grupoId: grupoId, subgrupoId: null,
        status: grupoId ? 'ativo' : 'aguardando-alocacao', inicio: U().hoje(),
        demanda: val('tr-demanda'), objetivos: 'A definir no início do atendimento.',
        anamnese: { queixa: '', historicoFamiliar: '', medicacoes: '', sintomas: '', historicoClinico: '' },
        consentimentos: { contrato: marcado('tr-c1'), supervisaoGrupo: marcado('tr-c2'), gravacao: marcado('tr-c3'), ensinoAnonimo: marcado('tr-c4') } };
      PEP.db.casos.push(novo);
      i.status = 'triada';
      window.location.hash = '#/fila';
      concluir(risco ? 'Triagem salva com risco: acione o supervisor e a rede agora.' : 'Triagem concluída e caso criado.', 'Concluiu triagem' + (risco ? ' (risco sinalizado)' : ''), novo.id);
    },
    'alocar-caso': function (el) {
      if (!R().podeGerirFila(usuario())) return PEP.ui.toast('Sem permissão.');
      var c = caso(el.getAttribute('data-id'));
      c.grupoId = val('ag-' + c.id);
      c.subgrupoId = null;
      c.status = 'ativo';
      concluir('Caso alocado ao grupo. O supervisor define a dupla ou trio.', 'Alocou caso a grupo', c.id);
    },
    'alocar-estagiario': function (el) {
      if (usuario().perfil !== 'direcao') return PEP.ui.toast('Sem permissão.');
      var id = el.getAttribute('data-id');
      var g = U().porId(PEP.db.grupos, val('gr-' + id));
      PEP.db.estagiariosSemGrupo = PEP.db.estagiariosSemGrupo.filter(function (x) { return x !== id; });
      g.semDupla = g.semDupla || [];
      g.semDupla.push(id);
      var est = U().porId(PEP.db.usuarios, id);
      est.descricao = 'Estagiário(a) · ' + g.nome + ', sem dupla';
      concluir('Estagiário alocado ao ' + g.nome + '.', 'Alocou estagiário a grupo', g.id);
    },
    'definir-dupla': function (el) {
      var g = U().porId(PEP.db.grupos, el.getAttribute('data-grupo'));
      var id = el.getAttribute('data-id');
      if (g.supervisorId !== usuario().id) return PEP.ui.toast('Sem permissão.');
      var sub = U().porId(g.subgrupos, val('dup-' + id));
      if (!sub) return PEP.ui.toast('Crie uma dupla ou trio primeiro.');
      g.semDupla = (g.semDupla || []).filter(function (x) { return x !== id; });
      sub.estagiarios.push(id);
      var est = U().porId(PEP.db.usuarios, id);
      est.descricao = 'Estagiário(a) · ' + g.nome + ', ' + sub.nome;
      concluir('Estagiário incluído na ' + sub.nome + '.', 'Definiu dupla/trio', g.id);
    },
    'nova-dupla': function (el) {
      var g = U().porId(PEP.db.grupos, el.getAttribute('data-grupo'));
      if (g.supervisorId !== usuario().id) return PEP.ui.toast('Sem permissão.');
      g.subgrupos.push({ id: U().novoId('d'), nome: 'Dupla/Trio ' + (g.subgrupos.length + 1), estagiarios: [] });
      concluir('Nova dupla/trio criada.', 'Criou dupla/trio', g.id);
    },
    'atribuir-caso': function (el) {
      var c = caso(el.getAttribute('data-id'));
      if (!R().ehSupervisorDoCaso(usuario(), c)) return PEP.ui.toast('Sem permissão.');
      c.subgrupoId = val('cs-' + c.id);
      concluir('Caso atribuído à dupla.', 'Atribuiu caso a dupla/trio', c.id);
    },

    // ----- Acesso do paciente ao prontuário -----
    'conferir-identidade': function (el) {
      if (usuario().perfil !== 'tecnico') return PEP.ui.toast('Sem permissão.');
      var s = U().porId(PEP.db.solicitacoes, el.getAttribute('data-id'));
      s.status = 'identidade-conferida';
      concluir('Identidade conferida.', 'Conferiu identidade para entrega de cópia', s.casoId);
    },
    'marcar-entregue': function (el) {
      if (usuario().perfil !== 'tecnico') return PEP.ui.toast('Sem permissão.');
      var s = U().porId(PEP.db.solicitacoes, el.getAttribute('data-id'));
      s.status = 'entregue';
      s.forma = val('forma-' + s.id);
      s.entregueEm = U().hoje();
      concluir('Cópia entregue ao paciente.', 'Entregou cópia do prontuário', s.casoId);
    }
  };

  // ----- Formulários -----
  PEP.formularios = {
    login: function (form) {
      var r = PEP.estado.autenticar(form.elements.usuario.value, form.elements.senha.value);
      if (r.ok) {
        window.location.hash = '#/painel';
        PEP.app.renderizar();
        return;
      }
      var erro = document.getElementById('login-erro');
      erro.textContent = r.motivo === 'bloqueado'
        ? 'Muitas tentativas sem sucesso. Aguarde 30 segundos e tente de novo.'
        : 'Usuário ou senha incorretos.';
      erro.hidden = false;
      form.elements.senha.value = '';
      form.elements.senha.focus();
    },
    inscricao: function (form) {
      var f = form.elements;
      PEP.db.inscricoes.push({
        id: U().novoId('i'), nome: f.nome.value.trim(), idade: Number(f.idade.value), contato: f.contato.value.trim(),
        responsavel: f.responsavel.value.trim(), resumo: f.resumo.value.trim(), periodo: f.periodo.value,
        data: U().hoje(), status: 'aguardando'
      });
      PEP.estado.registrarAuditoria('Nova inscrição na fila de espera', '—');
      window.location.hash = '#/inscricao-ok';
      PEP.app.renderizar();
    }
  };

  // Um único "ouvinte" para todos os botões (delegação de eventos)
  document.addEventListener('click', function (ev) {
    var alvo = ev.target.closest ? ev.target.closest('[data-acao]') : null;
    if (!alvo) return;
    var nome = alvo.getAttribute('data-acao');
    if (PEP.acoes[nome]) { ev.preventDefault(); PEP.acoes[nome](alvo); }
  });
  document.addEventListener('submit', function (ev) {
    var nome = ev.target.getAttribute('data-form');
    if (nome && PEP.formularios[nome]) { ev.preventDefault(); PEP.formularios[nome](ev.target); }
  });
})();
