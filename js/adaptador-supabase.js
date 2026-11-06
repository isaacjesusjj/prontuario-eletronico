/* =========================================================
   adaptador-supabase.js — liga o Vínculo ao PostgreSQL do
   Supabase. Fica DESLIGADO até js/config-banco.js dizer
   adaptador: 'supabase'.

   Como funciona:
   - Login: Supabase Auth (a senha é conferida no servidor,
     com hash; o navegador recebe um token de acesso).
   - Leitura: cada coleção vem da tabela de mesmo nome. O banco
     só devolve as linhas que o usuário pode ver (políticas RLS
     de banco/schema.sql) — o filtro deixa de depender do navegador.
   - Gravação: cada inserir/atualizar do PEP.repo vira um POST ou
     PATCH na API REST do Supabase (PostgREST).
   - Arquivos: bucket privado "anexos" do Supabase Storage.
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
  var CHAVE_TOKEN = 'vinculo-token-supabase';
  var COLECOES = ['usuarios', 'grupos', 'subgrupos', 'alocacoes', 'pacientes', 'inscricoes', 'casos', 'anamneses', 'consentimentos',
    'encerramentos', 'sessoes', 'evolucoes', 'assinaturas', 'adendos', 'orientacoes', 'documentos', 'anexos', 'avaliacoes',
    'contatos', 'lembretes', 'solicitacoes', 'linksAcesso', 'pedidosTitular', 'aceites', 'auditoria'];
  // Campos que o banco calcula ou guarda em outro lugar (senha no Supabase Auth; hash da auditoria pelo trigger)
  var NAO_ENVIAR = { usuarios: ['senhaHash'], auditoria: ['hash', 'hashAnterior'] };

  function cfg() { return PEP.configBanco; }
  function snake(s) { return s.replace(/[A-Z]/g, function (m) { return '_' + m.toLowerCase(); }); }
  function camel(s) { return s.replace(/_([a-z])/g, function (m, l) { return l.toUpperCase(); }); }

  function token() { try { return sessionStorage.getItem(CHAVE_TOKEN); } catch (e) { return null; } }

  function paraBanco(colecao, obj) {
    var r = {}, fora = NAO_ENVIAR[colecao] || [];
    Object.keys(obj).forEach(function (k) { if (fora.indexOf(k) === -1) r[snake(k)] = obj[k]; });
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

  function requisicao(metodo, caminho, corpo, preferir) {
    var cabecalhos = { apikey: cfg().supabaseChaveAnon, Authorization: 'Bearer ' + (token() || cfg().supabaseChaveAnon), 'Content-Type': 'application/json' };
    if (preferir) cabecalhos.Prefer = preferir;
    return fetch(cfg().supabaseUrl + caminho, { method: metodo, headers: cabecalhos, body: corpo ? JSON.stringify(corpo) : undefined })
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(metodo + ' ' + caminho + ' → ' + r.status + ' ' + t); });
        return r.status === 204 ? null : r.json();
      });
  }

  // Login no Supabase Auth com e-mail e senha. Quem digita só o usuário: completa com o domínio institucional.
  function autenticar(login, senha) {
    var email = login.indexOf('@') === -1 ? login + '@' + PEP.config().instituicao.dominioEmailEstudante : login;
    return fetch(cfg().supabaseUrl + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: cfg().supabaseChaveAnon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: senha })
    }).then(function (r) {
      if (!r.ok) return { ok: false, motivo: 'invalido' };
      return r.json().then(function (sessao) {
        try { sessionStorage.setItem(CHAVE_TOKEN, sessao.access_token); } catch (e) { /* segue sem guardar */ }
        return carregar().then(function () {
          var u = PEP.db.usuarios.filter(function (x) { return String(x.email).toLowerCase() === email.toLowerCase(); })[0];
          return u ? { ok: true, usuario: u } : { ok: false, motivo: 'invalido' };
        });
      });
    });
  }

  // Lê todas as coleções que o usuário pode ver (RLS decide no servidor)
  function carregar() {
    return Promise.all(COLECOES.map(function (c) {
      var ordem = c === 'auditoria' ? '&order=seq' : '';
      return requisicao('GET', '/rest/v1/' + snake(c) + '?select=*' + ordem).then(function (linhas) { PEP.db[c] = linhas.map(doBanco); });
    }));
  }

  // Envia as operações em ordem (a ordem importa por causa das chaves estrangeiras)
  function salvar(ops) {
    return ops.reduce(function (p, op) {
      return p.then(function () {
        var tabela = '/rest/v1/' + snake(op.colecao);
        if (op.op === 'inserir') return requisicao('POST', tabela, paraBanco(op.colecao, op.registro), 'return=minimal');
        return requisicao('PATCH', tabela + '?id=eq.' + encodeURIComponent(op.id), paraBanco(op.colecao, op.campos), 'return=minimal');
      });
    }, Promise.resolve());
  }

  // Estrutura vazia antes do login (as páginas públicas usam só _config e _meta)
  function estruturaVazia() {
    var db = { _meta: PEP._dadosJson._meta, _config: PEP._dadosJson._config };
    COLECOES.forEach(function (c) { db[c] = []; });
    return db;
  }

  function sair() { try { sessionStorage.removeItem(CHAVE_TOKEN); } catch (e) { /* ignora */ } }

  // Arquivos no Storage (bucket privado "anexos"); o caminho é o arquivoId
  function guardarArquivo(blob, id) {
    return fetch(cfg().supabaseUrl + '/storage/v1/object/anexos/' + encodeURIComponent(id), {
      method: 'POST', headers: { apikey: cfg().supabaseChaveAnon, Authorization: 'Bearer ' + token(), 'Content-Type': blob.type }, body: blob
    }).then(function (r) { if (!r.ok) throw new Error('Storage ' + r.status); });
  }
  function obterArquivo(id) {
    return fetch(cfg().supabaseUrl + '/storage/v1/object/authenticated/anexos/' + encodeURIComponent(id), {
      headers: { apikey: cfg().supabaseChaveAnon, Authorization: 'Bearer ' + token() }
    }).then(function (r) { return r.ok ? r.blob() : null; });
  }

  return { nome: 'Supabase (PostgreSQL, São Paulo)', remoto: true, autenticar: autenticar, carregar: carregar, salvar: salvar,
    estruturaVazia: estruturaVazia, sair: sair, temSessao: function () { return !!token(); }, guardarArquivo: guardarArquivo, obterArquivo: obterArquivo };
})();
