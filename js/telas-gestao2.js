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

  // Com o banco ligado, os números vêm prontos de app.indicadores() (a direção não lê tabelas clínicas)
  PEP.telas._indicadoresRemotos = null;
  PEP.telas.indicadoresAtuais = function (u) {
    return PEP.repo.adaptador().remoto ? PEP.telas._indicadoresRemotos : PEP.regras.indicadores(u);
  };

  PEP.telas.indicadores = function (u) {
    if (!PEP.regras.podeVerIndicadores(u)) return PEP.ui.semPermissao();
    var ind = PEP.telas.indicadoresAtuais(u);
    if (!ind) return '<h1>Indicadores</h1><p class="vazio" role="status">Carregando os indicadores do servidor…</p>';
    var nomesTipo = {}, encerramentos = {};
    PEP.lista('tiposEncerramento').forEach(function (t) { nomesTipo[t.valor] = t.nome.split(' (')[0]; });
    Object.keys(ind.encerramentos || {}).forEach(function (k) { encerramentos[nomesTipo[k] || k] = ind.encerramentos[k]; });
    var motivos = ind.motivosAbandono || {};
    var faltas = { 'Presenças': ind.presencas.presente, 'Faltas': ind.presencas.falta, 'Faltas justificadas': ind.presencas.faltaJustificada };
    var nomesFalta = {}, avisadas = {};
    PEP.lista('motivosFaltaPaciente').forEach(function (m) { nomesFalta[m.id] = m.nome; });
    Object.keys(ind.motivosFaltaAvisada || {}).forEach(function (k) { avisadas[nomesFalta[k] || k] = ind.motivosFaltaAvisada[k]; });
    var media = Number(ind.mediaSessoes || 0).toFixed(1).replace('.', ',');

    return '<h1>Indicadores</h1><div class="aviso info pequeno">Dados agregados, sem identificação de pacientes. São calculados na hora a partir dos registros (nada fica guardado).' + (u.perfil === 'supervisor' ? ' Escopo: seus grupos.' : '') + '</div>' +
      PEP.ui.numeros([[ind.atendidos, 'pacientes atendidos'], [ind.taxaRetorno + '%', 'voltaram após a 1ª sessão'],
        [media, 'sessões por paciente (média)'], [ind.emRisco, 'casos em risco de abandono agora']]
        .concat(u.perfil !== 'supervisor' ? [[ind.esperaMediaDias + ' dias', 'espera média na fila']] : [])) +
      (ind.porMes ? '<div class="cartao">' + PEP.grafico.atendimentosPorMes(ind.porMes) + '</div>' : '') +
      '<div class="grade-2"><div class="cartao"><h2>Motivos de abandono</h2>' + barras(motivos) +
      '<p class="suave pequeno">Vem do fluxo de contato: é o dado que faltava para entender por que o paciente não volta.</p></div>' +
      '<div class="cartao"><h2>Presenças e faltas</h2>' + barras(faltas) + '</div>' +
      '<div class="cartao"><h2>Por que o paciente avisou que não iria</h2>' + barras(avisadas) +
      '<p class="suave pequeno">Vem do "Não vou poder ir" do portal: mostra o que atrapalha a frequência antes de virar abandono.</p></div>' +
      '<div class="cartao"><h2>Encerramentos por tipo</h2>' + barras(encerramentos) + '</div></div>';
  };

  // ---------- Técnico: pedidos de acesso ao prontuário ----------
  PEP.telas._ultimoLink = null; // mostrado uma única vez, logo depois de gerar

  function linksDaSolicitacao(s) { return PEP.db.linksAcesso.filter(function (l) { return l.solicitacaoId === s.id; }); }

  // "Pedidos" da técnica: os dois tipos de pedido do paciente ficam juntos, com um seletor no topo
  function seletorPedidos(atual) {
    var abertos = PEP.db.solicitacoes.filter(function (s) { return s.status !== 'entregue'; }).length;
    var lgpd = PEP.db.pedidosTitular.filter(function (p) { return p.status === 'aberto'; }).length;
    var item = function (rota, nome, n) {
      return '<a href="#/' + rota + '"' + (rota === atual ? ' class="ativo" aria-current="page"' : '') + '>' + nome + (n ? ' (' + n + ')' : '') + '</a>';
    };
    return '<nav class="seletor" aria-label="Tipos de pedido" style="margin-bottom:1rem">' + item('solicitacoes', 'Cópia do prontuário', abertos) + item('pedidos-lgpd', 'Direitos LGPD', lgpd) + '</nav>';
  }

  PEP.telas.solicitacoes = function (u) {
    if (u.perfil !== 'tecnico') return PEP.ui.semPermissao();
    var lista = PEP.db.solicitacoes.slice().sort(function (a, b) { return b.em.localeCompare(a.em); });
    var html = '<h1>Pedidos dos pacientes</h1>' + seletorPedidos('solicitacoes') +
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
      return '<div class="cartao"><div class="linha entre"><strong>' + esc(PEP.ui.nomePaciente(p, p.id)) + '</strong><span class="suave pequeno">pedido em ' + data(s.em) + '</span></div>' +
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
    var html = '<h1>Pedidos dos pacientes</h1>' + (u.perfil === 'tecnico' ? seletorPedidos('pedidos-lgpd') : '') + '<p class="suave">Pedidos feitos pelos pacientes sobre os próprios dados (LGPD, art. 18). Prazo de resposta adotado: ' + prazo + ' dias (art. 19, II). ' +
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
      var nomeTitular = !titular ? p.titularId : (p.titularTipo === 'paciente' ? PEP.ui.nomePaciente(titular, titular.id) : titular.nome);
      return '<div class="cartao"><div class="linha entre"><span><strong>' + esc(nomeTitular) + '</strong> · ' + data(p.em) + '</span>' + etiqueta + '</div>' + corpo + '</div>';
    }).join('');
  };

  // ---------- Técnico: trilha de auditoria ----------
  PEP.telas._verificacao = null;

  // Filtro da trilha (ação ou alvo, usuário e período); a planilha (CSV) sai com o mesmo filtro
  PEP.telas._filtroAuditoria = null;
  PEP.telas.auditoriaFiltrada = function () {
    var f = PEP.telas._filtroAuditoria || {}, t = PEP.revisor.normalizar(f.texto || '');
    return PEP.db.auditoria.filter(function (a) {
      if (t && PEP.revisor.normalizar(a.acao + ' ' + a.alvo).indexOf(t) === -1) return false;
      if (f.usuario && a.usuarioId !== f.usuario) return false;
      if (f.de && String(a.em).slice(0, 10) < f.de) return false;
      if (f.ate && String(a.em).slice(0, 10) > f.ate) return false;
      return true;
    });
  };
  function formularioFiltroAuditoria() {
    var f = PEP.telas._filtroAuditoria || {};
    var ids = [];
    PEP.db.auditoria.forEach(function (a) { if (ids.indexOf(a.usuarioId) === -1) ids.push(a.usuarioId); });
    var opcoes = '<option value="">Todos</option>' + ids.map(function (id) {
      return '<option value="' + esc(id) + '"' + (f.usuario === id ? ' selected' : '') + '>' + esc(PEP.ui.nomeUsuario(id)) + '</option>';
    }).join('');
    return '<form class="cartao" data-form="filtrar-auditoria" novalidate><h2>Filtrar</h2><div class="grade-2">' +
      '<div class="campo"><label for="fa-texto">Ação ou alvo contém</label><input id="fa-texto" name="texto" type="search" maxlength="60" value="' + esc(f.texto || '') + '"></div>' +
      '<div class="campo"><label for="fa-usuario">Usuário</label><select id="fa-usuario" name="usuario">' + opcoes + '</select></div>' +
      '<div class="campo"><label for="fa-de">De</label><input id="fa-de" name="de" type="date" value="' + esc(f.de || '') + '"></div>' +
      '<div class="campo"><label for="fa-ate">Até</label><input id="fa-ate" name="ate" type="date" value="' + esc(f.ate || '') + '"></div></div>' +
      '<div class="linha"><button class="botao secundario" type="submit">Filtrar</button>' +
      (PEP.telas._filtroAuditoria ? '<button type="button" class="botao secundario" data-acao="limpar-filtro-auditoria">Limpar filtro</button>' : '') +
      '<button type="button" class="botao secundario" data-acao="exportar-auditoria">Exportar planilha (CSV)</button></div></form>';
  }

  PEP.telas.auditoria = function (u) {
    if (!PEP.regras.podeVerAuditoria(u)) return PEP.ui.semPermissao();
    var filtrada = PEP.telas.auditoriaFiltrada();
    var lista = filtrada.slice().reverse().slice(0, 200);
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
      resultado + formularioFiltroAuditoria() +
      '<p class="suave pequeno" role="status">' + filtrada.length + ' evento(s)' + (PEP.telas._filtroAuditoria ? ' com este filtro' : '') +
      (filtrada.length > 200 ? '; a tabela mostra os 200 mais recentes (a planilha leva todos)' : '') + '.</p>' +
      '<div class="cartao tabela-rolagem"><table><caption class="sr-only">Eventos de auditoria, do mais recente para o mais antigo</caption><thead><tr><th scope="col">Quando</th><th scope="col">Quem</th><th scope="col">Perfil</th><th scope="col">Ação</th><th scope="col">Alvo</th><th scope="col">Hash</th></tr></thead><tbody>' +
      lista.map(function (a) {
        var usuario = PEP.util.porId(PEP.db.usuarios, a.usuarioId);
        return '<tr><td>' + data(a.em) + '</td><td>' + esc(PEP.ui.nomeUsuario(a.usuarioId)) + '</td><td>' + esc(usuario ? PEP.regras.nomePerfil(usuario.perfil) : '—') +
          '</td><td>' + esc(a.acao) + '</td><td>' + esc(a.alvo) + '</td><td class="codigo pequeno">' + esc(String(a.hash || '').slice(0, 10)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  };
})();
