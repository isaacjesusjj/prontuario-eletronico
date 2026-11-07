/* =========================================================
   revisor.js — revisor de escrita clínica (tutor de escrita).

   Aponta, enquanto o estagiário escreve, o que costuma não
   caber num prontuário que o paciente pode ler (Res. CFP
   05/2025, art. 13): juízo de valor, palavra que desacredita
   o relato, linguagem estigmatizante, dado que identifica
   alguém (CPF, telefone, endereço, nome de terceiros), falta
   de intervenção ou de plano, citação ou texto longos.

   Não é inteligência artificial: são regras transparentes,
   guardadas em _config.revisorEscrita (a supervisão ajusta a
   lista sem mexer no código), e o texto não sai do navegador.
   O revisor aponta; não corrige nem bloqueia. O autor do
   registro continua sendo o estagiário, com a supervisão.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.revisor = (function () {
  // Sem acento e em minúsculas: "Alegou" e "alegou", "nóia" e "noia" viram a mesma coisa
  function normalizar(t) { return String(t || '').normalize('NFC').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function cfg() { return PEP.config().revisorEscrita || { regras: [], tipos: {} }; }

  function analisar(texto) {
    var c = cfg(), t = String(texto || '').normalize('NFC'), n = normalizar(t), achados = [];
    function achar(tipo, trecho, sugestao, motivo) {
      achados.push({ tipo: tipo, nomeTipo: (c.tipos || {})[tipo] || tipo, trecho: trecho, sugestao: sugestao, motivo: motivo });
    }

    // 1. Termos da lista: palavra ou expressão inteira (não acha "alega" dentro de "alegações")
    (c.regras || []).forEach(function (r) {
      r.termos.forEach(function (termo) {
        var m = new RegExp('(^|[^a-z0-9])(' + escRegex(normalizar(termo)) + ')(?=$|[^a-z0-9])').exec(n);
        if (m) achar(r.tipo, t.substr(m.index + m[1].length, m[2].length), r.sugestao, r.motivo);
      });
    });

    // 2. Dados que identificam alguém: ficam no cadastro, não no texto do atendimento
    var padroes = [
      [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, 'CPF no texto'],
      [/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/, 'Telefone no texto'],
      [/[^\s@]+@[^\s@]+\.[a-z]{2,}/i, 'E-mail no texto'],
      [/\b(rua|avenida|av\.|travessa|alameda|estrada)\s+\S+/i, 'Endereço no texto']
    ];
    padroes.forEach(function (p) {
      var m = t.match(p[0]);
      if (m) achar('identificacao', m[0], 'Dados de contato e documentos ficam só no cadastro.', p[1] + ': o registro do atendimento não precisa deles (LGPD, art. 6º, III).');
    });

    // 3. Nome próprio no meio da frase: pode ser de outra pessoa (irmã, chefe, colega)
    var permitidas = (c.palavrasComMaiuscula || []).map(normalizar);
    var reNome = /([a-záéíóúâêôãõçà,]\s+)([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõçà]{2,})/g, mm, nomes = [];
    while ((mm = reNome.exec(t))) {
      if (permitidas.indexOf(normalizar(mm[2])) === -1 && nomes.indexOf(mm[2]) === -1) nomes.push(mm[2]);
    }
    if (nomes.length) {
      achar('identificacao', nomes.slice(0, 3).join(', '), 'Prefira o vínculo: "a irmã", "o colega".',
        'Nome de outra pessoa? Quem não é o paciente não precisa ser identificado no prontuário (LGPD, art. 6º, III).');
    }

    // 4. Código de diagnóstico (F32, F41.1...)
    var cid = t.match(/\bF\d{2}(\.\d)?\b/);
    if (cid) achar('diagnostico', cid[0], 'Hipótese diagnóstica só depois de discutida em supervisão.', 'O paciente pode ler o prontuário: diagnóstico sem fundamento rotula e expõe.');

    // 5. Estrutura: o registro técnico traz o que foi feito e o que vem a seguir
    var e = c.estrutura || {};
    var tem = function (lista) { return (lista || []).some(function (k) { return n.indexOf(normalizar(k)) !== -1; }); };
    if (n.length >= 60) {
      if (!tem(e.intervencao)) achar('estrutura', '', 'Registre o que foi feito na sessão (a intervenção).', 'O registro técnico traz o procedimento, não só o relato.');
      if (!tem(e.plano)) achar('estrutura', '', 'Registre o plano para a próxima sessão.', 'O plano dá continuidade ao cuidado e orienta quem assumir o caso.');
    }

    // 6. Citação longa e texto longo: síntese, não transcrição
    (t.match(/["“][^"”]*["”]/g) || []).forEach(function (q) {
      if (q.length > (c.citacaoLongaCaracteres || 120)) achar('tamanho', q.slice(0, 40) + '…', 'Registre a síntese, não a fala inteira.', 'Citação longa expõe mais do que o necessário.');
    });
    if (t.length > (c.textoLongoCaracteres || 1500)) achar('tamanho', '', 'Resuma: tema, intervenção e plano.', 'Texto longo: o prontuário pede síntese.');
    return achados;
  }

  // Lista dos apontamentos, para mostrar embaixo do texto
  function html(achados, paraSupervisao) {
    var esc = PEP.util.esc;
    if (!achados.length) return paraSupervisao ? '' : '<p class="revisor-ok pequeno">Revisor de escrita: nada a apontar.</p>';
    return '<div class="revisor"><p class="pequeno"><strong>Revisor de escrita: ' + achados.length + ' ponto(s) para olhar.</strong> ' +
      (paraSupervisao ? 'Para orientar a supervisão; o texto é do estagiário.' : 'Ele aponta, não corrige: quem decide é você, com a supervisão.') + '</p><ul>' +
      achados.map(function (a) {
        return '<li><span class="etiqueta alerta">' + esc(a.nomeTipo) + '</span> ' + (a.trecho ? '<q>' + esc(a.trecho) + '</q> — ' : '') + esc(a.sugestao) +
          ' <span class="suave">' + esc(a.motivo) + '</span></li>';
      }).join('') + '</ul></div>';
  }

  return { analisar: analisar, html: html, normalizar: normalizar };
})();
