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
  function podeVerAreaRestrita(u, caso) { return u.perfil === 'tecnico' || ehSupervisorDoCaso(u, caso) || ehEstagiarioDoCaso(u, caso); }

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
    var ultima = datas.filter(Boolean).sort().pop();
    var p = ultima.slice(0, 10).split('-');
    return (Number(p[0]) + (PEP.regra('guardaProntuarioAnos') || 20)) + '-' + p[1] + '-' + p[2];
  }

  // ---------- Indicadores agregados (sem nomes) ----------
  // Mesmo formato da função app.indicadores() do banco: com o banco ligado, a tela recebe esse
  // objeto pronto do servidor (a direção não lê as tabelas clínicas). Escopo: supervisor vê os
  // próprios grupos; direção e técnico veem tudo.
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
    var fila = PEP.db.inscricoes.filter(function (i) { return i.status === 'aguardando'; });
    return {
      atendidos: atendidos,
      taxaRetorno: atendidos ? Math.round((voltaram / atendidos) * 100) : 0,
      mediaSessoes: atendidos ? Math.round((totalPresencas / atendidos) * 10) / 10 : 0,
      emRisco: casos.filter(emRiscoDeAbandono).length,
      motivosAbandono: motivos,
      encerramentos: encerramentos,
      presencas: { presente: conta('presente'), falta: conta('falta'), faltaJustificada: conta('falta-justificada') },
      casosAtivos: casos.filter(function (c) { return c.status === 'ativo'; }).length,
      naFila: fila.length,
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
    podeAtenderTitular: podeAtenderTitular, podeGerirEstudantes: podeGerirEstudantes,
    faltasSeguidas: faltasSeguidas, emRiscoDeAbandono: emRiscoDeAbandono,
    pendenciasParaEncerrar: pendenciasParaEncerrar, guardaAte: guardaAte, indicadores: indicadores,
    riscosDoCaso: riscosDoCaso, situacaoRisco: situacaoRisco, riscosAbertos: riscosAbertos, notificacoesDoRisco: notificacoesDoRisco,
    planosDoCaso: planosDoCaso, planoAtual: planoAtual, podeRegistrarRisco: podeRegistrarRisco, podeDarCiencia: podeDarCiencia,
    podeNotificar: podeNotificar, podeEncerrarRisco: podeEncerrarRisco, podeEditarPlano: podeEditarPlano,
    notificacoesSugeridas: notificacoesSugeridas, riscoProtegidoNaCopia: riscoProtegidoNaCopia
  };
})();
