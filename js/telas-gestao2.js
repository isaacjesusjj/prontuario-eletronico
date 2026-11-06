/* =========================================================
   telas-gestao2.js — indicadores agregados, acesso do paciente
   ao prontuário (com link temporário), pedidos LGPD e trilha
   de auditoria com verificação de integridade.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };

  // ---------- Indicadores agregados (sem nomes) ----------
  function barras(contagem) {
    var chaves = Object.keys(contagem);
    if (!chaves.length) return '<p class="vazio">Sem dados ainda.</p>';
    var max = Math.max.apply(null, chaves.map(function (k) { return contagem[k]; })) || 1;
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

    var motivos = {}, encerramentos = {};
    var nomesTipo = {};
    PEP.lista('tiposEncerramento').forEach(function (t) { nomesTipo[t.valor] = t.nome.split(' (')[0]; });
    PEP.db.encerramentos.filter(function (e) { return ids.indexOf(e.casoId) !== -1; }).forEach(function (e) {
      if (e.tipo === 'abandono') motivos[e.motivo || 'Não informado'] = (motivos[e.motivo || 'Não informado'] || 0) + 1;
      var tipo = nomesTipo[e.tipo] || e.tipo;
      encerramentos[tipo] = (encerramentos[tipo] || 0) + 1;
    });
    var faltas = { 'Presenças': 0, 'Faltas': 0, 'Faltas justificadas': 0 };
    sessoes.forEach(function (s) {
      if (s.presenca === 'presente') faltas['Presenças']++;
      else if (s.presenca === 'falta') faltas['Faltas']++;
      else if (s.presenca === 'falta-justificada') faltas['Faltas justificadas']++;
    });
    var risco = casos.filter(PEP.regras.emRiscoDeAbandono).length;
    var fila = PEP.db.inscricoes.filter(function (i) { return i.status === 'aguardando'; });
    var esperaMedia = fila.length ? Math.round(fila.reduce(function (t, i) { return t + PEP.util.diasEntre(i.data, PEP.util.hoje()); }, 0) / fila.length) : 0;

    return '<h1>Indicadores</h1><div class="aviso info pequeno">Dados agregados, sem identificação de pacientes. São calculados na hora a partir dos registros (nada fica guardado).' + (u.perfil === 'supervisor' ? ' Escopo: seus grupos.' : '') + '</div>' +
      '<div class="grade">' + PEP.ui.numero(atendidos, 'pacientes atendidos') + PEP.ui.numero(taxaRetorno + '%', 'voltaram após a 1ª sessão') +
      PEP.ui.numero(media, 'sessões por paciente (média)') + PEP.ui.numero(risco, 'casos em risco de abandono agora') +
      (u.perfil !== 'supervisor' ? PEP.ui.numero(esperaMedia + ' dias', 'espera média na fila') : '') + '</div>' +
      '<div class="grade-2"><div class="cartao"><h2>Motivos de abandono</h2>' + barras(motivos) +
      '<p class="suave pequeno">Vem do fluxo de contato: é o dado que faltava para entender por que o paciente não volta.</p></div>' +
      '<div class="cartao"><h2>Presenças e faltas</h2>' + barras(faltas) + '</div>' +
      '<div class="cartao"><h2>Encerramentos por tipo</h2>' + barras(encerramentos) + '</div></div>';
  };

  // ---------- Técnico: pedidos de acesso ao prontuário ----------
  PEP.telas._ultimoLink = null; // mostrado uma única vez, logo depois de gerar

  function linksDaSolicitacao(s) { return PEP.db.linksAcesso.filter(function (l) { return l.solicitacaoId === s.id; }); }

  PEP.telas.solicitacoes = function (u) {
    if (u.perfil !== 'tecnico') return PEP.ui.semPermissao();
    var lista = PEP.db.solicitacoes.slice().sort(function (a, b) { return b.em.localeCompare(a.em); });
    var html = '<h1>Acesso do paciente ao prontuário</h1>' +
      '<div class="aviso info">O acesso é um <strong>direito do paciente</strong> (Res. CFP 05/2025, art. 13). Você organiza a entrega: confere a identidade e entrega a cópia — não decide se libera.</div>';
    var ul = PEP.telas._ultimoLink;
    if (ul) {
      html += '<div class="cartao destaque-sucesso" role="status"><h2>Link de leitura gerado</h2>' +
        '<p>Válido por ' + PEP.regra('linkPacienteHoras') + ' horas. Para abrir, o paciente confirma a data de nascimento. Copie agora: por segurança, o sistema guarda só o hash do link e não consegue mostrá-lo de novo.</p>' +
        '<div class="linha"><input id="link-gerado" type="text" readonly value="' + esc(ul.url) + '" aria-label="Link de leitura do prontuário">' +
        '<button class="botao pequeno" data-acao="copiar-link">Copiar</button></div>' +
        '<p class="suave pequeno">No protótipo, o link abre neste navegador (os dados ainda não estão num servidor).</p></div>';
    }
    if (!lista.length) return html + '<p class="vazio">Nenhum pedido.</p>';
    return html + lista.map(function (s) {
      var p = PEP.util.porId(PEP.db.pacientes, s.pacienteId);
      var passo;
      if (s.status === 'recebida') {
        passo = '<button class="botao pequeno" data-acao="conferir-identidade" data-id="' + s.id + '">1. Identidade conferida</button>';
      } else if (s.status === 'identidade-conferida') {
        passo = '<a class="botao secundario pequeno" href="#/imprimir/' + s.casoId + '">2. Gerar cópia (PDF)</a> ' +
          '<button class="botao secundario pequeno" data-acao="gerar-link" data-id="' + s.id + '">ou gerar link de leitura</button> ' +
          '<label class="sr-only" for="forma-' + s.id + '">Forma de entrega</label><select id="forma-' + s.id + '" style="width:auto">' + PEP.ui.opcoes(PEP.lista('formasEntrega')) + '</select> ' +
          '<button class="botao pequeno" data-acao="marcar-entregue" data-id="' + s.id + '">3. Marcar como entregue</button>';
      } else {
        passo = '<span class="etiqueta validada">Entregue em ' + data(s.entregueEm) + ' · ' + esc(s.forma) + '</span>';
      }
      var links = linksDaSolicitacao(s).map(function (l) {
        var expirado = l.revogadoEm || l.expiraEm < PEP.util.agora();
        return '<li class="pequeno">Link criado em ' + data(l.criadoEm) + ' · ' + (l.revogadoEm ? 'revogado em ' + data(l.revogadoEm) : (expirado ? 'expirou em ' : 'expira em ') + data(l.expiraEm)) +
          ' · ' + l.acessos + ' acesso(s)' + (!expirado ? ' <button class="botao secundario pequeno" data-acao="revogar-link" data-id="' + l.id + '">Revogar</button>' : '') + '</li>';
      }).join('');
      return '<div class="cartao"><div class="linha entre"><strong>' + esc(p.nome) + '</strong><span class="suave pequeno">pedido em ' + data(s.em) + '</span></div>' +
        '<div class="linha" style="margin-top:.6rem">' + passo + '</div>' + (links ? '<ul>' + links + '</ul>' : '') + '</div>';
    }).join('');
  };

  // ---------- Paciente: meu prontuário ----------
  PEP.telas.meuProntuario = function (u) {
    if (u.perfil !== 'paciente') return PEP.ui.semPermissao();
    var pedidos = PEP.db.solicitacoes.filter(function (s) { return s.pacienteId === u.pacienteId; })
      .sort(function (a, b) { return b.em.localeCompare(a.em); });
    var aberto = pedidos.some(function (s) { return s.status !== 'entregue'; });
    var nomes = PEP.lista('statusSolicitacao');
    var html = '<h1>Meu prontuário</h1><div class="cartao"><p>Você tem direito de acesso ao seu prontuário. A cópia traz a avaliação da demanda, os objetivos, a anamnese, as evoluções validadas, os documentos emitidos e o encerramento.</p>' +
      '<p class="suave pequeno">Para proteger você, a equipe confere sua identidade antes de entregar a cópia: em PDF, impressa ou por um link de leitura que vale ' + PEP.regra('linkPacienteHoras') + ' horas.</p>' +
      (aberto ? '<p class="etiqueta enviada">Você já tem um pedido em andamento</p>' : '<button class="botao" data-acao="solicitar-copia">Pedir cópia do meu prontuário</button>') + '</div>';
    if (pedidos.length) {
      html += '<div class="cartao"><h2>Meus pedidos</h2><ul>' + pedidos.map(function (s) {
        return '<li>' + data(s.em) + ' — ' + esc(nomes[s.status]) + (s.status === 'entregue' ? ' em ' + data(s.entregueEm) + ' (' + esc(s.forma) + ')' : '') + '</li>';
      }).join('') + '</ul></div>';
    }
    return html;
  };

  // ---------- Técnico: pedidos dos titulares (LGPD, art. 18) ----------
  PEP.telas.pedidosLgpd = function (u) {
    if (!PEP.regras.podeAtenderTitular(u)) return PEP.ui.semPermissao();
    var prazo = PEP.regra('prazoRespostaTitularDias');
    var tipos = {};
    PEP.lista('tiposPedidoTitular').forEach(function (t) { tipos[t.valor] = t.nome; });
    var lista = PEP.db.pedidosTitular.slice().sort(function (a, b) { return b.em.localeCompare(a.em); });
    var html = '<h1>Pedidos dos titulares (LGPD)</h1><p class="suave">Pedidos feitos pelos pacientes sobre os próprios dados (LGPD, art. 18). Prazo de resposta adotado: ' + prazo + ' dias (art. 19, II). ' +
      'No sistema real, quem responde é o encarregado de dados; aqui, a psicóloga técnica faz esse papel.</p>';
    if (!lista.length) return html + '<p class="vazio">Nenhum pedido.</p>';
    return html + lista.map(function (p) {
      var titular = p.titularTipo === 'paciente' ? PEP.util.porId(PEP.db.pacientes, p.titularId) : PEP.util.porId(PEP.db.usuarios, p.titularId);
      var limite = PEP.util.somarDias(p.em.slice(0, 10), prazo);
      var restam = PEP.util.diasEntre(PEP.util.hoje(), limite);
      var etiqueta = p.status === 'respondido' ? '<span class="etiqueta validada">respondido em ' + data(p.respondidoEm) + '</span>' :
        (restam < 0 ? '<span class="etiqueta perigo">prazo vencido</span>' : '<span class="etiqueta alerta">responder até ' + data(limite) + '</span>');
      var corpo = '<p><strong>' + esc(tipos[p.tipo] || p.tipo) + '</strong><br>' + esc(p.descricao) + '</p>';
      if (p.status === 'respondido') corpo += '<div class="adendo"><strong>Resposta</strong> (' + esc(PEP.ui.nomeUsuario(p.respondidoPor)) + '): ' + esc(p.resposta) + '</div>';
      else corpo += '<div class="campo"><label for="resp-' + p.id + '">Resposta ao titular</label><textarea id="resp-' + p.id + '" style="min-height:70px"></textarea></div>' +
        '<button class="botao pequeno" data-acao="responder-titular" data-id="' + p.id + '">Registrar resposta</button>';
      return '<div class="cartao"><div class="linha entre"><span><strong>' + esc(titular ? titular.nome : p.titularId) + '</strong> · ' + data(p.em) + '</span>' + etiqueta + '</div>' + corpo + '</div>';
    }).join('');
  };

  // ---------- Técnico: trilha de auditoria ----------
  PEP.telas._verificacao = null;

  PEP.telas.auditoria = function (u) {
    if (!PEP.regras.podeVerAuditoria(u)) return PEP.ui.semPermissao();
    var lista = PEP.db.auditoria.slice().reverse().slice(0, 200);
    var v = PEP.telas._verificacao;
    var resultado = '';
    if (v) {
      resultado = v.ok ? '<div class="aviso info" role="status"><strong>Cadeia íntegra.</strong> ' + v.total + ' eventos conferidos: nenhum foi alterado ou apagado.</div>' :
        '<div class="aviso perigo" role="alert"><strong>Cadeia quebrada no evento ' + (v.quebraEm + 1) + ' de ' + v.total + '</strong> (' + esc(v.evento.id) + ', ' + data(v.evento.em) + '). ' +
        'Esse evento ou o anterior foi alterado ou apagado depois de gravado.</div>';
    }
    return '<h1>Trilha de auditoria</h1><p class="suave">Quem fez o quê, quando e em qual caso. Guarda só a ação e o identificador, nunca o conteúdo clínico nem senhas. ' +
      'Cada evento leva o hash SHA-256 do anterior: se alguém mexer num evento, a verificação acusa.</p>' +
      '<div class="linha" style="margin-bottom:1rem"><button class="botao" data-acao="verificar-auditoria">Verificar integridade</button>' +
      '<span class="suave pequeno">' + PEP.db.auditoria.length + ' eventos · último hash: <span class="codigo">' + esc((PEP.db.auditoria[PEP.db.auditoria.length - 1] || {}).hash ? PEP.db.auditoria[PEP.db.auditoria.length - 1].hash.slice(0, 16) + '…' : '—') + '</span></span></div>' +
      resultado +
      '<div class="cartao tabela-rolagem"><table><caption class="sr-only">Eventos de auditoria, do mais recente para o mais antigo</caption><thead><tr><th scope="col">Quando</th><th scope="col">Quem</th><th scope="col">Perfil</th><th scope="col">Ação</th><th scope="col">Alvo</th><th scope="col">Hash</th></tr></thead><tbody>' +
      lista.map(function (a) {
        var usuario = PEP.util.porId(PEP.db.usuarios, a.usuarioId);
        return '<tr><td>' + data(a.em) + '</td><td>' + esc(PEP.ui.nomeUsuario(a.usuarioId)) + '</td><td>' + esc(usuario ? PEP.regras.nomePerfil(usuario.perfil) : '—') +
          '</td><td>' + esc(a.acao) + '</td><td>' + esc(a.alvo) + '</td><td class="codigo pequeno">' + esc(String(a.hash || '').slice(0, 10)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  };
})();
