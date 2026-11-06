/* =========================================================
   dados.js — carrega os dados 100% FICTÍCIOS de
   dados/dados-iniciais.json. Uma cópia nova é devolvida
   a cada chamada (usada também em "Restaurar dados").

   Cada coleção do JSON corresponde a uma tabela do banco
   (banco/schema.sql): os ids ligam as coleções como chaves
   estrangeiras. Na migração, o JSON vira INSERTs.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP._dadosJson = null;

PEP.carregarDadosJson = function () {
  return fetch('dados/dados-iniciais.json', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (json) { PEP._dadosJson = json; });
};

// Configuração (listas de opções e regras) — vem do JSON, não do código
PEP.config = function () {
  return (PEP.db && PEP.db._config) || (PEP._dadosJson && PEP._dadosJson._config) || { regras: {}, listas: {} };
};
PEP.regra = function (nome) { return PEP.config().regras[nome]; };
PEP.lista = function (nome) { return PEP.config().listas[nome] || []; };

(function () {
  var RE_DATA = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
  var NAO_DESLOCAR = { dataNascimento: true };

  function deslocar(texto, dias) {
    var p = texto.slice(0, 10).split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + dias));
    var dd = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getUTCFullYear() + '-' + dd(d.getUTCMonth() + 1) + '-' + dd(d.getUTCDate()) + texto.slice(10);
  }

  // Datas relativas: os dados foram escritos como se hoje fosse _meta.dataBase.
  // Todas as datas andam o mesmo número de dias, para a demonstração nunca ficar "velha".
  function aplicarDatasRelativas(db) {
    if (!db._config || !db._config.demo || !db._config.demo.datasRelativas || !db._meta.dataBase) return;
    var dias = PEP.util.diasEntre(db._meta.dataBase, PEP.util.hoje());
    if (!dias) return;
    Object.keys(db).forEach(function (colecao) {
      if (colecao.charAt(0) === '_' || !Array.isArray(db[colecao])) return;
      db[colecao].forEach(function (item) {
        Object.keys(item).forEach(function (k) {
          if (typeof item[k] === 'string' && RE_DATA.test(item[k]) && !NAO_DESLOCAR[k]) item[k] = deslocar(item[k], dias);
        });
      });
    });
    db._meta.deslocamentoDias = dias;
  }

  PEP.criarDadosIniciais = function () {
    var db = JSON.parse(JSON.stringify(PEP._dadosJson));
    aplicarDatasRelativas(db);
    PEP.estado.selarAuditoria(db.auditoria); // calcula a cadeia de hash dos eventos iniciais
    return db;
  };
})();
