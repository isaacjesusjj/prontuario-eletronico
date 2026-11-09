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
    if (b) {
      b.setAttribute('aria-pressed', pref.contraste ? 'true' : 'false');
      var estado = b.querySelector('.estado');   // "ligado/desligado" no menu da conta
      if (estado) estado.textContent = pref.contraste ? 'ligado' : 'desligado';
    }
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

  // ---------- VLibras (tradutor de Libras do Governo Federal) ----------
  // Só é baixado quando a pessoa pede: o site não depende dele para funcionar.
  // Endereço oficial do VLibras 7. O gov.br entrega a página do avatar (o boneco 3D, num iframe) e redireciona
  // os outros arquivos para o jsDelivr; por isso a política de segurança (CSP, no index.html) libera o
  // vlibras.gov.br e só o caminho do VLibras no jsDelivr. O estatístico de uso que vem no VLibras (PostHog,
  // nos EUA) fica de fora da CSP: num prontuário, nenhum dado de navegação vai para terceiros.
  var VLIBRAS = 'https://vlibras.gov.br/app';
  var vlibras = 'parado';   // parado → carregando → pronto
  function abrirVlibras() {
    PEP.ui.fecharConta(false);   // o menu da conta sai da frente do tradutor
    if (vlibras === 'pronto') { window.VLibrasWidget.open(); return; }
    if (vlibras === 'carregando') return;
    vlibras = 'carregando';
    PEP.ui.toast('Carregando o VLibras…');
    window.VLibrasWidget = { path: VLIBRAS };
    var s = document.createElement('script');
    s.src = VLIBRAS + '/vlibras-plugin.js';
    s.onload = function () {
      try {
        new window.VLibras.Widget({ rootPath: VLIBRAS });
        vlibras = 'pronto';
        window.VLibrasWidget.open();   // abre o tradutor na hora (o botão azul do VLibras fica na lateral da tela)
        // O VLibras manda ao servidor do governo o texto escolhido para traduzir: a pessoa precisa saber
        PEP.ui.toast('VLibras aberto. O texto que você tocar vai para o serviço do governo, que traduz para Libras.');
      } catch (e) { vlibras = 'parado'; PEP.ui.toast('Não foi possível iniciar o VLibras.'); }
    };
    s.onerror = function () { vlibras = 'parado'; PEP.ui.toast('Não foi possível carregar o VLibras (sem conexão com o serviço do governo).'); };
    document.body.appendChild(s);
  }

  ler();
  aplicar();
  return { aplicar: aplicar, mudarFonte: mudarFonte, alternarContraste: alternarContraste, abrirVlibras: abrirVlibras };
})();
