/* =========================================================
   telas-gestao2.js — agenda, indicadores agregados, acesso do
   paciente ao prontuário e trilha de auditoria.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };

  // ---------- Agenda ----------
  PEP.telas.agenda = function (u) {
    var casos;
    if (u.perfil === 'paciente') casos = PEP.db.casos.filter(function (c) { return c.pacienteId === u.pacienteId; });
    else if (u.perfil === 'direcao') return PEP.ui.semPermissao('A agenda individual mostra pacientes; a direção acompanha pelos indicadores.');
    else casos = PEP.regras.casosVisiveis(u);
    casos = casos.filter(function (c) { return c.status === 'ativo'; });
    var sessoes = PEP.telas._proximasSessoes(casos);
    var html = '<h1>' + (u.perfil === 'paciente' ? 'Minhas sessões' : 'Agenda') + '</h1>';
    if (!sessoes.length) return html + '<p class="vazio">Nenhuma sessão agendada.</p>';
    return html + '<div class="cartao tabela-rolagem"><table><thead><tr><th>Data</th><th>Hora</th>' + (u.perfil !== 'paciente' ? '<th>Paciente</th>' : '') + '<th>Presença</th></tr></thead><tbody>' +
      sessoes.map(function (s) {
        var c = PEP.util.porId(PEP.db.casos, s.casoId);
        var conf = s.confirmada ? '<span class="etiqueta validada">confirmada</span>' :
          (u.perfil === 'paciente' ? '<button class="botao pequeno" data-acao="confirmar-sessao" data-id="' + s.id + '">Confirmar presença</button>' : '<span class="etiqueta rascunho">a confirmar</span>');
        return '<tr><td>' + data(s.data) + '</td><td>' + esc(s.hora) + '</td>' +
          (u.perfil !== 'paciente' ? '<td><a href="#/caso/' + c.id + '/sessoes">' + esc(PEP.ui.nomePacienteDoCaso(c)) + '</a></td>' : '') + '<td>' + conf + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  // ---------- Indicadores agregados (sem nomes) ----------
  function barras(contagem) {
    var chaves = Object.keys(contagem);
    if (!chaves.length) return '<p class="vazio">Sem dados ainda.</p>';
    var max = Math.max.apply(null, chaves.map(function (k) { return contagem[k]; }));
    return chaves.sort(function (a, b) { return contagem[b] - contagem[a]; }).map(function (k) {
      var pct = Math.round((contagem[k] / max) * 100);
      return '<div class="barra-linha"><span>' + esc(k) + '</span><div class="barra" role="img" aria-label="' + esc(k) + ': ' + contagem[k] + '"><span style="width:' + pct + '%"></span></div><strong>' + contagem[k] + '</strong></div>';
    }).join('');
  }

  PEP.telas.indicadores = function (u) {
    if (!PEP.regras.podeVerIndicadores(u)) return PEP.ui.semPermissao();
    // Escopo: direção e técnico veem tudo; supervisor, só os seus grupos
    var casos = u.perfil === 'supervisor' ? PEP.regras.casosVisiveis(u) : PEP.db.casos;
    var ids = casos.map(function (c) { return c.id; });
    var sessoes = PEP.db.sessoes.filter(function (s) { return ids.indexOf(s.casoId) !== -1; });

    var porCaso = {};
    sessoes.forEach(function (s) { if (s.presenca === 'presente') porCaso[s.casoId] = (porCaso[s.casoId] || 0) + 1; });
    var atendidos = Object.keys(porCaso).length;
    var voltaram = Object.keys(porCaso).filter(function (k) { return porCaso[k] >= 2; }).length;
    var taxaRetorno = atendidos ? Math.round((voltaram / atendidos) * 100) : 0;
    var totalPresencas = Object.keys(porCaso).reduce(function (t, k) { return t + porCaso[k]; }, 0);
    var media = atendidos ? (totalPresencas / atendidos).toFixed(1).replace('.', ',') : '0';

    var motivos = {};
    casos.forEach(function (c) {
      if (c.status === 'encerrado' && c.encerramento && c.encerramento.tipo === 'abandono') {
        var m = c.encerramento.motivo || 'Não informado';
        motivos[m] = (motivos[m] || 0) + 1;
      }
    });
    var NOMES_TIPO = { alta: 'Alta', abandono: 'Abandono', encaminhamento: 'Encaminhamento externo' };
    var encerramentos = {};
    casos.forEach(function (c) {
      if (c.status === 'encerrado' && c.encerramento) {
        var tipo = NOMES_TIPO[c.encerramento.tipo] || c.encerramento.tipo;
        encerramentos[tipo] = (encerramentos[tipo] || 0) + 1;
      }
    });
    var faltas = { 'Presenças': 0, 'Faltas': 0, 'Faltas justificadas': 0 };
    sessoes.forEach(function (s) {
      if (s.presenca === 'presente') faltas['Presenças']++;
      else if (s.presenca === 'falta') faltas['Faltas']++;
      else if (s.presenca === 'falta-justificada') faltas['Faltas justificadas']++;
    });
    var risco = casos.filter(PEP.regras.emRiscoDeAbandono).length;

    return '<h1>Indicadores</h1><div class="aviso info pequeno">Dados agregados, sem identificação de pacientes.' + (u.perfil === 'supervisor' ? ' Escopo: seus grupos.' : '') + '</div>' +
      '<div class="grade">' + PEP.ui.numero(atendidos, 'pacientes atendidos') + PEP.ui.numero(taxaRetorno + '%', 'voltaram após a 1ª sessão') +
      PEP.ui.numero(media, 'sessões por paciente (média)') + PEP.ui.numero(risco, 'casos em risco de abandono agora') + '</div>' +
      '<div class="grade-2"><div class="cartao"><h2>Motivos de abandono</h2>' + barras(motivos) +
      '<p class="suave pequeno">Vem do fluxo de contato: é o dado que faltava para entender por que o paciente não volta.</p></div>' +
      '<div class="cartao"><h2>Presenças e faltas</h2>' + barras(faltas) + '</div>' +
      '<div class="cartao"><h2>Encerramentos por tipo</h2>' + barras(encerramentos) + '</div></div>';
  };

  // ---------- Técnico: pedidos de acesso ao prontuário ----------
  PEP.telas.solicitacoes = function (u) {
    if (u.perfil !== 'tecnico') return PEP.ui.semPermissao();
    var lista = PEP.db.solicitacoes.slice().sort(function (a, b) { return b.em.localeCompare(a.em); });
    var html = '<h1>Acesso do paciente ao prontuário</h1>' +
      '<div class="aviso info">O acesso é um <strong>direito do paciente</strong> (Res. CFP 05/2025, art. 13). Você organiza a entrega: confere a identidade e entrega a cópia — não decide se libera.</div>';
    if (!lista.length) return html + '<p class="vazio">Nenhum pedido.</p>';
    return html + lista.map(function (s) {
      var p = PEP.util.porId(PEP.db.pacientes, s.pacienteId);
      var passo;
      if (s.status === 'recebida') {
        passo = '<button class="botao pequeno" data-acao="conferir-identidade" data-id="' + s.id + '">1. Identidade conferida</button>';
      } else if (s.status === 'identidade-conferida') {
        passo = '<a class="botao secundario pequeno" href="#/imprimir/' + s.casoId + '">2. Gerar cópia (PDF)</a> ' +
          '<select id="forma-' + s.id + '" style="width:auto"><option>PDF por e-mail</option><option>Cópia impressa</option></select> ' +
          '<button class="botao pequeno" data-acao="marcar-entregue" data-id="' + s.id + '">3. Marcar como entregue</button>';
      } else {
        passo = '<span class="etiqueta validada">Entregue em ' + data(s.entregueEm) + ' · ' + esc(s.forma) + '</span>';
      }
      return '<div class="cartao"><div class="linha entre"><strong>' + esc(p.nome) + '</strong><span class="suave pequeno">pedido em ' + data(s.em) + '</span></div>' +
        '<div class="linha" style="margin-top:.6rem">' + passo + '</div></div>';
    }).join('');
  };

  // ---------- Paciente: meu prontuário ----------
  PEP.telas.meuProntuario = function (u) {
    if (u.perfil !== 'paciente') return PEP.ui.semPermissao();
    var pedidos = PEP.db.solicitacoes.filter(function (s) { return s.pacienteId === u.pacienteId; })
      .sort(function (a, b) { return b.em.localeCompare(a.em); });
    var aberto = pedidos.some(function (s) { return s.status !== 'entregue'; });
    var nomes = { recebida: 'Pedido recebido', 'identidade-conferida': 'Identidade conferida — preparando a cópia', entregue: 'Entregue' };
    var html = '<h1>Meu prontuário</h1><div class="cartao"><p>Você tem direito de acesso ao seu prontuário. A cópia traz a avaliação da demanda, os objetivos, as evoluções validadas, os documentos emitidos e o encerramento.</p>' +
      '<p class="suave pequeno">Para proteger você, a equipe confere sua identidade antes de entregar a cópia (em PDF ou impressa).</p>' +
      (aberto ? '<p class="etiqueta enviada">Você já tem um pedido em andamento</p>' : '<button class="botao" data-acao="solicitar-copia">Pedir cópia do meu prontuário</button>') + '</div>';
    if (pedidos.length) {
      html += '<div class="cartao"><h2>Meus pedidos</h2><ul>' + pedidos.map(function (s) {
        return '<li>' + data(s.em) + ' — ' + esc(nomes[s.status]) + (s.status === 'entregue' ? ' em ' + data(s.entregueEm) + ' (' + esc(s.forma) + ')' : '') + '</li>';
      }).join('') + '</ul></div>';
    }
    return html;
  };

  // ---------- Técnico: trilha de auditoria ----------
  PEP.telas.auditoria = function (u) {
    if (!PEP.regras.podeVerAuditoria(u)) return PEP.ui.semPermissao();
    var lista = PEP.db.auditoria.slice().reverse().slice(0, 150);
    return '<h1>Trilha de auditoria</h1><p class="suave">Quem fez o quê, quando e em qual caso. Guarda só a ação e o identificador, nunca o conteúdo clínico. ' +
      'No sistema real, este registro fica no servidor e não pode ser alterado.</p>' +
      '<div class="cartao tabela-rolagem"><table><thead><tr><th>Quando</th><th>Quem</th><th>Perfil</th><th>Ação</th><th>Alvo</th></tr></thead><tbody>' +
      lista.map(function (a) {
        var usuario = PEP.util.porId(PEP.db.usuarios, a.usuarioId);
        return '<tr><td>' + data(a.em) + '</td><td>' + esc(PEP.ui.nomeUsuario(a.usuarioId)) + '</td><td>' + esc(usuario ? PEP.regras.nomePerfil(usuario.perfil) : '—') +
          '</td><td>' + esc(a.acao) + '</td><td>' + esc(a.alvo) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  };
})();
