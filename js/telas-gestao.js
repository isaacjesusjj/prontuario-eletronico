/* =========================================================
   telas-gestao.js — validação do supervisor, fila de espera,
   triagem, edição de cadastro, alocação e estudantes.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };
  var V = function () { return PEP.validar; };

  function diasDesde(dataIso) { return Math.max(0, PEP.util.diasEntre(dataIso, PEP.util.hoje())); }

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
        PEP.revisor.html(PEP.revisor.analisar(e.texto), true) +
        '<a class="botao pequeno" href="#/caso/' + c.id + '/evolucoes">Abrir para validar ou devolver</a></div>';
    }).join('');
  };

  function descreverDuplicidade(dup) {
    if (!dup) return '';
    if (dup.tipo === 'paciente') {
      var p = PEP.util.porId(PEP.db.pacientes, dup.id);
      var casos = PEP.db.casos.filter(function (c) { return c.pacienteId === dup.id; });
      var ult = casos[casos.length - 1];
      return 'CPF já cadastrado: ' + (p ? PEP.ui.nomePaciente(p, p.id) : dup.id) + (ult ? ' (último caso ' + ult.id + ', ' + (ult.status === 'encerrado' ? 'encerrado' : ult.status) + ')' : '');
    }
    var i = PEP.util.porId(PEP.db.inscricoes, dup.id);
    return 'CPF igual ao de outra inscrição na fila: ' + (i ? PEP.ui.nomeInscricao(i) + ' (' + data(i.data) + ')' : dup.id);
  }

  // ---------- Técnico: fila de espera ----------
  PEP.telas.fila = function (u) {
    if (!PEP.regras.podeGerirFila(u)) return PEP.ui.semPermissao();
    // Ordem de chegada; quem escreveu algo com sinal de urgência aparece primeiro (contato no mesmo dia)
    var fila = PEP.db.inscricoes.filter(function (i) { return i.status === 'aguardando'; })
      .sort(function (a, b) { return (b.sinalUrgencia ? 1 : 0) - (a.sinalUrgencia ? 1 : 0) || a.data.localeCompare(b.data); });
    var html = '<h1>Fila de espera</h1><p class="suave">Ordem de chegada; quem escreveu algo com sinal de urgência vem primeiro. Menores de idade e CPF já cadastrado aparecem sinalizados. Urgência não espera fila: contate no mesmo dia e encaminhe à rede.</p>';
    if (!fila.length) return html + '<p class="vazio">Fila vazia.</p>';
    return html + '<div class="cartao tabela-rolagem"><table><caption class="sr-only">Pessoas aguardando triagem</caption><thead><tr><th scope="col">Inscrição</th><th scope="col">Idade</th><th scope="col">Motivo (resumo)</th><th scope="col">Período</th><th scope="col">Espera</th><th scope="col"></th></tr></thead><tbody>' +
      fila.map(function (i) {
        var idade = PEP.util.idade(i.dataNascimento);
        return '<tr><td>' + esc(PEP.ui.nomeInscricao(i)) + '<br><span class="suave pequeno">desde ' + data(i.data) + '</span>' +
          (i.sinalUrgencia ? '<br><span class="etiqueta perigo">Sinal de urgência: contatar hoje</span>' : '') +
          (i.duplicidade ? '<br><span class="etiqueta alerta">CPF já cadastrado</span>' : '') + (i.semCpf ? '<br><span class="etiqueta rascunho">sem CPF</span>' : '') + '</td><td>' + esc(idade) +
          (idade < 18 ? ' <span class="etiqueta alerta">menor</span>' : '') + '</td><td>' + esc(i.resumo) + '</td><td>' + esc(i.periodo) + '</td><td>' +
          diasDesde(i.data) + ' dias</td><td><a class="botao pequeno" href="#/triagem/' + i.id + '">Triar</a></td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  // Campos de identificação (usados na triagem e na edição do cadastro)
  function camposIdentificacao(prefixo, v) {
    var canais = PEP.ui.opcoes(PEP.lista('canaisLembrete'), v.canalLembrete || 'whatsapp');
    return '<div class="grade-2">' +
      '<div class="campo"><label for="' + prefixo + '-nome">Nome completo *</label><input id="' + prefixo + '-nome" type="text" maxlength="80" value="' + esc(v.nome) + '"></div>' +
      '<div class="campo"><label for="' + prefixo + '-social">Nome social</label><input id="' + prefixo + '-social" type="text" maxlength="80" value="' + esc(v.nomeSocial || '') + '"></div>' +
      '<div class="campo"><label for="' + prefixo + '-nasc">Data de nascimento *</label><input id="' + prefixo + '-nasc" type="date" value="' + esc(v.dataNascimento) + '"></div>' +
      '<div class="campo"><label for="' + prefixo + '-cpf">CPF</label><input id="' + prefixo + '-cpf" type="text" inputmode="numeric" data-mascara="cpf" maxlength="14" value="' + esc(V().formatarCpf(v.cpf || '')) + '">' +
      '<span class="dica">Obrigatório, a não ser que a pessoa não tenha CPF.</span></div>' +
      '<div class="campo"><label for="' + prefixo + '-tel">Telefone *</label><input id="' + prefixo + '-tel" type="tel" data-mascara="telefone" maxlength="15" value="' + esc(V().formatarTelefone(v.telefone)) + '"></div>' +
      '<div class="campo"><label for="' + prefixo + '-email">E-mail</label><input id="' + prefixo + '-email" type="email" maxlength="254" value="' + esc(v.email || '') + '"></div>' +
      '<div class="campo"><label for="' + prefixo + '-resp">Responsável legal (se menor)</label><input id="' + prefixo + '-resp" type="text" maxlength="80" value="' + esc(v.responsavelNome || '') + '"></div>' +
      '<div class="campo"><label for="' + prefixo + '-resptel">Telefone do responsável</label><input id="' + prefixo + '-resptel" type="tel" data-mascara="telefone" maxlength="15" value="' + esc(V().formatarTelefone(v.responsavelTelefone || '')) + '"></div>' +
      '<div class="campo"><label for="' + prefixo + '-canal">Lembretes de sessão</label><select id="' + prefixo + '-canal">' + canais + '</select></div>' +
      '</div>';
  }

  // ---------- Técnico: triagem e cadastro ----------
  PEP.telas.triagem = function (u, inscricaoId) {
    if (!PEP.regras.podeGerirFila(u)) return PEP.ui.semPermissao();
    var i = PEP.util.porId(PEP.db.inscricoes, inscricaoId);
    if (!i || i.status !== 'aguardando') return '<h1>Triagem</h1><p>Inscrição não encontrada ou já triada.</p><a href="#/fila">Voltar à fila</a>';
    var dup = i.duplicidade || V().cpfJaCadastrado(i.cpf, { inscricaoId: i.id });
    var grupos = PEP.db.grupos.map(function (g) { return '<option value="' + g.id + '">' + esc(g.nome) + ' · ' + esc(g.foco) + '</option>'; }).join('');
    var consent = PEP.lista('finalidadesConsentimento').map(function (f) {
      return '<label class="check"><input type="checkbox" id="tr-c-' + f.id + '"' + (f.obrigatoria ? ' checked' : '') + '> <span>' + esc(f.nome) + '</span></label>';
    }).join('');
    var ident = { nome: i.nome, dataNascimento: i.dataNascimento, cpf: i.cpf, telefone: i.telefone, email: i.email, responsavelNome: i.responsavelNome };
    var p = dup && dup.tipo === 'paciente' ? PEP.util.porId(PEP.db.pacientes, dup.id) : null;
    if (p) ident = p;
    return '<a href="#/fila" class="suave">← Fila de espera</a><h1 style="margin-top:.5rem">Triagem e cadastro</h1>' +
      (dup ? '<div class="aviso alerta" role="note"><strong>' + esc(descreverDuplicidade(dup)) + '.</strong> ' +
        (dup.tipo === 'paciente' ? 'Ao concluir, o novo caso fica ligado ao cadastro existente (não cria paciente duplicado). Os campos abaixo vêm do cadastro.' :
          'Confira se é a mesma pessoa. Se for, marque esta inscrição como duplicada.') + '</div>' : '') +
      '<div class="cartao" id="form-triagem"><h2>Identificação</h2>' + camposIdentificacao('tr', ident) +
      '<h2>Acolhimento</h2>' +
      '<div class="campo"><label for="tr-demanda">Demanda identificada no acolhimento *</label><textarea id="tr-demanda" style="min-height:80px">' + esc(i.resumo) + '</textarea></div>' +
      '<div class="grade-2"><div class="campo"><label for="tr-risco">Avaliação de risco</label><select id="tr-risco">' +
      '<option value="sem">Sem risco aparente</option><option value="risco">Risco identificado — encaminhar agora</option></select></div>' +
      '<div class="campo"><label for="tr-destino">Encaminhamento</label><select id="tr-destino">' +
      '<option value="clinica">Atendimento na clínica-escola</option><option value="externo">Encaminhamento externo (CAPS, UBS, CRAS)</option></select></div></div>' +
      // Risco visto na triagem vira uma avaliação de risco no caso (a supervisão vê no painel)
      '<div id="tr-risco-detalhes" hidden><fieldset class="caixa-campos"><legend class="pequeno"><strong>Avaliação de risco da triagem</strong></legend>' +
      '<div class="grade-2"><div class="campo"><label for="tr-rk-tipo">Tipo de risco</label><select id="tr-rk-tipo">' +
      PEP.ui.opcoes(PEP.lista('tiposRisco').map(function (t) { return { valor: t.id, nome: t.nome }; })) + '</select></div>' +
      '<div class="campo"><label for="tr-rk-nivel">Nível</label><select id="tr-rk-nivel">' +
      PEP.ui.opcoes(PEP.lista('niveisRisco').map(function (n) { return { valor: n.id, nome: n.nome }; }), 'moderado') + '</select></div></div>' +
      '<div class="campo"><label for="tr-rk-desc">O que foi observado ou dito *</label><textarea id="tr-rk-desc" style="min-height:70px" maxlength="' + PEP.regra('riscoDescricaoMaxCaracteres') + '"></textarea></div>' +
      '</fieldset></div>' +
      '<div class="campo" id="tr-encaminhado-linha" hidden><label for="tr-encaminhado">Serviço para onde a pessoa foi encaminhada *</label>' +
      '<input id="tr-encaminhado" type="text" maxlength="120" list="tr-lista-servicos" autocomplete="off"><datalist id="tr-lista-servicos">' +
      PEP.lista('servicosRede').map(function (s) { return '<option value="' + esc(s) + '"></option>'; }).join('') + '</datalist></div>' +
      '<div class="aviso alerta pequeno">Com risco identificado: acione o supervisor, encaminhe à rede (CAPS, UPA, SAMU 192) e registre a notificação compulsória quando a lei exigir. ' +
      'Urgência: ' + PEP.telas.contatosUrgencia(true) + '.</div>' +
      '<div class="campo"><label for="tr-grupo">Alocar ao grupo (o supervisor define a dupla ou trio)</label><select id="tr-grupo"><option value="">Alocar depois</option>' + grupos + '</select></div>' +
      '<fieldset class="caixa-campos"><legend class="pequeno"><strong>Consentimentos informados na triagem (um por finalidade, termo ' + esc(PEP.config().termos.consentimento) + ')</strong></legend>' + consent + '</fieldset>' +
      '<div class="linha"><button class="botao" data-acao="concluir-triagem" data-id="' + i.id + '">Concluir triagem</button>' +
      (dup && dup.tipo === 'inscricao' ? '<button class="botao secundario" data-acao="marcar-duplicada" data-id="' + i.id + '">Marcar como duplicada</button>' : '') + '</div></div>';
  };

  // ---------- Técnico: edição do cadastro do paciente ----------
  PEP.telas.editarPaciente = function (u, pacienteId) {
    if (!PEP.regras.podeEditarCadastro(u)) return PEP.ui.semPermissao('Só a psicóloga técnica edita o cadastro.');
    var p = PEP.util.porId(PEP.db.pacientes, pacienteId);
    if (!p) return '<h1>Paciente não encontrado</h1>';
    var caso = PEP.db.casos.filter(function (c) { return c.pacienteId === p.id; }).pop();
    return (caso ? '<a href="#/caso/' + caso.id + '" class="suave">← Voltar ao caso</a>' : '') +
      '<h1 style="margin-top:.5rem">Editar cadastro</h1>' +
      '<div class="cartao" id="form-paciente"><p class="suave pequeno">A alteração fica registrada na auditoria (quem e quando, sem os valores).</p>' +
      camposIdentificacao('pc', p) +
      '<button class="botao" data-acao="salvar-paciente" data-id="' + p.id + '">Salvar cadastro</button></div>';
  };

  // ---------- Alocação: direção, supervisor e técnico ----------
  function listaGrupos(u) {
    return PEP.db.grupos.map(function (g) {
      var podeEditar = u && u.perfil === 'supervisor' && g.supervisorId === u.id;
      var ehDirecao = u && u.perfil === 'direcao';
      var subs = PEP.regras.subgruposDoGrupo(g.id);
      var opcoesSub = subs.map(function (s) { return '<option value="' + s.id + '">' + esc(s.nome) + '</option>'; }).join('');
      var botaoFim = function (id) { return ehDirecao ? ' <button class="botao secundario pequeno" data-acao="encerrar-estagio" data-id="' + id + '">Encerrar estágio</button>' : ''; };
      var html = '<div class="cartao"><div class="linha entre"><h2>' + esc(g.nome) + ' · ' + esc(g.foco) + '</h2><span class="suave">Supervisão: ' + esc(PEP.ui.nomeUsuario(g.supervisorId)) + '</span></div>';
      html += subs.map(function (s) {
        var est = PEP.regras.estagiariosDoSubgrupo(s.id);
        return '<p><strong>' + esc(s.nome) + ':</strong> ' + (est.map(function (id) { return esc(PEP.ui.nomeUsuario(id)) + botaoFim(id); }).join(', ') || '<span class="vazio">vazio</span>') + '</p>';
      }).join('');
      var semDupla = PEP.regras.estagiariosSemDupla(g.id);
      if (semDupla.length) {
        html += '<p class="suave"><strong>Sem dupla:</strong> ' + semDupla.map(function (id) { return esc(PEP.ui.nomeUsuario(id)) + botaoFim(id); }).join(', ') + '</p>';
        if (podeEditar) {
          html += semDupla.map(function (id) {
            return '<div class="linha" style="margin-bottom:.4rem"><label for="dup-' + id + '">' + esc(PEP.ui.nomeUsuario(id)) + ' →</label><select id="dup-' + id + '" style="width:auto">' + opcoesSub + '</select>' +
              '<button class="botao pequeno" data-acao="definir-dupla" data-grupo="' + g.id + '" data-id="' + id + '">Definir</button></div>';
          }).join('');
        }
      }
      var n = PEP.regras.estagiariosDoGrupo(g.id).length;
      if (n > PEP.regra('maxEstagiariosPorGrupo')) html += '<p class="aviso alerta pequeno">' + n + ' estagiários neste grupo (referência: até ' + PEP.regra('maxEstagiariosPorGrupo') + ').</p>';
      if (podeEditar) {
        html += '<button class="botao secundario pequeno" data-acao="nova-dupla" data-grupo="' + g.id + '">Criar nova dupla ou trio</button>';
        var casosSemDupla = PEP.db.casos.filter(function (c) { return c.grupoId === g.id && !c.subgrupoId && c.status === 'ativo'; });
        html += casosSemDupla.map(function (c) {
          return '<div class="linha" style="margin-top:.6rem"><label for="cs-' + c.id + '">Caso de ' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' →</label><select id="cs-' + c.id + '" style="width:auto">' + opcoesSub + '</select>' +
            '<button class="botao pequeno" data-acao="atribuir-caso" data-id="' + c.id + '">Atribuir à dupla</button></div>';
        }).join('');
      }
      return html + '</div>';
    }).join('');
  }

  PEP.telas.alocacao = function (u) {
    var html;
    if (u.perfil === 'direcao') {
      html = '<h1>Grupos de estágio</h1><p class="suave">A direção define em qual grupo (e com qual supervisor) cada estagiário fica, e encerra o vínculo no fim do semestre. Ao encerrar, o estagiário perde o acesso aos casos na hora; o histórico continua.</p>';
      var opcoes = PEP.db.grupos.map(function (g) { return '<option value="' + g.id + '">' + esc(g.nome) + '</option>'; }).join('');
      var sem = PEP.regras.estagiariosSemGrupo();
      html += '<div class="cartao"><h2>Estagiários sem grupo</h2>' + (sem.length ? sem.map(function (id) {
        return '<div class="linha" style="margin-bottom:.4rem"><label for="gr-' + id + '">' + esc(PEP.ui.nomeUsuario(id)) + ' →</label><select id="gr-' + id + '" style="width:auto">' + opcoes + '</select>' +
          '<button class="botao pequeno" data-acao="alocar-estagiario" data-id="' + id + '">Alocar</button></div>';
      }).join('') : '<p class="vazio">Todos alocados.</p>') + '<a class="pequeno" href="#/estudantes">Importar estudantes da universidade</a></div>';
      return html + listaGrupos(u);
    }
    if (u.perfil === 'supervisor') {
      return '<h1>Duplas e trios</h1><p class="suave">Organize seus estagiários e atribua os casos alocados ao seu grupo.</p>' + PEP.telas.alertaSemDupla(u) + listaGrupos(u);
    }
    if (u.perfil === 'tecnico') {
      var pendentes = PEP.db.casos.filter(function (c) { return c.status === 'aguardando-alocacao'; });
      var opcoesG = PEP.db.grupos.map(function (g) { return '<option value="' + g.id + '">' + esc(g.nome) + ' · ' + esc(g.foco) + '</option>'; }).join('');
      html = '<h1>Alocação de pacientes</h1><p class="suave">Você aloca o paciente triado a um grupo; o supervisor define a dupla ou trio.</p>' + PEP.telas.alertaSemDupla(u) +
        '<div class="cartao"><h2>Aguardando alocação</h2>' + (pendentes.length ? pendentes.map(function (c) {
          return '<div class="linha" style="margin-bottom:.4rem"><label for="ag-' + c.id + '">' + esc(PEP.ui.nomePacienteDoCaso(c)) + ' →</label><select id="ag-' + c.id + '" style="width:auto">' + opcoesG + '</select>' +
            '<button class="botao pequeno" data-acao="alocar-caso" data-id="' + c.id + '">Alocar</button></div>';
        }).join('') + '<p class="suave pequeno">Para alocar, o contrato terapêutico precisa estar registrado nos consentimentos do caso.</p>' : '<p class="vazio">Nenhum caso aguardando.</p>') + '</div>';
      return html + listaGrupos(null);
    }
    return PEP.ui.semPermissao();
  };

  // ---------- Contas: senha provisória mostrada uma vez e botões de gestão ----------
  PEP.telas._senhaGerada = null; // { nome, login, senha } — só na memória da página, até sair da tela
  PEP.telas.senhaGeradaAgora = function () {
    var g = PEP.telas._senhaGerada;
    if (!g) return '';
    return '<div class="cartao destaque-sucesso" role="status"><h2>Senha provisória de ' + esc(g.nome) + '</h2>' +
      '<p>Usuário <strong>' + esc(g.login) + '</strong> · senha provisória <span class="codigo" id="senha-gerada">' + esc(g.senha) + '</span></p>' +
      '<p class="suave pequeno">Aparece só agora: o sistema guarda só o hash. Entregue pessoalmente ou por canal institucional, nunca por mensagem pessoal. A pessoa troca no primeiro acesso.</p>' +
      '<button class="botao secundario pequeno" data-acao="fechar-senha-gerada">Fechar</button></div>';
  };
  PEP.telas.botoesConta = function (x) {
    return '<button class="botao secundario pequeno" data-acao="gerar-senha-provisoria" data-id="' + x.id + '"' + (x.ativo ? '' : ' disabled') + '>Gerar senha provisória</button>' +
      '<button class="botao secundario pequeno" data-acao="alternar-conta" data-id="' + x.id + '">' + (x.ativo ? 'Desativar' : 'Reativar') + '</button>' +
      (x.mfaAtivo ? '<button class="botao secundario pequeno" data-acao="desligar-mfa-conta" data-id="' + x.id + '">Desligar duas etapas (celular perdido)</button>' : '');
  };

  // ---------- Direção: estudantes (lista e importação) ----------
  PEP.telas._importacao = null; // { linhas: [...], resultado: [...] }

  PEP.telas.estudantes = function (u) {
    if (!PEP.regras.podeGerirEstudantes(u)) return PEP.ui.semPermissao();
    var imp = PEP.telas._importacao;
    var lista = PEP.db.usuarios.filter(function (x) { return x.perfil === 'estagiario'; });
    var html = '<h1>Estudantes e contas</h1><p class="suave">Contas de estudantes de Psicologia. Importe a lista da universidade (CSV) para criar as contas; cada estudante recebe uma senha provisória e troca no primeiro acesso.</p>';

    if (imp && imp.resultado) {
      html += '<div class="cartao destaque-sucesso" role="status"><h2>' + imp.resultado.length + ' conta(s) criada(s)</h2>' +
        '<p class="suave pequeno">As senhas provisórias aparecem só agora. No sistema real, elas vão por e-mail institucional (ou o login é feito pela conta da universidade).</p>' +
        '<div class="tabela-rolagem"><table><thead><tr><th scope="col">Nome</th><th scope="col">Usuário</th><th scope="col">Senha provisória</th></tr></thead><tbody>' +
        imp.resultado.map(function (r) { return '<tr><td>' + esc(r.nome) + '</td><td>' + esc(r.login) + '</td><td class="codigo">' + esc(r.senha) + '</td></tr>'; }).join('') +
        '</tbody></table></div><button class="botao secundario pequeno" data-acao="fechar-importacao">Fechar</button></div>';
    }

    html += '<div class="cartao" id="form-importar"><h2>Importar lista da universidade</h2>' +
      '<p class="suave pequeno">Uma linha por estudante: <code>nome;matrícula;e-mail</code>. A primeira linha pode ser o cabeçalho. Conferimos nome, matrícula (6 a 12 letras ou números), e-mail e duplicidade antes de criar.</p>' +
      '<div class="campo"><label for="im-arquivo">Arquivo CSV</label><input id="im-arquivo" type="file" accept=".csv,text/csv"></div>' +
      '<div class="campo"><label for="im-texto">Ou cole a lista</label><textarea id="im-texto" style="min-height:110px;font-family:monospace">' +
      esc(imp && imp.texto ? imp.texto : 'nome;matricula;email\nJoana Exemplo;20240101;joana.exemplo@' + PEP.config().instituicao.dominioEmailEstudante + '\nPedro Exemplo;20240102;pedro.exemplo@' + PEP.config().instituicao.dominioEmailEstudante) + '</textarea></div>' +
      '<button class="botao secundario" data-acao="conferir-importacao">Conferir lista</button>';
    if (imp && imp.linhas) {
      var validas = imp.linhas.filter(function (l) { return !l.erro; });
      html += '<div class="tabela-rolagem" style="margin-top:1rem"><table><caption>Conferência: ' + validas.length + ' válida(s), ' + (imp.linhas.length - validas.length) + ' com erro</caption>' +
        '<thead><tr><th scope="col">Linha</th><th scope="col">Nome</th><th scope="col">Matrícula</th><th scope="col">E-mail</th><th scope="col">Situação</th></tr></thead><tbody>' +
        imp.linhas.map(function (l) {
          return '<tr><td>' + l.n + '</td><td>' + esc(l.nome) + '</td><td>' + esc(l.matricula) + '</td><td>' + esc(l.email) + '</td><td>' +
            (l.erro ? '<span class="etiqueta perigo">' + esc(l.erro) + '</span>' : '<span class="etiqueta validada">ok</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (validas.length ? '<button class="botao" data-acao="importar-estudantes">Criar ' + validas.length + ' conta(s)</button>' : '');
    }
    html += '</div>';

    // Contas da equipe: senha provisória (esqueceu a senha) e desativar/reativar (nada é apagado)
    var equipe = PEP.db.usuarios.filter(function (x) { return x.perfil !== 'paciente' && x.id !== u.id; });
    html += PEP.telas.senhaGeradaAgora() +
      '<div class="cartao"><h2>Contas da equipe (' + equipe.length + ')</h2>' +
      '<p class="suave pequeno">Esqueceu a senha: gere uma senha provisória, entregue pessoalmente ou pelo e-mail institucional; a pessoa troca no primeiro acesso. ' +
      'Conta desativada não entra no sistema, mas o histórico dela continua.</p><div class="tabela-rolagem"><table>' +
      '<thead><tr><th scope="col">Nome</th><th scope="col">Perfil</th><th scope="col">Usuário</th><th scope="col">Situação</th><th scope="col">Ações</th></tr></thead><tbody>' +
      equipe.map(function (x) {
        return '<tr><td>' + esc(x.nome) + (x.matricula ? '<br><span class="suave pequeno">matrícula ' + esc(x.matricula) + '</span>' : '') + '</td><td>' + esc(PEP.regras.nomePerfil(x.perfil)) + '</td>' +
          '<td>' + esc(x.login) + '</td><td>' + (x.ativo ? esc(PEP.regras.descricaoUsuario(x).replace(x.cargo + ' · ', '').replace(x.cargo, '') || 'ativa') : '<span class="etiqueta perigo">desativada</span>') +
          (x.senhaProvisoria ? ' <span class="etiqueta alerta">senha provisória</span>' : '') + (x.mfaAtivo ? ' <span class="etiqueta validada">duas etapas</span>' : '') + '</td>' +
          '<td><div class="linha">' + PEP.telas.botoesConta(x) + '</div></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    return html;
  };
})();
