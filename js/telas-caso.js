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

  // Abas visíveis conforme o perfil (as restritas só aparecem para quem pode ver)
  function abasDoCaso(u, caso) {
    var abas = [['resumo', 'Resumo e anamnese'], ['evolucoes', 'Evoluções'], ['sessoes', 'Sessões e faltas'], ['documentos', 'Documentos e anexos']];
    if (R().podeVerAreaRestrita(u, caso)) abas.push(['restrita', 'Avaliação psicológica']);
    if (R().podeVerOrientacoes(u, caso)) abas.push(['supervisao', 'Supervisão']);
    abas.push(['encerramento', 'Encerramento']);
    return abas;
  }

  function cabecalho(u, caso) {
    var p = PEP.ui.pacienteDoCaso(caso);
    var g = R().grupoDoCaso(caso);
    var sg = R().subgrupoDoCaso(caso);
    var equipe = R().estagiariosDoCaso(caso).map(PEP.ui.nomeUsuario).join(', ') || '—';
    var podePdf = u.perfil === 'tecnico' || R().ehSupervisorDoCaso(u, caso);
    return '<a href="#/casos" class="suave">← Casos</a>' +
      '<div class="cartao" style="margin-top:.5rem"><div class="linha entre"><div>' +
      '<h1 style="margin:0">' + esc(p.nomeSocial || p.nome) + '</h1>' +
      '<p class="suave" style="margin:0">' + esc(PEP.ui.idade(p)) + ' anos · caso ' + esc(caso.id) + ' · início ' + data(caso.inicio) + '</p></div>' +
      '<div class="linha">' + PEP.ui.etiquetaCaso(caso) +
      (podePdf ? '<a class="botao secundario pequeno" href="#/imprimir/' + caso.id + '">Cópia em PDF</a>' : '') + '</div></div>' +
      '<p class="pequeno" style="margin:.6rem 0 0"><strong>Equipe:</strong> ' + (g ? esc(g.nome) + (sg ? ' · ' + esc(sg.nome) : '') : 'sem grupo') +
      ' — estagiários: ' + esc(equipe) + ' — supervisão: ' + esc(PEP.ui.nomeUsuario(R().supervisorDoCaso(caso)) || '—') + '</p></div>';
  }

  function abas(u, caso, atual) {
    return '<nav class="abas" aria-label="Seções do prontuário">' + abasDoCaso(u, caso).map(function (a) {
      return '<a href="#/caso/' + caso.id + '/' + a[0] + '"' + (a[0] === atual ? ' class="ativa" aria-current="page"' : '') + '>' + a[1] + '</a>';
    }).join('') + '</nav>';
  }

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
            '<textarea id="an-' + c[0] + '" style="min-height:80px">' + esc(a[c[0]] || '') + '</textarea></div>';
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

  function abaResumo(u, caso) {
    var p = PEP.ui.pacienteDoCaso(caso);
    var canal = PEP.lista('canaisLembrete').filter(function (c) { return c.valor === p.canalLembrete; })[0];
    return '<div class="cartao"><div class="linha entre"><h2>Identificação</h2>' +
      (R().podeEditarCadastro(u) ? '<a class="botao secundario pequeno" href="#/paciente/' + p.id + '/editar">Editar cadastro</a>' : '') + '</div>' +
      '<div class="grade-2"><p><strong>Nome:</strong> ' + esc(p.nome) + (p.nomeSocial ? '<br><strong>Nome social:</strong> ' + esc(p.nomeSocial) : '') +
      '<br><strong>Nascimento:</strong> ' + data(p.dataNascimento) + ' (' + esc(PEP.ui.idade(p)) + ' anos)' +
      '<br><strong>CPF:</strong> ' + esc(PEP.validar.ocultarCpf(p.cpf)) + '</p>' +
      '<p><strong>Telefone:</strong> ' + esc(PEP.validar.formatarTelefone(p.telefone)) + '<br><strong>E-mail:</strong> ' + esc(p.email || '—') +
      (p.responsavelNome ? '<br><strong>Responsável legal:</strong> ' + esc(p.responsavelNome) : '') +
      '<br><strong>Lembretes:</strong> ' + esc(canal ? canal.nome : '—') + '</p></div>' +
      (PEP.ui.idade(p) < 18 ? '<div class="aviso info pequeno">Paciente menor de idade: atendimento autorizado pelo responsável. Ao responsável, comunica-se só o essencial para o cuidado (Código de Ética, arts. 8º e 13).</div>' : '') + '</div>' +
      blocoAnamnese(u, caso) + blocoConsentimentos(u, caso);
  }

  // ---------- Aba: evoluções ----------
  function adendos(e) {
    return R().adendosDe(e.id).map(function (ad) {
      return '<div class="adendo"><strong>Adendo</strong> · ' + esc(ad.motivo) + ' · ' + esc(PEP.ui.nomeUsuario(ad.autorId)) + ' em ' + data(ad.em) +
        '<br>' + esc(ad.texto) + '</div>';
    }).join('');
  }

  function cartaoEvolucao(u, caso, e) {
    var html = '<div class="cartao evolucao ' + e.status + '"><div class="linha entre"><strong>' + data(e.data) + ' · ' + esc(PEP.ui.nomeUsuario(e.autorId)) + '</strong>' +
      PEP.ui.etiquetaEvolucao(e.status) + '</div>';
    var ehAutor = e.autorId === u.id;

    if ((e.status === 'rascunho' || e.status === 'devolvida') && ehAutor && R().podeEscreverEvolucao(u, caso)) {
      if (e.comentarioSupervisor && e.status === 'devolvida') html += '<div class="comentario-sup"><strong>Supervisão:</strong> ' + esc(e.comentarioSupervisor) + '</div>';
      html += '<div class="campo" style="margin-top:.6rem"><label for="ev-' + e.id + '">Texto da evolução</label>' +
        '<textarea id="ev-' + e.id + '">' + esc(e.texto) + '</textarea></div>' +
        '<div class="linha"><button class="botao secundario pequeno" data-acao="salvar-evolucao" data-id="' + e.id + '" data-modo="rascunho">Salvar rascunho</button>' +
        '<button class="botao pequeno" data-acao="salvar-evolucao" data-id="' + e.id + '" data-modo="enviar">Assinar e enviar à supervisão</button></div>';
      return html + '</div>';
    }

    html += '<div class="texto">' + esc(e.texto) + '</div>';
    if (e.comentarioSupervisor && e.status === 'devolvida') html += '<div class="comentario-sup"><strong>Supervisão:</strong> ' + esc(e.comentarioSupervisor) + '</div>';
    html += linhaAssinaturas('evolucao', e.id) + adendos(e);

    if (e.status === 'enviada' && R().podeValidar(u, caso)) {
      html += '<div class="campo" style="margin-top:.6rem"><label for="com-' + e.id + '">Comentário para o estagiário (obrigatório para devolver)</label>' +
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

  // Sessões com presença e sem evolução há mais tempo que o prazo (padrão 48 h)
  function sessoesSemEvolucao(caso) {
    var limite = new Date(Date.now() - PEP.regra('prazoEvolucaoHoras') * 3600 * 1000);
    return PEP.db.sessoes.filter(function (s) {
      if (s.casoId !== caso.id || s.presenca !== 'presente') return false;
      if (new Date(s.data + 'T' + s.hora) > limite) return false;
      return !PEP.db.evolucoes.some(function (e) { return e.sessaoId === s.id; });
    });
  }

  function abaEvolucoes(u, caso) {
    var lista = PEP.db.evolucoes.filter(function (e) {
      if (e.casoId !== caso.id) return false;
      if (e.status === 'rascunho') return e.autorId === u.id; // rascunho é só de quem escreve
      return true;
    }).sort(function (a, b) { return b.data.localeCompare(a.data); });

    var html = '<div class="aviso info pequeno"><strong>Lembrete:</strong> o paciente pode pedir cópia do prontuário. Registre tema, intervenção e plano — não o relato detalhado. ' +
      'Depois de validada, a evolução fica bloqueada: correção só por adendo.</div>';

    var atrasadas = sessoesSemEvolucao(caso);
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
        '<textarea id="nova-texto" aria-describedby="nova-texto-dica"></textarea></div>' +
        '<div class="linha"><button class="botao secundario pequeno" data-acao="nova-evolucao" data-caso="' + caso.id + '" data-modo="rascunho">Salvar rascunho</button>' +
        '<button class="botao pequeno" data-acao="nova-evolucao" data-caso="' + caso.id + '" data-modo="enviar">Assinar e enviar à supervisão</button></div></details>';
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
    var permitidas = abasDoCaso(u, caso).map(function (a) { return a[0]; });
    if (permitidas.indexOf(aba) === -1) aba = 'resumo';

    var corpo;
    if (aba === 'evolucoes') corpo = abaEvolucoes(u, caso);
    else if (aba === 'resumo') corpo = abaResumo(u, caso);
    else corpo = PEP.telas.casoAbaExtra(u, caso, aba);

    return cabecalho(u, caso) + abas(u, caso, aba) + corpo;
  };

  // Lista de casos (filtrada pela permissão)
  PEP.telas.casos = function (u) {
    if (u.perfil === 'direcao' || u.perfil === 'paciente') return PEP.ui.semPermissao('Este perfil não navega em prontuários.');
    var casos = PEP.regras.casosVisiveis(u);
    var titulo = u.perfil === 'estagiario' ? 'Meus casos' : (u.perfil === 'supervisor' ? 'Casos dos meus grupos' : 'Todos os casos');
    var html = '<h1>' + titulo + '</h1>';
    if (u.perfil === 'tecnico') html += '<p class="suave">Como responsável técnica, você vê todos os casos. Cada abertura de prontuário fica registrada na auditoria.</p>';
    if (!casos.length) return html + '<p class="vazio">Nenhum caso.</p>';
    return html + '<div class="grade">' + casos.map(function (c) {
      var g = PEP.regras.grupoDoCaso(c);
      return '<a class="cartao cartao-link" href="#/caso/' + c.id + '">' +
        '<span class="linha entre"><strong>' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</strong>' + PEP.ui.etiquetaCaso(c) + '</span>' +
        '<span class="suave pequeno" style="display:block;margin-top:.4rem">' + (g ? esc(g.nome) + ' · ' + esc(g.foco) : 'Aguardando alocação') + '</span></a>';
    }).join('') + '</div>';
  };
})();
