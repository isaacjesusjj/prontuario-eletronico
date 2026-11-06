/* =========================================================
   telas-caso-extra.js — prontuário do caso (parte 2):
   sessões, faltas e lembretes; documentos e anexos (upload
   real); área restrita; supervisão; encerramento; cópia.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };
  var R = function () { return PEP.regras; };

  var CLASSE_PRESENCA = { presente: 'validada', falta: 'perigo', 'falta-justificada': 'alerta', agendada: 'enviada', cancelada: 'rascunho' };
  function nomePresenca(p) { return p === 'cancelada' ? 'Cancelada' : (PEP.lista('presencas')[p] || p); }

  // ---------- Aba: sessões e faltas ----------
  function abaSessoes(u, caso) {
    var sessoes = PEP.db.sessoes.filter(function (s) { return s.casoId === caso.id; })
      .sort(function (a, b) { return (b.data + b.hora).localeCompare(a.data + a.hora); });
    var pode = R().podeRegistrarPresenca(u, caso);
    var lembretesOk = R().consentiu(caso, 'lembretes');
    var hoje = PEP.util.hoje();
    var html = '';

    // Fluxo de abandono: aparece com N faltas seguidas sem justificativa (N vem do JSON)
    var contatos = PEP.db.contatos.filter(function (c) { return c.casoId === caso.id; });
    if (R().emRiscoDeAbandono(caso)) {
      html += '<div class="cartao destaque-alerta"><h2>Fluxo de abandono</h2>' +
        '<p>' + R().faltasSeguidas(caso) + ' faltas seguidas sem justificativa. Antes de liberar a vaga, registre a tentativa de contato e o motivo — é esse dado que mostra <em>por que</em> os pacientes não voltam.</p>';
      if (pode) {
        html += '<div class="grade-2">' +
          '<div class="campo"><label for="ct-canal">Canal</label><select id="ct-canal">' + PEP.ui.opcoes(PEP.lista('canaisContato')) + '</select></div>' +
          '<div class="campo"><label for="ct-resultado">Resultado</label><select id="ct-resultado">' + PEP.ui.opcoes(PEP.lista('resultadosContato')) + '</select></div></div>' +
          '<div class="campo"><label for="ct-motivo">Motivo informado (se houver)</label><select id="ct-motivo"><option value="">Não informado</option>' +
          PEP.ui.opcoes(PEP.lista('motivosAbandono')) + '</select></div>' +
          '<div class="linha"><button class="botao pequeno" data-acao="registrar-contato" data-caso="' + caso.id + '">Registrar tentativa de contato</button>' +
          '<button class="botao perigo pequeno" data-acao="encerrar-abandono" data-caso="' + caso.id + '">Encerrar por abandono e liberar a vaga</button></div>';
      }
      html += '</div>';
    }

    if (contatos.length) {
      html += '<div class="cartao"><h2>Tentativas de contato</h2><div class="tabela-rolagem"><table><thead><tr><th scope="col">Data</th><th scope="col">Canal</th><th scope="col">Resultado</th><th scope="col">Motivo</th><th scope="col">Por</th></tr></thead><tbody>' +
        contatos.map(function (c) {
          return '<tr><td>' + data(c.em) + '</td><td>' + esc(c.canal) + '</td><td>' + esc(c.resultado) + '</td><td>' + esc(c.motivo || '—') + '</td><td>' + esc(PEP.ui.nomeUsuario(c.registradoPor)) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }

    html += '<div class="cartao"><h2>Sessões</h2><div class="tabela-rolagem"><table><thead><tr><th scope="col">Data</th><th scope="col">Hora</th><th scope="col">Presença</th><th scope="col">Ações</th></tr></thead><tbody>' +
      sessoes.map(function (s) {
        var acoes = '';
        if (pode && s.presenca === 'agendada') {
          acoes = ['presente', 'falta', 'falta-justificada'].map(function (v) {
            return '<button class="botao secundario pequeno" data-acao="registrar-presenca" data-id="' + s.id + '" data-valor="' + v + '">' + nomePresenca(v) + '</button>';
          }).join(' ');
          if (s.data >= hoje && lembretesOk) {
            acoes += ' <button class="botao secundario pequeno" data-acao="lembrete" data-canal="whatsapp" data-id="' + s.id + '">Lembrete WhatsApp</button>' +
              ' <button class="botao secundario pequeno" data-acao="lembrete" data-canal="email" data-id="' + s.id + '">Lembrete e-mail</button>';
          }
        }
        var enviados = PEP.db.lembretes.filter(function (l) { return l.sessaoId === s.id; }).length;
        return '<tr><td>' + data(s.data) + '</td><td>' + esc(s.hora) + '</td><td><span class="etiqueta ' + CLASSE_PRESENCA[s.presenca] + '">' + nomePresenca(s.presenca) + '</span>' +
          (s.presenca === 'agendada' && s.confirmada ? ' <span class="suave pequeno">confirmada pelo paciente</span>' : '') +
          (s.presenca === 'agendada' && s.data < hoje ? ' <span class="etiqueta alerta">presença pendente</span>' : '') +
          (enviados ? ' <span class="suave pequeno">· ' + enviados + ' lembrete(s)</span>' : '') + '</td><td><div class="linha">' + acoes + '</div></td></tr>';
      }).join('') + '</tbody></table></div>';

    if (!lembretesOk && caso.status === 'ativo') html += '<p class="suave pequeno">Lembretes desligados: o paciente não autorizou lembretes ou escolheu não recebê-los.</p>';
    if (pode) {
      html += '<h3 style="margin-top:1rem">Agendar sessão</h3><div class="linha">' +
        '<label class="suave" for="ag-data">Data</label><input id="ag-data" type="date" min="' + hoje + '" style="width:auto">' +
        '<label class="suave" for="ag-hora">Hora</label><input id="ag-hora" type="time" value="14:00" style="width:auto">' +
        '<button class="botao pequeno" data-acao="agendar-sessao" data-caso="' + caso.id + '">Agendar</button></div>';
    }
    return html + '<p class="suave pequeno" style="margin-top:.8rem">Falta justificada (avisada com antecedência) não conta para o fluxo de abandono. ' +
      'Lembretes não levam nome do serviço, do profissional nem conteúdo clínico.</p></div>';
  }

  // ---------- Aba: documentos emitidos e anexos ----------
  function abaDocumentos(u, caso) {
    var docs = PEP.db.documentos.filter(function (d) { return d.casoId === caso.id; });
    var anexos = PEP.db.anexos.filter(function (a) { return a.casoId === caso.id; });
    var html = '<div class="cartao"><h2>Documentos emitidos</h2><p class="suave pequeno">Cópia arquivada com data, finalidade e destinatário. Documento de estágio só vale com as assinaturas do estagiário e do psicólogo responsável (Res. CFP 05/2025, art. 19).</p>';
    if (!docs.length) html += '<p class="vazio">Nenhum documento emitido.</p>';
    else {
      html += '<div class="tabela-rolagem"><table><thead><tr><th scope="col">Documento</th><th scope="col">Finalidade</th><th scope="col">Destinatário</th><th scope="col">Emissão</th><th scope="col">Assinaturas</th></tr></thead><tbody>' +
        docs.map(function (d) {
          var assin = R().assinaturasDe('documento', d.id);
          var completo = R().assinadoPeloSupervisor('documento', d.id);
          var acao = (!completo && R().ehSupervisorDoCaso(u, caso)) ? ' <button class="botao pequeno" data-acao="assinar-documento" data-id="' + d.id + '">Assinar</button>' : '';
          return '<tr><td>' + esc(d.titulo) + '</td><td>' + esc(d.finalidade) + '</td><td>' + esc(d.destinatario) + '</td><td>' + data(d.emitidoEm) + '</td><td>' +
            esc(assin.map(function (a) { return PEP.ui.nomeUsuario(a.usuarioId); }).join(', ')) +
            (completo ? ' <span class="etiqueta validada">válido</span>' : ' <span class="etiqueta alerta">falta supervisor</span>') + acao + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    if (R().ehEstagiarioDoCaso(u, caso) && caso.status === 'ativo') {
      html += '<details style="margin-top:.8rem"><summary><strong>Emitir declaração de comparecimento</strong></summary>' +
        '<div class="grade-2" style="margin-top:.5rem"><div class="campo"><label for="dc-fin">Finalidade</label><input id="dc-fin" type="text" maxlength="120" placeholder="Ex.: justificar ausência no trabalho"></div>' +
        '<div class="campo"><label for="dc-dest">Destinatário</label><input id="dc-dest" type="text" maxlength="120" placeholder="Ex.: o próprio paciente"></div></div>' +
        '<button class="botao pequeno" data-acao="emitir-declaracao" data-caso="' + caso.id + '">Emitir e enviar para assinatura do supervisor</button></details>';
    }
    html += '</div><div class="cartao"><h2>Anexos externos</h2><p class="suave pequeno">Ex.: encaminhamento da UBS, exames trazidos pelo paciente. Testes psicológicos não entram aqui: ficam na área restrita.</p>';
    html += anexos.length ? '<ul class="lista-anexos">' + anexos.map(function (a) {
      var tam = a.tamanho ? ' · ' + (a.tamanho / 1024).toFixed(0) + ' KB' : '';
      return '<li><strong>' + esc(a.nome) + '</strong> — ' + esc(a.descricao) + ' <span class="suave pequeno">(' + esc(PEP.ui.nomeUsuario(a.enviadoPor)) + ', ' + data(a.em) + tam + ')</span> ' +
        (a.arquivoId ? '<button class="botao secundario pequeno" data-acao="abrir-anexo" data-id="' + a.id + '">Abrir</button>' : '<span class="suave pequeno">(anexo de demonstração, sem conteúdo)</span>') +
        (a.hash ? '<br><span class="suave pequeno codigo">SHA-256: ' + esc(a.hash.slice(0, 16)) + '…</span>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="vazio">Nenhum anexo.</p>';
    if (caso.status === 'ativo' && R().podeVerCaso(u, caso)) {
      html += '<div class="grade-2"><div class="campo"><label for="ax-arquivo">Arquivo (PDF, JPG ou PNG, até ' + PEP.regra('uploadMaxMB') + ' MB)</label><input id="ax-arquivo" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></div>' +
        '<div class="campo"><label for="ax-desc">Descrição</label><input id="ax-desc" type="text" maxlength="120"></div></div>' +
        '<button class="botao pequeno" data-acao="anexar" data-caso="' + caso.id + '">Anexar</button>';
    }
    return html + '</div>';
  }

  // ---------- Aba: avaliação psicológica (área restrita) ----------
  function abaRestrita(u, caso) {
    var lista = PEP.db.avaliacoes.filter(function (a) { return a.casoId === caso.id; });
    var html = '<div class="aviso restrito"><strong>Área restrita.</strong> Material de avaliação psicológica fica fora do prontuário e da cópia entregue ao paciente (Res. CFP 05/2025, art. 14). ' +
      'Use só testes com parecer favorável no SATEPSI (Res. CFP 31/2022).</div><div class="cartao"><h2>Instrumentos aplicados</h2>';
    html += lista.length ? '<ul>' + lista.map(function (a) {
      return '<li><strong>' + esc(a.instrumento) + '</strong> — ' + esc(a.observacao) + ' <span class="suave pequeno">(' + esc(PEP.ui.nomeUsuario(a.aplicadoPor)) + ', ' + data(a.em) + ')</span></li>';
    }).join('') + '</ul>' : '<p class="vazio">Nenhum instrumento registrado.</p>';
    if ((R().ehEstagiarioDoCaso(u, caso) || R().ehSupervisorDoCaso(u, caso)) && caso.status === 'ativo') {
      html += '<div class="campo"><label for="av-inst">Instrumento</label><input id="av-inst" type="text" maxlength="120"></div>' +
        '<div class="campo"><label for="av-obs">Observação</label><input id="av-obs" type="text" maxlength="200"></div>' +
        '<button class="botao pequeno" data-acao="registrar-avaliacao" data-caso="' + caso.id + '">Registrar aplicação</button>';
    }
    return html + '</div>';
  }

  // ---------- Aba: supervisão (registro separado do prontuário) ----------
  function abaSupervisao(u, caso) {
    var lista = PEP.db.orientacoes.filter(function (o) { return o.casoId === caso.id; })
      .sort(function (a, b) { return b.em.localeCompare(a.em); });
    var html = '<div class="aviso restrito"><strong>Registro de supervisão.</strong> Compartilhado só entre orientadores, supervisores e estagiários. ' +
      'Não faz parte do prontuário nem da cópia do paciente (Res. CFP 05/2025, art. 17).</div>';
    if (R().podeEscreverOrientacao(u, caso)) {
      html += '<div class="cartao"><div class="campo"><label for="or-texto">Nova orientação</label><textarea id="or-texto" style="min-height:80px"></textarea></div>' +
        '<button class="botao pequeno" data-acao="registrar-orientacao" data-caso="' + caso.id + '">Registrar orientação</button></div>';
    }
    if (!lista.length) return html + '<p class="vazio">Nenhuma orientação registrada.</p>';
    return html + lista.map(function (o) {
      return '<div class="cartao"><strong>' + esc(PEP.ui.nomeUsuario(o.supervisorId)) + '</strong> <span class="suave pequeno">' + data(o.em) + '</span><p style="margin:.4rem 0 0">' + esc(o.texto) + '</p></div>';
    }).join('');
  }

  // ---------- Aba: encerramento ----------
  function abaEncerramento(u, caso) {
    var e = R().encerramentoDoCaso(caso);
    if (caso.status === 'encerrado' && e) {
      return '<div class="cartao"><h2>Caso encerrado</h2><p><strong>Data:</strong> ' + data(e.data) + '<br><strong>Tipo:</strong> ' + esc(e.tipo) +
        '<br><strong>Motivo:</strong> ' + esc(e.motivo) + '<br><strong>Registrado por:</strong> ' + esc(PEP.ui.nomeUsuario(e.registradoPor)) + '</p><p>' + esc(e.registro) + '</p></div>';
    }
    if (!R().podeEncerrar(u, caso)) return '<p class="vazio">Caso em andamento.</p>';
    return '<div class="cartao"><h2>Registrar encerramento ou encaminhamento</h2>' +
      '<div class="campo"><label for="enc-tipo">Tipo</label><select id="enc-tipo">' + PEP.ui.opcoes(PEP.lista('tiposEncerramento')) + '</select></div>' +
      '<div class="campo"><label for="enc-motivo">Motivo</label><input id="enc-motivo" type="text" maxlength="120"></div>' +
      '<div class="campo"><label for="enc-registro">Registro</label><textarea id="enc-registro" style="min-height:80px"></textarea></div>' +
      '<button class="botao perigo pequeno" data-acao="encerrar-caso" data-caso="' + caso.id + '">Encerrar caso</button></div>';
  }

  PEP.telas.casoAbaExtra = function (u, caso, aba) {
    if (aba === 'sessoes') return abaSessoes(u, caso);
    if (aba === 'documentos') return abaDocumentos(u, caso);
    if (aba === 'restrita') return abaRestrita(u, caso);
    if (aba === 'supervisao') return abaSupervisao(u, caso);
    return abaEncerramento(u, caso);
  };

  // ---------- Cópia do prontuário ----------
  // Inclui só o prontuário (Res. CFP 05/2025, art. 12): sem rascunhos, sem supervisão, sem testes.
  PEP.telas.copiaProntuario = function (caso, geradoPara) {
    var p = PEP.ui.pacienteDoCaso(caso);
    var a = R().anamneseAtual(caso);
    var evols = PEP.db.evolucoes.filter(function (e) { return e.casoId === caso.id && e.status === 'validada'; })
      .sort(function (x, y) { return x.data.localeCompare(y.data); });
    var docs = PEP.db.documentos.filter(function (d) { return d.casoId === caso.id; });
    var anexos = PEP.db.anexos.filter(function (x) { return x.casoId === caso.id; });
    var enc = R().encerramentoDoCaso(caso);
    var assin = function (tipo, id) {
      var l = tipo === 'evolucao' ? R().assinaturasVigentes(PEP.util.porId(PEP.db.evolucoes, id)) : R().assinaturasDe(tipo, id);
      return l.map(function (s) { return esc(PEP.ui.nomeUsuario(s.usuarioId)) + ' em ' + data(s.em); }).join(' · ');
    };
    return '<div class="cartao"><h1>Prontuário psicológico — cópia</h1>' +
      '<p class="suave pequeno">' + esc(PEP.config().instituicao.nome) + ' · gerada em ' + data(PEP.util.agora()) + ' ' + esc(geradoPara) + ' · documento sigiloso</p>' +
      '<h2>Identificação</h2><p>' + esc(p.nome) + (p.nomeSocial ? ' (' + esc(p.nomeSocial) + ')' : '') + ' · nascimento ' + data(p.dataNascimento) + (p.responsavelNome ? ' · responsável: ' + esc(p.responsavelNome) : '') + '</p>' +
      '<h2>Avaliação de demanda</h2><p>' + esc(a.demanda) + '</p><h2>Objetivos</h2><p>' + esc(a.objetivos) + '</p>' +
      '<h2>Anamnese</h2><p>Queixa: ' + esc(a.queixa || '—') + '<br>Sintomas: ' + esc(a.sintomas || '—') + '<br>Histórico familiar: ' + esc(a.historicoFamiliar || '—') +
      '<br>Medicações: ' + esc(a.medicacoes || '—') + '<br>Histórico clínico: ' + esc(a.historicoClinico || '—') + '</p>' +
      '<h2>Evolução</h2>' + (evols.length ? evols.map(function (e) {
        return '<div style="margin-bottom:.8rem"><strong>' + data(e.data) + '</strong><br>' + esc(e.texto) +
          '<div class="assinaturas">Assinado por: ' + assin('evolucao', e.id) + '</div>' +
          R().adendosDe(e.id).map(function (ad) { return '<div class="adendo">Adendo (' + esc(ad.motivo) + ', ' + data(ad.em) + '): ' + esc(ad.texto) + '</div>'; }).join('') + '</div>';
      }).join('') : '<p class="vazio">Sem evoluções validadas.</p>') +
      '<h2>Documentos emitidos</h2>' + (docs.length ? '<ul>' + docs.map(function (d) {
        return '<li>' + esc(d.titulo) + ' — ' + esc(d.finalidade) + ' — para ' + esc(d.destinatario) + ' (' + data(d.emitidoEm) + ')</li>';
      }).join('') + '</ul>' : '<p class="vazio">Nenhum.</p>') +
      '<h2>Anexos externos</h2>' + (anexos.length ? '<ul>' + anexos.map(function (x) { return '<li>' + esc(x.nome) + ' — ' + esc(x.descricao) + '</li>'; }).join('') + '</ul>' : '<p class="vazio">Nenhum.</p>') +
      (enc ? '<h2>Encerramento</h2><p>' + data(enc.data) + ' · ' + esc(enc.tipo) + ' · ' + esc(enc.registro) + '</p>' : '') +
      '<p class="suave pequeno" style="margin-top:1rem">Não fazem parte desta cópia: rascunhos, registros de supervisão e material de avaliação psicológica (Res. CFP 05/2025, arts. 14 e 17).</p></div>';
  };

  PEP.telas.imprimir = function (u, casoId) {
    var caso = PEP.util.porId(PEP.db.casos, casoId);
    if (!caso) return '<h1>Caso não encontrado</h1>';
    var autorizado = u.perfil === 'tecnico' || R().ehSupervisorDoCaso(u, caso);
    if (!autorizado) return PEP.ui.semPermissao('A cópia é gerada pela psicóloga técnica ou pelo supervisor do caso.');
    return '<div class="linha entre nao-imprimir" style="margin-bottom:1rem"><a href="#/caso/' + caso.id + '">← Voltar ao caso</a>' +
      '<button class="botao" data-acao="imprimir" data-caso="' + caso.id + '">Imprimir / salvar em PDF</button></div>' +
      PEP.telas.copiaProntuario(caso, 'por ' + PEP.ui.nomeUsuario(u.id));
  };
})();
