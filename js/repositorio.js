/* =========================================================
   repositorio.js — camada de dados. Toda gravação passa por
   aqui (inserir / atualizar). As telas leem PEP.db.

   Quem decide ONDE os dados ficam é o adaptador:
   - local:    navegador (localStorage), lido do JSON
   - supabase: PostgreSQL (js/adaptador-supabase.js)
   Trocar de um para o outro = mudar js/config-banco.js.

   Nada é apagado: registros clínicos são só acrescentados
   (correção vira adendo, revogação vira novo registro, sessão
   desmarcada fica "cancelada"). Isso combina com o banco, onde
   triggers bloqueiam UPDATE/DELETE nas tabelas imutáveis.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.adaptadores = PEP.adaptadores || {};

// Adaptador local: guarda a cópia inteira no navegador
PEP.adaptadores.local = {
  nome: 'Navegador (JSON + localStorage)',
  salvar: function () {
    PEP.estado.salvar();
    return Promise.resolve();
  }
};

PEP.repo = (function () {
  var pendentes = [];

  function adaptador() {
    var nome = (PEP.configBanco && PEP.configBanco.adaptador) || 'local';
    return PEP.adaptadores[nome] || PEP.adaptadores.local;
  }

  function lista(colecao) { return PEP.db[colecao] || []; }
  function porId(colecao, id) { return PEP.util.porId(lista(colecao), id); }

  function inserir(colecao, registro) {
    if (!PEP.db[colecao]) throw new Error('Coleção inexistente: ' + colecao);
    if (!registro.id) registro.id = PEP.util.novoId(colecao.slice(0, 3));
    PEP.db[colecao].push(registro);
    pendentes.push({ op: 'inserir', colecao: colecao, registro: registro });
    return registro;
  }

  function atualizar(colecao, id, campos) {
    var r = porId(colecao, id);
    if (!r) throw new Error('Registro não encontrado: ' + colecao + '/' + id);
    Object.keys(campos).forEach(function (k) { r[k] = campos[k]; });
    pendentes.push({ op: 'atualizar', colecao: colecao, id: id, campos: campos });
    return r;
  }

  // Envia as alterações pendentes ao adaptador (no local, grava no navegador)
  function salvar() {
    var ops = pendentes;
    pendentes = [];
    return adaptador().salvar(ops).catch(function (erro) {
      if (PEP.ui) PEP.ui.toast('Não foi possível salvar no servidor. Tente de novo.');
      if (window.console) console.error(erro);
    });
  }

  return { lista: lista, porId: porId, inserir: inserir, atualizar: atualizar, salvar: salvar, adaptador: adaptador };
})();
