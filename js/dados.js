/* =========================================================
   dados.js — carrega os dados 100% FICTÍCIOS de
   dados/dados-iniciais.json. Uma cópia nova é devolvida
   a cada chamada (usada também em "Restaurar dados").
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

PEP.criarDadosIniciais = function () {
  return JSON.parse(JSON.stringify(PEP._dadosJson));
};
