/* =========================================================
   telas-caso.js — prontuário do caso (parte 1):
   cabeçalho, abas, resumo/anamnese e evoluções.
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
      '<h1 style="margin:0">' + esc(p.nome) + '</h1>' +
      '<p class="suave" style="margin:0">' + esc(p.idade) + ' anos · caso ' + esc(caso.id) + ' · início ' + data(caso.inicio) + '</p></div>' +
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

  // ---------- Aba: resumo e anamnese ----------
  function abaResumo(u, caso) {
    var p = PEP.ui.pacienteDoCaso(caso);
    var a = caso.anamnese || {};
    var c = caso.consentimentos || {};
    var sim = function (v) { return v ? '<span class="etiqueta validada">sim</span>' : '<span class="etiqueta rascunho">não</span>'; };
    return '<div class="grade-2">' +
      '<div class="cartao"><h2>Identificação</h2><p><strong>Nome:</strong> ' + esc(p.nome) + '<br><strong>Idade:</strong> ' + esc(p.idade) +
      '<br><strong>Contato:</strong> ' + esc(p.contato) + (p.responsavel ? '<br><strong>Responsável legal:</strong> ' + esc(p.responsavel) : '') + '</p>' +
      (p.idade < 18 ? '<div class="aviso info pequeno">Paciente menor de idade: atendimento autorizado pelo responsável. Ao responsável, comunica-se só o essencial para o cuidado (Código de Ética, arts. 8º e 13).</div>' : '') + '</div>' +
      '<div class="cartao"><h2>Avaliação de demanda e objetivos</h2><p><strong>Demanda:</strong> ' + esc(caso.demanda) + '</p><p><strong>Objetivos:</strong> ' + esc(caso.objetivos) + '</p></div></div>' +
      '<div class="cartao"><h2>Anamnese</h2><div class="grade-2">' +
      '<p><strong>Queixa principal</strong><br>' + esc(a.queixa || '—') + '</p>' +
      '<p><strong>Sintomas relatados</strong><br>' + esc(a.sintomas || '—') + '</p>' +
      '<p><strong>Histórico familiar</strong><br>' + esc(a.historicoFamiliar || '—') + '</p>' +
      '<p><strong>Medicações</strong><br>' + esc(a.medicacoes || '—') + '</p>' +
      '<p><strong>Histórico clínico</strong><br>' + esc(a.historicoClinico || '—') + '</p></div></div>' +
      '<div class="cartao"><h2>Consentimentos (por finalidade)</h2><table><tbody>' +
      '<tr><td>Contrato terapêutico assinado</td><td>' + sim(c.contrato) + '</td></tr>' +
      '<tr><td>Discussão do caso em supervisão em grupo</td><td>' + sim(c.supervisaoGrupo) + '</td></tr>' +
      '<tr><td>Gravação de sessões para supervisão</td><td>' + sim(c.gravacao) + '</td></tr>' +
      '<tr><td>Uso do caso, sem identificação, em ensino e pesquisa</td><td>' + sim(c.ensinoAnonimo) + '</td></tr>' +
      '</tbody></table><p class="suave pequeno">Todo meio de registro ou observação precisa ser informado ao paciente desde o início (Código de Ética, art. 14).</p></div>';
  }

  // ---------- Aba: evoluções ----------
  function assinaturas(e) {
    if (!e.assinaturas.length) return '';
    return '<div class="assinaturas">Assinado por: ' + e.assinaturas.map(function (s) {
      return esc(PEP.ui.nomeUsuario(s.usuarioId)) + ' em ' + data(s.em);
    }).join(' · ') + '</div>';
  }

  function adendos(e) {
    return e.adendos.map(function (ad) {
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
    html += assinaturas(e) + adendos(e);

    if (e.status === 'enviada' && R().podeValidar(u, caso)) {
      html += '<div class="campo" style="margin-top:.6rem"><label for="com-' + e.id + '">Comentário para o estagiário (obrigatório para devolver)</label>' +
        '<textarea id="com-' + e.id + '" style="min-height:70px"></textarea></div>' +
        '<div class="linha"><button class="botao pequeno" data-acao="validar-evolucao" data-id="' + e.id + '">Validar e assinar</button>' +
        '<button class="botao secundario pequeno" data-acao="devolver-evolucao" data-id="' + e.id + '">Devolver com comentário</button></div>';
    }

    if (e.status === 'validada' && R().podeAdendo(u, caso)) {
      html += '<details style="margin-top:.6rem"><summary>Adicionar adendo (correção ou complemento)</summary>' +
        '<div class="campo" style="margin-top:.5rem"><label for="admot-' + e.id + '">Motivo</label><select id="admot-' + e.id + '">' +
        '<option>Correção de informação</option><option>Complemento</option><option>Esclarecimento da supervisão</option></select></div>' +
        '<div class="campo"><label for="adtxt-' + e.id + '">Texto do adendo</label><textarea id="adtxt-' + e.id + '" style="min-height:70px"></textarea></div>' +
        '<button class="botao pequeno" data-acao="adicionar-adendo" data-id="' + e.id + '">Registrar adendo</button></details>';
    }
    return html + '</div>';
  }

  // Sessões com presença e sem evolução há mais de 48 horas
  function sessoesSemEvolucao(caso) {
    var limite = new Date(Date.now() - 48 * 3600 * 1000);
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
    // Só em caso ativo: num caso encerrado não dá mais para registrar evolução
    if (atrasadas.length && caso.status === 'ativo' && R().ehEstagiarioDoCaso(u, caso)) {
      html += '<div class="aviso alerta pequeno">Sessão sem evolução há mais de 48 h: ' + atrasadas.map(function (s) { return data(s.data); }).join(', ') + '.</div>';
    }

    if (R().podeEscreverEvolucao(u, caso)) {
      var sessoes = PEP.db.sessoes.filter(function (s) {
        return s.casoId === caso.id && s.presenca === 'presente' && !PEP.db.evolucoes.some(function (e) { return e.sessaoId === s.id; });
      });
      html += '<details class="cartao"><summary><strong>Nova evolução</strong></summary>' +
        '<div class="campo" style="margin-top:.6rem"><label for="nova-sessao">Sessão</label><select id="nova-sessao">' +
        sessoes.map(function (s) { return '<option value="' + s.id + '">' + data(s.data) + ' às ' + esc(s.hora) + '</option>'; }).join('') +
        '<option value="">Sem sessão vinculada</option></select></div>' +
        '<div class="campo"><label for="nova-texto">Texto</label><span class="dica">Modelo: tema trabalhado · intervenção · resposta do paciente · plano para a próxima sessão.</span>' +
        '<textarea id="nova-texto"></textarea></div>' +
        '<div class="linha"><button class="botao secundario pequeno" data-acao="nova-evolucao" data-caso="' + caso.id + '" data-modo="rascunho">Salvar rascunho</button>' +
        '<button class="botao pequeno" data-acao="nova-evolucao" data-caso="' + caso.id + '" data-modo="enviar">Assinar e enviar à supervisão</button></div></details>';
    }

    if (!lista.length) html += '<p class="vazio">Nenhuma evolução registrada.</p>';
    return html + lista.map(function (e) { return cartaoEvolucao(u, caso, e); }).join('');
  }

  // ---------- Tela principal do caso ----------
  PEP.telas.caso = function (u, casoId, aba) {
    var caso = PEP.util.porId(PEP.db.casos, casoId);
    if (!caso) return '<p>Caso não encontrado.</p>';
    if (!R().podeVerCaso(u, caso)) {
      return PEP.ui.semPermissao('Você não está alocado(a) neste caso. Estagiários só acessam os casos da própria dupla ou trio; supervisores, os casos dos seus grupos.');
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
      return '<a class="cartao" style="text-decoration:none;color:inherit" href="#/caso/' + c.id + '">' +
        '<div class="linha entre"><strong>' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</strong>' + PEP.ui.etiquetaCaso(c) + '</div>' +
        '<p class="suave pequeno" style="margin:.4rem 0 0">' + (g ? esc(g.nome) + ' · ' + esc(g.foco) : 'Aguardando alocação') + '</p></a>';
    }).join('') + '</div>';
  };
})();
