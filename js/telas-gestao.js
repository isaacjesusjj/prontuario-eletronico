/* =========================================================
   telas-gestao.js — validação do supervisor, fila de espera,
   triagem e alocação.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };

  function diasDesde(dataIso) {
    var ms = new Date(PEP.util.hoje() + 'T00:00') - new Date(dataIso + 'T00:00');
    return Math.max(0, Math.round(ms / 86400000));
  }

  // ---------- Supervisor: fila de validação ----------
  PEP.telas.supervisao = function (u) {
    if (u.perfil !== 'supervisor') return PEP.ui.semPermissao();
    var ids = PEP.regras.casosVisiveis(u).map(function (c) { return c.id; });
    var fila = PEP.db.evolucoes.filter(function (e) { return ids.indexOf(e.casoId) !== -1 && e.status === 'enviada'; });
    var html = '<h1>Validação de evoluções</h1><p class="suave">Ao validar, você assina junto com o estagiário e o registro fica bloqueado. Para corrigir depois, só por adendo.</p>';
    if (!fila.length) return html + '<p class="vazio">Nenhuma evolução aguardando validação.</p>';
    return html + fila.map(function (e) {
      var c = PEP.util.porId(PEP.db.casos, e.casoId);
      return '<div class="cartao evolucao"><div class="linha entre"><strong>' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' · ' + data(e.data) + '</strong>' + PEP.ui.etiquetaEvolucao(e.status) + '</div>' +
        '<p class="suave pequeno">por ' + esc(PEP.ui.nomeUsuario(e.autorId)) + '</p><div class="texto">' + esc(e.texto) + '</div>' +
        '<a class="botao pequeno" href="#/caso/' + c.id + '/evolucoes">Abrir para validar ou devolver</a></div>';
    }).join('');
  };

  // ---------- Técnico: fila de espera ----------
  PEP.telas.fila = function (u) {
    if (!PEP.regras.podeGerirFila(u)) return PEP.ui.semPermissao();
    var fila = PEP.db.inscricoes.filter(function (i) { return i.status === 'aguardando'; })
      .sort(function (a, b) { return a.data.localeCompare(b.data); });
    var html = '<h1>Fila de espera</h1><p class="suave">Ordem de chegada. Menores de idade e situações de vulnerabilidade aparecem sinalizados. Urgência não espera fila: encaminhe na hora.</p>';
    if (!fila.length) return html + '<p class="vazio">Fila vazia.</p>';
    return html + '<div class="cartao tabela-rolagem"><table><thead><tr><th>Inscrição</th><th>Idade</th><th>Motivo (resumo)</th><th>Período</th><th>Espera</th><th></th></tr></thead><tbody>' +
      fila.map(function (i) {
        return '<tr><td>' + esc(i.nome) + '<br><span class="suave pequeno">desde ' + data(i.data) + '</span></td><td>' + esc(i.idade) +
          (i.idade < 18 ? ' <span class="etiqueta alerta">menor</span>' : '') + '</td><td>' + esc(i.resumo) + '</td><td>' + esc(i.periodo) + '</td><td>' +
          diasDesde(i.data) + ' dias</td><td><a class="botao pequeno" href="#/triagem/' + i.id + '">Triar</a></td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  // ---------- Técnico: triagem e cadastro ----------
  PEP.telas.triagem = function (u, inscricaoId) {
    if (!PEP.regras.podeGerirFila(u)) return PEP.ui.semPermissao();
    var i = PEP.util.porId(PEP.db.inscricoes, inscricaoId);
    if (!i || i.status !== 'aguardando') return '<p>Inscrição não encontrada ou já triada.</p><a href="#/fila">Voltar à fila</a>';
    var grupos = PEP.db.grupos.map(function (g) { return '<option value="' + g.id + '">' + esc(g.nome) + ' · ' + esc(g.foco) + '</option>'; }).join('');
    return '<a href="#/fila" class="suave">← Fila de espera</a><h1 style="margin-top:.5rem">Triagem e cadastro</h1>' +
      '<div class="cartao"><div class="grade-2">' +
      '<div class="campo"><label for="tr-nome">Nome</label><input id="tr-nome" type="text" value="' + esc(i.nome) + '"></div>' +
      '<div class="campo"><label for="tr-idade">Idade</label><input id="tr-idade" type="number" value="' + esc(i.idade) + '"></div>' +
      '<div class="campo"><label for="tr-contato">Contato</label><input id="tr-contato" type="text" value="' + esc(i.contato) + '"></div>' +
      '<div class="campo"><label for="tr-resp">Responsável legal (se menor)</label><input id="tr-resp" type="text" value="' + esc(i.responsavel || '') + '"></div></div>' +
      '<div class="campo"><label for="tr-demanda">Demanda identificada no acolhimento</label><textarea id="tr-demanda" style="min-height:80px">' + esc(i.resumo) + '</textarea></div>' +
      '<div class="grade-2"><div class="campo"><label for="tr-risco">Avaliação de risco</label><select id="tr-risco">' +
      '<option value="sem">Sem risco aparente</option><option value="risco">Risco identificado — encaminhar agora</option></select></div>' +
      '<div class="campo"><label for="tr-destino">Encaminhamento</label><select id="tr-destino">' +
      '<option value="clinica">Atendimento na clínica-escola</option><option value="externo">Encaminhamento externo (CAPS, UBS, CRAS)</option></select></div></div>' +
      '<div class="aviso alerta pequeno">Com risco identificado: acione o supervisor, encaminhe à rede (CAPS, UPA, SAMU 192) e registre a notificação compulsória quando a lei exigir.</div>' +
      '<div class="campo"><label for="tr-grupo">Alocar ao grupo (o supervisor define a dupla ou trio)</label><select id="tr-grupo"><option value="">Alocar depois</option>' + grupos + '</select></div>' +
      '<fieldset class="campo" style="border:1px solid var(--borda);border-radius:8px;padding:.6rem .8rem"><legend class="pequeno"><strong>Consentimentos informados na triagem (um por finalidade)</strong></legend>' +
      '<label class="check"><input type="checkbox" id="tr-c1" checked> <span>Contrato terapêutico (horários, faltas, sigilo e seus limites)</span></label>' +
      '<label class="check"><input type="checkbox" id="tr-c2"> <span>Discussão do caso em supervisão em grupo</span></label>' +
      '<label class="check"><input type="checkbox" id="tr-c3"> <span>Gravação de sessões para supervisão</span></label>' +
      '<label class="check"><input type="checkbox" id="tr-c4"> <span>Uso do caso, sem identificação, em ensino e pesquisa</span></label></fieldset>' +
      '<button class="botao" data-acao="concluir-triagem" data-id="' + i.id + '">Concluir triagem</button></div>';
  };

  // ---------- Alocação: direção, supervisor e técnico ----------
  function listaGrupos(editavelPor) {
    return PEP.db.grupos.map(function (g) {
      var podeEditar = editavelPor && editavelPor.perfil === 'supervisor' && g.supervisorId === editavelPor.id;
      var opcoesSub = g.subgrupos.map(function (s) { return '<option value="' + s.id + '">' + esc(s.nome) + '</option>'; }).join('');
      var html = '<div class="cartao"><div class="linha entre"><h2>' + esc(g.nome) + ' · ' + esc(g.foco) + '</h2><span class="suave">Supervisão: ' + esc(PEP.ui.nomeUsuario(g.supervisorId)) + '</span></div>';
      html += g.subgrupos.map(function (s) {
        return '<p><strong>' + esc(s.nome) + ':</strong> ' + (s.estagiarios.map(PEP.ui.nomeUsuario).join(', ') || '<span class="vazio">vazio</span>') + '</p>';
      }).join('');
      var semDupla = g.semDupla || [];
      if (semDupla.length) {
        html += '<p class="suave"><strong>Sem dupla:</strong> ' + semDupla.map(PEP.ui.nomeUsuario).join(', ') + '</p>';
        if (podeEditar) {
          html += semDupla.map(function (id) {
            return '<div class="linha" style="margin-bottom:.4rem"><span>' + esc(PEP.ui.nomeUsuario(id)) + ' →</span><select id="dup-' + id + '" style="width:auto">' + opcoesSub + '</select>' +
              '<button class="botao pequeno" data-acao="definir-dupla" data-grupo="' + g.id + '" data-id="' + id + '">Definir</button></div>';
          }).join('');
        }
      }
      if (podeEditar) {
        html += '<button class="botao secundario pequeno" data-acao="nova-dupla" data-grupo="' + g.id + '">Criar nova dupla ou trio</button>';
        var casosSemDupla = PEP.db.casos.filter(function (c) { return c.grupoId === g.id && !c.subgrupoId && c.status === 'ativo'; });
        html += casosSemDupla.map(function (c) {
          return '<div class="linha" style="margin-top:.6rem"><span>Caso de ' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' →</span><select id="cs-' + c.id + '" style="width:auto">' + opcoesSub + '</select>' +
            '<button class="botao pequeno" data-acao="atribuir-caso" data-id="' + c.id + '">Atribuir à dupla</button></div>';
        }).join('');
      }
      return html + '</div>';
    }).join('');
  }

  PEP.telas.alocacao = function (u) {
    var html;
    if (u.perfil === 'direcao') {
      html = '<h1>Grupos de estágio</h1><p class="suave">A direção define em qual grupo (e com qual supervisor) cada estagiário fica. Os casos clínicos não aparecem aqui.</p>';
      var opcoes = PEP.db.grupos.map(function (g) { return '<option value="' + g.id + '">' + esc(g.nome) + '</option>'; }).join('');
      html += '<div class="cartao"><h2>Estagiários sem grupo</h2>' + (PEP.db.estagiariosSemGrupo.length ? PEP.db.estagiariosSemGrupo.map(function (id) {
        return '<div class="linha" style="margin-bottom:.4rem"><span>' + esc(PEP.ui.nomeUsuario(id)) + ' →</span><select id="gr-' + id + '" style="width:auto">' + opcoes + '</select>' +
          '<button class="botao pequeno" data-acao="alocar-estagiario" data-id="' + id + '">Alocar</button></div>';
      }).join('') : '<p class="vazio">Todos alocados.</p>') + '</div>';
      return html + listaGrupos(null);
    }
    if (u.perfil === 'supervisor') {
      return '<h1>Duplas e trios</h1><p class="suave">Organize seus estagiários e atribua os casos alocados ao seu grupo.</p>' + listaGrupos(u);
    }
    if (u.perfil === 'tecnico') {
      var pendentes = PEP.db.casos.filter(function (c) { return c.status === 'aguardando-alocacao'; });
      var opcoesG = PEP.db.grupos.map(function (g) { return '<option value="' + g.id + '">' + esc(g.nome) + ' · ' + esc(g.foco) + '</option>'; }).join('');
      html = '<h1>Alocação de pacientes</h1><p class="suave">Você aloca o paciente triado a um grupo; o supervisor define a dupla ou trio.</p>' +
        '<div class="cartao"><h2>Aguardando alocação</h2>' + (pendentes.length ? pendentes.map(function (c) {
          return '<div class="linha" style="margin-bottom:.4rem"><span>' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' →</span><select id="ag-' + c.id + '" style="width:auto">' + opcoesG + '</select>' +
            '<button class="botao pequeno" data-acao="alocar-caso" data-id="' + c.id + '">Alocar</button></div>';
        }).join('') : '<p class="vazio">Nenhum caso aguardando.</p>') + '</div>';
      return html + listaGrupos(null);
    }
    return PEP.ui.semPermissao();
  };
})();
