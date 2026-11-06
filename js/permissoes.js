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
    faltasSeguidas: faltasSeguidas, emRiscoDeAbandono: emRiscoDeAbandono
  };
})();
