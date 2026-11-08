/* =========================================================
   permissoes.js — regras de acesso e de negócio.
   ATENÇÃO: no protótipo as regras rodam no navegador. No banco,
   as MESMAS regras viram políticas RLS (banco/schema.sql), e o
   navegador só recebe as linhas que o usuário pode ver.

   Base das regras (vigência conferida em nov/2026):
   - Res. CFP 05/2025: direito de acesso informado ao usuário e
     termo de responsabilidade do estagiário (art. 10, I e III);
     conteúdo do prontuário (art. 12); acesso irrestrito do
     usuário (art. 13); testes fora do prontuário (art. 14);
     registro de supervisão só entre orientadores, supervisores
     e estagiários (art. 17); guarda mínima de 5 anos (art. 18);
     documentos assinados por estagiário e psicólogo (art. 19).
     O art. 5º (parâmetros de orientação, ex.: até 10 por grupo)
     está suspenso por liminar do STF (ADI 7911): aqui vira só
     um alerta configurável.
   - Res. CFP 01/2009, art. 3º: em serviço-escola, o registro
     identifica e é assinado pelo estagiário e pelo supervisor.
   - LGPD: princípio da necessidade (cada perfil vê só o que precisa).
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.regras = (function () {
  var porId = function (lista, id) { return PEP.util.porId(lista, id); };

  function nomePerfil(perfil) { return PEP.lista('perfis')[perfil] || perfil; }

  // ---------- Alocações (vínculo do estagiário com grupo e dupla) ----------
  // O acesso nasce e morre com o vínculo: alocação com "fim" no passado não dá acesso.
  // "fim" é o dia em que o vínculo deixa de valer
  function alocacaoAtiva(a) { return !a.fim || a.fim > PEP.util.hoje(); }
  function alocacaoDoEstagiario(estagiarioId) {
    return PEP.db.alocacoes.filter(function (a) { return a.estagiarioId === estagiarioId && alocacaoAtiva(a); })[0] || null;
  }
  function estagiariosDoSubgrupo(subgrupoId) {
    return PEP.db.alocacoes.filter(function (a) { return a.subgrupoId === subgrupoId && alocacaoAtiva(a); })
      .map(function (a) { return a.estagiarioId; });
  }
  function estagiariosSemDupla(grupoId) {
    return PEP.db.alocacoes.filter(function (a) { return a.grupoId === grupoId && !a.subgrupoId && alocacaoAtiva(a); })
      .map(function (a) { return a.estagiarioId; });
  }
  function estagiariosSemGrupo() {
    return PEP.db.usuarios.filter(function (u) { return u.perfil === 'estagiario' && u.ativo && !alocacaoDoEstagiario(u.id); })
      .map(function (u) { return u.id; });
  }
  function subgruposDoGrupo(grupoId) { return PEP.db.subgrupos.filter(function (s) { return s.grupoId === grupoId; }); }
  function estagiariosDoGrupo(grupoId) {
    return PEP.db.alocacoes.filter(function (a) { return a.grupoId === grupoId && alocacaoAtiva(a); }).map(function (a) { return a.estagiarioId; });
  }

  function grupoDoCaso(caso) { return caso && caso.grupoId ? porId(PEP.db.grupos, caso.grupoId) : null; }
  function subgrupoDoCaso(caso) { return caso && caso.subgrupoId ? porId(PEP.db.subgrupos, caso.subgrupoId) : null; }
  function estagiariosDoCaso(caso) { return caso && caso.subgrupoId ? estagiariosDoSubgrupo(caso.subgrupoId) : []; }
  function supervisorDoCaso(caso) { var g = grupoDoCaso(caso); return g ? g.supervisorId : null; }

  function ehEstagiarioDoCaso(u, caso) { return u.perfil === 'estagiario' && estagiariosDoCaso(caso).indexOf(u.id) !== -1; }
  function ehSupervisorDoCaso(u, caso) { return u.perfil === 'supervisor' && supervisorDoCaso(caso) === u.id; }

  // Descrição calculada (não fica guardada, para não ficar desatualizada)
  function descricaoUsuario(u) {
    if (!u) return '';
    if (u.perfil === 'estagiario') {
      var a = alocacaoDoEstagiario(u.id);
      if (!a) {
        var antiga = PEP.db.alocacoes.filter(function (x) { return x.estagiarioId === u.id; }).pop();
        return u.cargo + (antiga ? ' · vínculo de estágio encerrado em ' + PEP.util.formatarData(antiga.fim) : ' · ainda sem grupo');
      }
      var g = porId(PEP.db.grupos, a.grupoId), s = a.subgrupoId ? porId(PEP.db.subgrupos, a.subgrupoId) : null;
      return u.cargo + ' · ' + g.nome + ', ' + (s ? s.nome : 'sem dupla');
    }
    if (u.perfil === 'supervisor') {
      var gs = PEP.db.grupos.filter(function (g) { return g.supervisorId === u.id; }).map(function (g) { return g.nome; });
      return u.cargo + (gs.length ? ' · ' + gs.join(' e ') : '');
    }
    if (u.perfil === 'paciente') return 'Paciente em atendimento';
    return u.cargo || '';
  }

  // ---------- Dados do caso ----------
  function anamnesesDoCaso(caso) {
    return PEP.db.anamneses.filter(function (a) { return a.casoId === caso.id; }).sort(function (a, b) { return a.versao - b.versao; });
  }
  function anamneseAtual(caso) { var l = anamnesesDoCaso(caso); return l[l.length - 1] || {}; }
  function encerramentoDoCaso(caso) { return PEP.db.encerramentos.filter(function (e) { return e.casoId === caso.id; })[0] || null; }
  function assinaturasDe(tipo, id) {
    return PEP.db.assinaturas.filter(function (a) { return a.alvoTipo === tipo && a.alvoId === id; })
      .sort(function (a, b) { return a.em.localeCompare(b.em); });
  }
  // Assinaturas que valem para o texto atual da evolução: a última do estagiário (com o hash
  // do texto que está na tela) e, se validada, a do supervisor. Rascunho e devolvida não têm.
  function assinaturasVigentes(e) {
    if (e.status !== 'enviada' && e.status !== 'validada') return [];
    var hash = PEP.seguranca.sha256(e.texto);
    var todas = assinaturasDe('evolucao', e.id).filter(function (a) { return !a.hash || a.hash === hash; });
    var ult = function (papel) { return todas.filter(function (a) { return a.papel === papel; }).pop(); };
    return [ult('estagiario'), e.status === 'validada' ? ult('supervisor') : null].filter(Boolean);
  }
  function assinadoPeloSupervisor(tipo, id) { return assinaturasDe(tipo, id).some(function (a) { return a.papel === 'supervisor'; }); }
  function adendosDe(evolucaoId) { return PEP.db.adendos.filter(function (a) { return a.evolucaoId === evolucaoId; }); }

  // Consentimento vale pelo registro mais recente daquela finalidade (revogar = novo registro)
  function historicoConsentimento(caso, finalidade) {
    return PEP.db.consentimentos.filter(function (c) { return c.casoId === caso.id && c.finalidade === finalidade; })
      .sort(function (a, b) { return a.em.localeCompare(b.em); });
  }
  function consentimentoAtual(caso, finalidade) { var h = historicoConsentimento(caso, finalidade); return h[h.length - 1] || null; }
  function consentiu(caso, finalidade) { var c = consentimentoAtual(caso, finalidade); return !!(c && c.concedido); }

  function pacienteDoUsuario(u) { return u && u.pacienteId ? porId(PEP.db.pacientes, u.pacienteId) : null; }

  // ---------- Quem vê o prontuário (camada clínica) ----------
  // Estagiário: só casos da própria dupla/trio, com vínculo ativo.
  // Supervisor: só casos dos seus grupos.
  // Técnico (responsável técnico): todos, sempre com registro na auditoria.
  // Direção do curso e paciente: não navegam no prontuário
  //   (o paciente recebe cópia pelo fluxo de acesso).
  function podeVerCaso(u, caso) {
    if (!u || !caso) return false;
    if (u.perfil === 'tecnico') return true;
    if (u.perfil === 'supervisor') return ehSupervisorDoCaso(u, caso);
    if (u.perfil === 'estagiario') return ehEstagiarioDoCaso(u, caso);
    return false;
  }
  function casosVisiveis(u) { return PEP.db.casos.filter(function (c) { return podeVerCaso(u, c); }); }

  function podeEscreverEvolucao(u, caso) { return ehEstagiarioDoCaso(u, caso) && caso.status === 'ativo'; }
  function podeValidar(u, caso) { return ehSupervisorDoCaso(u, caso); }
  function podeAdendo(u, caso) { return ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso); }
  function podeEditarAnamnese(u, caso) { return caso.status === 'ativo' && (ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso)); }
  function podeAssinarAnamnese(u, caso) { return ehSupervisorDoCaso(u, caso); }

  // Registro de supervisão: fora do prontuário (o técnico não vê).
  function podeVerOrientacoes(u, caso) { return ehSupervisorDoCaso(u, caso) || ehEstagiarioDoCaso(u, caso); }
  function podeEscreverOrientacao(u, caso) { return ehSupervisorDoCaso(u, caso); }

  // Avaliação psicológica: área restrita, fora do prontuário e do PDF do paciente.
  function podeVerAreaRestrita(u, caso) { return podeVerConteudoClinico(u, caso); }

  // ---------- Motivo de acesso da técnica (igual a app.pode_ver_clinico no banco) ----------
  // A técnica vê a camada operacional de todos os casos (cadastro, agenda). O conteúdo clínico de
  // um caso que não é da equipe dela só abre com motivo registrado nas últimas horas da regra;
  // o caso recém-triado, que ainda espera alocação, não pede motivo.
  function justificativaValida(u, caso) {
    var limite = Date.now() - (PEP.regra('justificativaValidadeHoras') || 12) * 3600000;
    return (PEP.db.acessosJustificados || []).some(function (j) {
      return j.usuarioId === u.id && j.casoId === caso.id && new Date(j.em).getTime() > limite;
    });
  }
  function podeVerConteudoClinico(u, caso) {
    if (ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso)) return true;
    return u.perfil === 'tecnico' && (caso.status === 'aguardando-alocacao' || justificativaValida(u, caso));
  }
  function precisaJustificar(u, caso) { return u.perfil === 'tecnico' && !podeVerConteudoClinico(u, caso); }

  // ---------- "Quem acessou meu prontuário" (igual a app.acessos_ao_meu_prontuario) ----------
  // Ações por categoria, não o texto da auditoria; para menor de idade, sem o motivo da técnica
  // (quem usa o portal pode ser o responsável — Código de Ética, art. 13).
  function categoriaAcesso(acao) {
    if (acao.indexOf('Abriu o prontuário') === 0) return 'Abriu o prontuário';
    if (/^(Gerou cópia|Entregou cópia|Paciente leu o prontuário)/.test(acao)) return 'Cópia ou leitura do prontuário';
    if (acao.indexOf('Gerou lembrete') === 0) return 'Enviou lembrete de sessão';
    if (acao.indexOf('Passou o caso') === 0) return 'Passou o seu atendimento para outra dupla';
    return 'Registrou informações no prontuário';
  }
  function acessosAoProntuario(u) {
    var p = pacienteDoUsuario(u);
    if (!p) return [];
    var menor = PEP.util.idade(p.dataNascimento) < 18;
    var meus = PEP.db.casos.filter(function (c) { return c.pacienteId === p.id; }).map(function (c) { return c.id; });
    var perfil = function (id) { var x = porId(PEP.db.usuarios, id); return x ? x.perfil : ''; };
    var eventos = PEP.db.auditoria.filter(function (a) { return meus.indexOf(a.alvo) !== -1 || a.alvo === p.id; }).map(function (a) {
      var proprio = a.usuarioId === u.id;
      return { quando: a.em, quem: proprio ? 'Você' : PEP.ui.nomeUsuario(a.usuarioId), papel: perfil(a.usuarioId), acao: proprio ? a.acao : categoriaAcesso(a.acao), motivo: null, detalhe: null };
    });
    var motivos = (PEP.db.acessosJustificados || []).filter(function (j) { return meus.indexOf(j.casoId) !== -1; }).map(function (j) {
      return { quando: j.em, quem: PEP.ui.nomeUsuario(j.usuarioId), papel: 'tecnico', acao: 'Registrou o motivo do acesso ao prontuário',
        motivo: menor ? null : j.motivo, detalhe: menor ? null : j.detalhe };
    });
    return eventos.concat(motivos).sort(function (a, b) { return b.quando.localeCompare(a.quando); }).slice(0, 100);
  }

  function podeRegistrarPresenca(u, caso) {
    return caso.status === 'ativo' && (ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso) || u.perfil === 'tecnico');
  }
  function podeEncerrar(u, caso) { return caso.status === 'ativo' && (ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso)); }

  function podeVerIndicadores(u) { return u && (u.perfil === 'direcao' || u.perfil === 'tecnico' || u.perfil === 'supervisor'); }
  function podeGerirFila(u) { return u && u.perfil === 'tecnico'; }
  function podeVerAuditoria(u) { return u && u.perfil === 'tecnico'; }
  function podeEditarCadastro(u) { return u && u.perfil === 'tecnico'; }
  function podeAtenderTitular(u) { return u && u.perfil === 'tecnico'; } // canal do encarregado no protótipo
  function podeGerirEstudantes(u) { return u && u.perfil === 'direcao'; }
  // Contas: a direção cuida das contas da equipe (nunca da própria); a técnica, do acesso dos pacientes ao portal
  function podeGerirConta(u, alvo) {
    if (!u || !alvo || alvo.id === u.id) return false;
    if (u.perfil === 'direcao') return alvo.perfil !== 'paciente';
    if (u.perfil === 'tecnico') return alvo.perfil === 'paciente';
    return false;
  }
  function contaDoPaciente(p) { return PEP.db.usuarios.filter(function (x) { return x.perfil === 'paciente' && x.pacienteId === p.id; })[0] || null; }

  // ---------- Faltas e abandono ----------
  // Conta as faltas sem justificativa no fim da sequência de sessões passadas.
  function faltasSeguidas(caso) {
    var passadas = PEP.db.sessoes
      .filter(function (s) { return s.casoId === caso.id && s.presenca !== 'agendada' && s.presenca !== 'cancelada'; })
      .sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
    var cont = 0;
    for (var i = passadas.length - 1; i >= 0; i--) {
      if (passadas[i].presenca === 'falta') cont++;
      else if (passadas[i].presenca === 'falta-justificada') continue; // justificada não conta nem zera
      else break;
    }
    return cont;
  }

  function emRiscoDeAbandono(caso) {
    return caso.status === 'ativo' && faltasSeguidas(caso) >= PEP.regra('faltasSeguidasLimite');
  }

  // ---------- Risco e segurança ----------
  // Avaliação de risco: a equipe do caso registra; o supervisor dá ciência (uma vez) e só ele
  // registra a notificação compulsória (Res. CFP 05/2025, art. 7º, III). O técnico registra o
  // risco identificado na triagem, quando o caso ainda nem tem grupo.
  function riscosDoCaso(caso) {
    return PEP.db.riscos.filter(function (r) { return r.casoId === caso.id; }).sort(function (a, b) { return b.em.localeCompare(a.em); });
  }
  function situacaoRisco(r) { return r.encerradoEm ? 'encerrado' : (r.cienciaEm ? 'acompanhamento' : 'aguardando-ciencia'); }
  function riscosAbertos(caso) { return riscosDoCaso(caso).filter(function (r) { return !r.encerradoEm; }); }
  function notificacoesDoRisco(r) { return PEP.db.notificacoes.filter(function (n) { return n.riscoId === r.id; }); }
  function planosDoCaso(caso) {
    return PEP.db.planosSeguranca.filter(function (p) { return p.casoId === caso.id; }).sort(function (a, b) { return a.versao - b.versao; });
  }
  function planoAtual(caso) { var l = planosDoCaso(caso); return l[l.length - 1] || null; }

  function podeRegistrarRisco(u, caso) {
    return (caso.status === 'ativo' && (ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso))) ||
      (u.perfil === 'tecnico' && (caso.status === 'ativo' || caso.status === 'aguardando-alocacao'));
  }
  function podeDarCiencia(u, caso) { return ehSupervisorDoCaso(u, caso); }
  function podeNotificar(u, caso) { return ehSupervisorDoCaso(u, caso); }
  function podeEncerrarRisco(u, caso) { return ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso); }
  function podeEditarPlano(u, caso) { return caso.status === 'ativo' && (ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso)); }

  // Notificações que podem se aplicar, pelo tipo de risco e pela idade (gênero não é presumido:
  // a supervisão confere a lista inteira). O sistema sugere; quem decide e notifica é o supervisor.
  function notificacoesSugeridas(r, paciente) {
    var idade = paciente ? PEP.util.idade(paciente.dataNascimento) : null;
    var s = [];
    if (['tentativa-suicidio', 'autolesao', 'violencia-sofrida'].indexOf(r.tipo) !== -1) s.push('vigilancia');
    if (r.tipo === 'violencia-sofrida' && idade !== null && idade < 18) s.push('conselho-tutelar');
    if (r.tipo === 'violencia-sofrida' && idade !== null && idade >= 60) s.push('pessoa-idosa');
    return s;
  }

  // Na cópia entregue ao responsável de criança ou adolescente vai o estritamente essencial
  // (Código de Ética, art. 13): relato de violência e notificação ficam de fora, porque quem
  // pede a cópia pode ser justamente a pessoa apontada no relato.
  function riscoProtegidoNaCopia(r, paciente) {
    return PEP.util.idade(paciente.dataNascimento) < 18 && r.tipo === 'violencia-sofrida';
  }

  // ---------- Faltas avisadas e prazo de registro ----------
  // O paciente avisa, antes da sessão, que não vai (motivo de lista fechada): vira falta justificada
  function podeAvisarFalta(u, s) {
    var c = porId(PEP.db.casos, s.casoId);
    return !!(u && u.perfil === 'paciente' && c && c.pacienteId === u.pacienteId && s.presenca === 'agendada' && s.data >= PEP.util.hoje());
  }
  // Sessões com presença e sem evolução há mais tempo que o prazo da regra (padrão 48 h)
  function sessoesSemEvolucao(caso) {
    var limite = new Date(Date.now() - PEP.regra('prazoEvolucaoHoras') * 3600 * 1000);
    return PEP.db.sessoes.filter(function (s) {
      if (s.casoId !== caso.id || s.presenca !== 'presente') return false;
      if (new Date(s.data + 'T' + s.hora) > limite) return false;
      return !PEP.db.evolucoes.some(function (e) { return e.sessaoId === s.id; });
    });
  }
  // ---------- Transição de semestre: passagem do caso para outra dupla ----------
  // O prontuário continua o mesmo; muda quem atende (tabela transferencias, regras em app.transferencia_regras)
  function subgrupoTemEstagiarioAtivo(subId) { return estagiariosDoSubgrupo(subId).length > 0; }
  // Caso em andamento cuja dupla ou trio não tem mais ninguém com vínculo ativo (o estágio terminou)
  function semDuplaAtiva(caso) { return caso.status === 'ativo' && !!caso.subgrupoId && !subgrupoTemEstagiarioAtivo(caso.subgrupoId); }
  function casosSemDuplaAtiva(u) { return casosVisiveis(u).filter(semDuplaAtiva); }
  function transferenciasDoCaso(caso) {
    return (PEP.db.transferencias || []).filter(function (t) { return t.casoId === caso.id; })
      .sort(function (a, b) { return a.em.localeCompare(b.em); });
  }
  // Resumos de transferência desta passagem: escritos depois da última passagem e ainda não usados
  function resumosDaPassagem(caso) {
    var passagens = transferenciasDoCaso(caso), ult = passagens[passagens.length - 1], desde = ult ? ult.em.slice(0, 10) : '';
    var usados = passagens.map(function (t) { return t.resumoId; });
    return PEP.db.evolucoes.filter(function (e) {
      return e.casoId === caso.id && e.tipo === 'transferencia' && e.data >= desde && usados.indexOf(e.id) === -1;
    });
  }
  function resumoValidado(caso) { return resumosDaPassagem(caso).filter(function (e) { return e.status === 'validada'; }).pop() || null; }
  function podePassarCaso(u, caso) { return !!u && !!caso && caso.status === 'ativo' && (u.perfil === 'tecnico' || ehSupervisorDoCaso(u, caso)); }
  // Duplas que podem receber o caso: com estagiário em vínculo ativo; o supervisor, só as do grupo do caso
  function duplasDestino(u, caso) {
    return PEP.db.subgrupos.filter(function (s) {
      return s.id !== caso.subgrupoId && subgrupoTemEstagiarioAtivo(s.id) && (u.perfil === 'tecnico' || s.grupoId === caso.grupoId);
    });
  }
  // O que conferir antes da passagem. bloqueia = impede passar (o banco recusa); os outros itens são avisos
  function checklistPassagem(caso) {
    var evs = PEP.db.evolucoes.filter(function (e) { return e.casoId === caso.id; });
    var enviadas = evs.filter(function (e) { return e.status === 'enviada'; }).length;
    var abertas = evs.filter(function (e) { return e.status === 'rascunho' || e.status === 'devolvida'; }).length;
    var semEvolucao = PEP.db.sessoes.filter(function (s) {
      return s.casoId === caso.id && s.presenca === 'presente' && !evs.some(function (e) { return e.sessaoId === s.id; });
    }).length;
    var riscos = riscosAbertos(caso), semCiencia = riscos.filter(function (r) { return !r.cienciaEm; }).length;
    var agendadas = PEP.db.sessoes.filter(function (s) { return s.casoId === caso.id && s.presenca === 'agendada' && s.data >= PEP.util.hoje(); }).length;
    var resumo = resumoValidado(caso), escrito = resumosDaPassagem(caso).filter(function (e) { return e.status !== 'validada'; }).length;
    return [
      { id: 'enviadas', ok: !enviadas, bloqueia: true, texto: enviadas ? enviadas + ' evolução(ões) esperando a supervisão: valide ou devolva antes de passar o caso' : 'Nada esperando a validação da supervisão' },
      { id: 'resumo', ok: !!resumo, bloqueia: false, texto: resumo ? 'Resumo de transferência validado em ' + PEP.util.formatarData(resumo.data) :
        escrito ? 'Resumo de transferência escrito, falta a validação da supervisão' :
        semDuplaAtiva(caso) ? 'A dupla saiu sem resumo de transferência: a passagem precisa de justificativa' :
        'Sem resumo de transferência: o estagiário escreve na aba Evoluções (sem ele, a passagem precisa de justificativa)' },
      { id: 'abertas', ok: !abertas, bloqueia: false, texto: abertas ? abertas + ' rascunho(s) ou evolução(ões) devolvida(s): ficam fora do prontuário se não forem enviados' : 'Nenhum rascunho ou devolução em aberto' },
      { id: 'sessoes', ok: !semEvolucao, bloqueia: false, texto: semEvolucao ? semEvolucao + ' sessão(ões) com presença e sem evolução' : 'Toda sessão com presença tem evolução' },
      { id: 'risco', ok: !semCiencia, bloqueia: false, texto: !riscos.length ? 'Sem risco em acompanhamento' : semCiencia ? 'Risco em acompanhamento ainda sem a ciência da supervisão' :
        'Risco em acompanhamento, com ciência: a nova dupla retoma na primeira sessão (aba Risco e segurança)' },
      { id: 'agenda', ok: !agendadas, bloqueia: false, texto: agendadas ? agendadas + ' sessão(ões) agendada(s): confira o horário com a nova dupla e avise o paciente' : 'Sem sessões agendadas' }
    ];
  }
  // Rascunho gerado do resumo: dados que o prontuário já tem + as seções que o estagiário completa.
  // O risco não entra no texto: fica na aba Risco e segurança (que não sai na cópia de criança ou adolescente).
  function modeloResumoTransferencia(caso) {
    var a = anamneseAtual(caso), ss = PEP.db.sessoes.filter(function (s) { return s.casoId === caso.id; });
    var conta = function (p) { return ss.filter(function (s) { return s.presenca === p; }).length; };
    var faltas = conta('falta') + conta('falta-justificada');
    return 'Período: de ' + PEP.util.formatarData(caso.inicio) + ' a ' + PEP.util.formatarData(PEP.util.hoje()) + ' · ' + conta('presente') + ' sessões com presença · ' +
      faltas + ' falta(s), ' + conta('falta-justificada') + ' justificada(s).\n' +
      'Demanda: ' + (a.demanda || '—') + '\nObjetivos: ' + (a.objetivos || '—') + '\n' +
      PEP.lista('secoesResumoTransferencia').map(function (nome) { return nome + ': '; }).join('\n');
  }
  // Seções do resumo ainda sem conteúdo (cada uma precisa de pelo menos regras.resumoSecaoMinCaracteres)
  function secoesFaltandoNoResumo(texto) {
    var secoes = PEP.lista('secoesResumoTransferencia'), min = PEP.regra('resumoSecaoMinCaracteres') || 10, t = String(texto || '');
    return secoes.filter(function (nome) {
      var i = t.indexOf(nome + ':');
      if (i === -1) return true;
      var resto = t.slice(i + nome.length + 1), fim = resto.length;
      secoes.forEach(function (outra) { var j = resto.indexOf(outra + ':'); if (j !== -1 && j < fim) fim = j; });
      return resto.slice(0, fim).trim().length < min;
    });
  }
  // Se a direção encerrar o vínculo deste estagiário, quais casos ficam sem ninguém da dupla
  function casosQueFicamSemDupla(estagiarioId) {
    var a = alocacaoDoEstagiario(estagiarioId);
    if (!a || !a.subgrupoId) return [];
    var outros = estagiariosDoSubgrupo(a.subgrupoId).filter(function (id) { return id !== estagiarioId; });
    if (outros.length) return [];
    return PEP.db.casos.filter(function (c) { return c.status === 'ativo' && c.subgrupoId === a.subgrupoId; });
  }

  // ---------- Documentos psicológicos (Res. CFP 06/2019) ----------
  function modalidadeDocumento(id) { return PEP.lista('modalidadesDocumento').filter(function (m) { return m.id === id; })[0] || null; }
  function eventosDoDocumento(d) { return (PEP.db.eventosDocumento || []).filter(function (e) { return e.documentoId === d.id; }); }
  function eventoDoDocumento(d, tipo) { return eventosDoDocumento(d).filter(function (e) { return e.tipo === tipo; })[0] || null; }
  function documentoValido(d) { return assinadoPeloSupervisor('documento', d.id) && !eventoDoDocumento(d, 'anulacao'); }
  // Relatório e laudo pedem entrevista devolutiva (ou o motivo de não ter feito)
  function devolutivaPendente(d) {
    var m = modalidadeDocumento(d.tipo);
    return !!(m && m.devolutiva && documentoValido(d) && !eventoDoDocumento(d, 'devolutiva') && !eventoDoDocumento(d, 'sem-devolutiva'));
  }
  function podeEmitirDocumento(u, caso) { return caso.status === 'ativo' && (ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso)); }
  function podeAnularDocumento(u, d) {
    var c = porId(PEP.db.casos, d.casoId);
    return !!c && !eventoDoDocumento(d, 'anulacao') && !eventoDoDocumento(d, 'entrega') && (d.autorId === u.id || ehSupervisorDoCaso(u, c));
  }
  // Entrega e devolutiva: equipe do caso ou técnica (com motivo de acesso), só de documento válido
  function podeRegistrarEntrega(u, d) {
    var c = porId(PEP.db.casos, d.casoId);
    return !!c && documentoValido(d) && podeVerConteudoClinico(u, c);
  }
  // Declaração não tem sintoma, diagnóstico nem situação clínica (art. 9º): termos de _config, sem acento
  function termosClinicosNoTexto(texto) {
    var n = ' ' + PEP.revisor.normalizar(texto) + ' ';
    return PEP.lista('termosClinicosDeclaracao').filter(function (t) {
      return new RegExp('[^a-z0-9]' + PEP.revisor.normalizar(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(n);
    });
  }
  // Texto que a assinatura protege: muda uma letra, muda o hash
  function conteudoAssinadoDocumento(d) {
    return JSON.stringify([d.tipo, d.titulo, d.finalidade, d.destinatario, d.solicitante || '', d.validade || '', d.local || '', d.conteudo || {}]);
  }

  // ---------- Comunicações e compartilhamentos ----------
  function tipoComunicacao(id) { return PEP.lista('tiposComunicacao').filter(function (t) { return t.id === id; })[0] || null; }
  function comunicacoesDoCaso(caso) {
    return (PEP.db.comunicacoes || []).filter(function (x) { return x.casoId === caso.id; }).sort(function (a, b) { return b.data.localeCompare(a.data); });
  }
  function podeRegistrarComunicacao(u, caso, tipo) {
    var t = tipoComunicacao(tipo);
    if (!t || !podeVerConteudoClinico(u, caso) || ['estagiario', 'supervisor', 'tecnico'].indexOf(u.perfil) === -1) return false;
    return !t.somenteResponsavel || u.perfil === 'supervisor' || u.perfil === 'tecnico';
  }
  // O paciente vê com quem os dados dele foram compartilhados (LGPD, art. 18, VII), menos o que a equipe escondeu com motivo
  function comunicacoesVisiveisAoPaciente(u) {
    var p = pacienteDoUsuario(u);
    if (!p) return [];
    var meus = PEP.db.casos.filter(function (c) { return c.pacienteId === p.id; }).map(function (c) { return c.id; });
    return (PEP.db.comunicacoes || []).filter(function (x) { return meus.indexOf(x.casoId) !== -1 && x.visivelPaciente; })
      .sort(function (a, b) { return b.data.localeCompare(a.data); });
  }

  // Sinal de urgência no relato do formulário público (termos de _config.listas.sinaisUrgencia, sem acento)
  function temSinalDeUrgencia(texto) {
    var n = PEP.revisor.normalizar(texto);
    return PEP.lista('sinaisUrgencia').some(function (s) { return n.indexOf(PEP.revisor.normalizar(s)) !== -1; });
  }

  // ---------- Encerramento ----------
  // O prontuário precisa estar completo antes de fechar: evolução esperando a supervisão ou
  // devolvida impede (o banco recusa também); rascunho e sessão sem evolução são avisos.
  function pendenciasParaEncerrar(caso) {
    var evs = PEP.db.evolucoes.filter(function (e) { return e.casoId === caso.id; });
    var conta = function (st) { return evs.filter(function (e) { return e.status === st; }).length; };
    var bloqueiam = [], avisos = [];
    if (conta('enviada')) bloqueiam.push(conta('enviada') + ' evolução(ões) aguardando a validação da supervisão');
    if (conta('devolvida')) bloqueiam.push(conta('devolvida') + ' evolução(ões) devolvida(s) para ajuste');
    if (conta('rascunho')) avisos.push(conta('rascunho') + ' rascunho(s) que não vão para o prontuário');
    var semEvolucao = PEP.db.sessoes.filter(function (s) {
      return s.casoId === caso.id && s.presenca === 'presente' && !evs.some(function (e) { return e.sessaoId === s.id; });
    }).length;
    if (semEvolucao) avisos.push(semEvolucao + ' sessão(ões) com presença e sem evolução');
    return { bloqueiam: bloqueiam, avisos: avisos };
  }

  // Guarda do prontuário: conta a partir do último registro (regra da instituição, parametrizável)
  function guardaAte(caso) {
    var datas = [caso.inicio];
    PEP.db.evolucoes.forEach(function (e) { if (e.casoId === caso.id) datas.push(e.data); });
    PEP.db.sessoes.forEach(function (s) { if (s.casoId === caso.id && s.presenca !== 'agendada' && s.presenca !== 'cancelada') datas.push(s.data); });
    var enc = encerramentoDoCaso(caso);
    if (enc) datas.push(enc.data);
    var ultima = datas.filter(Boolean).sort().pop().slice(0, 10);
    // Regra prudente da clínica (regras.guardaMenorDesde18, a confirmar com o jurídico): para quem era menor,
    // a contagem começa no dia em que a pessoa faz 18 anos, se isso for depois do último registro
    var pac = porId(PEP.db.pacientes, caso.pacienteId);
    if (PEP.regra('guardaMenorDesde18') && pac && pac.dataNascimento) {
      var n = pac.dataNascimento.split('-'), dezoito = (Number(n[0]) + 18) + '-' + n[1] + '-' + n[2];
      if (dezoito > ultima) ultima = dezoito;
    }
    var p = ultima.split('-');
    return (Number(p[0]) + (PEP.regra('guardaProntuarioAnos') || 20)) + '-' + p[1] + '-' + p[2];
  }

  // ---------- Indicadores agregados (sem nomes) ----------
  // Mesmo formato da função app.indicadores() do banco: com o banco ligado, a tela recebe esse
  // objeto pronto do servidor (a direção não lê as tabelas clínicas). Escopo: supervisor vê os
  // próprios grupos; direção e técnico veem tudo.
  // Atendimentos dos últimos 6 meses (o atual incluído), por mês: presença, falta justificada e falta
  // sem justificativa. A mesma conta de app.indicadores no banco (campo porMes).
  function atendimentosPorMes(sessoes) {
    var h = PEP.util.hoje().split('-').map(Number), lista = [];
    for (var i = 5; i >= 0; i--) {
      var ano = h[0], mes = h[1] - i;
      while (mes < 1) { mes += 12; ano--; }
      var chave = ano + '-' + (mes < 10 ? '0' : '') + mes;
      var doMes = sessoes.filter(function (s) { return s.data.slice(0, 7) === chave; });
      var conta = function (p) { return doMes.filter(function (s) { return s.presenca === p; }).length; };
      lista.push({ mes: chave, presente: conta('presente'), faltaJustificada: conta('falta-justificada'), falta: conta('falta') });
    }
    return lista;
  }

  function indicadores(u) {
    var casos = u.perfil === 'supervisor' ? casosVisiveis(u) : PEP.db.casos;
    var ids = casos.map(function (c) { return c.id; });
    var sessoes = PEP.db.sessoes.filter(function (s) { return ids.indexOf(s.casoId) !== -1; });
    var porCaso = {};
    sessoes.forEach(function (s) { if (s.presenca === 'presente') porCaso[s.casoId] = (porCaso[s.casoId] || 0) + 1; });
    var atendidos = Object.keys(porCaso).length;
    var voltaram = Object.keys(porCaso).filter(function (k) { return porCaso[k] >= 2; }).length;
    var totalPresencas = Object.keys(porCaso).reduce(function (t, k) { return t + porCaso[k]; }, 0);
    var motivos = {}, encerramentos = {};
    PEP.db.encerramentos.filter(function (e) { return ids.indexOf(e.casoId) !== -1; }).forEach(function (e) {
      if (e.tipo === 'abandono') motivos[e.motivo || 'Não informado'] = (motivos[e.motivo || 'Não informado'] || 0) + 1;
      encerramentos[e.tipo] = (encerramentos[e.tipo] || 0) + 1;
    });
    var conta = function (p) { return sessoes.filter(function (s) { return s.presenca === p; }).length; };
    var avisadas = {};
    sessoes.forEach(function (s) { if (s.avisoPaciente) avisadas[s.motivoFalta] = (avisadas[s.motivoFalta] || 0) + 1; });
    var fila = PEP.db.inscricoes.filter(function (i) { return i.status === 'aguardando'; });
    return {
      atendidos: atendidos,
      taxaRetorno: atendidos ? Math.round((voltaram / atendidos) * 100) : 0,
      mediaSessoes: atendidos ? Math.round((totalPresencas / atendidos) * 10) / 10 : 0,
      emRisco: casos.filter(emRiscoDeAbandono).length,
      motivosAbandono: motivos,
      encerramentos: encerramentos,
      presencas: { presente: conta('presente'), falta: conta('falta'), faltaJustificada: conta('falta-justificada') },
      motivosFaltaAvisada: avisadas,
      casosAtivos: casos.filter(function (c) { return c.status === 'ativo'; }).length,
      naFila: fila.length,
      porMes: atendimentosPorMes(sessoes),
      esperaMediaDias: fila.length ? Math.round(fila.reduce(function (t, i) { return t + PEP.util.diasEntre(i.data, PEP.util.hoje()); }, 0) / fila.length) : 0
    };
  }

  return {
    nomePerfil: nomePerfil, alocacaoAtiva: alocacaoAtiva, alocacaoDoEstagiario: alocacaoDoEstagiario,
    estagiariosDoSubgrupo: estagiariosDoSubgrupo, estagiariosSemDupla: estagiariosSemDupla, estagiariosSemGrupo: estagiariosSemGrupo,
    estagiariosDoGrupo: estagiariosDoGrupo, subgruposDoGrupo: subgruposDoGrupo,
    grupoDoCaso: grupoDoCaso, subgrupoDoCaso: subgrupoDoCaso, estagiariosDoCaso: estagiariosDoCaso, supervisorDoCaso: supervisorDoCaso,
    ehEstagiarioDoCaso: ehEstagiarioDoCaso, ehSupervisorDoCaso: ehSupervisorDoCaso, descricaoUsuario: descricaoUsuario,
    anamnesesDoCaso: anamnesesDoCaso, anamneseAtual: anamneseAtual, encerramentoDoCaso: encerramentoDoCaso,
    assinaturasDe: assinaturasDe, assinaturasVigentes: assinaturasVigentes, assinadoPeloSupervisor: assinadoPeloSupervisor, adendosDe: adendosDe,
    historicoConsentimento: historicoConsentimento, consentimentoAtual: consentimentoAtual, consentiu: consentiu,
    pacienteDoUsuario: pacienteDoUsuario,
    podeVerCaso: podeVerCaso, casosVisiveis: casosVisiveis,
    podeEscreverEvolucao: podeEscreverEvolucao, podeValidar: podeValidar, podeAdendo: podeAdendo,
    podeEditarAnamnese: podeEditarAnamnese, podeAssinarAnamnese: podeAssinarAnamnese,
    podeVerOrientacoes: podeVerOrientacoes, podeEscreverOrientacao: podeEscreverOrientacao,
    podeVerAreaRestrita: podeVerAreaRestrita, podeRegistrarPresenca: podeRegistrarPresenca,
    podeEncerrar: podeEncerrar, podeVerIndicadores: podeVerIndicadores,
    podeGerirFila: podeGerirFila, podeVerAuditoria: podeVerAuditoria, podeEditarCadastro: podeEditarCadastro,
    podeAtenderTitular: podeAtenderTitular, podeGerirEstudantes: podeGerirEstudantes, podeGerirConta: podeGerirConta, contaDoPaciente: contaDoPaciente,
    faltasSeguidas: faltasSeguidas, emRiscoDeAbandono: emRiscoDeAbandono,
    pendenciasParaEncerrar: pendenciasParaEncerrar, guardaAte: guardaAte, indicadores: indicadores,
    riscosDoCaso: riscosDoCaso, situacaoRisco: situacaoRisco, riscosAbertos: riscosAbertos, notificacoesDoRisco: notificacoesDoRisco,
    planosDoCaso: planosDoCaso, planoAtual: planoAtual, podeRegistrarRisco: podeRegistrarRisco, podeDarCiencia: podeDarCiencia,
    podeNotificar: podeNotificar, podeEncerrarRisco: podeEncerrarRisco, podeEditarPlano: podeEditarPlano,
    notificacoesSugeridas: notificacoesSugeridas, riscoProtegidoNaCopia: riscoProtegidoNaCopia,
    justificativaValida: justificativaValida, podeVerConteudoClinico: podeVerConteudoClinico, precisaJustificar: precisaJustificar,
    categoriaAcesso: categoriaAcesso, acessosAoProntuario: acessosAoProntuario,
    podeAvisarFalta: podeAvisarFalta, sessoesSemEvolucao: sessoesSemEvolucao, temSinalDeUrgencia: temSinalDeUrgencia,
    semDuplaAtiva: semDuplaAtiva, casosSemDuplaAtiva: casosSemDuplaAtiva, transferenciasDoCaso: transferenciasDoCaso,
    resumosDaPassagem: resumosDaPassagem, resumoValidado: resumoValidado, podePassarCaso: podePassarCaso, duplasDestino: duplasDestino,
    checklistPassagem: checklistPassagem, modeloResumoTransferencia: modeloResumoTransferencia, secoesFaltandoNoResumo: secoesFaltandoNoResumo,
    casosQueFicamSemDupla: casosQueFicamSemDupla,
    modalidadeDocumento: modalidadeDocumento, eventosDoDocumento: eventosDoDocumento, eventoDoDocumento: eventoDoDocumento, documentoValido: documentoValido,
    devolutivaPendente: devolutivaPendente, podeEmitirDocumento: podeEmitirDocumento, podeAnularDocumento: podeAnularDocumento, podeRegistrarEntrega: podeRegistrarEntrega,
    termosClinicosNoTexto: termosClinicosNoTexto, conteudoAssinadoDocumento: conteudoAssinadoDocumento,
    tipoComunicacao: tipoComunicacao, comunicacoesDoCaso: comunicacoesDoCaso, podeRegistrarComunicacao: podeRegistrarComunicacao,
    comunicacoesVisiveisAoPaciente: comunicacoesVisiveisAoPaciente
  };
})();
