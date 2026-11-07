/* =========================================================
   arquivos.js — upload real de anexos. O conteúdo do arquivo
   fica no IndexedDB do navegador (o localStorage não aguenta
   arquivos); o registro do anexo (nome, tipo, tamanho, hash)
   fica na coleção "anexos". No banco, o conteúdo vai para o
   Supabase Storage, num bucket privado.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.arquivos = (function () {
  var BANCO = 'vinculo-arquivos', LOJA = 'arquivos';

  function abrir() {
    return new Promise(function (ok, falha) {
      if (!window.indexedDB) return falha(new Error('IndexedDB indisponível'));
      var req = window.indexedDB.open(BANCO, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(LOJA); };
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { falha(req.error); };
    });
  }

  function operar(modo, fn) {
    return abrir().then(function (db) {
      return new Promise(function (ok, falha) {
        var tx = db.transaction(LOJA, modo);
        var req = fn(tx.objectStore(LOJA));
        tx.oncomplete = function () { ok(req && req.result); db.close(); };
        tx.onerror = function () { falha(tx.error); db.close(); };
      });
    });
  }

  function lerBytes(file) {
    return new Promise(function (ok, falha) {
      var r = new FileReader();
      r.onload = function () { ok(new Uint8Array(r.result)); };
      r.onerror = function () { falha(r.error); };
      r.readAsArrayBuffer(file);
    });
  }

  // Valida e guarda. Devolve { arquivoId, hash } ou { erro }.
  // O identificador começa pelo caso ("c01/arq-..."): no Supabase Storage, a política de acesso
  // lê essa primeira parte para saber se quem pede o arquivo pode ver o caso.
  function guardar(file, casoId) {
    return lerBytes(file).then(function (bytes) {
      var erro = PEP.validar.arquivo(file, bytes.slice(0, 8));
      if (erro) return { erro: erro };
      var hash = PEP.seguranca.sha256Bytes(bytes);
      var id = casoId + '/' + PEP.util.novoId('arq');
      var blob = new Blob([bytes], { type: file.type });
      var ad = PEP.repo.adaptador();
      var gravar = ad.guardarArquivo ? ad.guardarArquivo(blob, id) : operar('readwrite', function (loja) { return loja.put(blob, id); });
      return gravar.then(function () { return { arquivoId: id, hash: hash }; });
    });
  }

  function obter(id) {
    var ad = PEP.repo.adaptador();
    return ad.obterArquivo ? ad.obterArquivo(id) : operar('readonly', function (loja) { return loja.get(id); });
  }
  function limparTudo() { return operar('readwrite', function (loja) { return loja.clear(); }).catch(function () {}); }

  return { guardar: guardar, obter: obter, limparTudo: limparTudo };
})();
