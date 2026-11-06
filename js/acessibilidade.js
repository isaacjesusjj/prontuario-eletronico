/* =========================================================
   acessibilidade.js — tamanho do texto, alto contraste e
   VLibras (tradução para Libras do Governo Federal).
   Referências: ABNT NBR 17225:2025 (baseada na WCAG 2.2) e
   Lei Brasileira de Inclusão (Lei 13.146/2015, art. 63).
   As preferências ficam só neste navegador.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.acessibilidade = (function () {
  var CHAVE = 'vinculo-acessibilidade';
  var NIVEIS = [100, 112.5, 125, 150];   // % do tamanho do texto
  var pref = { fonte: 0, contraste: false };

  function ler() { try { pref = JSON.parse(localStorage.getItem(CHAVE)) || pref; } catch (e) { /* usa o padrão */ } }
  function gravar() { try { localStorage.setItem(CHAVE, JSON.stringify(pref)); } catch (e) { /* ignora */ } }

  function aplicar() {
    document.documentElement.style.fontSize = NIVEIS[pref.fonte] + '%';
    document.documentElement.classList.toggle('contraste', !!pref.contraste);
    var b = document.querySelector('[data-acao="alto-contraste"]');
    if (b) b.setAttribute('aria-pressed', pref.contraste ? 'true' : 'false');
  }

  function mudarFonte(passo) {
    pref.fonte = Math.max(0, Math.min(NIVEIS.length - 1, pref.fonte + passo));
    gravar(); aplicar();
    PEP.ui.toast('Tamanho do texto: ' + NIVEIS[pref.fonte] + '%');
  }

  function alternarContraste() {
    pref.contraste = !pref.contraste;
    gravar(); aplicar();
    PEP.ui.toast(pref.contraste ? 'Alto contraste ativado.' : 'Alto contraste desativado.');
  }

  // O VLibras só é baixado quando a pessoa pede (o site não depende dele para funcionar)
  var vlibrasCarregado = false;
  function abrirVlibras() {
    if (vlibrasCarregado) { var botao = document.querySelector('[vw-access-button]'); if (botao) botao.click(); return; }
    var div = document.createElement('div');
    div.setAttribute('vw', ''); div.className = 'enabled';
    div.innerHTML = '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
    document.body.appendChild(div);
    var s = document.createElement('script');
    s.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    s.onload = function () {
      try {
        new window.VLibras.Widget('https://vlibras.gov.br/app');
        vlibrasCarregado = true;
        // o widget se monta no evento load; como a página já carregou, dispara de novo
        window.dispatchEvent(new Event('load'));
        PEP.ui.toast('VLibras carregado: use o botão azul no canto da tela.');
      } catch (e) { PEP.ui.toast('Não foi possível iniciar o VLibras.'); }
    };
    s.onerror = function () { PEP.ui.toast('Não foi possível carregar o VLibras (sem conexão com vlibras.gov.br).'); };
    document.body.appendChild(s);
  }

  ler();
  aplicar();
  return { aplicar: aplicar, mudarFonte: mudarFonte, alternarContraste: alternarContraste, abrirVlibras: abrirVlibras };
})();
