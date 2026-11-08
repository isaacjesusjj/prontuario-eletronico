/* =========================================================
   acoes.js — o que acontece quando o usuário clica ou envia
   um formulário. Cada botão tem data-acao="nome-da-acao".
   Ordem de toda ação: confere a permissão → valida → grava
   pela camada de dados (PEP.repo) → registra na auditoria →
   salva → redesenha a tela.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

(function () {
  var U = function () { return PEP.util; };
  var R = function () { return PEP.regras; };
  var V = function () { return PEP.validar; };
  var repo = function () { return PEP.repo; };

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value || '').trim() : ''; }
  function marcado(id) { var e = el(id); return !!(e && e.checked); }
  function usuario() { return PEP.estado.usuarioAtual(); }
  function caso(id) { return repo().porId('casos', id); }
  function evolucao(id) { return repo().porId('evolucoes', id); }
  function negar() { PEP.ui.toast('Sem permissão.'); }

  // Data e hora local (AAAA-MM-DDTHH:MM) daqui a "ms" milissegundos
  function dataHora(ms) {
    var d = new Date(Date.now() + (ms || 0)), dd = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + dd(d.getMonth() + 1) + '-' + dd(d.getDate()) + 'T' + dd(d.getHours()) + ':' + dd(d.getMinutes());
  }

  // Grava, registra na auditoria, avisa e redesenha a tela
  function concluir(mensagem, acaoAuditoria, alvo) {
    if (acaoAuditoria) PEP.estado.registrarAuditoria(acaoAuditoria, alvo);
    repo().salvar();
    if (mensagem) PEP.ui.toast(mensagem);
    PEP.app.renderizar();
  }

  function assinar(tipo, alvoId, u, papel, conteudo) {
    repo().inserir('assinaturas', { alvoTipo: tipo, alvoId: alvoId, usuarioId: u.id, papel: papel, em: U().agora(),
      hash: conteudo ? PEP.seguranca.sha256(conteudo) : null });
  }

  var CAMPOS_ANAMNESE = ['demanda', 'objetivos', 'queixa', 'sintomas', 'historicoFamiliar', 'medicacoes', 'historicoClinico'];

  // Texto da evolução: mínimo de 10 caracteres e máximo da regra (o banco confere o mesmo)
  function erroTextoEvolucao(campoId, texto) {
    var max = PEP.regra('evolucaoMaxCaracteres');
    if (texto.length < 10) return [[campoId, 'Escreva a evolução (pelo menos 10 caracteres).']];
    if (texto.length > max) return [[campoId, 'Use no máximo ' + max + ' caracteres: registre tema, intervenção e plano, não o relato detalhado.']];
    return [];
  }
  // Resumo de transferência: cada seção de _config.listas.secoesResumoTransferencia precisa estar preenchida
  function erroSecoesResumo(campoId, texto) {
    var faltam = R().secoesFaltandoNoResumo(texto);
    return faltam.length ? [[campoId, 'Complete antes de enviar: ' + faltam.join(', ') + '.']] : [];
  }

  function cancelarSessoesFuturas(casoId) {
    PEP.db.sessoes.filter(function (s) { return s.casoId === casoId && s.presenca === 'agendada'; })
      .forEach(function (s) { repo().atualizar('sessoes', s.id, { presenca: 'cancelada' }); });
  }

  // ---------- Identificação do paciente (triagem e edição) ----------
  function lerIdentificacao(p) {
    return {
      nome: val(p + '-nome'), nomeSocial: val(p + '-social'), dataNascimento: val(p + '-nasc'),
      cpf: V().soDigitos(val(p + '-cpf')), telefone: V().soDigitos(val(p + '-tel')), email: val(p + '-email'),
      responsavelNome: val(p + '-resp'), responsavelTelefone: V().soDigitos(val(p + '-resptel')), canalLembrete: val(p + '-canal')
    };
  }

  function errosIdentificacao(p, d, opcoes) {
    var e = [];
    if (!V().nome(d.nome)) e.push([p + '-nome', 'Informe o nome completo (só letras, de 2 a 80 caracteres).']);
    if (d.nomeSocial && !V().nome(d.nomeSocial)) e.push([p + '-social', 'Nome social com caracteres inválidos.']);
    var dn = V().dataNascimento(d.dataNascimento);
    if (!dn.ok) e.push([p + '-nasc', dn.msg]);
    if (d.cpf) {
      if (!V().cpf(d.cpf)) e.push([p + '-cpf', 'CPF inválido: confira os números.']);
      else {
        var dup = V().cpfJaCadastrado(d.cpf, opcoes.ignorar);
        if (dup && dup.tipo === 'paciente' && dup.id !== opcoes.pacientePermitido) e.push([p + '-cpf', 'Este CPF já está cadastrado para outro paciente.']);
      }
    } else if (!opcoes.semCpfPermitido) e.push([p + '-cpf', 'Informe o CPF.']);
    if (!V().telefone(d.telefone)) e.push([p + '-tel', 'Telefone inválido: use DDD + número, ex.: (11) 91234-5678.']);
    if (d.email && !V().email(d.email)) e.push([p + '-email', 'E-mail inválido.']);
    if (dn.ok && U().idade(d.dataNascimento) < 18 && !V().nome(d.responsavelNome)) e.push([p + '-resp', 'Menor de 18 anos: informe o responsável legal.']);
    if (d.responsavelTelefone && !V().telefone(d.responsavelTelefone)) e.push([p + '-resptel', 'Telefone do responsável inválido.']);
    return e;
  }

  // ---------- Importação de estudantes (CSV) ----------
  function conferirLinhas(texto) {
    var linhas = String(texto || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (linhas.length && /nome/i.test(linhas[0]) && /mail/i.test(linhas[0])) linhas.shift();
    var vistos = { mat: {}, email: {}, login: {} };
    return linhas.slice(0, 500).map(function (l, i) {
      var c = l.split(l.indexOf(';') !== -1 ? ';' : ',').map(function (x) { return x.trim(); });
      var r = { n: i + 1, nome: c[0] || '', matricula: c[1] || '', email: (c[2] || '').toLowerCase() };
      r.login = r.email.split('@')[0];
      if (!V().nome(r.nome)) r.erro = 'nome inválido';
      else if (!V().matricula(r.matricula)) r.erro = 'matrícula inválida';
      else if (!V().email(r.email)) r.erro = 'e-mail inválido';
      else if (vistos.mat[r.matricula] || PEP.db.usuarios.some(function (u) { return u.matricula === r.matricula; })) r.erro = 'matrícula já cadastrada';
      else if (vistos.email[r.email] || PEP.db.usuarios.some(function (u) { return String(u.email).toLowerCase() === r.email; })) r.erro = 'e-mail já cadastrado';
      else if (vistos.login[r.login] || PEP.db.usuarios.some(function (u) { return u.login === r.login; })) r.erro = 'usuário já existe';
      vistos.mat[r.matricula] = vistos.email[r.email] = vistos.login[r.login] = true;
      return r;
    });
  }

  PEP.acoes = {
    // ----- Acessibilidade e entrada -----
    'fonte-menor': function () { PEP.acessibilidade.mudarFonte(-1); },
    'fonte-maior': function () { PEP.acessibilidade.mudarFonte(1); },
    'alto-contraste': function () { PEP.acessibilidade.alternarContraste(); },
    vlibras: function () { PEP.acessibilidade.abrirVlibras(); },
    'modo-discreto': function () { PEP.privacidade.alternarDiscreto(); },
    'cobrir-tela': function () { PEP.privacidade.cobrir(); },
    'descobrir-tela': function () { PEP.privacidade.descobrir(); },
    'continuar-sessao': function () { PEP.app.continuarSessao(); },

    'mostrar-senha': function (b) {
      var campo = el(b.getAttribute('data-alvo'));
      var mostrar = campo.type === 'password';
      campo.type = mostrar ? 'text' : 'password';
      b.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
      b.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    },
    // Conta de demonstração: só preenche o formulário; quem entra é o botão "Entrar"
    'preencher-login': function (b) {
      el('lg-usuario').value = b.getAttribute('data-login');
      el('lg-senha').value = PEP.db._meta.senhaDemonstracao;
      el('login-erro').hidden = true;
      el('lg-entrar').focus();
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
    imprimir: function (b) {
      PEP.estado.registrarAuditoria('Gerou cópia do prontuário (PDF)', b.getAttribute('data-caso') || '—');
      if (typeof window.print === 'function') window.print();
    },

    // ----- Primeiro acesso e conta -----
    'aceitar-termo': function (b) {
      var u = usuario();
      if (!marcado('tm-ok')) { PEP.form.aplicar(document, [['tm-ok', 'Marque a caixa para confirmar que leu o termo.']]); return; }
      var termo = b.getAttribute('data-termo');
      repo().inserir('aceites', { usuarioId: u.id, termo: termo, versao: PEP.config().termos[termo], em: U().agora() });
      window.location.hash = '#/painel';
      concluir('Termo aceito. Bom trabalho!', 'Aceitou o termo de ' + (termo === 'sigilo' ? 'responsabilidade e sigilo' : 'uso e privacidade') + ' (v' + PEP.config().termos[termo] + ')', u.id);
    },

    // ----- Paciente -----
    'confirmar-sessao': function (b) {
      var u = usuario(), s = repo().porId('sessoes', b.getAttribute('data-id')), c = caso(s.casoId);
      if (u.perfil !== 'paciente' || c.pacienteId !== u.pacienteId) return negar();
      repo().atualizar('sessoes', s.id, { confirmada: true });
      concluir('Presença confirmada. Obrigado por avisar!', 'Confirmou presença na sessão', s.casoId);
    },
    'avisar-falta': function (b) {
      var u = usuario(), s = repo().porId('sessoes', b.getAttribute('data-id'));
      if (!s || !R().podeAvisarFalta(u, s)) return negar();
      var motivo = val('mf-' + s.id);
      if (!PEP.lista('motivosFaltaPaciente').some(function (m) { return m.id === motivo; })) return PEP.ui.toast('Escolha o motivo.');
      repo().atualizar('sessoes', s.id, { presenca: 'falta-justificada', avisoPaciente: true, motivoFalta: motivo, avisadoEm: U().agora() });
      concluir('Aviso enviado. A falta avisada não conta como abandono; a clínica pode oferecer outro horário.', 'Avisou que não vai à sessão', s.casoId);
    },
    'solicitar-copia': function () {
      var u = usuario();
      var casos = PEP.db.casos.filter(function (c) { return c.pacienteId === u.pacienteId; });
      if (!casos.length) return PEP.ui.toast('Nenhum prontuário encontrado.');
      var c = casos[casos.length - 1];
      repo().inserir('solicitacoes', { pacienteId: u.pacienteId, casoId: c.id, em: U().agora(), status: 'recebida', forma: '', entregueEm: '', conferidoPor: null, entreguePor: null });
      concluir('Pedido enviado. A equipe vai conferir sua identidade e entregar a cópia.', 'Solicitou acesso ao prontuário', c.id);
    },
    'paciente-consentimento': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso')), fin = b.getAttribute('data-fin');
      var f = PEP.lista('finalidadesConsentimento').filter(function (x) { return x.id === fin; })[0];
      if (u.perfil !== 'paciente' || c.pacienteId !== u.pacienteId || !f || f.obrigatoria) return negar();
      var conceder = b.getAttribute('data-valor') === 'sim';
      repo().inserir('consentimentos', { casoId: c.id, finalidade: fin, concedido: conceder, termoVersao: PEP.config().termos.consentimento, registradoPor: u.id, em: U().agora() });
      concluir(conceder ? 'Autorização registrada.' : 'Autorização revogada. Vale a partir de agora.', (conceder ? 'Concedeu' : 'Revogou') + ' consentimento: ' + fin, c.id);
    },
    'pedido-titular': function () {
      var u = usuario(), p = R().pacienteDoUsuario(u);
      if (!p) return negar();
      var desc = val('pt-desc');
      if (desc.length < 5) { PEP.form.aplicar(el('form-titular'), [['pt-desc', 'Descreva o pedido em poucas palavras.']]); return; }
      repo().inserir('pedidosTitular', { titularTipo: 'paciente', titularId: p.id, tipo: val('pt-tipo'), descricao: desc, em: U().agora(), status: 'aberto', resposta: '', respondidoPor: null, respondidoEm: null });
      concluir('Pedido enviado. A resposta vem em até ' + PEP.regra('prazoRespostaTitularDias') + ' dias.', 'Fez pedido de titular (LGPD): ' + val('pt-tipo'), p.id);
    },

    // ----- Anamnese, demanda e objetivos (versionados) -----
    'salvar-anamnese': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeEditarAnamnese(u, c)) return negar();
      var erros = [], max = PEP.regra('anamneseCampoMaxCaracteres');
      if (val('an-demanda').length < 5) erros.push(['an-demanda', 'Descreva a demanda.']);
      if (val('an-objetivos').length < 5) erros.push(['an-objetivos', 'Descreva os objetivos.']);
      CAMPOS_ANAMNESE.forEach(function (k) { if (val('an-' + k).length > max) erros.push(['an-' + k, 'Use no máximo ' + max + ' caracteres: o prontuário é conciso.']); });
      if (!PEP.form.aplicar(el('form-anamnese'), erros)) return;
      var atual = R().anamneseAtual(c);
      var nova = { casoId: c.id, versao: (atual.versao || 0) + 1, autorId: u.id, em: U().agora() };
      CAMPOS_ANAMNESE.forEach(function (k) { nova[k] = val('an-' + k); });
      repo().inserir('anamneses', nova);
      assinar('anamnese', nova.id, u, u.perfil === 'supervisor' ? 'supervisor' : 'estagiario', JSON.stringify(nova));
      concluir('Versão ' + nova.versao + ' salva. As anteriores continuam guardadas.', 'Registrou versão ' + nova.versao + ' da anamnese', c.id);
    },
    'assinar-anamnese': function (b) {
      var u = usuario(), a = repo().porId('anamneses', b.getAttribute('data-id')), c = caso(a.casoId);
      if (!R().podeAssinarAnamnese(u, c)) return negar();
      assinar('anamnese', a.id, u, 'supervisor', null);
      concluir('Versão assinada pela supervisão.', 'Assinou anamnese (versão ' + a.versao + ')', c.id);
    },
    'registrar-consentimento': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (u.perfil !== 'tecnico') return negar();
      var conceder = b.getAttribute('data-valor') === 'sim', fin = b.getAttribute('data-fin');
      repo().inserir('consentimentos', { casoId: c.id, finalidade: fin, concedido: conceder, termoVersao: PEP.config().termos.consentimento, registradoPor: u.id, em: U().agora() });
      concluir(conceder ? 'Concessão registrada.' : 'Revogação registrada.', 'Registrou consentimento ' + fin + ': ' + (conceder ? 'sim' : 'não'), c.id);
    },

    // ----- Evoluções -----
    'nova-evolucao': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeEscreverEvolucao(u, c)) return negar();
      var resumo = b.getAttribute('data-tipo') === 'transferencia', campo = resumo ? 'nova-transf' : 'nova-texto';
      var texto = val(campo), enviar = b.getAttribute('data-modo') === 'enviar';
      var erros = erroTextoEvolucao(campo, texto);
      if (resumo && enviar && !erros.length) erros = erroSecoesResumo(campo, texto);
      if (!PEP.form.aplicar(document, erros)) return;
      if (resumo && R().resumosDaPassagem(c).length) return PEP.ui.toast('O resumo de transferência desta passagem já foi escrito.');
      var e = repo().inserir('evolucoes', { casoId: c.id, sessaoId: resumo ? null : (val('nova-sessao') || null), autorId: u.id, data: U().hoje(),
        status: enviar ? 'enviada' : 'rascunho', texto: texto, comentarioSupervisor: '', tipo: resumo ? 'transferencia' : 'sessao' });
      if (enviar) assinar('evolucao', e.id, u, 'estagiario', texto);
      var nome = resumo ? 'resumo de transferência' : 'evolução';
      concluir(enviar ? (resumo ? 'Resumo de transferência assinado e enviado à supervisão.' : 'Evolução assinada e enviada à supervisão.') : 'Rascunho salvo.',
        enviar ? 'Assinou e enviou ' + nome : 'Salvou rascunho de ' + nome, c.id);
    },
    'salvar-evolucao': function (b) {
      var u = usuario(), e = evolucao(b.getAttribute('data-id')), c = caso(e.casoId);
      if (e.autorId !== u.id || !R().podeEscreverEvolucao(u, c) || e.status === 'validada' || e.status === 'enviada') return PEP.ui.toast('Esta evolução não pode ser editada.');
      var texto = val('ev-' + e.id), enviar = b.getAttribute('data-modo') === 'enviar';
      var erros = erroTextoEvolucao('ev-' + e.id, texto);
      if (e.tipo === 'transferencia' && enviar && !erros.length) erros = erroSecoesResumo('ev-' + e.id, texto);
      if (!PEP.form.aplicar(document, erros)) return;
      if (enviar) {
        repo().atualizar('evolucoes', e.id, { texto: texto, status: 'enviada', comentarioSupervisor: '' });
        assinar('evolucao', e.id, u, 'estagiario', texto);
        concluir('Evolução assinada e enviada à supervisão.', 'Assinou e enviou evolução', c.id);
      } else {
        repo().atualizar('evolucoes', e.id, { texto: texto });
        concluir('Rascunho salvo.', 'Salvou rascunho de evolução', c.id);
      }
    },
    'validar-evolucao': function (b) {
      var u = usuario(), e = evolucao(b.getAttribute('data-id')), c = caso(e.casoId);
      if (!R().podeValidar(u, c) || e.status !== 'enviada') return negar();
      repo().atualizar('evolucoes', e.id, { status: 'validada' });
      assinar('evolucao', e.id, u, 'supervisor', e.texto);
      concluir('Evolução validada e bloqueada.', 'Validou e assinou evolução', c.id);
    },
    'devolver-evolucao': function (b) {
      var u = usuario(), e = evolucao(b.getAttribute('data-id')), c = caso(e.casoId);
      if (!R().podeValidar(u, c) || e.status !== 'enviada') return negar();
      var comentario = val('com-' + e.id);
      if (comentario.length < 5) { PEP.form.aplicar(document, [['com-' + e.id, 'Escreva um comentário para o estagiário.']]); return; }
      repo().atualizar('evolucoes', e.id, { status: 'devolvida', comentarioSupervisor: comentario });
      concluir('Evolução devolvida com comentário.', 'Devolveu evolução para ajuste', c.id);
    },
    'adicionar-adendo': function (b) {
      var u = usuario(), e = evolucao(b.getAttribute('data-id')), c = caso(e.casoId);
      if (!R().podeAdendo(u, c) || e.status !== 'validada') return negar();
      var texto = val('adtxt-' + e.id);
      if (texto.length < 5) { PEP.form.aplicar(document, [['adtxt-' + e.id, 'Escreva o texto do adendo.']]); return; }
      repo().inserir('adendos', { evolucaoId: e.id, autorId: u.id, em: U().agora(), motivo: val('admot-' + e.id), texto: texto });
      concluir('Adendo registrado. O texto original continua intacto.', 'Registrou adendo em evolução validada', c.id);
    },

    // ----- Sessões, faltas, lembretes e abandono -----
    'registrar-presenca': function (b) {
      var u = usuario(), s = repo().porId('sessoes', b.getAttribute('data-id')), c = caso(s.casoId);
      if (!R().podeRegistrarPresenca(u, c) || s.presenca !== 'agendada') return negar();
      var valor = b.getAttribute('data-valor');
      if (['presente', 'falta', 'falta-justificada'].indexOf(valor) === -1) return negar();
      // Presença ou falta só a partir do dia da sessão; a falta avisada (justificada) pode vir antes
      if (s.data > U().hoje() && valor !== 'falta-justificada') return PEP.ui.toast('Presença e falta só podem ser registradas a partir do dia da sessão.');
      // Presença registrada não muda depois: confirma antes a falta, que conta para o fluxo de abandono
      if (valor === 'falta' && typeof window.confirm === 'function' &&
          !window.confirm('Registrar falta sem justificativa em ' + U().formatarData(s.data) + '? Ela conta para o fluxo de abandono e não pode ser desfeita.')) return;
      repo().atualizar('sessoes', s.id, { presenca: valor, presencaRegistradaPor: u.id });
      var msg = R().emRiscoDeAbandono(c) ? 'Faltas seguidas: o fluxo de abandono foi aberto.' : 'Presença registrada.';
      concluir(msg, 'Registrou presença: ' + valor, c.id);
    },
    'agendar-sessao': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeRegistrarPresenca(u, c)) return negar();
      var d = val('ag-data'), h = val('ag-hora');
      var erros = [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) erros.push(['ag-data', 'Informe a data.']);
      else if (d < U().hoje()) erros.push(['ag-data', 'Escolha uma data a partir de hoje.']);
      if (!/^\d{2}:\d{2}$/.test(h)) erros.push(['ag-hora', 'Informe a hora.']);
      else if (h < '07:00' || h > '21:00') erros.push(['ag-hora', 'A clínica atende das 7h às 21h.']);
      // A mesma dupla (ou o mesmo paciente) não pode ter sessões que se sobreponham: cada uma ocupa a duração da regra
      var duracao = PEP.regra('duracaoSessaoMinutos') || 50;
      var minutos = function (hhmm) { var p = hhmm.split(':'); return Number(p[0]) * 60 + Number(p[1]); };
      var conflito = !erros.length && PEP.db.sessoes.some(function (s) {
        if (s.data !== d || s.presenca !== 'agendada') return false;
        var outro = caso(s.casoId);
        var mesmaEquipe = s.casoId === c.id || (c.subgrupoId && outro && outro.subgrupoId === c.subgrupoId);
        return mesmaEquipe && Math.abs(minutos(s.hora) - minutos(h)) < duracao;
      });
      if (conflito) erros.push(['ag-hora', 'A dupla ou trio já tem sessão nesse horário (cada sessão ocupa ' + duracao + ' minutos).']);
      if (!PEP.form.aplicar(document, erros)) return;
      repo().inserir('sessoes', { casoId: c.id, data: d, hora: h, presenca: 'agendada', confirmada: false });
      concluir('Sessão agendada para ' + U().formatarData(d) + ' às ' + h + '.', 'Agendou sessão', c.id);
    },
    lembrete: function (b) {
      var u = usuario(), s = repo().porId('sessoes', b.getAttribute('data-id')), c = caso(s.casoId);
      if (!R().podeRegistrarPresenca(u, c) || !R().consentiu(c, 'lembretes')) return negar();
      var p = PEP.ui.pacienteDoCaso(c), canal = b.getAttribute('data-canal');
      // Sem nome do serviço, do profissional nem conteúdo clínico
      var msg = 'Olá! Lembrete: você tem um horário agendado na Clínica-Escola em ' + U().formatarData(s.data) + ' às ' + s.hora +
        '. Se não puder vir, avise com antecedência respondendo esta mensagem.';
      var url;
      if (canal === 'whatsapp') {
        var tel = PEP.ui.idade(p) < 18 && p.responsavelTelefone ? p.responsavelTelefone : p.telefone;
        url = 'https://wa.me/55' + V().soDigitos(tel) + '?text=' + encodeURIComponent(msg);
      } else {
        if (!p.email) return PEP.ui.toast('Paciente sem e-mail cadastrado.');
        url = 'mailto:' + encodeURIComponent(p.email) + '?subject=' + encodeURIComponent('Lembrete de horário') + '&body=' + encodeURIComponent(msg);
      }
      repo().inserir('lembretes', { sessaoId: s.id, canal: canal, em: U().agora(), enviadoPor: u.id });
      concluir('Lembrete aberto no ' + (canal === 'whatsapp' ? 'WhatsApp' : 'e-mail') + '. Confira e envie.', 'Gerou lembrete de sessão (' + canal + ')', c.id);
      window.open(url, '_blank', 'noopener');
    },
    'registrar-contato': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeRegistrarPresenca(u, c)) return negar();
      var resultado = val('ct-resultado');
      repo().inserir('contatos', { casoId: c.id, em: U().hoje(), canal: val('ct-canal'), resultado: resultado, motivo: val('ct-motivo'), registradoPor: u.id });
      concluir(resultado === 'Retornará' ? 'Contato registrado. Agende a próxima sessão.' : 'Tentativa de contato registrada.', 'Registrou tentativa de contato', c.id);
    },
    'encerrar-abandono': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeEncerrar(u, c)) return negar();
      var contatos = PEP.db.contatos.filter(function (ct) { return ct.casoId === c.id; });
      if (!contatos.length) return PEP.ui.toast('Registre ao menos uma tentativa de contato antes de liberar a vaga.');
      var pend = R().pendenciasParaEncerrar(c);
      if (pend.bloqueiam.length) return PEP.ui.toast('Antes de encerrar: ' + pend.bloqueiam.join('; ') + '.');
      var comMotivo = contatos.filter(function (ct) { return ct.motivo; });
      var motivo = comMotivo.length ? comMotivo[comMotivo.length - 1].motivo : 'Não informado';
      repo().inserir('encerramentos', { casoId: c.id, data: U().hoje(), tipo: 'abandono', motivo: motivo, destino: '', registradoPor: u.id,
        registro: 'Encerrado por abandono após ' + R().faltasSeguidas(c) + ' faltas seguidas e ' + contatos.length + ' tentativa(s) de contato. Vaga liberada para a fila.' });
      repo().atualizar('casos', c.id, { status: 'encerrado' });
      cancelarSessoesFuturas(c.id);
      concluir('Caso encerrado e vaga liberada.', 'Encerrou caso por abandono e liberou a vaga', c.id);
    },
    'encerrar-caso': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeEncerrar(u, c)) return negar();
      var tipo = val('enc-tipo'), motivo = val('enc-motivo'), destino = val('enc-destino'), registro = val('enc-registro');
      // Abandono só pelo fluxo de faltas: é ele que exige a tentativa de contato e guarda o motivo
      if (tipo === 'abandono' || !PEP.lista('tiposEncerramento').some(function (t) { return t.valor === tipo; })) {
        return PEP.ui.toast('Abandono é registrado pelo fluxo de faltas, depois da tentativa de contato.');
      }
      var pend = R().pendenciasParaEncerrar(c);
      if (pend.bloqueiam.length) return PEP.ui.toast('Antes de encerrar: ' + pend.bloqueiam.join('; ') + '.');
      var erros = [];
      if (motivo.length < 3) erros.push(['enc-motivo', 'Informe o motivo do encerramento.']);
      if (tipo === 'encaminhamento' && destino.length < 3) erros.push(['enc-destino', 'Informe o serviço da rede que vai receber o paciente.']);
      if (registro.length < 10) erros.push(['enc-registro', 'Escreva o registro: o que foi feito e como o paciente foi orientado.']);
      if (!PEP.form.aplicar(document, erros)) return;
      repo().inserir('encerramentos', { casoId: c.id, data: U().hoje(), tipo: tipo, motivo: motivo, destino: tipo === 'encaminhamento' ? destino : '',
        registro: registro, registradoPor: u.id });
      repo().atualizar('casos', c.id, { status: 'encerrado' });
      cancelarSessoesFuturas(c.id);
      concluir('Caso encerrado.', 'Encerrou caso (' + tipo + ')', c.id);
    },

    // ----- Documentos, anexos, área restrita e supervisão -----
    'emitir-declaracao': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().ehEstagiarioDoCaso(u, c)) return negar();
      var fin = val('dc-fin'), dest = val('dc-dest'), erros = [];
      if (fin.length < 3) erros.push(['dc-fin', 'Informe a finalidade (Res. CFP 05/2025, art. 12).']);
      if (dest.length < 3) erros.push(['dc-dest', 'Informe o destinatário.']);
      if (!PEP.form.aplicar(document, erros)) return;
      var d = repo().inserir('documentos', { casoId: c.id, tipo: 'Declaração', titulo: 'Declaração de comparecimento', finalidade: fin, destinatario: dest, emitidoEm: U().hoje(), autorId: u.id });
      assinar('documento', d.id, u, 'estagiario', d.titulo + '|' + fin + '|' + dest);
      concluir('Declaração criada. Falta a assinatura do supervisor.', 'Emitiu declaração (aguardando supervisor)', c.id);
    },
    'assinar-documento': function (b) {
      var u = usuario(), d = repo().porId('documentos', b.getAttribute('data-id')), c = caso(d.casoId);
      if (!R().ehSupervisorDoCaso(u, c)) return negar();
      if (!R().assinadoPeloSupervisor('documento', d.id)) assinar('documento', d.id, u, 'supervisor', d.titulo + '|' + d.finalidade + '|' + d.destinatario);
      concluir('Documento assinado.', 'Assinou documento', c.id);
    },
    anexar: function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeVerCaso(u, c) || c.status !== 'ativo') return negar();
      var input = el('ax-arquivo');
      var file = input && input.files && input.files[0];
      if (!file) { PEP.form.aplicar(document, [['ax-arquivo', 'Escolha um arquivo.']]); return; }
      b.disabled = true;
      PEP.arquivos.guardar(file, c.id).then(function (r) {
        b.disabled = false;
        if (r.erro) { PEP.form.aplicar(document, [['ax-arquivo', r.erro]]); return; }
        repo().inserir('anexos', { casoId: c.id, nome: V().nomeArquivoSeguro(file.name), tipo: file.type, tamanho: file.size, descricao: val('ax-desc') || '—',
          enviadoPor: u.id, em: U().hoje(), hash: r.hash, arquivoId: r.arquivoId });
        concluir('Anexo guardado. Conteúdo conferido e hash registrado.', 'Anexou arquivo', c.id);
      }).catch(function () { b.disabled = false; PEP.ui.toast('Não foi possível guardar o arquivo neste navegador.'); });
    },
    'abrir-anexo': function (b) {
      var u = usuario(), a = repo().porId('anexos', b.getAttribute('data-id')), c = caso(a.casoId);
      if (!R().podeVerCaso(u, c)) return negar();
      PEP.arquivos.obter(a.arquivoId).then(function (blob) {
        if (!blob) return PEP.ui.toast('Arquivo não encontrado neste navegador.');
        PEP.estado.registrarAuditoria('Abriu anexo', c.id);
        window.open(URL.createObjectURL(blob), '_blank', 'noopener');
      });
    },
    'registrar-avaliacao': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!(R().ehEstagiarioDoCaso(u, c) || R().ehSupervisorDoCaso(u, c))) return negar();
      var inst = val('av-inst');
      if (inst.length < 3) { PEP.form.aplicar(document, [['av-inst', 'Informe o instrumento.']]); return; }
      repo().inserir('avaliacoes', { casoId: c.id, instrumento: inst, aplicadoPor: u.id, em: U().hoje(), observacao: val('av-obs') || '—' });
      concluir('Registrado na área restrita.', 'Registrou aplicação de instrumento', c.id);
    },
    'registrar-orientacao': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeEscreverOrientacao(u, c)) return negar();
      var texto = val('or-texto');
      if (texto.length < 5) { PEP.form.aplicar(document, [['or-texto', 'Escreva a orientação.']]); return; }
      repo().inserir('orientacoes', { casoId: c.id, supervisorId: u.id, em: U().agora(), texto: texto });
      concluir('Orientação registrada.', 'Registrou orientação de supervisão', c.id);
    },

    // ----- Motivo de acesso da técnica -----
    'justificar-acesso': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!u || u.perfil !== 'tecnico' || !R().podeVerCaso(u, c)) return negar();
      var m = document.querySelector('input[name="jt-motivo"]:checked'), detalhe = val('jt-detalhe'), erros = [];
      if (!m) erros.push(['jt-motivo-' + PEP.lista('motivosAcessoTecnico')[0].id, 'Escolha o motivo do acesso.']);
      else if (m.value === 'outro' && detalhe.length < 5) erros.push(['jt-detalhe', 'Descreva o motivo do acesso.']);
      if (!PEP.form.aplicar(el('form-justificativa'), erros)) return;
      var nome = PEP.lista('motivosAcessoTecnico').filter(function (x) { return x.id === m.value; })[0].nome;
      repo().inserir('acessosJustificados', { usuarioId: u.id, casoId: c.id, motivo: m.value, detalhe: detalhe, em: U().agora() });
      var destino = b.getAttribute('data-destino'), ad = repo().adaptador();
      var abrir = function () { PEP.app.marcarAberturaRegistrada(c.id); window.location.hash = destino; PEP.app.renderizar(); };
      // Grava o motivo primeiro; com o banco ligado, o conteúdo clínico só chega depois dele (o banco
      // filtra), então busca os dados de novo
      repo().salvar().then(function () {
        PEP.estado.registrarAuditoria('Abriu o prontuário com motivo: ' + nome, c.id);
        return ad.remoto ? ad.carregar() : null;
      }).then(abrir);
    },

    // ----- Revisor de escrita: como o paciente lê o registro -----
    'ver-como-paciente': function (b) {
      var alvo = b.getAttribute('data-alvo'), caixa = el(alvo + '-previa');
      if (!caixa) return;
      if (caixa.innerHTML) { caixa.innerHTML = ''; b.setAttribute('aria-expanded', 'false'); return; }
      caixa.innerHTML = '<div class="previa-paciente"><p class="suave pequeno">Assim este registro aparece na cópia que o paciente pode pedir a qualquer momento (Res. CFP 05/2025, art. 13):</p>' +
        '<div class="cartao"><strong>' + U().formatarData(U().hoje()) + '</strong><div class="texto">' + U().esc(val(alvo) || '(ainda vazio)') + '</div></div></div>';
      b.setAttribute('aria-expanded', 'true');
    },

    // ----- Risco e segurança -----
    'registrar-risco': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeRegistrarRisco(u, c)) return negar();
      var nivel = document.querySelector('input[name="rk-nivel"]:checked');
      var desc = val('rk-desc'), max = PEP.regra('riscoDescricaoMaxCaracteres'), erros = [];
      if (desc.length < 10) erros.push(['rk-desc', 'Descreva o que motivou a avaliação (pelo menos 10 caracteres).']);
      if (desc.length > max) erros.push(['rk-desc', 'Use no máximo ' + max + ' caracteres.']);
      if (!nivel) erros.push(['rk-nivel-moderado', 'Escolha o nível do risco.']);
      if (!PEP.form.aplicar(el('form-risco'), erros)) return;
      var condutas = PEP.lista('condutasRisco').filter(function (x) { return marcado('rk-c-' + x.id); }).map(function (x) { return x.id; });
      repo().inserir('riscos', { casoId: c.id, registradoPor: u.id, em: U().agora(), tipo: val('rk-tipo'), nivel: nivel.value, descricao: desc, condutas: condutas,
        cienciaEm: null, cienciaPor: null, encerradoEm: null, encerradoPor: null, encerramentoNota: '' });
      concluir(nivel.value === 'alto' ? 'Risco alto registrado. Não deixe a pessoa sozinha e acione a supervisão agora.' : 'Avaliação registrada. A supervisão vê o aviso no painel.',
        'Registrou avaliação de risco (' + nivel.value + ')', c.id);
    },
    'dar-ciencia-risco': function (b) {
      var u = usuario(), r = repo().porId('riscos', b.getAttribute('data-id')), c = caso(r.casoId);
      if (!R().podeDarCiencia(u, c) || r.cienciaEm) return negar();
      repo().atualizar('riscos', r.id, { cienciaEm: U().agora(), cienciaPor: u.id });
      concluir('Ciência da supervisão registrada.', 'Deu ciência à avaliação de risco', c.id);
    },
    'registrar-notificacao': function (b) {
      var u = usuario(), r = repo().porId('riscos', b.getAttribute('data-id')), c = caso(r.casoId);
      if (!R().podeNotificar(u, c)) return negar();
      var orgao = val('nt-orgao-' + r.id);
      if (!PEP.lista('notificacoes').some(function (n) { return n.id === orgao; })) return PEP.ui.toast('Escolha o órgão notificado.');
      repo().inserir('notificacoes', { riscoId: r.id, casoId: c.id, orgao: orgao, em: U().agora(), registradoPor: u.id,
        protocolo: val('nt-prot-' + r.id), observacao: val('nt-obs-' + r.id) });
      concluir('Notificação registrada.', 'Registrou notificação compulsória (' + orgao + ')', c.id);
    },
    'encerrar-risco': function (b) {
      var u = usuario(), r = repo().porId('riscos', b.getAttribute('data-id')), c = caso(r.casoId);
      if (!R().podeEncerrarRisco(u, c) || !r.cienciaEm || r.encerradoEm) return negar();
      var nota = val('rk-nota-' + r.id);
      if (nota.length < 5) { PEP.form.aplicar(document, [['rk-nota-' + r.id, 'Escreva por que o acompanhamento deste risco pode ser encerrado.']]); return; }
      repo().atualizar('riscos', r.id, { encerradoEm: U().agora(), encerradoPor: u.id, encerramentoNota: nota });
      concluir('Acompanhamento do risco encerrado.', 'Encerrou acompanhamento de risco', c.id);
    },
    'salvar-plano': function (b) {
      var u = usuario(), c = caso(b.getAttribute('data-caso'));
      if (!R().podeEditarPlano(u, c)) return negar();
      var campos = PEP.lista('camposPlanoSeguranca'), max = PEP.regra('planoCampoMaxCaracteres'), erros = [];
      // O essencial de um plano: sinais de alerta, o que a pessoa pode fazer, a quem pedir ajuda e os serviços
      ['sinaisAlerta', 'estrategiasProprias', 'pessoasAjuda', 'servicos'].forEach(function (k) {
        if (val('pl-' + k).length < 3) erros.push(['pl-' + k, 'Campo essencial do plano.']);
      });
      campos.forEach(function (x) { if (val('pl-' + x.id).length > max) erros.push(['pl-' + x.id, 'Use no máximo ' + max + ' caracteres.']); });
      if (!marcado('pl-revisado')) erros.push(['pl-revisado', 'O plano é construído junto com o paciente: confirme que foi feito com ele.']);
      if (!PEP.form.aplicar(el('form-plano'), erros)) return;
      var atual = R().planoAtual(c);
      var novo = { casoId: c.id, versao: (atual ? atual.versao : 0) + 1, autorId: u.id, em: U().agora(), revisadoComPaciente: true };
      campos.forEach(function (x) { novo[x.id] = val('pl-' + x.id); });
      repo().inserir('planosSeguranca', novo);
      concluir('Plano de segurança salvo (versão ' + novo.versao + '). O paciente vê no portal.', 'Registrou plano de segurança (versão ' + novo.versao + ')', c.id);
    },
    'assinar-plano': function (b) {
      var u = usuario(), p = repo().porId('planosSeguranca', b.getAttribute('data-id')), c = caso(p.casoId);
      if (!R().ehSupervisorDoCaso(u, c)) return negar();
      if (!R().assinadoPeloSupervisor('plano', p.id)) assinar('plano', p.id, u, 'supervisor', null);
      concluir('Plano assinado pela supervisão.', 'Assinou plano de segurança (versão ' + p.versao + ')', c.id);
    },
    'imprimir-plano': function () {
      PEP.estado.registrarAuditoria('Imprimiu o próprio plano de segurança', (usuario() && usuario().pacienteId) || '—');
      if (typeof window.print === 'function') window.print();
    },

    // ----- Fila, triagem, cadastro e alocação -----
    'concluir-triagem': function (b) {
      var u = usuario();
      if (!R().podeGerirFila(u)) return negar();
      var i = repo().porId('inscricoes', b.getAttribute('data-id'));
      var risco = val('tr-risco') === 'risco';
      if (risco && val('tr-rk-desc').length < 10) { PEP.form.aplicar(el('form-triagem'), [['tr-rk-desc', 'Descreva o que foi observado ou dito (pelo menos 10 caracteres).']]); return; }
      if (val('tr-destino') === 'externo') {
        // Encaminhamento externo: registra para onde a pessoa foi e se havia risco (sem abrir caso)
        if (val('tr-encaminhado').length < 3) { PEP.form.aplicar(el('form-triagem'), [['tr-encaminhado', 'Informe o serviço para onde a pessoa foi encaminhada.']]); return; }
        repo().atualizar('inscricoes', i.id, { status: 'encaminhado-externo', encaminhadoPara: val('tr-encaminhado'), riscoTriagem: risco ? val('tr-rk-nivel') : '' });
        window.location.hash = '#/fila';
        return concluir('Encaminhamento externo registrado.', 'Triagem: encaminhamento externo' + (risco ? ' (risco sinalizado)' : ''), i.id);
      }
      var d = lerIdentificacao('tr');
      var existente = d.cpf ? PEP.db.pacientes.filter(function (p) { return p.cpf === d.cpf; })[0] : null;
      var erros = errosIdentificacao('tr', d, { semCpfPermitido: i.semCpf, ignorar: { inscricaoId: i.id }, pacientePermitido: existente && existente.id });
      if (val('tr-demanda').length < 5) erros.push(['tr-demanda', 'Descreva a demanda identificada.']);
      var grupoId = val('tr-grupo') || null;
      if (grupoId && !marcado('tr-c-contrato')) erros.push(['tr-c-contrato', 'Para alocar a um grupo, registre o contrato terapêutico.']);
      if (!PEP.form.aplicar(el('form-triagem'), erros)) return;
      if (existente && PEP.db.casos.some(function (c) { return c.pacienteId === existente.id && c.status !== 'encerrado'; })) {
        return PEP.ui.toast('Este paciente já tem um caso em andamento: não é possível abrir outro.');
      }
      var paciente;
      if (existente) paciente = repo().atualizar('pacientes', existente.id, d);
      else { d.criadoEm = U().hoje(); paciente = repo().inserir('pacientes', d); }
      var novo = repo().inserir('casos', { pacienteId: paciente.id, grupoId: grupoId, subgrupoId: null, status: grupoId ? 'ativo' : 'aguardando-alocacao', inicio: U().hoje() });
      repo().inserir('anamneses', { casoId: novo.id, versao: 1, autorId: u.id, em: U().agora(), demanda: val('tr-demanda'), objetivos: 'A definir no início do atendimento.',
        queixa: '', sintomas: '', historicoFamiliar: '', medicacoes: '', historicoClinico: '' });
      PEP.lista('finalidadesConsentimento').forEach(function (f) {
        repo().inserir('consentimentos', { casoId: novo.id, finalidade: f.id, concedido: marcado('tr-c-' + f.id), termoVersao: PEP.config().termos.consentimento, registradoPor: u.id, em: U().agora() });
      });
      repo().atualizar('inscricoes', i.id, { status: 'triada', casoId: novo.id, riscoTriagem: risco ? val('tr-rk-nivel') : '' });
      if (risco) {
        // O caso já nasce com a avaliação de risco da triagem, aguardando a ciência da supervisão
        repo().inserir('riscos', { casoId: novo.id, registradoPor: u.id, em: U().agora(), tipo: val('tr-rk-tipo'), nivel: val('tr-rk-nivel'), descricao: val('tr-rk-desc'),
          condutas: [], cienciaEm: null, cienciaPor: null, encerradoEm: null, encerradoPor: null, encerramentoNota: '' });
      }
      window.location.hash = '#/fila';
      concluir(risco ? 'Triagem salva com risco: acione o supervisor e a rede agora.' : (existente ? 'Triagem concluída: novo caso ligado ao cadastro existente.' : 'Triagem concluída e caso criado.'),
        'Concluiu triagem' + (risco ? ' (risco sinalizado)' : '') + (existente ? ' (paciente já cadastrado)' : ''), novo.id);
    },
    'marcar-duplicada': function (b) {
      if (!R().podeGerirFila(usuario())) return negar();
      var i = repo().porId('inscricoes', b.getAttribute('data-id'));
      repo().atualizar('inscricoes', i.id, { status: 'duplicada' });
      window.location.hash = '#/fila';
      concluir('Inscrição marcada como duplicada e retirada da fila.', 'Marcou inscrição duplicada', i.id);
    },
    'salvar-paciente': function (b) {
      var u = usuario();
      if (!R().podeEditarCadastro(u)) return negar();
      var p = repo().porId('pacientes', b.getAttribute('data-id'));
      var d = lerIdentificacao('pc');
      var erros = errosIdentificacao('pc', d, { semCpfPermitido: !p.cpf, ignorar: { pacienteId: p.id } });
      if (!PEP.form.aplicar(el('form-paciente'), erros)) return;
      repo().atualizar('pacientes', p.id, d);
      var c = PEP.db.casos.filter(function (x) { return x.pacienteId === p.id; }).pop();
      if (c) window.location.hash = '#/caso/' + c.id;
      concluir('Cadastro atualizado.', 'Editou cadastro do paciente', p.id);
    },
    'alocar-caso': function (b) {
      if (!R().podeGerirFila(usuario())) return negar();
      var c = caso(b.getAttribute('data-id'));
      if (!R().consentiu(c, 'contrato')) return PEP.ui.toast('Registre o contrato terapêutico nos consentimentos do caso antes de alocar.');
      repo().atualizar('casos', c.id, { grupoId: val('ag-' + c.id), subgrupoId: null, status: 'ativo' });
      concluir('Caso alocado ao grupo. O supervisor define a dupla ou trio.', 'Alocou caso a grupo', c.id);
    },
    'alocar-estagiario': function (b) {
      if (!R().podeGerirEstudantes(usuario())) return negar();
      var id = b.getAttribute('data-id');
      if (R().alocacaoDoEstagiario(id)) return PEP.ui.toast('Este estagiário já está alocado.');
      var g = repo().porId('grupos', val('gr-' + id));
      repo().inserir('alocacoes', { estagiarioId: id, grupoId: g.id, subgrupoId: null, inicio: U().hoje(), fim: null });
      concluir('Estagiário alocado ao ' + g.nome + '.', 'Alocou estagiário a grupo', g.id);
    },
    'encerrar-estagio': function (b) {
      if (!R().podeGerirEstudantes(usuario())) return negar();
      var id = b.getAttribute('data-id'), a = R().alocacaoDoEstagiario(id);
      if (!a) return;
      // Transição de semestre: avisa quais casos ficam sem ninguém da dupla (a supervisão faz a passagem)
      var orfaos = R().casosQueFicamSemDupla(id).map(function (c) { return PEP.ui.nomePacienteDoCaso(c); });
      var aviso = orfaos.length ? '\n\nFica sem dupla ativa: ' + orfaos.join(', ') + '. Combine com a supervisão a passagem (resumo de transferência e nova dupla).' : '';
      if (typeof window.confirm === 'function' && !window.confirm('Encerrar o vínculo de estágio de ' + PEP.ui.nomeUsuario(id) + '? O acesso aos casos termina agora.' + aviso)) return;
      repo().atualizar('alocacoes', a.id, { fim: U().hoje() });
      concluir('Vínculo encerrado. O acesso aos casos terminou; o histórico continua.' + (orfaos.length ? ' ' + orfaos.length + ' caso(s) aguardam a passagem para outra dupla.' : ''),
        'Encerrou vínculo de estágio', id);
    },
    'definir-dupla': function (b) {
      var u = usuario(), g = repo().porId('grupos', b.getAttribute('data-grupo')), id = b.getAttribute('data-id');
      var a = R().alocacaoDoEstagiario(id);
      if (g.supervisorId !== u.id || !a || a.grupoId !== g.id) return negar();
      var sub = repo().porId('subgrupos', val('dup-' + id));
      if (!sub || sub.grupoId !== g.id) return PEP.ui.toast('Crie uma dupla ou trio primeiro.');
      repo().atualizar('alocacoes', a.id, { subgrupoId: sub.id });
      concluir('Estagiário incluído na ' + sub.nome + '.', 'Definiu dupla/trio', g.id);
    },
    'nova-dupla': function (b) {
      var g = repo().porId('grupos', b.getAttribute('data-grupo'));
      if (g.supervisorId !== usuario().id) return negar();
      var n = R().subgruposDoGrupo(g.id).length + 1;
      repo().inserir('subgrupos', { grupoId: g.id, nome: 'Dupla/Trio ' + n });
      concluir('Nova dupla/trio criada.', 'Criou dupla/trio', g.id);
    },
    'atribuir-caso': function (b) {
      var c = caso(b.getAttribute('data-id'));
      if (!R().ehSupervisorDoCaso(usuario(), c)) return negar();
      var sub = repo().porId('subgrupos', val('cs-' + c.id));
      if (!sub || sub.grupoId !== c.grupoId) return negar();
      repo().atualizar('casos', c.id, { subgrupoId: sub.id });
      concluir('Caso atribuído à dupla.', 'Atribuiu caso a dupla/trio', c.id);
    },

    // ----- Estudantes (direção) -----
    'conferir-importacao': function () {
      if (!R().podeGerirEstudantes(usuario())) return negar();
      var arq = el('im-arquivo').files && el('im-arquivo').files[0];
      var ler = arq ? arq.text() : Promise.resolve(val('im-texto'));
      ler.then(function (texto) {
        PEP.telas._importacao = { texto: texto, linhas: conferirLinhas(texto) };
        PEP.app.renderizar();
      });
    },
    'importar-estudantes': function (b) {
      var u = usuario();
      if (!R().podeGerirEstudantes(u) || !PEP.telas._importacao) return negar();
      var validas = PEP.telas._importacao.linhas.filter(function (l) { return !l.erro; });
      b.disabled = true;
      b.textContent = 'Criando contas…';
      var resultado = [];
      validas.reduce(function (promessa, l) {
        return promessa.then(function () {
          var senha = PEP.seguranca.senhaProvisoria();
          return PEP.seguranca.hashSenha(senha).then(function (hash) {
            repo().inserir('usuarios', { nome: l.nome, login: l.login, email: l.email, perfil: 'estagiario', cargo: 'Estagiário(a)', crp: null, matricula: l.matricula,
              pacienteId: null, senhaHash: hash, senhaProvisoria: true, ativo: true, criadoEm: U().hoje() });
            resultado.push({ nome: l.nome, login: l.login, senha: senha });
          });
        });
      }, Promise.resolve()).then(function () {
        PEP.telas._importacao = { resultado: resultado };
        concluir(resultado.length + ' conta(s) criada(s).', 'Importou ' + resultado.length + ' estudante(s)', '—');
      });
    },
    'fechar-importacao': function () { PEP.telas._importacao = null; PEP.app.renderizar(); },

    // ----- Contas: senha provisória, desativar/reativar e acesso do paciente ao portal -----
    'gerar-senha-provisoria': function (b) {
      var u = usuario(), alvo = repo().porId('usuarios', b.getAttribute('data-id'));
      if (!R().podeGerirConta(u, alvo) || !alvo.ativo) return negar();
      var ad = repo().adaptador(), alvoAuditoria = alvo.pacienteId || alvo.id;
      if (ad.remoto) {
        // Banco ligado: a senha não passa pelo navegador de outra pessoa; o Supabase Auth manda o link de redefinição
        return ad.recuperarSenha(alvo.email).then(function () { concluir('Link para criar nova senha enviado ao e-mail da pessoa.', 'Enviou link de redefinição de senha', alvoAuditoria); });
      }
      b.disabled = true;
      var senha = PEP.seguranca.senhaProvisoria();
      PEP.seguranca.hashSenha(senha).then(function (hash) {
        repo().atualizar('usuarios', alvo.id, { senhaHash: hash, senhaProvisoria: true });
        PEP.telas._senhaGerada = { nome: PEP.ui.nomeUsuario(alvo.id), login: alvo.login, senha: senha };
        concluir('Senha provisória gerada.', 'Gerou senha provisória para a conta', alvoAuditoria);
      });
    },
    'alternar-conta': function (b) {
      var u = usuario(), alvo = repo().porId('usuarios', b.getAttribute('data-id'));
      if (!R().podeGerirConta(u, alvo)) return negar();
      var ativar = !alvo.ativo;
      if (!ativar && typeof window.confirm === 'function' &&
          !window.confirm('Desativar a conta de ' + PEP.ui.nomeUsuario(alvo.id) + '? A pessoa não entra mais no sistema; o histórico continua.')) return;
      repo().atualizar('usuarios', alvo.id, { ativo: ativar });
      concluir(ativar ? 'Conta reativada.' : 'Conta desativada: a pessoa não entra mais; o histórico continua.', (ativar ? 'Reativou' : 'Desativou') + ' a conta', alvo.pacienteId || alvo.id);
    },
    'criar-acesso-portal': function (b) {
      var u = usuario(), p = repo().porId('pacientes', b.getAttribute('data-id'));
      if (!u || u.perfil !== 'tecnico' || !p || R().contaDoPaciente(p)) return negar();
      if (!V().email(p.email)) return PEP.ui.toast('Cadastre um e-mail válido do paciente para criar o acesso ao portal.');
      if (PEP.db.usuarios.some(function (x) { return String(x.email).toLowerCase() === p.email.toLowerCase(); })) return PEP.ui.toast('Este e-mail já é usado por outra conta.');
      if (repo().adaptador().remoto) return PEP.ui.toast('Com o banco ligado, o acesso é criado por convite de e-mail, numa função do servidor (veja banco/README.md).');
      // Usuário a partir do e-mail (sem repetir); a senha provisória aparece uma vez
      var base = p.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 50);
      if (base.length < 3) base = 'paciente' + base;
      var login = base, n = 2;
      while (PEP.db.usuarios.some(function (x) { return x.login === login; })) login = base + n++;
      var senha = PEP.seguranca.senhaProvisoria();
      b.disabled = true;
      PEP.seguranca.hashSenha(senha).then(function (hash) {
        repo().inserir('usuarios', { nome: null, login: login, email: p.email.toLowerCase(), perfil: 'paciente', cargo: 'Paciente', crp: null, matricula: null,
          pacienteId: p.id, senhaHash: hash, senhaProvisoria: true, ativo: true, criadoEm: U().hoje() });
        PEP.telas._senhaGerada = { nome: PEP.ui.nomePaciente(p, p.id), login: login, senha: senha };
        concluir('Acesso ao portal criado.', 'Criou acesso do paciente ao portal', p.id);
      });
    },
    'fechar-senha-gerada': function () { PEP.telas._senhaGerada = null; PEP.app.renderizar(); },
    // Esqueci a senha (banco ligado): a resposta é a mesma exista ou não o e-mail (não revela quem tem conta)
    'recuperar-senha': function () {
      var email = val('lg-usuario'), ad = repo().adaptador();
      if (!ad.recuperarSenha) return;
      if (!V().email(email)) { PEP.form.aplicar(document, [['lg-usuario', 'Digite o seu e-mail para receber o link.']]); return; }
      ad.recuperarSenha(email).then(function () { PEP.ui.toast('Se o e-mail estiver cadastrado, você vai receber um link para criar outra senha.'); });
    },

    // ----- Verificação em duas etapas -----
    'cancelar-mfa': function () { PEP.estado.cancelarMfa(); PEP.app.renderizar(); },
    'mfa-iniciar': function () {
      var u = usuario(), ad = repo().adaptador();
      if (!u) return;
      var mostrar = function (n) { PEP.telas._mfaNovo = n; PEP.app.renderizar(); if (el('mfa-codigo-novo')) el('mfa-codigo-novo').focus(); };
      if (ad.remoto) return ad.cadastrarMfa().then(mostrar, function () { PEP.ui.toast('Não foi possível iniciar a configuração. Tente de novo.'); });
      var segredo = PEP.seguranca.novoSegredoMfa();
      mostrar({ segredo: segredo, uri: PEP.seguranca.enderecoOtp(segredo, u.email || u.login) });
    },
    'mfa-cancelar': function () { PEP.telas._mfaNovo = null; PEP.app.renderizar(); },
    'mfa-fechar-codigos': function () { PEP.telas._mfaCodigos = null; PEP.app.renderizar(); },
    'mfa-desativar': function () {
      var u = usuario(), ad = repo().adaptador();
      if (!u || !u.mfaAtivo || PEP.estado.mfaExigido(u)) return negar();
      var codigo = val('mfa-codigo-atual');
      (ad.remoto ? ad.verificarMfa(u.mfaFatorId, codigo) : PEP.seguranca.conferirTotp(u.mfaSegredo, codigo, u.mfaUltimoPasso)).then(function (ok) {
        if (!ok) { PEP.form.aplicar(document, [['mfa-codigo-atual', 'Código incorreto.']]); return; }
        var fim = ad.remoto ? ad.desativarMfa(u.mfaFatorId).then(function () { u.mfaAtivo = false; }) :
          Promise.resolve(repo().atualizar('usuarios', u.id, { mfaAtivo: false, mfaSegredo: null, mfaRecuperacao: [], mfaDesde: null, mfaUltimoPasso: 0 }));
        fim.then(function () { concluir('Verificação em duas etapas desativada.', 'Desativou a verificação em duas etapas', u.id); });
      });
    },
    'mfa-novos-codigos': function () {
      var u = usuario();
      if (!u || !u.mfaAtivo || repo().adaptador().remoto) return negar();
      PEP.seguranca.conferirTotp(u.mfaSegredo, val('mfa-codigo-atual'), u.mfaUltimoPasso).then(function (passo) {
        if (!passo) { PEP.form.aplicar(document, [['mfa-codigo-atual', 'Código incorreto.']]); return; }
        var codigos = PEP.seguranca.codigosRecuperacao();
        repo().atualizar('usuarios', u.id, { mfaRecuperacao: codigos.map(function (c) { return PEP.seguranca.sha256(c); }), mfaUltimoPasso: passo });
        PEP.telas._mfaCodigos = codigos;
        concluir('Novos códigos gerados; os anteriores deixaram de valer.', 'Gerou novos códigos de recuperação', u.id);
      });
    },
    'desligar-mfa-conta': function (b) {
      var u = usuario(), alvo = repo().porId('usuarios', b.getAttribute('data-id'));
      if (!R().podeGerirConta(u, alvo) || !alvo.mfaAtivo) return negar();
      if (repo().adaptador().remoto) return PEP.ui.toast('Com o banco ligado, o segundo fator é removido por uma função do servidor (Supabase Auth, administração).');
      if (typeof window.confirm === 'function' && !window.confirm('Desligar a verificação em duas etapas de ' + PEP.ui.nomeUsuario(alvo.id) + '? Use só se a pessoa perdeu o celular e os códigos de recuperação.')) return;
      repo().atualizar('usuarios', alvo.id, { mfaAtivo: false, mfaSegredo: null, mfaRecuperacao: [], mfaDesde: null, mfaUltimoPasso: 0 });
      concluir('Verificação em duas etapas desligada: a pessoa configura de novo.', 'Desligou a verificação em duas etapas da conta (celular perdido)', alvo.pacienteId || alvo.id);
    },

    // ----- Acesso do paciente ao prontuário -----
    'conferir-identidade': function (b) {
      var u = usuario();
      if (u.perfil !== 'tecnico') return negar();
      var s = repo().porId('solicitacoes', b.getAttribute('data-id'));
      repo().atualizar('solicitacoes', s.id, { status: 'identidade-conferida', conferidoPor: u.id });
      concluir('Identidade conferida.', 'Conferiu identidade para entrega de cópia', s.casoId);
    },
    'gerar-link': function (b) {
      var u = usuario();
      if (u.perfil !== 'tecnico') return negar();
      var s = repo().porId('solicitacoes', b.getAttribute('data-id'));
      if (s.status !== 'identidade-conferida') return negar();
      var token = PEP.seguranca.tokenAleatorio(24);
      repo().inserir('linksAcesso', { solicitacaoId: s.id, casoId: s.casoId, tokenHash: PEP.seguranca.sha256(token), criadoPor: u.id, criadoEm: U().agora(),
        expiraEm: dataHora(PEP.regra('linkPacienteHoras') * 3600000), revogadoEm: null, acessos: 0, falhas: 0 });
      PEP.telas._ultimoLink = { url: window.location.origin + window.location.pathname + '#/acesso/' + token };
      concluir('Link gerado. Copie e envie ao paciente.', 'Gerou link de leitura do prontuário', s.casoId);
    },
    'copiar-link': function () {
      var campo = el('link-gerado');
      var feito = function () { PEP.ui.toast('Link copiado.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(campo.value).then(feito, function () { campo.select(); });
      else { campo.select(); feito(); }
    },
    'revogar-link': function (b) {
      if (usuario().perfil !== 'tecnico') return negar();
      var l = repo().porId('linksAcesso', b.getAttribute('data-id'));
      repo().atualizar('linksAcesso', l.id, { revogadoEm: U().agora() });
      concluir('Link revogado.', 'Revogou link de leitura', l.casoId);
    },
    'marcar-entregue': function (b) {
      var u = usuario();
      if (u.perfil !== 'tecnico') return negar();
      var s = repo().porId('solicitacoes', b.getAttribute('data-id'));
      repo().atualizar('solicitacoes', s.id, { status: 'entregue', forma: val('forma-' + s.id), entregueEm: U().hoje(), entreguePor: u.id });
      PEP.telas._ultimoLink = null;
      concluir('Cópia entregue ao paciente.', 'Entregou cópia do prontuário', s.casoId);
    },
    'responder-titular': function (b) {
      var u = usuario();
      if (!R().podeAtenderTitular(u)) return negar();
      var p = repo().porId('pedidosTitular', b.getAttribute('data-id'));
      var resp = val('resp-' + p.id);
      if (resp.length < 5) { PEP.form.aplicar(document, [['resp-' + p.id, 'Escreva a resposta ao titular.']]); return; }
      repo().atualizar('pedidosTitular', p.id, { status: 'respondido', resposta: resp, respondidoPor: u.id, respondidoEm: U().agora() });
      concluir('Resposta registrada.', 'Respondeu pedido de titular (LGPD)', p.id);
    },
    'verificar-auditoria': function () {
      if (!R().podeVerAuditoria(usuario())) return negar();
      var ad = repo().adaptador();
      if (ad.verificarAuditoria) {
        // Banco ligado: a cadeia é conferida pelo próprio banco (app.verificar_auditoria), não pela cópia da tela
        return ad.verificarAuditoria().then(function (r) { PEP.telas._verificacao = r; PEP.app.renderizar(); },
          function () { PEP.ui.toast('Não foi possível verificar no servidor. Tente de novo.'); });
      }
      PEP.telas._verificacao = PEP.estado.verificarAuditoria();
      PEP.app.renderizar();
    }
  };

  // Rascunhos abertos na tela são guardados quando a sessão está para encerrar por inatividade:
  // o texto que a pessoa estava escrevendo não se perde. Lê todos os editores antes de gravar
  // (gravar redesenha a tela) e registra um evento de auditoria por caso.
  PEP.acoes._guardarRascunhosAbertos = function () {
    var u = usuario();
    if (!u || u.perfil !== 'estagiario') return 0;
    var pendentes = [];
    var nova = el('nova-texto'), botaoNova = document.querySelector('[data-acao="nova-evolucao"]');
    if (nova && botaoNova && nova.value.trim().length >= 10) {
      pendentes.push({ casoId: botaoNova.getAttribute('data-caso'), texto: nova.value.trim(), sessaoId: val('nova-sessao') || null });
    }
    document.querySelectorAll('textarea[id^="ev-"]').forEach(function (t) {
      var e = evolucao(t.id.slice(3));
      if (e && t.value.trim().length >= 10 && t.value.trim() !== e.texto) pendentes.push({ evolucao: e, texto: t.value.trim() });
    });
    var casos = {};
    pendentes.forEach(function (p) {
      var c = caso(p.evolucao ? p.evolucao.casoId : p.casoId);
      if (!c || !R().podeEscreverEvolucao(u, c) || erroTextoEvolucao('x', p.texto).length) return;
      if (p.evolucao) {
        if (p.evolucao.autorId !== u.id || (p.evolucao.status !== 'rascunho' && p.evolucao.status !== 'devolvida')) return;
        repo().atualizar('evolucoes', p.evolucao.id, { texto: p.texto });
      } else {
        repo().inserir('evolucoes', { casoId: c.id, sessaoId: p.sessaoId, autorId: u.id, data: U().hoje(), status: 'rascunho', texto: p.texto, comentarioSupervisor: '' });
      }
      casos[c.id] = true;
    });
    Object.keys(casos).forEach(function (id) { PEP.estado.registrarAuditoria('Rascunho guardado automaticamente (sessão encerrando por inatividade)', id); });
    if (Object.keys(casos).length) { repo().salvar(); PEP.app.renderizar(); }
    return Object.keys(casos).length;
  };

  // ----- Formulários -----
  PEP.formularios = {
    login: function (form) {
      var botao = el('lg-entrar'), erro = el('login-erro');
      botao.disabled = true;
      botao.textContent = 'Conferindo…';
      PEP.estado.autenticar(form.elements.usuario.value, form.elements.senha.value).then(function (r) {
        botao.disabled = false;
        botao.textContent = 'Entrar';
        if (r.ok) {
          window.location.hash = '#/painel';
          PEP.app.renderizar();
          return;
        }
        if (r.motivo === 'mfa') {   // senha certa e MFA ativo: segundo passo, o código do aplicativo
          PEP.app.renderizar();
          if (el('lg-codigo')) el('lg-codigo').focus();
          return;
        }
        erro.textContent = r.motivo === 'bloqueado' ? 'Muitas tentativas sem sucesso. Aguarde ' + (r.segundos || 30) + ' segundos e tente de novo.' :
          r.motivo === 'sem-cripto' ? 'Abra o site pelo endereço https (GitHub Pages) ou por localhost: o navegador só libera a criptografia nesses endereços.' :
          'Usuário ou senha incorretos.';
        erro.hidden = false;
        form.elements.senha.value = '';
        form.elements.senha.focus();
      });
    },
    inscricao: function (form) {
      var f = form.elements, erros = [];
      var d = { nome: f.nome.value.trim(), social: f.social.value.trim(), nasc: f.nascimento.value, cpf: V().soDigitos(f.cpf.value), semCpf: f.semcpf.checked,
        telefone: V().soDigitos(f.telefone.value), email: f.email.value.trim(), responsavel: f.responsavel.value.trim(), resumo: f.resumo.value.trim() };
      if (!V().nome(d.nome)) erros.push(['f-nome', 'Informe seu nome completo (só letras).']);
      if (d.social && !V().nome(d.social)) erros.push(['f-social', 'Use só letras.']);
      var dn = V().dataNascimento(d.nasc);
      if (!dn.ok) erros.push(['f-nasc', dn.msg]);
      if (!d.semCpf && !V().cpf(d.cpf)) erros.push(['f-cpf', d.cpf ? 'CPF inválido: confira os números.' : 'Informe o CPF ou marque "Não tenho CPF".']);
      if (!V().telefone(d.telefone)) erros.push(['f-tel', 'Telefone inválido: use DDD + número, ex.: (11) 91234-5678.']);
      if (d.email && !V().email(d.email)) erros.push(['f-email', 'E-mail inválido.']);
      var menor = dn.ok && U().idade(d.nasc) < 18;
      if (menor && !V().nome(d.responsavel)) erros.push(['f-resp', 'Menor de 18 anos: informe o responsável legal.']);
      if (menor && !f.responsavelOk.checked) erros.push(['f-respok', 'O responsável precisa autorizar a inscrição.']);
      if (d.resumo.length < 3) erros.push(['f-resumo', 'Conte em poucas palavras o motivo.']);
      if (!f.ciente.checked) erros.push(['f-ciente', 'É preciso ler o aviso de privacidade para entrar na fila.']);
      if (!PEP.form.aplicar(form, erros)) return;
      // Duplicidade: fica sinalizada para a equipe, sem aparecer para quem preenche
      var dup = d.semCpf ? null : V().cpfJaCadastrado(d.cpf);
      var i = repo().inserir('inscricoes', { nome: d.nome, nomeSocial: d.social, dataNascimento: d.nasc, cpf: d.semCpf ? '' : d.cpf, semCpf: d.semCpf,
        telefone: d.telefone, email: d.email, responsavelNome: d.responsavel, resumo: d.resumo, sinalUrgencia: R().temSinalDeUrgencia(d.resumo), periodo: f.periodo.value,
        data: U().hoje(), status: 'aguardando', avisoVersao: PEP.config().termos.privacidade, duplicidade: dup, casoId: null, encaminhadoPara: '', riscoTriagem: '' });
      PEP.estado.registrarAuditoria('Nova inscrição na fila de espera', i.id, 'visitante');
      window.location.hash = '#/inscricao-ok';
      PEP.app.renderizar();
    },
    'trocar-senha': function (form) {
      var u = usuario(), atual = el('ts-atual').value, nova = el('ts-nova').value, confirma = el('ts-confirma').value;
      var ad = repo().adaptador();
      if (ad.trocarSenha) {
        // Banco ligado: quem confere a senha atual e guarda a nova (com hash) é o Supabase Auth
        var av0 = PEP.seguranca.avaliarSenha(nova, { login: u.login, nome: PEP.ui.nomeUsuario(u.id), email: u.email });
        var erros0 = [];
        if (!av0.ok) erros0.push(['ts-nova', av0.erros.join(' ')]);
        if (confirma !== nova) erros0.push(['ts-confirma', 'As duas senhas não são iguais.']);
        if (!PEP.form.aplicar(form, erros0)) return;
        return ad.trocarSenha(u.email, atual, nova).then(function (r) {
          if (!r.ok) { PEP.form.aplicar(form, [['ts-atual', r.motivo === 'senha-atual' ? 'Senha atual incorreta.' : 'Não foi possível trocar a senha agora. Tente de novo.']]); return; }
          var eraProvisoria = u.senhaProvisoria;
          repo().atualizar('usuarios', u.id, { senhaProvisoria: false });
          if (eraProvisoria) window.location.hash = '#/painel';
          concluir('Senha alterada.', 'Trocou a senha', u.id);
        });
      }
      PEP.seguranca.conferirSenha(atual, u.senhaHash).then(function (confere) {
        var erros = [];
        if (!confere) erros.push(['ts-atual', 'Senha atual incorreta.']);
        var av = PEP.seguranca.avaliarSenha(nova, { login: u.login, nome: PEP.ui.nomeUsuario(u.id), email: u.email });
        if (!av.ok) erros.push(['ts-nova', av.erros.join(' ')]);
        else if (nova === atual) erros.push(['ts-nova', 'A nova senha precisa ser diferente da atual.']);
        if (confirma !== nova) erros.push(['ts-confirma', 'As duas senhas não são iguais.']);
        if (!PEP.form.aplicar(form, erros)) return;
        return PEP.seguranca.hashSenha(nova).then(function (hash) {
          var eraProvisoria = u.senhaProvisoria;
          repo().atualizar('usuarios', u.id, { senhaHash: hash, senhaProvisoria: false });
          if (eraProvisoria) window.location.hash = '#/painel';
          concluir('Senha alterada.', 'Trocou a senha', u.id);
        });
      });
    },
    // Passagem do caso para outra dupla (transição de semestre). As mesmas regras valem no banco
    // (app.transferencia_regras), e é ele que muda a dupla do caso quando o banco está ligado.
    'passar-caso': function (form) {
      var u = usuario(), c = caso(form.getAttribute('data-caso'));
      if (!R().podePassarCaso(u, c)) return negar();
      if (R().checklistPassagem(c).some(function (i) { return i.bloqueia && !i.ok; })) {
        return PEP.ui.toast('Há evolução esperando a supervisão: valide ou devolva antes de passar o caso.');
      }
      var sub = repo().porId('subgrupos', form.elements.destino.value);
      if (!sub || !R().duplasDestino(u, c).some(function (s) { return s.id === sub.id; })) return negar();
      var resumo = R().resumoValidado(c), just = form.elements.justificativa ? form.elements.justificativa.value.trim() : '';
      var erros = [];
      if (!resumo && just.length < 10) erros.push(['pc-justificativa', 'Sem o resumo de transferência validado, explique o motivo (pelo menos 10 caracteres).']);
      if (!form.elements.avisado.checked) erros.push(['pc-avisado', 'A passagem só acontece com o paciente avisado da troca.']);
      if (!PEP.form.aplicar(form, erros)) return;
      var g = repo().porId('grupos', sub.grupoId);
      repo().inserir('transferencias', { casoId: c.id, deGrupoId: c.grupoId, deSubgrupoId: c.subgrupoId, paraGrupoId: sub.grupoId, paraSubgrupoId: sub.id,
        resumoId: resumo ? resumo.id : null, justificativa: resumo ? '' : just, pacienteAvisado: true, registradoPor: u.id, em: U().agora() });
      repo().atualizar('casos', c.id, { grupoId: sub.grupoId, subgrupoId: sub.id });
      concluir('Caso passado para ' + g.nome + ' · ' + sub.nome + '. A dupla anterior não acessa mais; o prontuário continua inteiro.', 'Passou o caso para outra dupla', c.id);
    },
    // Segundo passo do login: código do aplicativo ou código de recuperação
    mfa: function (form) {
      var botao = el('lg-confirmar'), erro = el('mfa-erro');
      botao.disabled = true;
      PEP.estado.confirmarMfa(form.elements.codigo.value).then(function (r) {
        botao.disabled = false;
        if (r.ok) { window.location.hash = '#/painel'; PEP.app.renderizar(); return; }
        if (r.motivo === 'expirou') { PEP.ui.toast('O tempo para digitar o código acabou. Entre de novo.'); PEP.app.renderizar(); return; }
        erro.textContent = r.motivo === 'bloqueado' ? 'Muitas tentativas sem sucesso. Aguarde ' + r.segundos + ' segundos e tente de novo.' : 'Código incorreto. Confira o aplicativo e tente de novo.';
        erro.hidden = false;
        form.elements.codigo.value = '';
        form.elements.codigo.focus();
      });
    },
    // Ativação do MFA: confere o primeiro código do aplicativo antes de ligar
    'mfa-ativar': function (form) {
      var u = usuario(), n = PEP.telas._mfaNovo, codigo = form.elements.codigo.value, ad = repo().adaptador();
      if (!u || !n) return;
      (ad.remoto ? ad.confirmarCadastroMfa(n.fatorId, codigo) : PEP.seguranca.conferirTotp(n.segredo, codigo)).then(function (ok) {
        if (!ok) { PEP.form.aplicar(form, [['mfa-codigo-novo', 'Código não confere. Confira a chave digitada e se o relógio do celular está certo.']]); return; }
        var campos = { mfaAtivo: true, mfaDesde: U().agora() };
        if (ad.remoto) { u.mfaAtivo = true; u.mfaDesde = campos.mfaDesde; u.mfaFatorId = n.fatorId; }
        else {
          var codigos = PEP.seguranca.codigosRecuperacao();
          campos.mfaSegredo = n.segredo;
          campos.mfaUltimoPasso = ok;   // o código usado na ativação não serve para entrar
          campos.mfaRecuperacao = codigos.map(function (c) { return PEP.seguranca.sha256(c); });
          PEP.telas._mfaCodigos = codigos;
          repo().atualizar('usuarios', u.id, campos);
        }
        PEP.telas._mfaNovo = null;
        window.location.hash = '#/conta';
        concluir('Verificação em duas etapas ativada.', 'Ativou a verificação em duas etapas', u.id);
      });
    },
    'abrir-link': function (form) {
      var token = form.elements.token.value, hash = PEP.seguranca.sha256(token);
      var link = PEP.db.linksAcesso.filter(function (l) { return l.tokenHash === hash; })[0];
      if (!link || link.revogadoEm || link.expiraEm < U().agora()) return PEP.app.renderizar();
      var c = caso(link.casoId), p = PEP.ui.pacienteDoCaso(c);
      var dono = PEP.db.usuarios.filter(function (x) { return x.pacienteId === p.id; })[0];
      if (form.elements.nascimento.value !== p.dataNascimento) {
        var falhas = (link.falhas || 0) + 1, limite = PEP.regra('tentativasLink') || 5;
        repo().atualizar('linksAcesso', link.id, falhas >= limite ? { falhas: falhas, revogadoEm: U().agora() } : { falhas: falhas });
        PEP.estado.registrarAuditoria(falhas >= limite ? 'Link de leitura bloqueado por tentativas' : 'Tentativa de abrir link de leitura sem sucesso', c.id, 'visitante');
        PEP.form.aplicar(form, [['lk-nasc', falhas >= limite ? 'Link bloqueado. Peça um novo à clínica.' : 'Data não confere. Tentativas restantes: ' + (limite - falhas) + '.']]);
        if (falhas >= limite) PEP.app.renderizar();
        return;
      }
      PEP.telas._linkLiberado = link.id;
      repo().atualizar('linksAcesso', link.id, { acessos: (link.acessos || 0) + 1, ultimoAcessoEm: U().agora() });
      PEP.estado.registrarAuditoria('Paciente leu o prontuário por link', c.id, dono ? dono.id : 'visitante');
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

  // Campos que reagem enquanto a pessoa digita
  var revisarDepois = null;
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    // Contador de caracteres dos textos com limite (evolução)
    var idContador = t.getAttribute && t.getAttribute('data-contador');
    if (idContador && el(idContador)) el(idContador).textContent = t.value.length + ' de ' + t.getAttribute('maxlength') + ' caracteres';
    // Revisor de escrita: roda quando a pessoa para de digitar (meio segundo), sem atrapalhar a escrita
    var idRevisor = t.getAttribute && t.getAttribute('data-revisor');
    if (idRevisor) {
      clearTimeout(revisarDepois);
      revisarDepois = setTimeout(function () {
        if (el(idRevisor)) el(idRevisor).innerHTML = t.value.trim() ? PEP.revisor.html(PEP.revisor.analisar(t.value)) : '';
      }, 500);
    }
    if (t.id === 'f-resumo' && el('f-urgencia')) el('f-urgencia').hidden = !R().temSinalDeUrgencia(t.value);
    if (t.id === 'f-nasc') {
      var linha = el('linha-resp-ok');
      if (linha) linha.hidden = !(t.value && U().idade(t.value) < 18);
    }
    if (t.id === 'f-semcpf' || t.id === 'f-cpf') { var cpf = el('f-cpf'); if (cpf) cpf.disabled = el('f-semcpf').checked; }
    if (t.id === 'ts-nova') {
      var u = usuario();
      var av = PEP.seguranca.avaliarSenha(t.value, u ? { login: u.login, nome: PEP.ui.nomeUsuario(u.id), email: u.email } : {});
      var barra = el('ts-barra');
      barra.style.width = (t.value ? (av.forca + 1) * 20 : 0) + '%';
      barra.className = 'forca-' + av.forca;
      el('ts-forca').textContent = t.value ? 'Força: ' + av.rotulo + (av.ok ? ' · atende às regras' : ' · ' + av.erros[0]) : 'Força: —';
    }
  });
  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'f-semcpf') { var cpf = el('f-cpf'); cpf.disabled = ev.target.checked; if (ev.target.checked) cpf.value = ''; }
    // Triagem: os campos de risco e de encaminhamento aparecem só quando se aplicam
    if (ev.target.id === 'tr-risco' && el('tr-risco-detalhes')) el('tr-risco-detalhes').hidden = ev.target.value !== 'risco';
    if (ev.target.id === 'tr-destino' && el('tr-encaminhado-linha')) el('tr-encaminhado-linha').hidden = ev.target.value !== 'externo';
  });
})();
