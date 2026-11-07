/* =========================================================
   privacidade.js — privacidade na tela, para o dia a dia da
   clínica (sala de atendimento, computador compartilhado,
   alguém que se aproxima):
   - Modo discreto: nomes de pacientes viram iniciais e o
     código do caso; telefone e e-mail ficam ocultos. A cópia
     do prontuário e os formulários continuam completos.
   - Cobrir tela: esconde tudo na hora, sem sair do sistema.
   A preferência do modo discreto fica só neste navegador.
   Nada disso substitui o encerramento por inatividade.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.privacidade = (function () {
  var CHAVE = 'vinculo-privacidade';
  var pref = { discreto: false };

  function ler() { try { pref = JSON.parse(localStorage.getItem(CHAVE)) || pref; } catch (e) { /* usa o padrão */ } }
  function gravar() { try { localStorage.setItem(CHAVE, JSON.stringify(pref)); } catch (e) { /* ignora */ } }
  function aplicar() { document.documentElement.classList.toggle('discreto', !!pref.discreto); }
  function discreto() { return !!pref.discreto; }

  function alternarDiscreto() {
    pref.discreto = !pref.discreto;
    gravar(); aplicar();
    PEP.ui.toast(pref.discreto ? 'Modo discreto: pacientes aparecem só pelas iniciais e pelo código.' : 'Modo discreto desligado.');
    PEP.app.renderizar();
  }

  // "Maria da Silva" → "M. S." (sem "da", "de", "do"...; números ficam de fora)
  function iniciais(nome) {
    return String(nome || '').split(/\s+/).filter(function (p) { return /^[A-Za-zÀ-ÿ]/.test(p) && !/^(da|de|do|das|dos|e)$/i.test(p); })
      .map(function (p) { return p.charAt(0).toUpperCase() + '.'; }).join(' ') || '—';
  }

  // ---------- Cobrir tela ----------
  // A cortina é um diálogo modal; o resto da página fica "inerte" (sem foco nem leitor de tela)
  var voltarPara = null;
  function partes() { return [document.getElementById('topo'), document.querySelector('.layout'), document.getElementById('rodape'), document.querySelector('.faixa-aviso')]; }
  function cobrir() {
    var cortina = document.getElementById('cortina');
    voltarPara = document.activeElement;
    cortina.hidden = false;
    partes().forEach(function (el) { if (el) el.inert = true; });
    document.getElementById('cortina-voltar').focus();
  }
  function descobrir() {
    document.getElementById('cortina').hidden = true;
    partes().forEach(function (el) { if (el) el.inert = false; });
    if (voltarPara && voltarPara.focus) voltarPara.focus();
  }

  ler();
  aplicar();
  return { discreto: discreto, alternarDiscreto: alternarDiscreto, iniciais: iniciais, cobrir: cobrir, descobrir: descobrir };
})();
