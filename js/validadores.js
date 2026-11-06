/* =========================================================
   validadores.js — validação de CPF, telefone, e-mail, datas,
   nomes e arquivos; máscaras de digitação; mensagens de erro
   ligadas ao campo (acessíveis para leitores de tela).
   As mesmas regras existem no banco (banco/schema.sql), para
   que um dado inválido não entre nem pela tela nem pela API.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.validar = (function () {
  function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }

  // CPF: 11 dígitos, não pode ser tudo igual e os 2 dígitos verificadores precisam bater
  function cpf(valor) {
    var d = soDigitos(valor);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    for (var t = 9; t < 11; t++) {
      var soma = 0;
      for (var i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
      var dv = (soma * 10) % 11;
      if (dv === 10) dv = 0;
      if (dv !== Number(d[t])) return false;
    }
    return true;
  }

  // DDDs em uso no Brasil (Anatel)
  var DDD = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
    51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];

  // Telefone: DDD válido + 8 dígitos (fixo) ou 9 dígitos começando com 9 (celular)
  function telefone(valor) {
    var d = soDigitos(valor);
    if (d.length === 13 && d.indexOf('55') === 0) d = d.slice(2);
    if (DDD.indexOf(Number(d.slice(0, 2))) === -1) return false;
    if (d.length === 11) return d[2] === '9';
    if (d.length === 10) return /[2-5]/.test(d[2]);
    return false;
  }

  function email(valor) {
    var v = String(valor || '').trim();
    return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
  }

  // Nome: de 2 a 80 caracteres, começando com letra; letras (com acento), espaço, apóstrofo, ponto,
  // hífen e números (os números existem só nos nomes fictícios da demonstração, como "Paciente Exemplo 01")
  function nome(valor) {
    var v = String(valor || '').trim();
    return v.length >= 2 && v.length <= 80 && /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9' .-]*$/.test(v) && (v.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length >= 2;
  }

  function matricula(valor) { return /^[A-Za-z0-9]{6,12}$/.test(String(valor || '').trim()); }

  // Data de nascimento: data real, não futura, até 120 anos
  function dataNascimento(valor) {
    var v = String(valor || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, msg: 'Informe a data de nascimento.' };
    var p = v.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    if (d.getUTCFullYear() !== p[0] || d.getUTCMonth() !== p[1] - 1 || d.getUTCDate() !== p[2]) return { ok: false, msg: 'Data inválida.' };
    if (v > PEP.util.hoje()) return { ok: false, msg: 'A data de nascimento não pode estar no futuro.' };
    if (PEP.util.idade(v) > 120) return { ok: false, msg: 'Confira o ano de nascimento.' };
    return { ok: true };
  }

  // ---------- Duplicidade de CPF ----------
  // Procura o CPF entre os pacientes e as inscrições que ainda estão na fila.
  // ignorar: { pacienteId, inscricaoId } para não acusar o próprio registro na edição
  function cpfJaCadastrado(valor, ignorar) {
    var d = soDigitos(valor);
    if (!d) return null;
    ignorar = ignorar || {};
    var p = PEP.db.pacientes.filter(function (x) { return x.cpf === d && x.id !== ignorar.pacienteId; })[0];
    if (p) return { tipo: 'paciente', id: p.id };
    var i = PEP.db.inscricoes.filter(function (x) { return x.cpf === d && x.status === 'aguardando' && x.id !== ignorar.inscricaoId; })[0];
    if (i) return { tipo: 'inscricao', id: i.id };
    return null;
  }

  // ---------- Arquivos (upload) ----------
  // Confere tipo, tamanho e a "assinatura" dos primeiros bytes (não confia só na extensão)
  var MAGICOS = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/jpeg': [0xff, 0xd8, 0xff] };
  function arquivo(file, primeirosBytes) {
    var max = (PEP.regra('uploadMaxMB') || 2) * 1024 * 1024;
    var tipos = PEP.lista('tiposArquivo').map(function (t) { return t.mime; });
    if (!file) return 'Escolha um arquivo.';
    if (tipos.indexOf(file.type) === -1) return 'Tipo não permitido. Envie PDF, JPG ou PNG.';
    if (file.size > max) return 'O arquivo passa de ' + PEP.regra('uploadMaxMB') + ' MB.';
    if (file.size === 0) return 'O arquivo está vazio.';
    var m = MAGICOS[file.type];
    for (var i = 0; m && i < m.length; i++) if (primeirosBytes[i] !== m[i]) return 'O conteúdo não corresponde a um ' + file.type.split('/')[1].toUpperCase() + ' (arquivo renomeado?).';
    return '';
  }

  function nomeArquivoSeguro(n) {
    return String(n || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80);
  }

  // ---------- Máscaras ----------
  function formatarCpf(v) {
    var d = soDigitos(v).slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  function formatarTelefone(v) {
    var d = soDigitos(v).slice(0, 11);
    if (d.length <= 2) return d ? '(' + d : '';
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  // CPF mascarado para telas que não precisam do número inteiro
  function ocultarCpf(v) {
    var d = soDigitos(v);
    return d.length === 11 ? '***.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-**' : '—';
  }

  document.addEventListener('input', function (ev) {
    var tipo = ev.target.getAttribute && ev.target.getAttribute('data-mascara');
    if (tipo === 'cpf') ev.target.value = formatarCpf(ev.target.value);
    if (tipo === 'telefone') ev.target.value = formatarTelefone(ev.target.value);
  });

  return {
    soDigitos: soDigitos, cpf: cpf, telefone: telefone, email: email, nome: nome, matricula: matricula,
    dataNascimento: dataNascimento, cpfJaCadastrado: cpfJaCadastrado, arquivo: arquivo, nomeArquivoSeguro: nomeArquivoSeguro,
    formatarCpf: formatarCpf, formatarTelefone: formatarTelefone, ocultarCpf: ocultarCpf
  };
})();

/* Erros de formulário: a mensagem fica embaixo do campo, ligada a ele por
   aria-describedby, e o campo recebe aria-invalid. O foco vai para o primeiro erro. */
PEP.form = (function () {
  function limpar(raiz) {
    (raiz || document).querySelectorAll('.erro-campo').forEach(function (el) { el.remove(); });
    (raiz || document).querySelectorAll('[aria-invalid="true"]').forEach(function (el) {
      el.removeAttribute('aria-invalid');
      var desc = (el.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x.indexOf('-erro') === -1; }).join(' ');
      if (desc) el.setAttribute('aria-describedby', desc); else el.removeAttribute('aria-describedby');
    });
  }

  function erro(campoId, mensagem) {
    var el = document.getElementById(campoId);
    if (!el) return;
    el.setAttribute('aria-invalid', 'true');
    var id = campoId + '-erro';
    var span = document.createElement('span');
    span.className = 'erro-campo';
    span.id = id;
    span.textContent = mensagem;
    var alvo = el.closest('.campo') || el.parentNode;
    alvo.appendChild(span);
    var desc = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    desc.push(id);
    el.setAttribute('aria-describedby', desc.join(' '));
  }

  // Recebe [[campoId, mensagem], ...]; devolve true se não houver erros
  function aplicar(raiz, erros) {
    limpar(raiz);
    erros.forEach(function (e) { erro(e[0], e[1]); });
    if (erros.length) {
      var primeiro = document.getElementById(erros[0][0]);
      if (primeiro) primeiro.focus();
      PEP.ui.toast(erros.length === 1 ? 'Corrija o campo destacado.' : 'Corrija os ' + erros.length + ' campos destacados.');
    }
    return erros.length === 0;
  }

  return { limpar: limpar, erro: erro, aplicar: aplicar };
})();
