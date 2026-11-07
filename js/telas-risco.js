/* =========================================================
   telas-risco.js — risco e segurança: avaliação de risco,
   ciência da supervisão, notificação compulsória e plano de
   segurança (aba do caso); "Meu plano de segurança" (portal
   do paciente); trecho de risco da cópia do prontuário.

   Base: Res. CFP 05/2025, art. 7º, III (notificação feita pelo
   supervisor); Código de Ética, arts. 9º, 10 e 13 (sigilo, seus
   limites e o essencial ao responsável); Safety Planning
   Intervention (Stanley e Brown) para o plano de segurança.
   As leis de cada notificação ficam em _config.listas.notificacoes.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };
  var R = function () { return PEP.regras; };

  function nomeEm(lista, id) {
    var x = PEP.lista(lista).filter(function (i) { return i.id === id; })[0];
    return x ? (x.nome || x.orgao) : id;
  }
  var CLASSE_NIVEL = { baixo: 'enviada', moderado: 'alerta', alto: 'perigo' };
  function etiquetaNivel(n) { return '<span class="etiqueta ' + (CLASSE_NIVEL[n] || '') + '">Risco ' + esc(nomeEm('niveisRisco', n).toLowerCase()) + '</span>'; }
  function etiquetaSituacao(r) {
    var s = R().situacaoRisco(r);
    if (s === 'aguardando-ciencia') return '<span class="etiqueta perigo">Aguardando ciência da supervisão</span>';
    if (s === 'acompanhamento') return '<span class="etiqueta alerta">Em acompanhamento</span>';
    return '<span class="etiqueta rascunho">Acompanhamento encerrado</span>';
  }

  // Contatos de urgência (do JSON). Com link "tel:", um toque no celular já liga.
  PEP.telas.contatosUrgencia = function (compacto) {
    var l = PEP.lista('contatosUrgencia');
    if (compacto) return l.map(function (c) { return '<a href="tel:' + esc(c.numero) + '"><strong>' + esc(c.numero) + '</strong></a> ' + esc(c.curto); }).join(' · ');
    return '<ul class="lista-urgencia">' + l.map(function (c) {
      return '<li><a class="numero-urgencia" href="tel:' + esc(c.numero) + '">' + esc(c.numero) + '</a> <span><strong>' + esc(c.nome) + '</strong><br>' +
        '<span class="suave pequeno">' + esc(c.quando) + '</span></span></li>';
    }).join('') + '</ul>';
  };

  // ---------- Formulário: nova avaliação de risco ----------
  function formularioRisco(caso) {
    var tipos = PEP.lista('tiposRisco').map(function (t) { return { valor: t.id, nome: t.nome }; });
    return '<details class="cartao" id="form-risco"><summary><strong>Registrar avaliação de risco</strong></summary>' +
      '<div class="campo" style="margin-top:.6rem"><label for="rk-tipo">Tipo de risco</label><select id="rk-tipo">' + PEP.ui.opcoes(tipos) + '</select></div>' +
      '<fieldset class="caixa-campos"><legend class="pequeno"><strong>Nível e o que fazer</strong></legend>' +
      PEP.lista('niveisRisco').map(function (n) {
        return '<label class="check"><input type="radio" name="rk-nivel" id="rk-nivel-' + n.id + '" value="' + n.id + '"' + (n.id === 'moderado' ? ' checked' : '') + '> ' +
          '<span><strong>' + esc(n.nome) + ':</strong> ' + esc(n.orientacao) + '</span></label>';
      }).join('') + '</fieldset>' +
      '<div class="campo"><label for="rk-desc">O que foi observado ou dito *</label>' +
      '<span class="dica" id="rk-desc-dica">O essencial: o que motivou a avaliação, fatores de risco e de proteção. Sem detalhes íntimos: o paciente pode ler o prontuário.</span>' +
      '<textarea id="rk-desc" maxlength="' + PEP.regra('riscoDescricaoMaxCaracteres') + '" aria-describedby="rk-desc-dica" style="min-height:90px"></textarea></div>' +
      '<fieldset class="caixa-campos"><legend class="pequeno"><strong>Condutas tomadas</strong></legend>' +
      PEP.lista('condutasRisco').map(function (c) {
        return '<label class="check"><input type="checkbox" id="rk-c-' + c.id + '"> <span>' + esc(c.nome) + '</span></label>';
      }).join('') + '</fieldset>' +
      '<button class="botao pequeno" data-acao="registrar-risco" data-caso="' + caso.id + '">Registrar e avisar a supervisão</button></details>';
  }

  // ---------- Notificação compulsória (só o supervisor registra) ----------
  function formularioNotificacao(caso, r) {
    var sugeridas = R().notificacoesSugeridas(r, PEP.ui.pacienteDoCaso(caso));
    var opcoes = PEP.lista('notificacoes').map(function (n) {
      return '<option value="' + esc(n.id) + '">' + esc(n.orgao) + (sugeridas.indexOf(n.id) !== -1 ? ' (pode se aplicar)' : '') + '</option>';
    }).join('');
    return '<details style="margin-top:.6rem"><summary>Registrar notificação compulsória</summary>' +
      '<p class="suave pequeno" style="margin-top:.5rem">O sistema não decide: a supervisão avalia se a lei exige e faz a notificação (Res. CFP 05/2025, art. 7º, III). ' +
      'Na notificação vai só o necessário (Código de Ética, arts. 10 e 12).</p>' +
      '<div class="tabela-rolagem"><table class="pequeno"><caption class="sr-only">Quando cada notificação é exigida</caption><thead><tr><th scope="col">Órgão</th><th scope="col">Quando</th><th scope="col">Fundamento e prazo</th></tr></thead><tbody>' +
      PEP.lista('notificacoes').map(function (n) {
        return '<tr><td>' + esc(n.orgao) + (sugeridas.indexOf(n.id) !== -1 ? ' <span class="etiqueta alerta">pode se aplicar</span>' : '') + '</td><td>' + esc(n.quando) + '</td><td>' + esc(n.fundamento) + '. ' + esc(n.prazo) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="grade-2"><div class="campo"><label for="nt-orgao-' + r.id + '">Órgão notificado</label><select id="nt-orgao-' + r.id + '">' + opcoes + '</select></div>' +
      '<div class="campo"><label for="nt-prot-' + r.id + '">Protocolo (se houver)</label><input id="nt-prot-' + r.id + '" type="text" maxlength="80"></div></div>' +
      '<div class="campo"><label for="nt-obs-' + r.id + '">Observação</label><input id="nt-obs-' + r.id + '" type="text" maxlength="200"></div>' +
      '<button class="botao pequeno" data-acao="registrar-notificacao" data-id="' + r.id + '">Registrar notificação</button></details>';
  }

  function cartaoRisco(u, caso, r) {
    var notifs = R().notificacoesDoRisco(r);
    var html = '<div class="cartao evolucao' + (r.encerradoEm ? '' : ' devolvida') + '"><div class="linha entre"><strong>' + data(r.em) + ' · ' + esc(nomeEm('tiposRisco', r.tipo)) + '</strong>' +
      '<span class="linha">' + etiquetaNivel(r.nivel) + etiquetaSituacao(r) + '</span></div>' +
      '<div class="texto">' + esc(r.descricao) + '</div>' +
      ((r.condutas || []).length ? '<p class="pequeno"><strong>Condutas:</strong> ' + r.condutas.map(function (c) { return esc(nomeEm('condutasRisco', c)); }).join('; ') + '.</p>' : '') +
      '<p class="suave pequeno">Registrado por ' + esc(PEP.ui.nomeUsuario(r.registradoPor)) +
      (r.cienciaEm ? ' · ciência da supervisão: ' + esc(PEP.ui.nomeUsuario(r.cienciaPor)) + ' em ' + data(r.cienciaEm) : '') + '</p>';
    html += notifs.map(function (n) {
      var info = PEP.lista('notificacoes').filter(function (x) { return x.id === n.orgao; })[0] || {};
      return '<div class="adendo"><strong>Notificação:</strong> ' + esc(info.orgao || n.orgao) + ' · ' + esc(info.fundamento || '') + ' · ' + data(n.em) +
        ' · ' + esc(PEP.ui.nomeUsuario(n.registradoPor)) + (n.protocolo ? ' · protocolo ' + esc(n.protocolo) : '') + (n.observacao ? '<br>' + esc(n.observacao) : '') + '</div>';
    }).join('');
    if (r.encerradoEm) {
      html += '<div class="adendo"><strong>Acompanhamento encerrado</strong> em ' + data(r.encerradoEm) + ' por ' + esc(PEP.ui.nomeUsuario(r.encerradoPor)) + ': ' + esc(r.encerramentoNota) + '</div>';
    }
    if (!r.cienciaEm && R().podeDarCiencia(u, caso)) {
      html += '<div class="linha" style="margin-top:.6rem"><button class="botao pequeno" data-acao="dar-ciencia-risco" data-id="' + r.id + '">Dar ciência (supervisão)</button></div>';
    }
    if (!r.encerradoEm && R().podeNotificar(u, caso)) html += formularioNotificacao(caso, r);
    if (r.cienciaEm && !r.encerradoEm && R().podeEncerrarRisco(u, caso)) {
      html += '<details style="margin-top:.6rem"><summary>Encerrar o acompanhamento deste risco</summary>' +
        '<div class="campo" style="margin-top:.5rem"><label for="rk-nota-' + r.id + '">Por que pode ser encerrado</label><textarea id="rk-nota-' + r.id + '" style="min-height:60px" maxlength="500"></textarea></div>' +
        '<button class="botao secundario pequeno" data-acao="encerrar-risco" data-id="' + r.id + '">Encerrar acompanhamento</button></details>';
    }
    return html + '</div>';
  }

  // ---------- Plano de segurança ----------
  function camposDoPlano(p) {
    return '<dl class="plano">' + PEP.lista('camposPlanoSeguranca').map(function (c) {
      return '<dt>' + esc(c.nome) + '</dt><dd>' + esc((p && p[c.id]) || '—') + '</dd>';
    }).join('') + '</dl>';
  }

  function cartaoPlano(u, caso) {
    var p = R().planoAtual(caso), versoes = R().planosDoCaso(caso);
    var assinaturas = p ? R().assinaturasDe('plano', p.id) : [];
    var html = '<div class="cartao" id="plano"><div class="linha entre"><h2>Plano de segurança</h2>' +
      (p ? '<span class="suave pequeno">Versão ' + p.versao + ' · ' + esc(PEP.ui.nomeUsuario(p.autorId)) + ' em ' + data(p.em) + '</span>' : '') + '</div>' +
      '<p class="suave pequeno">Feito na sessão, junto com o paciente e nas palavras dele. O paciente consulta a versão atual no portal ("Meu plano de segurança"). ' +
      'Estrutura da intervenção de plano de segurança de Stanley e Brown.</p>';
    html += p ? camposDoPlano(p) : '<p class="vazio">Nenhum plano de segurança registrado.</p>';
    if (assinaturas.length) html += '<div class="assinaturas">Assinado por: ' + assinaturas.map(function (a) { return esc(PEP.ui.nomeUsuario(a.usuarioId)) + ' (supervisão) em ' + data(a.em); }).join(' · ') + '</div>';
    if (p && R().ehSupervisorDoCaso(u, caso) && !R().assinadoPeloSupervisor('plano', p.id)) {
      html += '<button class="botao pequeno" style="margin-top:.6rem" data-acao="assinar-plano" data-id="' + p.id + '">Assinar versão ' + p.versao + ' (supervisão)</button>';
    }
    if (R().podeEditarPlano(u, caso)) {
      var max = PEP.regra('planoCampoMaxCaracteres');
      var servicosPadrao = 'Clínica-escola, no horário de funcionamento; CVV 188 (24 horas); SAMU 192; UPA ou CAPS mais perto.';
      html += '<details style="margin-top:.8rem"><summary><strong>' + (p ? 'Revisar o plano (nova versão)' : 'Fazer o plano de segurança') + '</strong></summary>' +
        '<div id="form-plano" style="margin-top:.5rem">' + PEP.lista('camposPlanoSeguranca').map(function (c) {
          var valor = p ? p[c.id] : (c.id === 'servicos' ? servicosPadrao : '');
          return '<div class="campo"><label for="pl-' + c.id + '">' + esc(c.nome) + '</label><span class="dica" id="pl-' + c.id + '-dica">' + esc(c.pergunta) + '</span>' +
            '<textarea id="pl-' + c.id + '" style="min-height:60px" maxlength="' + max + '" aria-describedby="pl-' + c.id + '-dica">' + esc(valor || '') + '</textarea></div>';
        }).join('') +
        '<label class="check"><input type="checkbox" id="pl-revisado"> <span>O plano foi feito (ou revisado) junto com o paciente, nesta sessão. *</span></label>' +
        '<button class="botao pequeno" data-acao="salvar-plano" data-caso="' + caso.id + '">Salvar ' + (p ? 'nova versão' : 'plano') + '</button></div></details>';
    }
    if (versoes.length > 1) {
      html += '<details style="margin-top:.8rem"><summary>Versões anteriores (' + (versoes.length - 1) + ')</summary>' +
        versoes.slice(0, -1).reverse().map(function (v) {
          return '<div class="adendo"><strong>Versão ' + v.versao + '</strong> · ' + esc(PEP.ui.nomeUsuario(v.autorId)) + ' em ' + data(v.em) + camposDoPlano(v) + '</div>';
        }).join('') + '</details>';
    }
    return html + '</div>';
  }

  // ---------- Aba do caso ----------
  PEP.telas.abaRisco = function (u, caso) {
    var riscos = R().riscosDoCaso(caso);
    var html = '<div class="aviso perigo pequeno" role="note"><strong>Urgência:</strong> ' + PEP.telas.contatosUrgencia(true) +
      '. Diante de risco iminente, não deixe a pessoa sozinha e acione a supervisão.</div>';
    if (R().podeRegistrarRisco(u, caso)) html += formularioRisco(caso);
    html += '<h2>Avaliações de risco</h2>' + (riscos.length ? riscos.map(function (r) { return cartaoRisco(u, caso, r); }).join('') : '<p class="vazio">Nenhuma avaliação de risco registrada.</p>');
    return html + cartaoPlano(u, caso);
  };

  // ---------- Portal do paciente: meu plano de segurança ----------
  PEP.telas.meuPlano = function (u) {
    if (u.perfil !== 'paciente') return PEP.ui.semPermissao();
    var p = null;
    PEP.db.casos.filter(function (c) { return c.pacienteId === u.pacienteId; }).forEach(function (c) {
      var x = R().planoAtual(c);
      if (x && (!p || x.em > p.em)) p = x;
    });
    var html = '<h1>Meu plano de segurança</h1><div class="cartao"><h2>Se você estiver em perigo agora</h2>' + PEP.telas.contatosUrgencia(false) + '</div>';
    if (!p) return html + '<div class="cartao"><p>Você ainda não tem um plano de segurança. Se for preciso, ele é feito com você, na sessão, por quem te atende.</p></div>';
    return html + '<div class="cartao plano-paciente"><h2>O que combinamos</h2><p class="suave pequeno">Feito com você em ' + data(p.em) + ' (versão ' + p.versao + '). ' +
      'Leia quando sentir que uma crise está começando e siga os passos na ordem.</p>' + camposDoPlano(p) + '</div>' +
      '<div class="linha nao-imprimir"><button class="botao secundario" data-acao="imprimir-plano">Imprimir o plano</button></div>';
  };

  // ---------- Trecho de risco na cópia do prontuário ----------
  // Devolve { html, omitidos }: na cópia de criança ou adolescente, relato de violência e
  // notificação ficam de fora (Código de Ética, art. 13), sem aviso no próprio documento.
  PEP.telas.riscoNaCopia = function (caso) {
    var paciente = PEP.ui.pacienteDoCaso(caso);
    var todos = R().riscosDoCaso(caso).slice().reverse();
    var riscos = todos.filter(function (r) { return !R().riscoProtegidoNaCopia(r, paciente); });
    var menor = PEP.util.idade(paciente.dataNascimento) < 18;
    // omitidos = avaliações protegidas + (se menor) todas as notificações
    var omitidos = (todos.length - riscos.length) + (menor ? todos.reduce(function (t, r) { return t + R().notificacoesDoRisco(r).length; }, 0) : 0);
    var plano = R().planoAtual(caso);
    var html = '';
    if (riscos.length) {
      html += '<h2>Avaliações de risco e condutas</h2>' + riscos.map(function (r) {
        var notifs = menor ? [] : R().notificacoesDoRisco(r);
        return '<div style="margin-bottom:.8rem"><strong>' + data(r.em) + ' · ' + esc(nomeEm('tiposRisco', r.tipo)) + ' · nível ' + esc(nomeEm('niveisRisco', r.nivel).toLowerCase()) + '</strong><br>' +
          esc(r.descricao) + ((r.condutas || []).length ? '<br>Condutas: ' + r.condutas.map(function (c) { return esc(nomeEm('condutasRisco', c)); }).join('; ') + '.' : '') +
          notifs.map(function (n) { return '<br>Notificação: ' + esc(nomeEm('notificacoes', n.orgao)) + ' em ' + data(n.em) + '.'; }).join('') +
          (r.encerradoEm ? '<br>Acompanhamento encerrado em ' + data(r.encerradoEm) + ': ' + esc(r.encerramentoNota) : '') + '</div>';
      }).join('');
    }
    if (plano) html += '<h2>Plano de segurança (versão ' + plano.versao + ', ' + data(plano.em) + ')</h2>' + camposDoPlano(plano);
    return { html: html, omitidos: omitidos };
  };
})();
