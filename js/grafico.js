/* =========================================================
   grafico.js — gráfico "Atendimentos por mês" (colunas empilhadas),
   feito só com HTML e CSS: nenhuma biblioteca nem servidor de terceiros.

   Para ler sem depender da cor:
   - a legenda fica sempre visível e o total aparece no topo de cada coluna;
   - cada coluna recebe foco (Tab) e mostra o detalhe ao passar o mouse;
   - "Ver os números" abre a tabela com todos os valores.
   Cores: variáveis --grafico-1, --grafico-2 e --grafico-3 em css/estilo.css,
   conferidas para daltonismo (também no alto contraste).
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.grafico = (function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  // A ordem é fixa: presença embaixo (a base), depois falta justificada, e falta sem justificativa no topo
  var SERIES = [
    { id: 'presente', nome: 'Presença', classe: 's1' },
    { id: 'faltaJustificada', nome: 'Falta justificada', classe: 's2' },
    { id: 'falta', nome: 'Falta sem justificativa', classe: 's3' }
  ];
  var contador = 0;

  function nomeMes(chave, longo) {
    var p = String(chave).split('-');
    return longo ? LONGOS[Number(p[1]) - 1] + ' de ' + p[0] : CURTOS[Number(p[1]) - 1];
  }
  // Topo do eixo em número redondo (5, 10, 15, 20, 30...), para as marcas ficarem limpas
  function teto(n) {
    if (n <= 4) return 4;
    var passo = n <= 20 ? 4 : n <= 60 ? 10 : n <= 200 ? 40 : 100;
    return Math.ceil(n / passo) * passo;
  }

  // lista = [{ mes: '2026-09', presente: 14, faltaJustificada: 1, falta: 0 }, ...] (PEP.regras.indicadores().porMes)
  function atendimentosPorMes(lista, titulo) {
    lista = lista || [];
    var id = 'grafico-' + (++contador);
    var totais = lista.map(function (m) { return m.presente + m.faltaJustificada + m.falta; });
    var max = teto(Math.max.apply(null, totais.concat([0])));
    var colunas = lista.map(function (m, i) {
      var total = totais[i];
      var resumo = nomeMes(m.mes, true) + ': ' + (total ? SERIES.map(function (s) { return m[s.id] + ' ' + s.nome.toLowerCase(); }).join(', ') : 'nenhum atendimento');
      return '<li class="grafico-coluna" tabindex="0" aria-label="' + esc(resumo) + '" data-mes="' + esc(nomeMes(m.mes, true)) + '" data-valores="' +
        SERIES.map(function (s) { return Number(m[s.id]) || 0; }).join(',') + '">' +
        '<span class="grafico-pilha" style="height:' + (total / max * 100).toFixed(1) + '%">' +
        (total ? '<span class="grafico-total" aria-hidden="true">' + total + '</span>' : '') +
        SERIES.map(function (s) { return m[s.id] ? '<span class="seg ' + s.classe + '" style="flex-grow:' + Number(m[s.id]) + '"></span>' : ''; }).join('') +
        '</span><span class="grafico-mes" aria-hidden="true">' + nomeMes(m.mes) + '</span></li>';
    }).join('');
    var linhas = lista.map(function (m, i) {
      return '<tr><th scope="row">' + esc(nomeMes(m.mes, true)) + '</th>' + SERIES.map(function (s) { return '<td>' + (Number(m[s.id]) || 0) + '</td>'; }).join('') + '<td>' + totais[i] + '</td></tr>';
    }).join('');
    return '<figure class="grafico" id="' + id + '" aria-labelledby="' + id + '-titulo">' +
      '<figcaption id="' + id + '-titulo"><strong>' + esc(titulo || 'Atendimentos por mês') + '</strong> <span class="suave pequeno">últimos 6 meses</span></figcaption>' +
      '<ul class="grafico-legenda" aria-label="Legenda">' + SERIES.map(function (s) {
        return '<li><span class="chave ' + s.classe + '" aria-hidden="true"></span>' + esc(s.nome) + '</li>';
      }).join('') + '</ul>' +
      '<div class="grafico-area"><div class="grafico-eixo" aria-hidden="true"><span>' + max + '</span><span>' + (max / 2) + '</span><span>0</span></div>' +
      '<div class="grafico-plot"><div class="grafico-grade" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<ul class="grafico-colunas" aria-label="Meses (use Tab para ouvir cada um)">' + colunas + '</ul></div></div>' +
      '<details class="grafico-tabela"><summary class="pequeno">Ver os números</summary><div class="tabela-rolagem"><table>' +
      '<caption class="sr-only">' + esc(titulo || 'Atendimentos por mês') + '</caption><thead><tr><th scope="col">Mês</th>' +
      SERIES.map(function (s) { return '<th scope="col">' + esc(s.nome) + '</th>'; }).join('') + '<th scope="col">Total</th></tr></thead><tbody>' + linhas + '</tbody></table></div></details>' +
      '<div class="grafico-dica" role="tooltip" hidden></div></figure>';
  }

  // ---------- Detalhe ao passar o mouse ou ao focar a coluna ----------
  // O texto entra com textContent (nunca innerHTML): o valor em destaque, o nome da série ao lado
  function mostrar(coluna) {
    var figura = coluna.closest('.grafico'), dica = figura && figura.querySelector('.grafico-dica');
    if (!dica) return;
    var valores = coluna.getAttribute('data-valores').split(',');
    dica.textContent = '';
    var titulo = document.createElement('div');
    titulo.className = 'dica-titulo';
    titulo.textContent = coluna.getAttribute('data-mes');
    dica.appendChild(titulo);
    SERIES.forEach(function (s, i) {
      var linha = document.createElement('div'), traco = document.createElement('span'), valor = document.createElement('strong'), nome = document.createElement('span');
      linha.className = 'dica-linha';
      traco.className = 'traco ' + s.classe;
      valor.textContent = valores[i];
      nome.textContent = s.nome;
      linha.appendChild(traco); linha.appendChild(valor); linha.appendChild(nome);
      dica.appendChild(linha);
    });
    dica.hidden = false;
    var f = figura.getBoundingClientRect(), c = coluna.getBoundingClientRect(), p = coluna.querySelector('.grafico-pilha').getBoundingClientRect();
    var esquerda = c.left - f.left + c.width / 2 - dica.offsetWidth / 2;
    dica.style.left = Math.max(0, Math.min(esquerda, f.width - dica.offsetWidth)) + 'px';
    // Sempre acima da coluna (pode cobrir a legenda, nunca o eixo nem os nomes dos meses)
    dica.style.top = (p.top - f.top - dica.offsetHeight - 22) + 'px';
  }
  function esconder(coluna) {
    var dica = coluna.closest('.grafico') && coluna.closest('.grafico').querySelector('.grafico-dica');
    if (dica) dica.hidden = true;
  }
  ['pointerover', 'focusin'].forEach(function (tipo) {
    document.addEventListener(tipo, function (ev) {
      var col = ev.target.closest && ev.target.closest('.grafico-coluna');
      if (col) mostrar(col);
    });
  });
  ['pointerout', 'focusout'].forEach(function (tipo) {
    document.addEventListener(tipo, function (ev) {
      var col = ev.target.closest && ev.target.closest('.grafico-coluna');
      if (col && !(ev.relatedTarget && col.contains(ev.relatedTarget))) esconder(col);
    });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') document.querySelectorAll('.grafico-dica').forEach(function (d) { d.hidden = true; });
  });

  return { atendimentosPorMes: atendimentosPorMes };
})();
