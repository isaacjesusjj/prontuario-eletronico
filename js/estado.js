/* =========================================================
   estado.js — utilitários, sessão do usuário, login e
   auditoria com cadeia de hash.
   Os dados ficam no navegador (localStorage) só no protótipo;
   a troca para o banco acontece em js/repositorio.js.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.util = (function () {
  // Escapa texto antes de colocar no HTML (evita injeção de código)
  function esc(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function porId(lista, id) {
    for (var i = 0; i < lista.length; i++) { if (lista[i].id === id) return lista[i]; }
    return null;
  }

  function novoId(prefixo) {
    return prefixo + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function dd(n) { return n < 10 ? '0' + n : '' + n; }

  // Data de hoje no formato AAAA-MM-DD (horário local)
  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + dd(d.getMonth() + 1) + '-' + dd(d.getDate());
  }

  // Data e hora agora no formato AAAA-MM-DDTHH:MM
  function agora() {
    var d = new Date();
    return hoje() + 'T' + dd(d.getHours()) + ':' + dd(d.getMinutes());
  }

  function paraUtc(iso) { var p = iso.slice(0, 10).split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
  function diasEntre(a, b) { return Math.round((paraUtc(b) - paraUtc(a)) / 86400000); }
  function somarDias(iso, n) {
    var d = new Date(paraUtc(iso) + n * 86400000);
    return d.getUTCFullYear() + '-' + dd(d.getUTCMonth() + 1) + '-' + dd(d.getUTCDate());
  }
  function diaDaSemana(iso) { return new Date(paraUtc(iso)).getUTCDay(); } // 0 = domingo

  function idade(nascimento) {
    if (!nascimento) return null;
    var h = hoje().split('-').map(Number), n = nascimento.split('-').map(Number);
    var anos = h[0] - n[0];
    if (h[1] < n[1] || (h[1] === n[1] && h[2] < n[2])) anos--;
    return anos;
  }

  // "2026-08-19" -> "19/08/2026"; "2026-08-19T16:10" -> "19/08/2026 16:10"
  function formatarData(texto) {
    if (!texto) return '—';
    var partes = String(texto).split('T');
    var d = partes[0].split('-');
    if (d.length !== 3) return esc(texto); // fora do formato: devolve escapado (o resultado vai direto para o HTML)
    var data = d[2] + '/' + d[1] + '/' + d[0];
    return partes[1] ? data + ' ' + partes[1].slice(0, 5) : data;
  }

  // Data curta para listas: "Hoje", "Amanhã" ou "qua, 11/11" (dia da semana ajuda a lembrar a sessão)
  var SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  function diaRelativo(iso) {
    if (!iso || String(iso).split('-').length !== 3) return formatarData(iso);
    var n = diasEntre(hoje(), iso);
    if (n === 0) return 'Hoje';
    if (n === 1) return 'Amanhã';
    var d = String(iso).slice(0, 10).split('-');
    return SEMANA[diaDaSemana(iso)] + ', ' + d[2] + '/' + d[1] + (d[0] !== hoje().slice(0, 4) ? '/' + d[0] : '');
  }

  return { esc: esc, porId: porId, novoId: novoId, hoje: hoje, agora: agora, diasEntre: diasEntre, somarDias: somarDias,
    diaDaSemana: diaDaSemana, idade: idade, formatarData: formatarData, diaRelativo: diaRelativo };
})();

PEP.estado = (function () {
  var CHAVE_DADOS = 'vinculo-dados-v2';
  var CHAVE_SESSAO = 'vinculo-sessao-v2';      // sessionStorage: fecha a aba, acaba a sessão
  var CHAVE_TENTATIVAS = 'vinculo-tentativas-v2';
  var memoria = {};                              // reserva caso o navegador bloqueie o armazenamento
  var motivoSaida = '';

  function ler(area, chave) {
    try { return window[area].getItem(chave); } catch (e) { return memoria[area + chave] || null; }
  }
  function gravar(area, chave, valor) {
    try { window[area].setItem(chave, valor); } catch (e) { memoria[area + chave] = valor; }
  }
  function remover(area, chave) {
    try { window[area].removeItem(chave); } catch (e) { /* ignora */ }
    delete memoria[area + chave];
  }

  function versaoDoJson() {
    var d = PEP._dadosJson;
    return d && d._meta ? d._meta.versao : '';
  }

  // Usa a cópia guardada no navegador se for da mesma versão do JSON
  function carregar() {
    // Com o banco ligado, os dados chegam depois do login (só o que o usuário pode ver)
    if (PEP.repo.adaptador().remoto) { PEP.db = PEP.repo.adaptador().estruturaVazia(); return; }
    var salvo = ler('localStorage', CHAVE_DADOS);
    if (salvo) {
      try {
        var dados = JSON.parse(salvo);
        if (dados && dados._meta && dados._meta.versao === versaoDoJson()) { PEP.db = dados; return; }
      } catch (e) { /* dados corrompidos: recomeça */ }
    }
    PEP.db = PEP.criarDadosIniciais();
    salvar();
  }

  var avisouEspaco = false;
  function salvar() {
    try { window.localStorage.setItem(CHAVE_DADOS, JSON.stringify(PEP.db)); avisouEspaco = false; }
    catch (e) {
      memoria.dados = JSON.stringify(PEP.db);
      // Espaço do navegador cheio ou bloqueado: avisa, para ninguém achar que o registro ficou guardado
      if (!avisouEspaco && PEP.ui) {
        avisouEspaco = true;
        PEP.ui.toast('Atenção: o navegador não deixou guardar os dados (espaço cheio ou bloqueado). O que for feito agora se perde ao recarregar.');
      }
    }
  }

  function restaurar() {
    if (PEP.repo.adaptador().remoto) return;
    PEP.db = PEP.criarDadosIniciais();
    remover('localStorage', CHAVE_TENTATIVAS);
    salvar();
    if (PEP.arquivos) PEP.arquivos.limparTudo();
  }

  // ---------- Sessão ----------
  function lerSessao() {
    try { return JSON.parse(ler('sessionStorage', CHAVE_SESSAO) || 'null'); } catch (e) { return null; }
  }

  function usuarioAtual() {
    var s = lerSessao();
    if (!s || !PEP.db) return null;
    var agoraMs = Date.now();
    var inativo = (PEP.regra('inatividadeMinutos') || 15) * 60000;
    var maximo = (PEP.regra('sessaoMaximaHoras') || 12) * 3600000;
    if (agoraMs - s.ultimoUso > inativo || agoraMs - s.inicio > maximo) {
      motivoSaida = agoraMs - s.ultimoUso > inativo ? 'inatividade' : 'expirada';
      registrarAuditoria('Sessão encerrada por ' + (motivoSaida === 'inatividade' ? 'inatividade' : 'tempo máximo'), '—', s.usuarioId);
      remover('sessionStorage', CHAVE_SESSAO);
      return null;
    }
    var u = PEP.util.porId(PEP.db.usuarios, s.usuarioId);
    return u && u.ativo ? u : null;
  }

  var ultimaMarca = 0;
  function marcarAtividade(forcar) {
    var agoraMs = Date.now();
    if (!forcar && agoraMs - ultimaMarca < 10000) return;
    ultimaMarca = agoraMs;
    var s = lerSessao();
    if (s) { s.ultimoUso = agoraMs; gravar('sessionStorage', CHAVE_SESSAO, JSON.stringify(s)); }
  }

  // Último acesso e tentativas sem sucesso desde então (boa prática de segurança, SBIS): a pessoa percebe
  // se alguém tentou entrar com o usuário dela. Calculado da auditoria antes de registrar esta entrada.
  function resumoDoUltimoAcesso(usuario) {
    var eventos = PEP.db.auditoria || [], login = String(usuario.login || '').toLowerCase(), i = eventos.length;
    // A trilha está em ordem: procura a última entrada desta conta (a hora guarda só até o minuto, a ordem é exata)
    while (i-- > 0) { if (eventos[i].usuarioId === usuario.id && eventos[i].acao === 'Entrou no sistema') break; }
    if (i < 0) return null;
    var falhas = eventos.slice(i + 1).filter(function (a) {
      return a.usuarioId === 'visitante' && String(a.alvo).toLowerCase() === login && /sem sucesso|incorreto/.test(a.acao);
    }).length;
    return { em: eventos[i].em, falhas: falhas };
  }
  function lerUltimoAcesso() { var s = lerSessao(); return s && !s.ultimoAcessoDispensado ? s.ultimoAcesso || null : null; }
  function dispensarUltimoAcesso() { var s = lerSessao(); if (s) { s.ultimoAcessoDispensado = true; gravar('sessionStorage', CHAVE_SESSAO, JSON.stringify(s)); } }

  function entrar(usuario) {
    var agoraMs = Date.now();
    gravar('sessionStorage', CHAVE_SESSAO, JSON.stringify({ usuarioId: usuario.id, inicio: agoraMs, ultimoUso: agoraMs, ultimoAcesso: resumoDoUltimoAcesso(usuario) }));
    motivoSaida = ''; // o aviso de "sessão encerrada" some quando a pessoa entra de novo
    registrarAuditoria('Entrou no sistema', '—');
  }

  function sair() {
    registrarAuditoria('Saiu do sistema', '—');
    remover('sessionStorage', CHAVE_SESSAO);
    if (PEP.repo.adaptador().sair) PEP.repo.adaptador().sair();
  }

  // Milissegundos desde o último uso (null se ninguém estiver logado)
  function tempoInativo() {
    var s = lerSessao();
    return s ? Date.now() - s.ultimoUso : null;
  }

  function lerMotivoSaida() { return motivoSaida; }

  // ---------- Login ----------
  // Bloqueio por usuário digitado (guardado no navegador para valer mesmo se recarregar a página).
  // A mensagem é sempre genérica: não revela se o usuário existe.
  function lerTentativas() { try { return JSON.parse(ler('localStorage', CHAVE_TENTATIVAS) || '{}'); } catch (e) { return {}; } }
  function registroDe(t, alvo) { return t[alvo] || { falhas: 0, bloqueadoAte: 0, bloqueios: 0 }; }
  function segundosBloqueado(alvo) {
    var reg = registroDe(lerTentativas(), alvo);
    return Date.now() < reg.bloqueadoAte ? Math.ceil((reg.bloqueadoAte - Date.now()) / 1000) : 0;
  }

  // Senha ou código errados: conta a tentativa e, a cada N erros, bloqueia por um tempo cada vez maior
  function registrarFalha(alvo, acao) {
    var t = lerTentativas(), reg = registroDe(t, alvo);
    reg.falhas++;
    registrarAuditoria(acao, alvo || '—', 'visitante'); // nunca grava a senha nem o código
    if (reg.falhas >= (PEP.regra('tentativasLogin') || 5)) {
      reg.falhas = 0;
      reg.bloqueios = (reg.bloqueios || 0) + 1;
      // Bloqueio progressivo: 30 s, 60 s, 2 min, 4 min... até o teto. Quem tenta adivinhar a senha
      // fica cada vez mais lento; quem só errou a senha uma vez quase não sente (NIST SP 800-63B-4).
      var base = PEP.regra('bloqueioLoginSegundos') || 30, teto = PEP.regra('bloqueioLoginMaximoSegundos') || 900;
      var segundos = Math.min(base * Math.pow(2, reg.bloqueios - 1), teto);
      reg.bloqueadoAte = Date.now() + segundos * 1000;
      registrarAuditoria('Login bloqueado temporariamente (' + segundos + ' s)', alvo || '—', 'visitante');
    }
    t[alvo] = reg;
    gravar('localStorage', CHAVE_TENTATIVAS, JSON.stringify(t));
    var bloqueado = reg.bloqueadoAte > Date.now();
    return { ok: false, motivo: bloqueado ? 'bloqueado' : 'invalido', segundos: bloqueado ? Math.ceil((reg.bloqueadoAte - Date.now()) / 1000) : 0 };
  }
  function limparFalhas(alvo) {
    var t = lerTentativas();
    delete t[alvo];
    gravar('localStorage', CHAVE_TENTATIVAS, JSON.stringify(t));
  }

  // Verificação em duas etapas: depois da senha certa, quem tem MFA ainda não entra. Fica "pendente"
  // (só na memória desta página, por 5 minutos) até digitar o código do app ou um código de recuperação.
  var mfaPendente = null; // { usuarioId, alvo, ate, fatorId }
  function lerMfaPendente() { if (mfaPendente && Date.now() > mfaPendente.ate) mfaPendente = null; return mfaPendente; }
  function cancelarMfa() { mfaPendente = null; }

  function autenticar(login, senha) {
    var alvo = String(login || '').trim().toLowerCase();
    var espera = segundosBloqueado(alvo);
    if (espera) return Promise.resolve({ ok: false, motivo: 'bloqueado', segundos: espera });
    var falhou = function () { return registrarFalha(alvo, 'Tentativa de login sem sucesso'); };
    var deuCerto = function (usuario) { limparFalhas(alvo); entrar(usuario); return { ok: true, usuario: usuario }; };
    var pedirCodigo = function (usuario, fatorId) {
      mfaPendente = { usuarioId: usuario.id, alvo: alvo, ate: Date.now() + 5 * 60000, fatorId: fatorId || null };
      return { ok: false, motivo: 'mfa' };
    };

    // Banco ligado: quem confere a senha (e diz se há segundo fator) é o Supabase Auth, no servidor
    var ad = PEP.repo.adaptador();
    if (ad.remoto) {
      return ad.autenticar(alvo, senha).then(function (r) {
        if (r.ok) return deuCerto(r.usuario);
        return r.motivo === 'mfa' ? pedirCodigo(r.usuario, r.fatorId) : falhou();
      });
    }

    if (!PEP.seguranca.suportaCripto()) return Promise.resolve({ ok: false, motivo: 'sem-cripto' });
    var achado = null;
    PEP.db.usuarios.forEach(function (u) {
      if (String(u.login).toLowerCase() === alvo || String(u.email || '').toLowerCase() === alvo) achado = u;
    });
    // Mesmo sem usuário, calcula um hash: o tempo de resposta não denuncia se a conta existe
    var guardado = achado ? achado.senhaHash : PEP.db.usuarios[0].senhaHash;
    return PEP.seguranca.conferirSenha(senha, guardado).then(function (confere) {
      if (!(achado && confere && achado.ativo)) return falhou();
      return achado.mfaAtivo ? pedirCodigo(achado) : deuCerto(achado);
    });
  }

  // Código de 6 dígitos do app, ou código de recuperação ("abcd-efgh", vale uma vez)
  function conferirCodigoLocal(u, codigo) {
    var c = String(codigo || '').trim().toLowerCase();
    if (/^[a-z0-9]{4}-[a-z0-9]{4}$/.test(c)) {
      var h = PEP.seguranca.sha256(c), lista = u.mfaRecuperacao || [];
      if (lista.indexOf(h) === -1) return Promise.resolve(false);
      PEP.repo.atualizar('usuarios', u.id, { mfaRecuperacao: lista.filter(function (x) { return x !== h; }) });
      registrarAuditoria('Entrou com um código de recuperação (verificação em duas etapas)', u.id, u.id);
      return Promise.resolve(true);
    }
    if (!u.mfaSegredo) return Promise.resolve(false);
    return PEP.seguranca.conferirTotp(u.mfaSegredo, c, u.mfaUltimoPasso).then(function (passo) {
      if (passo) PEP.repo.atualizar('usuarios', u.id, { mfaUltimoPasso: passo });   // o mesmo código não serve de novo
      return !!passo;
    });
  }

  function confirmarMfa(codigo) {
    var p = lerMfaPendente();
    if (!p) return Promise.resolve({ ok: false, motivo: 'expirou' });
    var espera = segundosBloqueado(p.alvo);
    if (espera) return Promise.resolve({ ok: false, motivo: 'bloqueado', segundos: espera });
    var ad = PEP.repo.adaptador();
    var u = PEP.util.porId(PEP.db.usuarios, p.usuarioId);
    var conferencia = ad.remoto ? ad.verificarMfa(p.fatorId, codigo) : conferirCodigoLocal(u, codigo);
    return conferencia.then(function (ok) {
      if (!ok) return registrarFalha(p.alvo, 'Código da verificação em duas etapas incorreto');
      mfaPendente = null;
      u = PEP.util.porId(PEP.db.usuarios, p.usuarioId);   // com o banco ligado, os dados chegaram de novo
      limparFalhas(p.alvo);
      entrar(u);
      return { ok: true, usuario: u };
    });
  }

  // MFA exigido para o perfil (regras.mfaObrigatoria + regras.mfaPerfisObrigatorios)...
  function mfaExigido(u) {
    return !!(u && PEP.regra('mfaObrigatoria') && (PEP.regra('mfaPerfisObrigatorios') || []).indexOf(u.perfil) !== -1);
  }
  // ... e ainda não configurado
  function precisaConfigurarMfa(u) { return mfaExigido(u) && !u.mfaAtivo; }

  // O usuário precisa configurar o MFA, trocar a senha (provisória) ou aceitar um termo antes de usar o sistema.
  // O MFA obrigatório vem primeiro: com o banco ligado, a conta sem o segundo fator não grava nada
  // (nem a troca de senha nem o aceite do termo), porque app.usuario_atual() fica vazio até o código.
  function pendenciaDeAcesso(u) {
    if (!u) return '';
    if (precisaConfigurarMfa(u)) return 'configurar-mfa';
    if (u.senhaProvisoria) return 'trocar-senha';
    var termo = u.perfil === 'paciente' ? 'uso' : 'sigilo';
    var versao = PEP.config().termos[termo];
    var aceitou = PEP.db.aceites.some(function (a) { return a.usuarioId === u.id && a.termo === termo && a.versao === versao; });
    return aceitou ? '' : 'termo';
  }

  // ---------- Auditoria com cadeia de hash ----------
  // Cada evento guarda o hash do anterior. Se alguém alterar ou apagar um evento,
  // a conta deixa de fechar a partir dele (é assim que se detecta adulteração).
  function conteudoDoEvento(ev) { return JSON.stringify([ev.id, ev.em, ev.usuarioId, ev.acao, ev.alvo, ev.hashAnterior]); }

  function selarAuditoria(lista) {
    var anterior = '0';
    lista.forEach(function (ev) {
      ev.hashAnterior = anterior;
      ev.hash = PEP.seguranca.sha256(conteudoDoEvento(ev));
      anterior = ev.hash;
    });
  }

  function registrarAuditoria(acao, alvo, usuarioId) {
    if (!PEP.db) return;
    var lista = PEP.db.auditoria;
    var u = usuarioId ? null : (lerSessao() || {});
    var ev = {
      id: PEP.util.novoId('au'),
      em: PEP.util.agora(),
      usuarioId: usuarioId || (u && u.usuarioId) || 'visitante',
      acao: acao,
      alvo: alvo || '—',
      hashAnterior: lista.length ? lista[lista.length - 1].hash : '0'
    };
    ev.hash = PEP.seguranca.sha256(conteudoDoEvento(ev));
    PEP.repo.inserir('auditoria', ev);
    PEP.repo.salvar();
  }

  function verificarAuditoria() {
    var lista = PEP.db.auditoria, anterior = '0';
    for (var i = 0; i < lista.length; i++) {
      var ev = lista[i];
      if (ev.hashAnterior !== anterior || ev.hash !== PEP.seguranca.sha256(conteudoDoEvento(ev))) {
        return { ok: false, total: lista.length, quebraEm: i, evento: ev };
      }
      anterior = ev.hash;
    }
    return { ok: true, total: lista.length };
  }

  return {
    carregar: carregar, salvar: salvar, restaurar: restaurar,
    usuarioAtual: usuarioAtual, marcarAtividade: marcarAtividade, tempoInativo: tempoInativo, entrar: entrar, sair: sair, lerMotivoSaida: lerMotivoSaida,
    autenticar: autenticar, pendenciaDeAcesso: pendenciaDeAcesso, lerMfaPendente: lerMfaPendente, cancelarMfa: cancelarMfa, confirmarMfa: confirmarMfa,
    precisaConfigurarMfa: precisaConfigurarMfa, mfaExigido: mfaExigido, lerUltimoAcesso: lerUltimoAcesso, dispensarUltimoAcesso: dispensarUltimoAcesso,
    registrarAuditoria: registrarAuditoria, selarAuditoria: selarAuditoria, verificarAuditoria: verificarAuditoria
  };
})();
