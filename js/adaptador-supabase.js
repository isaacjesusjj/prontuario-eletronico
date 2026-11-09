/* =========================================================
   adaptador-supabase.js — liga o Vinculum ao PostgreSQL do
   Supabase. Fica DESLIGADO até js/config-banco.js dizer
   adaptador: 'supabase'.

   Como funciona:
   - Login: Supabase Auth (a senha é conferida no servidor,
     com hash; o navegador recebe um token de acesso curto, que
     é renovado sozinho antes de vencer).
   - Leitura: cada coleção vem da tabela de mesmo nome. O banco
     só devolve as linhas que o usuário pode ver (políticas RLS
     de banco/schema.sql) — o filtro deixa de depender do navegador.
   - Gravação: cada inserir/atualizar do PEP.repo vira um POST ou
     PATCH na API REST do Supabase (PostgREST). A data e a hora
     de cada registro são carimbadas pelo servidor.
   - Funções do banco (schema app): indicadores agregados e
     verificação da cadeia da auditoria.
   - Arquivos: bucket privado "anexos" do Supabase Storage, no
     caminho "<caso>/<arquivo>" (a política confere o caso).
   Nomes: o JSON usa camelCase (casoId); o banco, snake_case (caso_id).

   Escrito e revisado contra a documentação da API; o schema e as
   políticas foram testados num PostgreSQL real (banco/testar_banco.mjs).
   Falta testar contra um projeto Supabase criado — passo a passo
   em banco/README.md.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.adaptadores = PEP.adaptadores || {};

PEP.adaptadores.supabase = (function () {
  var CHAVE_SESSAO = 'vinculo-sessao-supabase';
  var COLECOES = ['usuarios', 'grupos', 'subgrupos', 'alocacoes', 'pacientes', 'inscricoes', 'casos', 'anamneses', 'consentimentos',
    'encerramentos', 'sessoes', 'evolucoes', 'assinaturas', 'adendos', 'orientacoes', 'documentos', 'anexos', 'avaliacoes',
    'riscos', 'notificacoes', 'planosSeguranca', 'contatos', 'lembretes', 'solicitacoes', 'linksAcesso', 'pedidosTitular', 'aceites', 'acessosJustificados', 'transferencias', 'eventosDocumento', 'comunicacoes', 'auditoria'];
  // Campos que o banco calcula ou guarda em outro lugar: a senha e o segundo fator (MFA) ficam no
  // Supabase Auth; o hash e a hora da auditoria são do trigger (a tabela é particionada pela hora,
  // que precisa ser a do servidor)
  var NAO_ENVIAR = { usuarios: ['senhaHash', 'mfaAtivo', 'mfaSegredo', 'mfaRecuperacao', 'mfaDesde', 'mfaFatorId', 'mfaUltimoPasso'], auditoria: ['hash', 'hashAnterior', 'em'] };

  function cfg() { return PEP.configBanco; }
  function snake(s) { return s.replace(/[A-Z]/g, function (m) { return '_' + m.toLowerCase(); }); }
  function camel(s) { return s.replace(/_([a-z])/g, function (m, l) { return l.toUpperCase(); }); }

  // ---------- Sessão do Supabase Auth ----------
  // Token de acesso (vale ~1 hora) + token de renovação, no sessionStorage: fecha a aba, acaba a sessão.
  function lerSessao() { try { return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || 'null'); } catch (e) { return null; } }
  function gravarSessao(s) {
    try {
      sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({ acesso: s.access_token, renovacao: s.refresh_token, expira: Date.now() + (s.expires_in || 3600) * 1000 }));
    } catch (e) { /* segue sem guardar: a sessão dura só esta página */ }
  }
  function token() { var s = lerSessao(); return s ? s.acesso : null; }

  // A sessão do Vinculum pode durar até 12 horas: o token é renovado um minuto antes de vencer
  var renovando = null;
  function garantirToken() {
    var s = lerSessao();
    if (!s || Date.now() < s.expira - 60000) return Promise.resolve();
    if (!renovando) {
      renovando = fetch(cfg().supabaseUrl + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', headers: { apikey: cfg().supabaseChaveAnon, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.renovacao })
      }).then(function (r) {
        if (!r.ok) throw new Error('Sessão do servidor expirada: entre de novo.');
        return r.json();
      }).then(function (nova) { gravarSessao(nova); renovando = null; }, function (erro) { renovando = null; throw erro; });
    }
    return renovando;
  }

  // ---------- Conversão de nomes e datas ----------
  // Data e hora locais ("AAAA-MM-DDTHH:MM") vão com o fuso de quem usa (ISO em UTC); data pura vai como está.
  // Sem isso, o servidor (que trabalha em UTC) gravaria a hora de Brasília 3 horas adiantada.
  function paraBanco(colecao, obj) {
    var r = {}, fora = NAO_ENVIAR[colecao] || [];
    Object.keys(obj).forEach(function (k) {
      if (fora.indexOf(k) !== -1) return;
      var v = obj[k];
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) v = new Date(v).toISOString();
      r[snake(k)] = v;
    });
    return r;
  }

  // Timestamps voltam como "2026-11-03T14:30:00-03:00": o app usa "AAAA-MM-DDTHH:MM" no horário local
  function doBanco(linha) {
    var r = {};
    Object.keys(linha).forEach(function (k) {
      var v = linha[k];
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
        var d = new Date(v), dd = function (n) { return n < 10 ? '0' + n : '' + n; };
        v = d.getFullYear() + '-' + dd(d.getMonth() + 1) + '-' + dd(d.getDate()) + 'T' + dd(d.getHours()) + ':' + dd(d.getMinutes());
      } else if (typeof v === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(v)) v = v.slice(0, 5);
      r[camel(k)] = v;
    });
    return r;
  }

  // ---------- Requisições ----------
  // Do erro do servidor fica só o código e a mensagem curta: o "detalhe" do PostgreSQL pode trazer os
  // valores da linha recusada (conteúdo clínico), que não podem ir para o console nem para logs.
  function erroSeguro(metodo, caminho, status, texto) {
    var codigo = '', msg = '';
    try { var j = JSON.parse(texto); codigo = j.code || ''; msg = j.message || ''; } catch (e) { /* resposta sem JSON */ }
    return new Error(metodo + ' ' + caminho.split('?')[0] + ' → ' + status + (codigo ? ' (' + codigo + ')' : '') + (msg ? ': ' + String(msg).slice(0, 140) : ''));
  }

  function requisicao(metodo, caminho, corpo, extras) {
    return garantirToken().then(function () {
      var cabecalhos = { apikey: cfg().supabaseChaveAnon, Authorization: 'Bearer ' + (token() || cfg().supabaseChaveAnon), 'Content-Type': 'application/json' };
      Object.keys(extras || {}).forEach(function (k) { cabecalhos[k] = extras[k]; });
      return fetch(cfg().supabaseUrl + caminho, { method: metodo, headers: cabecalhos, body: corpo ? JSON.stringify(corpo) : undefined });
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw erroSeguro(metodo, caminho, r.status, t); });
      // Com "Prefer: return=minimal", o POST responde 201 sem corpo e o PATCH, 204: só lê JSON se houver
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }

  // Funções do schema "app" (expostas em Settings → API → Exposed schemas)
  function rpc(nome, argumentos) {
    return requisicao('POST', '/rest/v1/rpc/' + nome, argumentos || {}, { 'Content-Profile': 'app', 'Accept-Profile': 'app' });
  }

  // ---------- Login e senha ----------
  function entrarNoAuth(email, senha) {
    return fetch(cfg().supabaseUrl + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: cfg().supabaseChaveAnon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: senha })
    }).then(function (r) { return r.ok ? r.json() : null; });
  }

  // ---------- Verificação em duas etapas (MFA do Supabase Auth, TOTP) ----------
  var emailAtual = '';
  function usuarioAtualNoBanco() { return PEP.db.usuarios.filter(function (x) { return String(x.email).toLowerCase() === emailAtual; })[0]; }
  function cabecalhoAuth() { return { apikey: cfg().supabaseChaveAnon, Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' }; }
  function fatoresVerificados() {
    return fetch(cfg().supabaseUrl + '/auth/v1/user', { headers: cabecalhoAuth() })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (usr) { return (usr.factors || []).filter(function (f) { return f.factor_type === 'totp' && f.status === 'verified'; }); });
  }
  // Desafio + verificação: o Supabase devolve uma sessão nova, de nível aal2 (entrou com o segundo fator)
  function verificarMfa(fatorId, codigo) {
    var base = cfg().supabaseUrl + '/auth/v1/factors/' + encodeURIComponent(fatorId);
    return garantirToken().then(function () { return fetch(base + '/challenge', { method: 'POST', headers: cabecalhoAuth(), body: '{}' }); })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (desafio) {
        if (!desafio) return false;
        return fetch(base + '/verify', { method: 'POST', headers: cabecalhoAuth(), body: JSON.stringify({ challenge_id: desafio.id, code: String(codigo || '').replace(/\D/g, '') }) })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (sessao) {
            if (!sessao) return false;
            gravarSessao(sessao);
            return carregar().then(function () { var u = usuarioAtualNoBanco(); if (u) { u.mfaAtivo = true; u.mfaFatorId = fatorId; } return true; });
          });
      });
  }
  function cadastrarMfa() {
    return garantirToken().then(function () {
      return fetch(cfg().supabaseUrl + '/auth/v1/factors', { method: 'POST', headers: cabecalhoAuth(), body: JSON.stringify({ factor_type: 'totp', friendly_name: 'Vinculum' }) });
    }).then(function (r) { if (!r.ok) throw new Error('MFA ' + r.status); return r.json(); })
      .then(function (f) { return { fatorId: f.id, segredo: f.totp.secret, uri: f.totp.uri }; });
  }
  function desativarMfa(fatorId) {
    return garantirToken().then(function () {
      return fetch(cfg().supabaseUrl + '/auth/v1/factors/' + encodeURIComponent(fatorId), { method: 'DELETE', headers: cabecalhoAuth() });
    }).then(function (r) { if (!r.ok) throw new Error('MFA ' + r.status); });
  }

  // Login no Supabase Auth com e-mail e senha. Quem digita só o usuário: completa com o domínio dos estudantes
  // (a equipe e os pacientes entram com o e-mail completo). Com fator verificado, pede o código (segundo passo).
  function autenticar(login, senha) {
    var email = login.indexOf('@') === -1 ? login + '@' + PEP.config().instituicao.dominioEmailEstudante : login;
    return entrarNoAuth(email, senha).then(function (sessao) {
      if (!sessao) return { ok: false, motivo: 'invalido' };
      gravarSessao(sessao);
      emailAtual = email.toLowerCase();
      return fatoresVerificados().then(function (fatores) {
        return carregar().then(function () {
          var u = usuarioAtualNoBanco();
          if (!u) return { ok: false, motivo: 'invalido' };
          if (fatores.length) return { ok: false, motivo: 'mfa', fatorId: fatores[0].id, usuario: u };
          u.mfaAtivo = false;
          return { ok: true, usuario: u };
        });
      });
    });
  }

  // Troca de senha: confere a senha atual entrando de novo (o Supabase pede login recente para
  // trocar a senha) e grava a nova no Auth, que guarda só o hash
  function trocarSenha(email, atual, nova) {
    return entrarNoAuth(email, atual).then(function (sessao) {
      if (!sessao) return { ok: false, motivo: 'senha-atual' };
      gravarSessao(sessao);
      return fetch(cfg().supabaseUrl + '/auth/v1/user', {
        method: 'PUT', headers: { apikey: cfg().supabaseChaveAnon, Authorization: 'Bearer ' + sessao.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nova })
      }).then(function (r) { return r.ok ? { ok: true } : { ok: false, motivo: 'servidor' }; });
    });
  }

  // Esqueci a senha: o Supabase Auth manda um link de redefinição. A resposta é tratada igual, exista
  // ou não o e-mail (o site não revela quem tem conta).
  function recuperarSenha(email) {
    var ok = function () { return { ok: true }; };
    return fetch(cfg().supabaseUrl + '/auth/v1/recover', {
      method: 'POST', headers: { apikey: cfg().supabaseChaveAnon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email })
    }).then(ok, ok);
  }

  // ---------- Dados ----------
  // Lê todas as coleções que o usuário pode ver (RLS decide no servidor)
  function carregar() {
    return Promise.all(COLECOES.map(function (c) {
      var ordem = c === 'auditoria' ? '&order=seq' : '';
      return requisicao('GET', '/rest/v1/' + snake(c) + '?select=*' + ordem).then(function (linhas) { PEP.db[c] = linhas.map(doBanco); });
    }));
  }

  // Envia as operações em ordem (a ordem importa por causa das chaves estrangeiras e das regras de transição).
  // Eventos de visitante (login que falhou, link do paciente) ficam com o servidor: registro do Supabase Auth,
  // trigger da inscrição e a Edge Function do link. O banco não aceita evento gravado "em nome" de visitante.
  function salvar(ops) {
    return ops.filter(function (op) { return !(op.colecao === 'auditoria' && op.registro && op.registro.usuarioId === 'visitante'); })
      .reduce(function (p, op) {
        return p.then(function () {
          var tabela = '/rest/v1/' + snake(op.colecao);
          if (op.op === 'inserir') return requisicao('POST', tabela, paraBanco(op.colecao, op.registro), { Prefer: 'return=minimal' });
          return requisicao('PATCH', tabela + '?id=eq.' + encodeURIComponent(op.id), paraBanco(op.colecao, op.campos), { Prefer: 'return=minimal' });
        });
      }, Promise.resolve());
  }

  // Estrutura vazia antes do login (as páginas públicas usam só _config e _meta)
  function estruturaVazia() {
    var db = { _meta: PEP._dadosJson._meta, _config: PEP._dadosJson._config };
    COLECOES.forEach(function (c) { db[c] = []; });
    return db;
  }

  function sair() { try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* ignora */ } }

  // A cadeia da auditoria é conferida pelo banco (app.verificar_auditoria devolve o seq do 1º evento quebrado)
  function verificarAuditoria() {
    return rpc('verificar_auditoria').then(function (seq) {
      var total = PEP.db.auditoria.length;
      return seq === null ? { ok: true, total: total } : { ok: false, total: total, quebraEm: Number(seq) - 1, evento: { id: 'seq ' + seq, em: '' } };
    });
  }

  // Indicadores agregados prontos do servidor (mesmo formato de PEP.regras.indicadores)
  function indicadores() { return rpc('indicadores', { p_limite_faltas: PEP.regra('faltasSeguidasLimite') }); }

  // "Quem acessou meu prontuário": o paciente recebe a lista pronta (não lê a tabela de auditoria)
  function acessosAoMeuProntuario() { return rpc('acessos_ao_meu_prontuario').then(function (l) { return (l || []).map(doBanco); }); }

  // ---------- Arquivos no Storage (bucket privado "anexos") ----------
  // O caminho é o arquivoId, "<caso>/<arquivo>": cada parte é codificada, a barra fica
  function caminhoArquivo(id) { return String(id).split('/').map(encodeURIComponent).join('/'); }
  function guardarArquivo(blob, id) {
    return garantirToken().then(function () {
      return fetch(cfg().supabaseUrl + '/storage/v1/object/anexos/' + caminhoArquivo(id), {
        method: 'POST', headers: { apikey: cfg().supabaseChaveAnon, Authorization: 'Bearer ' + token(), 'Content-Type': blob.type }, body: blob
      });
    }).then(function (r) { if (!r.ok) throw new Error('Storage ' + r.status); });
  }
  function obterArquivo(id) {
    return garantirToken().then(function () {
      return fetch(cfg().supabaseUrl + '/storage/v1/object/authenticated/anexos/' + caminhoArquivo(id), {
        headers: { apikey: cfg().supabaseChaveAnon, Authorization: 'Bearer ' + token() }
      });
    }).then(function (r) { return r.ok ? r.blob() : null; });
  }

  return { nome: 'Supabase (PostgreSQL, São Paulo)', remoto: true, autenticar: autenticar, trocarSenha: trocarSenha, recuperarSenha: recuperarSenha, carregar: carregar, salvar: salvar,
    verificarMfa: verificarMfa, cadastrarMfa: cadastrarMfa, confirmarCadastroMfa: verificarMfa, desativarMfa: desativarMfa,
    estruturaVazia: estruturaVazia, sair: sair, temSessao: function () { return !!token(); }, verificarAuditoria: verificarAuditoria,
    indicadores: indicadores, acessosAoMeuProntuario: acessosAoMeuProntuario, guardarArquivo: guardarArquivo, obterArquivo: obterArquivo,
    // expostos só para o teste automático do adaptador (testes/testar_site.py)
    _paraBanco: paraBanco, _erroSeguro: erroSeguro };
})();
