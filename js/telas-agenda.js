/* =========================================================
   telas-agenda.js — agenda em calendário: dia, semana, mês
   e lista. Rota: #/agenda/<visão>/<AAAA-MM-DD>
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };
  var U = function () { return PEP.util; };
  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var CLASSE = { presente: 'validada', falta: 'perigo', 'falta-justificada': 'alerta', agendada: 'enviada', cancelada: 'rascunho' };

  function casosDaAgenda(u) {
    if (u.perfil === 'paciente') return PEP.db.casos.filter(function (c) { return c.pacienteId === u.pacienteId; });
    return PEP.regras.casosVisiveis(u);
  }

  function sessoesEntre(u, inicio, fim) {
    var ids = casosDaAgenda(u).map(function (c) { return c.id; });
    var sala = u.perfil === 'paciente' ? '' : PEP.telas._salaAgenda;
    return PEP.db.sessoes.filter(function (s) {
      return ids.indexOf(s.casoId) !== -1 && s.data >= inicio && s.data <= fim && s.presenca !== 'cancelada' && (!sala || s.sala === sala);
    })
      .sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
  }

  function rotulo(u, s) {
    var c = PEP.util.porId(PEP.db.casos, s.casoId);
    return u.perfil === 'paciente' ? 'Sua sessão' : PEP.ui.nomePacienteDoCaso(c);
  }

  function itemSessao(u, s, completo) {
    var c = PEP.util.porId(PEP.db.casos, s.casoId);
    var nome = esc(rotulo(u, s));
    var link = u.perfil === 'paciente' ? nome : '<a href="#/caso/' + c.id + '/sessoes">' + nome + '</a>';
    var status = s.avisoPaciente ? 'Falta avisada' : (PEP.lista('presencas')[s.presenca] || s.presenca);
    var extra = '';
    if (completo && s.presenca === 'agendada') {
      if (u.perfil === 'paciente' && !s.confirmada && s.data >= U().hoje()) extra = ' <button class="botao pequeno" data-acao="confirmar-sessao" data-id="' + s.id + '">Confirmar presença</button>';
      else extra = s.confirmada ? ' <span class="etiqueta validada">confirmada</span>' : ' <span class="etiqueta rascunho">a confirmar</span>';
      if (PEP.regras.podeAvisarFalta(u, s)) extra += PEP.telas.avisoFaltaPaciente(s);
    }
    return '<li class="sessao-item"><span class="hora">' + esc(s.hora) + '</span> ' + link + (s.sala ? ' <span class="suave pequeno">' + esc(s.sala) + '</span>' : '') + ' <span class="etiqueta ' + CLASSE[s.presenca] + '">' + esc(status) + '</span>' + extra + '</li>';
  }

  function inicioDaSemana(iso) { return U().somarDias(iso, -((U().diaDaSemana(iso) + 6) % 7)); } // segunda-feira
  function primeiroDoMes(iso) { return iso.slice(0, 8) + '01'; }
  function ultimoDoMes(iso) {
    var p = iso.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1], 0));
    return iso.slice(0, 8) + (d.getUTCDate() < 10 ? '0' : '') + d.getUTCDate();
  }
  function somarMeses(iso, n) {
    var p = iso.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1 + n, 1));
    return d.getUTCFullYear() + '-' + (d.getUTCMonth() < 9 ? '0' : '') + (d.getUTCMonth() + 1) + '-01';
  }

  function cabecalho(visao, ref, titulo, anterior, proximo) {
    var visoes = [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês'], ['lista', 'Lista']];
    return '<div class="agenda-topo"><div class="linha" role="group" aria-label="Navegar no calendário">' +
      '<a class="botao secundario pequeno" href="#/agenda/' + visao + '/' + anterior + '">← Anterior</a>' +
      '<a class="botao secundario pequeno" href="#/agenda/' + visao + '/' + U().hoje() + '">Hoje</a>' +
      '<a class="botao secundario pequeno" href="#/agenda/' + visao + '/' + proximo + '">Próximo →</a></div>' +
      '<h2 class="agenda-titulo" aria-live="polite">' + esc(titulo) + '</h2>' +
      '<nav class="seletor" aria-label="Tipo de visualização">' + visoes.map(function (v) {
        return '<a href="#/agenda/' + v[0] + '/' + ref + '"' + (v[0] === visao ? ' aria-current="page" class="ativo"' : '') + '>' + v[1] + '</a>';
      }).join('') + '</nav></div>';
  }

  function visaoDia(u, ref) {
    var lista = sessoesEntre(u, ref, ref);
    var d = ref.split('-');
    var titulo = DIAS[U().diaDaSemana(ref)] + ', ' + Number(d[2]) + ' de ' + MESES[Number(d[1]) - 1] + ' de ' + d[0];
    return cabecalho('dia', ref, titulo, U().somarDias(ref, -1), U().somarDias(ref, 1)) +
      '<div class="cartao">' + (lista.length ? '<ul class="lista-sessoes">' + lista.map(function (s) { return itemSessao(u, s, true); }).join('') + '</ul>' : '<p class="vazio">Nenhuma sessão neste dia.</p>') + '</div>';
  }

  function visaoSemana(u, ref) {
    var ini = inicioDaSemana(ref), fim = U().somarDias(ini, 6);
    var lista = sessoesEntre(u, ini, fim);
    var html = cabecalho('semana', ref, 'Semana de ' + data(ini) + ' a ' + data(fim), U().somarDias(ref, -7), U().somarDias(ref, 7)) + '<div class="semana">';
    for (var i = 0; i < 7; i++) {
      var dia = U().somarDias(ini, i);
      var doDia = lista.filter(function (s) { return s.data === dia; });
      html += '<section class="dia-semana' + (dia === U().hoje() ? ' hoje' : '') + (doDia.length ? '' : ' sem-sessao') + '" aria-labelledby="dia-' + dia + '">' +
        '<h3 id="dia-' + dia + '"><a href="#/agenda/dia/' + dia + '">' + DIAS[U().diaDaSemana(dia)].slice(0, 3) + ' ' + dia.slice(8) + '/' + dia.slice(5, 7) + '</a>' + (dia === U().hoje() ? ' <span class="sr-only">(hoje)</span>' : '') + '</h3>' +
        (doDia.length ? '<ul class="lista-sessoes">' + doDia.map(function (s) { return itemSessao(u, s, false); }).join('') + '</ul>' : '<p class="vazio pequeno">sem sessões</p>') + '</section>';
    }
    return html + '</div>';
  }

  function visaoMes(u, ref) {
    var ini = primeiroDoMes(ref), fim = ultimoDoMes(ref);
    var lista = sessoesEntre(u, ini, fim);
    var p = ref.split('-');
    var html = cabecalho('mes', ref, MESES[Number(p[1]) - 1].replace(/^./, function (c) { return c.toUpperCase(); }) + ' de ' + p[0], somarMeses(ref, -1), somarMeses(ref, 1));
    html += '<div class="tabela-rolagem"><table class="mes"><caption class="sr-only">Sessões do mês</caption><thead><tr>' +
      ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(function (d, i) { return '<th scope="col"><abbr title="' + DIAS[(i + 1) % 7] + '">' + d + '</abbr></th>'; }).join('') + '</tr></thead><tbody><tr>';
    var dia = inicioDaSemana(ini), coluna = 0;
    while (dia <= fim || coluna % 7 !== 0) {
      var noMes = dia >= ini && dia <= fim;
      var doDia = noMes ? lista.filter(function (s) { return s.data === dia; }) : [];
      html += '<td class="' + (noMes ? '' : 'fora') + (dia === U().hoje() ? ' hoje' : '') + '">' +
        (noMes ? '<a class="num-dia" href="#/agenda/dia/' + dia + '" aria-label="' + Number(dia.slice(8)) + ' de ' + MESES[Number(p[1]) - 1] + (doDia.length ? ', ' + doDia.length + ' sessão(ões)' : '') + '">' + Number(dia.slice(8)) + '</a>' +
          doDia.slice(0, 3).map(function (s) { return '<span class="mini ' + CLASSE[s.presenca] + '">' + esc(s.hora) + ' ' + esc(rotulo(u, s).replace('Paciente Exemplo', 'P.')) + '</span>'; }).join('') +
          (doDia.length > 3 ? '<span class="mini">+' + (doDia.length - 3) + '</span>' : '') : '') + '</td>';
      coluna++;
      if (coluna % 7 === 0 && (U().somarDias(dia, 1) <= fim)) html += '</tr><tr>';
      dia = U().somarDias(dia, 1);
    }
    return html + '</tr></tbody></table></div>';
  }

  function visaoLista(u, ref) {
    var lista = sessoesEntre(u, U().hoje(), U().somarDias(U().hoje(), 120)).filter(function (s) { return s.presenca === 'agendada'; });
    var html = cabecalho('lista', ref, 'Próximas sessões', ref, ref);
    if (!lista.length) return html + '<p class="vazio">Nenhuma sessão agendada.</p>';
    return html + '<div class="cartao"><ul class="lista-sessoes">' + lista.map(function (s) {
      return '<li class="sessao-item"><strong>' + data(s.data) + '</strong> ' + itemSessao(u, s, true).replace(/^<li class="sessao-item">|<\/li>$/g, '') + '</li>';
    }).join('') + '</ul></div>';
  }

  PEP.telas.agenda = function (u, visao, ref) {
    if (u.perfil === 'direcao') return PEP.ui.semPermissao('A agenda individual mostra pacientes; a direção acompanha pelos indicadores.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ref || '')) ref = U().hoje();
    visao = visao || (u.perfil === 'paciente' ? 'lista' : 'semana');
    var titulo = '<h1>' + (u.perfil === 'paciente' ? 'Minhas sessões' : 'Agenda') + '</h1><p class="subtitulo">' +
      (u.perfil === 'paciente' ? 'Suas sessões na clínica-escola. Confirme a presença ou avise se não puder ir.' :
        'Sessões dos seus casos por dia, semana, mês ou lista, com a sala. Para agendar, abra o caso e vá em Sessões.') + '</p>';
    // Filtro por sala: mostra a ocupação de uma sala (para quem atende; o paciente vê só as próprias sessões)
    if (u.perfil !== 'paciente') {
      var atual = PEP.telas._salaAgenda || '';
      titulo += '<form class="linha filtro-sala" data-form="filtrar-sala" novalidate><label for="ag-filtro-sala" class="suave">Sala</label>' +
        '<select id="ag-filtro-sala" name="sala" style="width:auto"><option value="">Todas</option>' + PEP.lista('salas').map(function (x) {
          return '<option' + (x === atual ? ' selected' : '') + '>' + esc(x) + '</option>';
        }).join('') + '</select><button class="botao secundario pequeno" type="submit">Mostrar</button>' +
        (atual ? '<span class="suave pequeno" role="status">Mostrando só a ' + esc(atual) + (u.perfil === 'tecnico' ? '' : ', entre os seus casos') + '.</span>' : '') + '</form>';
    }
    if (visao === 'dia') return titulo + visaoDia(u, ref);
    if (visao === 'mes') return titulo + visaoMes(u, ref);
    if (visao === 'lista') return titulo + visaoLista(u, ref);
    return titulo + visaoSemana(u, ref);
  };
})();
