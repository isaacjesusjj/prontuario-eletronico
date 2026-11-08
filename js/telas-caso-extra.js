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
  function nomeMotivoFalta(id) { var m = PEP.lista('motivosFaltaPaciente').filter(function (x) { return x.id === id; })[0]; return m ? m.nome : id; }

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

    html += '<div class="cartao"><h2>Sessões</h2><div class="tabela-rolagem"><table><thead><tr><th scope="col">Data</th><th scope="col">Hora</th><th scope="col">Sala</th><th scope="col">Presença</th><th scope="col">Ações</th></tr></thead><tbody>' +
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
        return '<tr><td>' + data(s.data) + '</td><td>' + esc(s.hora) + '</td><td>' + esc(s.sala || '—') + '</td><td><span class="etiqueta ' + CLASSE_PRESENCA[s.presenca] + '">' + nomePresenca(s.presenca) + '</span>' +
          (s.presenca === 'agendada' && s.confirmada ? ' <span class="suave pequeno">confirmada pelo paciente</span>' : '') +
          (s.avisoPaciente ? ' <span class="suave pequeno">avisada pelo paciente em ' + data(s.avisadoEm) + ': ' + esc(nomeMotivoFalta(s.motivoFalta)) + '</span>' : '') +
          (s.presenca === 'agendada' && s.data < hoje ? ' <span class="etiqueta alerta">presença pendente</span>' : '') +
          (enviados ? ' <span class="suave pequeno">· ' + enviados + ' lembrete(s)</span>' : '') + '</td><td><div class="linha">' + acoes + '</div></td></tr>';
      }).join('') + '</tbody></table></div>';

    if (!lembretesOk && caso.status === 'ativo') html += '<p class="suave pequeno">Lembretes desligados: o paciente não autorizou lembretes ou escolheu não recebê-los.</p>';
    if (pode) {
      html += '<h3 style="margin-top:1rem">Agendar sessão</h3><div class="linha">' +
        '<label class="suave" for="ag-data">Data</label><input id="ag-data" type="date" min="' + hoje + '" style="width:auto">' +
        '<label class="suave" for="ag-hora">Hora</label><input id="ag-hora" type="time" value="14:00" style="width:auto">' +
        '<label class="suave" for="ag-sala">Sala</label><select id="ag-sala" style="width:auto"><option value="">Escolha</option>' +
        PEP.lista('salas').map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<button class="botao pequeno" data-acao="agendar-sessao" data-caso="' + caso.id + '">Agendar</button></div>';
    }
    return html + '<p class="suave pequeno" style="margin-top:.8rem">Falta justificada (avisada com antecedência) não conta para o fluxo de abandono. ' +
      'Lembretes não levam nome do serviço, do profissional nem conteúdo clínico. Envie pelo WhatsApp ou e-mail institucional da clínica, nunca pelo seu número pessoal (termo de sigilo).</p></div>';
  }

  // ---------- Aba: documentos psicológicos (Res. CFP 06/2019), comunicações e anexos ----------
  PEP.telas._modalidadeDoc = null;   // modalidade escolhida no formulário de emissão

  function situacaoDocumento(d) {
    if (R().eventoDoDocumento(d, 'anulacao')) return '<span class="etiqueta perigo">anulado</span>';
    if (!R().documentoValido(d)) return '<span class="etiqueta alerta">falta o supervisor</span>';
    var entrega = R().eventoDoDocumento(d, 'entrega');
    return '<span class="etiqueta validada">válido</span>' + (entrega ? ' <span class="suave pequeno">entregue em ' + data(entrega.em) + '</span>' : ' <span class="suave pequeno">não entregue</span>') +
      (R().devolutivaPendente(d) ? ' <span class="etiqueta alerta">devolutiva pendente</span>' : '');
  }

  function formularioDocumento(u, caso) {
    var escolhida = R().modalidadeDocumento(PEP.telas._modalidadeDoc);
    var html = '<details id="emitir-documento"' + (escolhida ? ' open' : '') + ' style="margin-top:.8rem"><summary><strong>Emitir documento psicológico</strong></summary>' +
      '<p class="suave pequeno">Estrutura da Res. CFP 06/2019. Escreva em linguagem técnica e impessoal. Uma cópia fica no prontuário; documento de estagiário só vale com a assinatura do supervisor.</p>' +
      '<div class="linha" role="group" aria-label="Modalidade do documento">' + PEP.lista('modalidadesDocumento').map(function (m) {
        return '<button type="button" class="botao ' + (escolhida && escolhida.id === m.id ? '' : 'secundario ') + 'pequeno" data-acao="escolher-modalidade" data-id="' + m.id + '" aria-pressed="' +
          (escolhida && escolhida.id === m.id ? 'true' : 'false') + '">' + esc(m.nome) + '</button>';
      }).join('') + '</div>';
    if (!escolhida) return html + '<p class="suave pequeno">Escolha a modalidade.</p></details>';
    var semAvaliacao = escolhida.exigeAvaliacao && !PEP.db.avaliacoes.some(function (a) { return a.casoId === caso.id; });
    html += '<div class="aviso info pequeno" style="margin-top:.6rem"><strong>' + esc(escolhida.nome) + '</strong> (' + esc(escolhida.artigo) + '): ' + esc(escolhida.orientacao) + '</div>';
    if (semAvaliacao) return html + '<div class="aviso alerta pequeno">Este caso não tem avaliação psicológica registrada na área restrita: o laudo não pode ser emitido.</div></details>';
    var campo = function (id, rotulo, valor, extra) {
      return '<div class="campo"><label for="dp-' + id + '">' + rotulo + '</label><input id="dp-' + id + '" type="text" maxlength="' + (extra || 120) + '" value="' + esc(valor || '') + '"></div>';
    };
    var max = PEP.regra('documentoSecaoMaxCaracteres');
    return html + '<form id="form-documento" data-form="emitir-documento" data-caso="' + caso.id + '" novalidate><div class="grade-2">' +
      campo('titulo', 'Título *', escolhida.nome) + campo('solicitante', 'Solicitante *', '') + campo('finalidade', 'Finalidade *', '') + campo('destinatario', 'Destinatário *', '') +
      campo('local', 'Local', 'São Paulo', 80) +
      (escolhida.validade ? '<div class="campo"><label for="dp-validade">Prazo de validade do conteúdo *</label><input id="dp-validade" type="text" maxlength="200" placeholder="ex.: 6 meses" aria-describedby="dp-validade-dica">' +
        '<span class="dica" id="dp-validade-dica">Vai no último parágrafo do documento.</span></div>' : '') + '</div>' +
      escolhida.secoes.map(function (sec) {
        return '<div class="campo"><label for="dp-s-' + sec.id + '">' + esc(sec.nome) + (sec.obrigatoria ? ' *' : '') + '</label>' +
          '<textarea id="dp-s-' + sec.id + '" maxlength="' + max + '" style="min-height:90px"></textarea></div>';
      }).join('') +
      '<button class="botao" type="submit">' + (R().ehSupervisorDoCaso(u, caso) ? 'Emitir e assinar' : 'Emitir e enviar para a assinatura do supervisor') + '</button></form></details>';
  }

  function quadroComunicacoes(u, caso) {
    var lista = R().comunicacoesDoCaso(caso);
    var html = '<div class="cartao" id="comunicacoes"><h2>Comunicações e compartilhamentos</h2>' +
      '<p class="suave pequeno">Toda informação passada a terceiros fica registrada: data, destinatário, finalidade e fundamento. Informe só o estritamente necessário (Código de Ética, arts. 10 e 13). ' +
      'Requisição judicial: responda por documento psicológico, não com cópia do prontuário. A notificação compulsória fica na aba Risco e segurança.</p>';
    html += lista.length ? '<div class="tabela-rolagem"><table><caption class="sr-only">Comunicações a terceiros, da mais recente para a mais antiga</caption><thead><tr><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col">Destinatário e finalidade</th><th scope="col">O que foi informado</th><th scope="col">Paciente vê?</th></tr></thead><tbody>' +
      lista.map(function (x) {
        var t = R().tipoComunicacao(x.tipo);
        return '<tr><td>' + data(x.data) + '</td><td>' + esc(t ? t.nome : x.tipo) + (x.fundamento ? '<br><span class="suave pequeno">Fundamento: ' + esc(x.fundamento) + '</span>' : '') + '</td>' +
          '<td>' + esc(x.destinatario) + '<br><span class="suave pequeno">' + esc(x.finalidade) + '</span></td><td class="pequeno">' + esc(x.conteudo) +
          '<br><span class="suave">por ' + esc(PEP.ui.nomeUsuario(x.registradoPor)) + '</span></td><td>' + (x.visivelPaciente ? 'sim' : 'não<br><span class="suave pequeno">' + esc(x.motivoOculto) + '</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="vazio">Nenhuma comunicação registrada.</p>';
    var tipos = PEP.lista('tiposComunicacao').filter(function (t) { return R().podeRegistrarComunicacao(u, caso, t.id); });
    if (caso.status === 'ativo' && tipos.length) {
      html += '<details style="margin-top:.6rem"><summary><strong>Registrar comunicação</strong></summary><form id="form-comunicacao" data-form="registrar-comunicacao" data-caso="' + caso.id + '" novalidate style="margin-top:.5rem"><div class="grade-2">' +
        '<div class="campo"><label for="cm-tipo">Tipo *</label><select id="cm-tipo" name="tipo">' + tipos.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nome) + '</option>'; }).join('') + '</select></div>' +
        '<div class="campo"><label for="cm-data">Data *</label><input id="cm-data" name="data" type="date" value="' + PEP.util.hoje() + '"></div>' +
        '<div class="campo"><label for="cm-dest">Destinatário *</label><input id="cm-dest" name="destinatario" type="text" maxlength="120"></div>' +
        '<div class="campo"><label for="cm-fin">Finalidade *</label><input id="cm-fin" name="finalidade" type="text" maxlength="200"></div></div>' +
        '<div class="campo"><label for="cm-fund">Fundamento (obrigatório em comunicação autorizada, requisição e quebra de sigilo)</label><input id="cm-fund" name="fundamento" type="text" maxlength="300" aria-describedby="cm-fund-dica">' +
        '<span class="dica" id="cm-fund-dica">' + tipos.map(function (t) { return esc(t.nome) + ': ' + esc(t.fundamentoDica); }).join(' · ') + '</span></div>' +
        '<div class="campo"><label for="cm-conteudo">O que foi informado *</label><textarea id="cm-conteudo" name="conteudo" maxlength="' + PEP.regra('comunicacaoMaxCaracteres') + '" style="min-height:70px"></textarea></div>' +
        '<label class="check"><input type="checkbox" id="cm-visivel" name="visivel" checked> <span>Mostrar este registro ao paciente no portal (LGPD, art. 18, VII)</span></label>' +
        '<div class="campo"><label for="cm-motivo">Se não mostrar, por quê</label><input id="cm-motivo" name="motivo" type="text" maxlength="300"></div>' +
        '<button class="botao" type="submit">Registrar</button></form></details>';
    }
    return html + '</div>';
  }

  function abaDocumentos(u, caso) {
    var docs = PEP.db.documentos.filter(function (d) { return d.casoId === caso.id; });
    var anexos = PEP.db.anexos.filter(function (a) { return a.casoId === caso.id; });
    var html = '<div class="cartao"><h2>Documentos emitidos</h2><p class="suave pequeno">Cópia arquivada com data, finalidade e destinatário (Res. CFP 05/2025, art. 12). Documento de estágio só vale com as assinaturas do estagiário e do supervisor (art. 19).</p>';
    if (!docs.length) html += '<p class="vazio">Nenhum documento emitido.</p>';
    else {
      html += '<div class="tabela-rolagem"><table><caption class="sr-only">Documentos psicológicos emitidos no caso</caption><thead><tr><th scope="col">Documento</th><th scope="col">Finalidade e destinatário</th><th scope="col">Emissão</th><th scope="col">Situação</th><th scope="col"></th></tr></thead><tbody>' +
        docs.map(function (d) {
          var m = R().modalidadeDocumento(d.tipo);
          return '<tr><td>' + esc(d.titulo) + '<br><span class="suave pequeno">' + esc(m ? m.nome : d.tipo) + '</span></td><td>' + esc(d.finalidade) + '<br><span class="suave pequeno">para ' + esc(d.destinatario) + '</span></td>' +
            '<td>' + data(d.emitidoEm) + '</td><td>' + situacaoDocumento(d) + '</td><td><a class="botao secundario pequeno" href="#/documento/' + d.id + '">Abrir</a></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    if (R().podeEmitirDocumento(u, caso)) html += formularioDocumento(u, caso);
    html += '</div>' + quadroComunicacoes(u, caso);
    html += '<div class="cartao"><h2>Anexos externos</h2><p class="suave pequeno">Ex.: encaminhamento da UBS, exames trazidos pelo paciente. Testes psicológicos não entram aqui: ficam na área restrita.</p>';
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
  function guarda(caso) {
    return '<p class="suave pequeno">Guarda do prontuário até <strong>' + data(R().guardaAte(caso)) + '</strong> (' + PEP.regra('guardaProntuarioAnos') +
      ' anos depois do último registro; mínimo de ' + PEP.regra('guardaMinimaCfpAnos') + ' anos pela Res. CFP 05/2025). Nada é apagado antes disso.</p>';
  }

  function abaEncerramento(u, caso) {
    var e = R().encerramentoDoCaso(caso);
    var tipos = {};
    PEP.lista('tiposEncerramento').forEach(function (t) { tipos[t.valor] = t.nome; });
    if (caso.status === 'encerrado' && e) {
      return '<div class="cartao"><h2>Caso encerrado</h2><p><strong>Data:</strong> ' + data(e.data) + '<br><strong>Tipo:</strong> ' + esc(tipos[e.tipo] || e.tipo) +
        '<br><strong>Motivo:</strong> ' + esc(e.motivo) + (e.destino ? '<br><strong>Encaminhado para:</strong> ' + esc(e.destino) : '') +
        '<br><strong>Registrado por:</strong> ' + esc(PEP.ui.nomeUsuario(e.registradoPor)) + '</p><p>' + esc(e.registro) + '</p>' + guarda(caso) + '</div>';
    }
    if (!R().podeEncerrar(u, caso)) return '<p class="vazio">Caso em andamento.</p>' + guarda(caso);
    var pend = R().pendenciasParaEncerrar(caso);
    // Abandono não entra por aqui: só pelo fluxo de faltas, depois da tentativa de contato (aba Sessões)
    var opcoesTipo = PEP.lista('tiposEncerramento').filter(function (t) { return t.valor !== 'abandono'; });
    return '<div class="cartao"><h2>Registrar encerramento ou encaminhamento</h2>' +
      (pend.bloqueiam.length ? '<div class="aviso perigo pequeno" role="note"><strong>Antes de encerrar:</strong> ' + esc(pend.bloqueiam.join('; ')) + '.</div>' : '') +
      (pend.avisos.length ? '<div class="aviso alerta pequeno" role="note"><strong>Confira:</strong> ' + esc(pend.avisos.join('; ')) + '.</div>' : '') +
      '<div class="grade-2"><div class="campo"><label for="enc-tipo">Tipo</label><select id="enc-tipo">' + PEP.ui.opcoes(opcoesTipo) + '</select>' +
      '<span class="dica">Abandono é registrado pelo fluxo de faltas (aba Sessões e faltas), depois da tentativa de contato.</span></div>' +
      '<div class="campo"><label for="enc-motivo">Motivo *</label><input id="enc-motivo" type="text" maxlength="120"></div></div>' +
      '<div class="campo"><label for="enc-destino">Serviço que recebe o encaminhamento (obrigatório no encaminhamento)</label>' +
      '<input id="enc-destino" type="text" maxlength="120" list="lista-servicos" autocomplete="off">' +
      '<datalist id="lista-servicos">' + PEP.lista('servicosRede').map(function (s) { return '<option value="' + esc(s) + '"></option>'; }).join('') + '</datalist>' +
      '<span class="dica">Ex.: CAPS, UBS, CRAS. No relatório de encaminhamento vai só o necessário (Código de Ética, arts. 6º e 12).</span></div>' +
      '<div class="campo"><label for="enc-registro">Registro *</label><span class="dica" id="enc-registro-dica">O que foi feito, como o paciente foi orientado e o que fica combinado.</span>' +
      '<textarea id="enc-registro" style="min-height:80px" maxlength="' + PEP.regra('anamneseCampoMaxCaracteres') + '" aria-describedby="enc-registro-dica"></textarea></div>' +
      '<button class="botao perigo pequeno" data-acao="encerrar-caso" data-caso="' + caso.id + '"' + (pend.bloqueiam.length ? ' disabled' : '') + '>Encerrar caso</button>' +
      guarda(caso) + '</div>';
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
        return '<div style="margin-bottom:.8rem"><strong>' + data(e.data) + (e.tipo === 'transferencia' ? ' · Resumo de transferência' : '') + '</strong><br>' + esc(e.texto) +
          '<div class="assinaturas">Assinado por: ' + assin('evolucao', e.id) + '</div>' +
          R().adendosDe(e.id).map(function (ad) { return '<div class="adendo">Adendo (' + esc(ad.motivo) + ', ' + data(ad.em) + '): ' + esc(ad.texto) + '</div>'; }).join('') + '</div>';
      }).join('') : '<p class="vazio">Sem evoluções validadas.</p>') +
      PEP.telas.riscoNaCopia(caso).html +
      '<h2>Documentos emitidos</h2>' + (docs.length ? '<ul>' + docs.map(function (d) {
        var m = R().modalidadeDocumento(d.tipo);
        return '<li>' + esc(m ? m.nome : d.tipo) + ': ' + esc(d.titulo) + ' — ' + esc(d.finalidade) + ' — para ' + esc(d.destinatario) + ' (' + data(d.emitidoEm) + ')' +
          (R().eventoDoDocumento(d, 'anulacao') ? ' — anulado' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="vazio">Nenhum.</p>') +
      '<h2>Comunicações a terceiros</h2>' + (function () {
        var l = R().comunicacoesDoCaso(caso).filter(function (x) { return x.visivelPaciente; });
        return l.length ? '<ul>' + l.map(function (x) {
          var t = R().tipoComunicacao(x.tipo);
          return '<li>' + data(x.data) + ' · ' + esc(t ? t.nome : x.tipo) + ' · para ' + esc(x.destinatario) + ' · ' + esc(x.finalidade) + '</li>';
        }).join('') + '</ul>' : '<p class="vazio">Nenhuma.</p>';
      })() +
      '<h2>Anexos externos</h2>' + (anexos.length ? '<ul>' + anexos.map(function (x) { return '<li>' + esc(x.nome) + ' — ' + esc(x.descricao) + '</li>'; }).join('') + '</ul>' : '<p class="vazio">Nenhum.</p>') +
      (enc ? '<h2>Encerramento</h2><p>' + data(enc.data) + ' · ' + esc(enc.tipo) + ' · ' + esc(enc.registro) + '</p>' : '') +
      '<p class="suave pequeno" style="margin-top:1rem">Não fazem parte desta cópia: rascunhos, registros de supervisão e material de avaliação psicológica (Res. CFP 05/2025, arts. 14 e 17).</p></div>';
  };

  // ---------- Documento psicológico: leitura, ações e impressão ----------
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function dataPorExtenso(iso) { var p = String(iso).slice(0, 10).split('-'); return Number(p[2]) + ' de ' + MESES[Number(p[1]) - 1] + ' de ' + p[0]; }
  function quemAssina(id) {
    var x = PEP.util.porId(PEP.db.usuarios, id) || {};
    return esc(x.nome || id) + '<br>' + (x.crp ? 'Psicólogo(a) · ' + esc(x.crp) : 'Estagiário(a) de Psicologia' + (x.matricula ? ' · matrícula ' + esc(x.matricula) : ''));
  }
  function acoesDoDocumento(u, d, caso) {
    var html = '', entrega = R().eventoDoDocumento(d, 'entrega');
    if (!R().documentoValido(d) && !R().eventoDoDocumento(d, 'anulacao') && R().ehSupervisorDoCaso(u, caso)) {
      html += '<button class="botao pequeno" data-acao="assinar-documento" data-id="' + d.id + '">Assinar como supervisor</button>';
    }
    if (R().podeRegistrarEntrega(u, d) && !entrega) {
      html += '<div class="campo"><label for="ev-para">Entregue a</label><input id="ev-para" type="text" maxlength="120" placeholder="ex.: a própria paciente"></div>' +
        '<button class="botao secundario pequeno" data-acao="registrar-evento-documento" data-tipo="entrega" data-id="' + d.id + '">Registrar entrega</button>';
    }
    if (R().devolutivaPendente(d) && R().podeRegistrarEntrega(u, d)) {
      html += '<button class="botao secundario pequeno" data-acao="registrar-evento-documento" data-tipo="devolutiva" data-id="' + d.id + '">Registrar devolutiva feita</button>' +
        '<details><summary class="pequeno">Devolutiva não feita</summary><div class="campo"><label for="ev-motivo-dev">Motivo</label><input id="ev-motivo-dev" type="text" maxlength="500"></div>' +
        '<button class="botao secundario pequeno" data-acao="registrar-evento-documento" data-tipo="sem-devolutiva" data-id="' + d.id + '">Registrar o motivo</button></details>';
    }
    if (R().podeAnularDocumento(u, d)) {
      html += '<details><summary class="pequeno">Anular este documento</summary><div class="campo"><label for="ev-motivo-anul">Motivo da anulação</label><input id="ev-motivo-anul" type="text" maxlength="500"></div>' +
        '<button class="botao secundario pequeno" data-acao="registrar-evento-documento" data-tipo="anulacao" data-id="' + d.id + '">Anular</button></details>';
    }
    return html;
  }
  PEP.telas.documento = function (u, id) {
    var d = PEP.util.porId(PEP.db.documentos, id), caso = d && PEP.util.porId(PEP.db.casos, d.casoId);
    if (!d || !caso) return '<h1>Documento não encontrado</h1>';
    if (!R().podeVerCaso(u, caso)) return PEP.ui.semPermissao();
    if (R().precisaJustificar(u, caso)) return '<h1>Documento psicológico</h1>' + PEP.telas.formularioJustificativa(caso, '#/documento/' + d.id);
    var m = R().modalidadeDocumento(d.tipo) || { nome: d.tipo, secoes: [] }, p = PEP.ui.pacienteDoCaso(caso);
    var eventos = R().eventosDoDocumento(d), nomes = { entrega: 'Entregue', devolutiva: 'Devolutiva feita', 'sem-devolutiva': 'Devolutiva não feita', anulacao: 'Anulado' };
    var autor = PEP.util.porId(PEP.db.usuarios, d.autorId) || {}, sup = R().supervisorDoCaso(caso);
    var autoria = esc(autor.nome || d.autorId) + (autor.perfil === 'estagiario' ? ' (estagiário(a) de Psicologia), sob supervisão de ' + esc(PEP.ui.nomeUsuario(sup)) : '');
    var acoes = acoesDoDocumento(u, d, caso);
    var html = '<div class="linha entre nao-imprimir" style="margin-bottom:1rem"><a href="#/caso/' + caso.id + '/documentos">← Voltar aos documentos</a>' +
      (R().documentoValido(d) ? '<button class="botao" data-acao="imprimir-documento" data-id="' + d.id + '">Imprimir / salvar em PDF</button>' : '') + '</div>' +
      '<div class="cartao nao-imprimir"><h1 style="font-size:1.3rem;margin-top:0">' + esc(d.titulo) + '</h1><p>' + situacaoDocumento(d) + '</p>' +
      (eventos.length ? '<ul class="pequeno">' + eventos.map(function (e) {
        return '<li>' + esc(nomes[e.tipo] || e.tipo) + ' em ' + data(e.em) + (e.para ? ' · para ' + esc(e.para) : '') + (e.observacao ? ' · ' + esc(e.observacao) : '') +
          ' · registrado por ' + esc(PEP.ui.nomeUsuario(e.registradoPor)) + '</li>';
      }).join('') + '</ul>' : '') +
      (!R().documentoValido(d) && !R().eventoDoDocumento(d, 'anulacao') ? '<p class="aviso alerta pequeno">Sem validade até a assinatura do supervisor do caso (Res. CFP 05/2025, art. 19). A impressão fica liberada depois.</p>' : '') +
      (acoes ? '<div class="pilha-acoes">' + acoes + '</div>' : '') + '</div>';
    html += '<article class="documento-psicologico" aria-label="' + esc(m.nome) + '">' +
      '<header class="doc-cabecalho"><strong>' + esc(PEP.config().instituicao.nome) + '</strong><br>Serviço-Escola de Psicologia</header>' +
      '<h2 class="doc-titulo">' + esc(m.nome) + '</h2>' +
      '<dl class="doc-identificacao"><dt>Interessado(a)</dt><dd>' + esc(p.nome) + '</dd><dt>Solicitante</dt><dd>' + esc(d.solicitante || '—') + '</dd>' +
      '<dt>Finalidade</dt><dd>' + esc(d.finalidade) + '</dd><dt>Destinatário</dt><dd>' + esc(d.destinatario) + '</dd><dt>Autoria</dt><dd>' + autoria + '</dd></dl>' +
      m.secoes.filter(function (sec) { return d.conteudo && d.conteudo[sec.id]; }).map(function (sec) {
        return (m.secoes.length > 1 ? '<h3 class="doc-secao">' + esc(sec.nome) + '</h3>' : '') + '<p class="doc-texto">' + esc(d.conteudo[sec.id]) + '</p>';
      }).join('') +
      (d.validade ? '<p class="doc-texto">Este documento tem validade de ' + esc(d.validade) + ', a contar da data de emissão.</p>' : '') +
      '<p class="doc-local">' + (d.local ? esc(d.local) + ', ' : '') + dataPorExtenso(d.emitidoEm) + '.</p>' +
      '<div class="doc-assinaturas">' + R().assinaturasDe('documento', d.id).map(function (a) {
        return '<div class="doc-assinatura"><span class="linha-assinatura"></span>' + quemAssina(a.usuarioId) +
          '<br><span class="pequeno">Assinado eletronicamente em ' + data(a.em) + (a.hash ? ' · ' + esc(a.hash.slice(0, 12)) : '') + '</span></div>';
      }).join('') + '</div></article>' +
      '<article class="documento-psicologico protocolo" aria-label="Protocolo de entrega"><h2 class="doc-titulo">Protocolo de entrega</h2>' +
      '<p class="doc-texto">Documento: ' + esc(m.nome) + ' (' + esc(d.titulo) + '), emitido em ' + data(d.emitidoEm) + ', para ' + esc(d.destinatario) + '.</p>' +
      '<p class="doc-texto">Recebi o documento acima em ____/____/________.</p>' +
      '<div class="doc-assinaturas"><div class="doc-assinatura"><span class="linha-assinatura"></span>Nome legível e assinatura de quem recebeu</div></div></article>';
    return html;
  };

  PEP.telas.imprimir = function (u, casoId) {
    var caso = PEP.util.porId(PEP.db.casos, casoId);
    if (!caso) return '<h1>Caso não encontrado</h1>';
    var autorizado = u.perfil === 'tecnico' || R().ehSupervisorDoCaso(u, caso);
    if (!autorizado) return PEP.ui.semPermissao('A cópia é gerada pela psicóloga técnica ou pelo supervisor do caso.');
    if (R().precisaJustificar(u, caso)) return '<h1>Cópia do prontuário</h1>' + PEP.telas.formularioJustificativa(caso, '#/imprimir/' + caso.id);
    var omitidos = PEP.telas.riscoNaCopia(caso).omitidos;
    return '<div class="linha entre nao-imprimir" style="margin-bottom:1rem"><a href="#/caso/' + caso.id + '">← Voltar ao caso</a>' +
      '<button class="botao" data-acao="imprimir" data-caso="' + caso.id + '">Imprimir / salvar em PDF</button></div>' +
      (omitidos ? '<div class="aviso restrito pequeno nao-imprimir" role="note"><strong>Só para a equipe (não sai na impressão):</strong> esta cópia de criança ou adolescente omite ' +
        omitidos + ' registro(s) de violência ou notificação. Ao responsável, o estritamente essencial (Código de Ética, art. 13); a supervisão orienta o que comunicar.</div>' : '') +
      PEP.telas.copiaProntuario(caso, 'por ' + PEP.ui.nomeUsuario(u.id));
  };
})();
