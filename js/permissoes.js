/* =========================================================
   permissoes.js — regras de acesso e de negócio.
   ATENÇÃO: aqui as regras rodam no navegador só para a
   demonstração. Num sistema real, o servidor é quem aplica.

   Base das regras (verificar vigência):
   - Res. CFP 05/2025: prontuário de acesso irrestrito ao paciente
     (art. 13); testes fora do prontuário (art. 14); registro de
     supervisão só entre orientadores, supervisores e estagiários
     (art. 17, §2º); documentos assinados por estagiário e psicólogo
     responsável (art. 19).
   - Res. CFP 01/2009, art. 3º: em serviço-escola o registro identifica
     e é assinado pelo estagiário e pelo supervisor.
   - LGPD: princípio da necessidade (cada perfil vê só o necessário).
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.regras = (function () {
  var porId = function (lista, id) { return PEP.util.porId(lista, id); };

  // Quantas faltas seguidas (sem justificativa) disparam o fluxo de abandono.
  // Regra do cliente (Etapa 1). "3 faltas intercaladas" ficou como sugestão a validar.
  var FALTAS_SEGUIDAS_LIMITE = 2;

  var NOMES_PERFIS = {
    tecnico: 'Psicólogo(a) técnico(a)',
    supervisor: 'Supervisor(a)',
    estagiario: 'Estagiário(a)',
    paciente: 'Paciente',
    direcao: 'Direção do curso'
  };

  function nomePerfil(perfil) { return NOMES_PERFIS[perfil] || perfil; }

  function grupoDoCaso(caso) { return caso && caso.grupoId ? porId(PEP.db.grupos, caso.grupoId) : null; }

  function subgrupoDoCaso(caso) {
    var g = grupoDoCaso(caso);
    if (!g || !caso.subgrupoId) return null;
    return porId(g.subgrupos, caso.subgrupoId);
  }

  function estagiariosDoCaso(caso) {
    var s = subgrupoDoCaso(caso);
    return s ? s.estagiarios.slice() : [];
  }

  function supervisorDoCaso(caso) {
    var g = grupoDoCaso(caso);
    return g ? g.supervisorId : null;
  }

  function ehEstagiarioDoCaso(u, caso) { return u.perfil === 'estagiario' && estagiariosDoCaso(caso).indexOf(u.id) !== -1; }
  function ehSupervisorDoCaso(u, caso) { return u.perfil === 'supervisor' && supervisorDoCaso(caso) === u.id; }

  // ---------- Quem vê o prontuário (camada clínica) ----------
  // Estagiário: só casos em que está alocado.
  // Supervisor: só casos dos seus grupos.
  // Técnico (responsável técnico): todos, sempre com registro na auditoria.
  // Direção do curso e paciente: não navegam no prontuário.
  //   (o paciente recebe a cópia pelo fluxo de solicitação de acesso)
  function podeVerCaso(u, caso) {
    if (!u || !caso) return false;
    if (u.perfil === 'tecnico') return true;
    if (u.perfil === 'supervisor') return ehSupervisorDoCaso(u, caso);
    if (u.perfil === 'estagiario') return ehEstagiarioDoCaso(u, caso);
    return false;
  }

  function casosVisiveis(u) {
    return PEP.db.casos.filter(function (c) { return podeVerCaso(u, c); });
  }

  function podeEscreverEvolucao(u, caso) { return ehEstagiarioDoCaso(u, caso) && caso.status === 'ativo'; }
  function podeValidar(u, caso) { return ehSupervisorDoCaso(u, caso); }
  function podeAdendo(u, caso) { return ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso); }

  // Registro de supervisão: fora do prontuário (o técnico não vê).
  function podeVerOrientacoes(u, caso) { return ehSupervisorDoCaso(u, caso) || ehEstagiarioDoCaso(u, caso); }
  function podeEscreverOrientacao(u, caso) { return ehSupervisorDoCaso(u, caso); }

  // Avaliação psicológica: área restrita, fora do prontuário e do PDF do paciente.
  function podeVerAreaRestrita(u, caso) {
    return u.perfil === 'tecnico' || ehSupervisorDoCaso(u, caso) || ehEstagiarioDoCaso(u, caso);
  }

  function podeRegistrarPresenca(u, caso) {
    return caso.status === 'ativo' && (ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso) || u.perfil === 'tecnico');
  }

  function podeEncerrar(u, caso) { return caso.status === 'ativo' && (ehEstagiarioDoCaso(u, caso) || ehSupervisorDoCaso(u, caso)); }

  function podeVerIndicadores(u) { return u && (u.perfil === 'direcao' || u.perfil === 'tecnico' || u.perfil === 'supervisor'); }
  function podeGerirFila(u) { return u && u.perfil === 'tecnico'; }
  function podeVerAuditoria(u) { return u && u.perfil === 'tecnico'; }

  // ---------- Faltas e abandono ----------
  // Conta as faltas sem justificativa no fim da sequência de sessões passadas.
  function faltasSeguidas(caso) {
    var passadas = PEP.db.sessoes
      .filter(function (s) { return s.casoId === caso.id && s.presenca !== 'agendada'; })
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
    return caso.status === 'ativo' && faltasSeguidas(caso) >= FALTAS_SEGUIDAS_LIMITE;
  }

  return {
    FALTAS_SEGUIDAS_LIMITE: FALTAS_SEGUIDAS_LIMITE,
    nomePerfil: nomePerfil, grupoDoCaso: grupoDoCaso, subgrupoDoCaso: subgrupoDoCaso,
    estagiariosDoCaso: estagiariosDoCaso, supervisorDoCaso: supervisorDoCaso,
    ehEstagiarioDoCaso: ehEstagiarioDoCaso, ehSupervisorDoCaso: ehSupervisorDoCaso,
    podeVerCaso: podeVerCaso, casosVisiveis: casosVisiveis,
    podeEscreverEvolucao: podeEscreverEvolucao, podeValidar: podeValidar, podeAdendo: podeAdendo,
    podeVerOrientacoes: podeVerOrientacoes, podeEscreverOrientacao: podeEscreverOrientacao,
    podeVerAreaRestrita: podeVerAreaRestrita, podeRegistrarPresenca: podeRegistrarPresenca,
    podeEncerrar: podeEncerrar, podeVerIndicadores: podeVerIndicadores,
    podeGerirFila: podeGerirFila, podeVerAuditoria: podeVerAuditoria,
    faltasSeguidas: faltasSeguidas, emRiscoDeAbandono: emRiscoDeAbandono
  };
})();
