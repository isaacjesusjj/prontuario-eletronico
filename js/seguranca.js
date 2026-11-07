/* =========================================================
   seguranca.js — hash de senha, política de senha, tokens e
   SHA-256 (usado na cadeia da auditoria e no hash dos arquivos).

   Senhas: PBKDF2-SHA256 com sal aleatório e 600 mil iterações
   (recomendação do OWASP Password Storage Cheat Sheet). A senha
   nunca é guardada, só o hash.
   Política: NIST SP 800-63B-4 (2025) — mínimo de 15 caracteres
   quando a senha é o único fator, sem regras de composição
   ("maiúscula + número + símbolo"), com lista de senhas comuns.
   No sistema real, o hash é feito no servidor (Supabase Auth).
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.seguranca = (function () {
  // ---------- SHA-256 (síncrono, sem depender de https) ----------
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rot(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256Bytes(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = bytes.length;
    var tamanho = Math.ceil((l + 9) / 64) * 64;
    var m = new Uint8Array(tamanho);
    m.set(bytes);
    m[l] = 0x80;
    var dv = new DataView(m.buffer);
    var bits = l * 8;
    dv.setUint32(tamanho - 8, Math.floor(bits / 0x100000000));
    dv.setUint32(tamanho - 4, bits >>> 0);
    var W = new Uint32Array(64);
    for (var off = 0; off < tamanho; off += 64) {
      var t;
      for (t = 0; t < 16; t++) W[t] = dv.getUint32(off + t * 4);
      for (t = 16; t < 64; t++) {
        var s0 = rot(W[t - 15], 7) ^ rot(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        var s1 = rot(W[t - 2], 17) ^ rot(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rot(e, 6) ^ rot(e, 11) ^ rot(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        var S0 = rot(a, 2) ^ rot(a, 13) ^ rot(a, 22);
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('');
  }

  function sha256(texto) { return sha256Bytes(new TextEncoder().encode(String(texto))); }

  // ---------- Base64 ----------
  function paraBase64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function deBase64(texto) {
    var s = atob(texto), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }

  function bytesAleatorios(n) {
    var b = new Uint8Array(n);
    window.crypto.getRandomValues(b);
    return b;
  }

  // Token para link (base64 sem + / =, seguro para URL)
  function tokenAleatorio(nBytes) {
    return paraBase64(bytesAleatorios(nBytes || 24)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Senha provisória legível (sem 0/O, 1/l), 16 caracteres em blocos de 4.
  // Sorteio sem viés: 256 não é múltiplo de 31, então os bytes acima do último múltiplo
  // são descartados (senão as primeiras letras do alfabeto sairiam mais vezes).
  function senhaProvisoria() {
    var alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789';
    var limite = 256 - (256 % alfabeto.length);
    var s = '', n = 0;
    while (n < 16) {
      var b = bytesAleatorios(32);
      for (var i = 0; i < b.length && n < 16; i++) {
        if (b[i] >= limite) continue;
        s += alfabeto[b[i] % alfabeto.length];
        n++;
        if (n % 4 === 0 && n < 16) s += '-';
      }
    }
    return s;
  }

  // ---------- Hash de senha (PBKDF2, assíncrono) ----------
  function suportaCripto() { return !!(window.crypto && window.crypto.subtle); }

  function derivar(senha, sal, iteracoes) {
    return window.crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
      .then(function (chave) {
        return window.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes }, chave, 256);
      })
      .then(function (bits) { return new Uint8Array(bits); });
  }

  // Formato guardado: pbkdf2-sha256$iterações$sal(base64)$hash(base64)
  function hashSenha(senha) {
    var iteracoes = PEP.regra('pbkdf2Iteracoes') || 600000;
    var sal = bytesAleatorios(16);
    return derivar(senha, sal, iteracoes).then(function (h) {
      return 'pbkdf2-sha256$' + iteracoes + '$' + paraBase64(sal) + '$' + paraBase64(h);
    });
  }

  // Comparação em tempo constante (não para no primeiro byte diferente)
  function iguais(a, b) {
    if (a.length !== b.length) return false;
    var dif = 0;
    for (var i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
    return dif === 0;
  }

  function conferirSenha(senha, guardado) {
    var partes = String(guardado || '').split('$');
    if (partes.length !== 4 || partes[0] !== 'pbkdf2-sha256') return Promise.resolve(false);
    return derivar(senha, deBase64(partes[2]), Number(partes[1])).then(function (h) {
      return iguais(h, deBase64(partes[3]));
    });
  }

  // ---------- Política de senha ----------
  var COMUNS = ['123456', '123456789', '12345678', '1234567890', '111111', '123123', 'senha', 'senha123', 'senhasenha',
    'password', 'password123', 'qwerty', 'qwerty123', 'qwertyuiop', '1q2w3e4r', 'abc123', 'iloveyou', 'admin', 'admin123',
    'mudar123', 'mudarsenha', 'brasil', 'flamengo', 'corinthians', 'palmeiras', 'saopaulo', 'santos', 'vasco', 'gremio',
    'cruzeiro', 'botafogo', 'internacional', 'pokemon', 'naruto', 'princesa', 'familia', 'jesuscristo', 'teste123',
    'minhasenha', 'trocarsenha', 'bemvindo', 'estagiario', 'psicologia', 'santacasa', 'prontuario'];

  function normalizar(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  }

  function ehSequencia(t) {
    if (t.length < 4) return false;
    var passo = t.charCodeAt(1) - t.charCodeAt(0);
    if (Math.abs(passo) !== 1) return false;
    for (var i = 2; i < t.length; i++) if (t.charCodeAt(i) - t.charCodeAt(i - 1) !== passo) return false;
    return true;
  }

  // contexto: { login, nome, email } — palavras que não podem aparecer na senha
  function avaliarSenha(senha, contexto) {
    var min = PEP.regra('senhaMinimo') || 15, max = PEP.regra('senhaMaximo') || 128;
    var erros = [];
    var s = String(senha || '');
    var n = normalizar(s);
    if (s.length < min) erros.push('Use pelo menos ' + min + ' caracteres. Uma frase curta funciona bem, como "chuva fina na janela".');
    if (s.length > max) erros.push('Use no máximo ' + max + ' caracteres.');
    if (s && (/^(.+?)\1+$/.test(s) || ehSequencia(n))) erros.push('Evite repetições e sequências (como "abcabc" ou "123456").');
    var proibidas = ['vinculo', 'senha', 'password'];
    contexto = contexto || {};
    [contexto.login, contexto.email ? String(contexto.email).split('@')[0] : '', contexto.nome].forEach(function (v) {
      String(v || '').split(/[\s._@-]+/).forEach(function (p) { if (normalizar(p).length >= 4) proibidas.push(normalizar(p)); });
    });
    if (proibidas.some(function (p) { return n.indexOf(p) !== -1; })) erros.push('Não use seu nome, seu usuário, a palavra "senha" nem o nome do sistema.');
    if (COMUNS.indexOf(n) !== -1 || COMUNS.some(function (c) { return n.length && n === c + c; })) erros.push('Essa senha está na lista de senhas mais usadas.');

    // Força: o comprimento pesa mais que a variedade de caracteres
    var classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(s); }).length;
    var forca = s.length >= 25 ? 4 : s.length >= 20 ? 3 : s.length >= min ? 2 : s.length >= 10 ? 1 : 0;
    if (classes >= 3 && forca < 4 && s.length >= min) forca++;
    if (erros.length && forca > 1) forca = 1;
    var rotulos = ['muito fraca', 'fraca', 'razoável', 'boa', 'forte'];
    return { ok: erros.length === 0, erros: erros, forca: forca, rotulo: rotulos[forca] };
  }

  // ---------- Verificação em duas etapas (TOTP, RFC 6238) ----------
  // O app autenticador (Google Authenticator, Microsoft Authenticator...) e o sistema guardam o mesmo
  // segredo; a cada 30 segundos os dois calculam o mesmo código de 6 dígitos (HMAC-SHA1 do horário).
  // Com o banco ligado, quem confere é o Supabase Auth; aqui é o protótipo.
  var BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function base32(bytes) {
    var bits = 0, valor = 0, s = '';
    for (var i = 0; i < bytes.length; i++) {
      valor = (valor << 8) | bytes[i]; bits += 8;
      while (bits >= 5) { s += BASE32[(valor >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) s += BASE32[(valor << (5 - bits)) & 31];
    return s;
  }
  function deBase32(texto) {
    var s = String(texto || '').replace(/[\s=-]/g, '').toUpperCase(), bits = 0, valor = 0, saida = [];
    for (var i = 0; i < s.length; i++) {
      var idx = BASE32.indexOf(s[i]);
      if (idx < 0) throw new Error('Chave inválida');
      valor = (valor << 5) | idx; bits += 5;
      if (bits >= 8) { saida.push((valor >>> (bits - 8)) & 255); bits -= 8; }
    }
    return new Uint8Array(saida);
  }
  function novoSegredoMfa() { return base32(bytesAleatorios(20)); }   // 160 bits, como recomenda a RFC 4226

  // Código de 6 dígitos para um instante (milissegundos)
  function codigoTotp(segredo, instanteMs) {
    var passo = Math.floor((instanteMs === undefined ? Date.now() : instanteMs) / 30000);
    var msg = new Uint8Array(8);
    for (var i = 7; i >= 0; i--) { msg[i] = passo % 256; passo = Math.floor(passo / 256); }
    return window.crypto.subtle.importKey('raw', deBase32(segredo), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
      .then(function (chave) { return window.crypto.subtle.sign('HMAC', chave, msg); })
      .then(function (assinatura) {
        var h = new Uint8Array(assinatura), o = h[h.length - 1] & 15;
        var n = ((h[o] & 127) * 16777216) + (h[o + 1] << 16) + (h[o + 2] << 8) + h[o + 3];
        return ('000000' + (n % 1000000)).slice(-6);
      });
  }
  // Aceita o código de agora e o de 30 s antes ou depois (relógio do celular um pouco adiantado ou atrasado).
  // Devolve o "passo" de 30 s do código aceito (0 = recusado). Com ultimoPasso, recusa código já usado:
  // o mesmo código não entra duas vezes, nem se alguém o viu por cima do ombro (RFC 6238, seção 5.2).
  function conferirTotp(segredo, codigo, ultimoPasso) {
    var c = String(codigo || '').replace(/\D/g, ''), agora = Math.floor(Date.now() / 30000);
    if (c.length !== 6 || !segredo) return Promise.resolve(0);
    var passos = [agora - 1, agora, agora + 1].filter(function (p) { return p > (ultimoPasso || 0); });
    return Promise.all(passos.map(function (p) { return codigoTotp(segredo, p * 30000); }))
      .then(function (codigos) { var i = codigos.indexOf(c); return i === -1 ? 0 : passos[i]; });
  }
  // Endereço otpauth:// que os apps aceitam (a chave também pode ser digitada à mão)
  function enderecoOtp(segredo, conta) {
    return 'otpauth://totp/' + encodeURIComponent('Vínculo:' + conta) + '?secret=' + segredo + '&issuer=' + encodeURIComponent('Vínculo') + '&digits=6&period=30';
  }
  // Códigos de recuperação (celular perdido): cada um vale uma vez; o sistema guarda só o hash
  function codigosRecuperacao() {
    var lista = [];
    for (var i = 0; i < 8; i++) lista.push(senhaProvisoria().slice(0, 9));   // "abcd-efgh"
    return lista;
  }

  return {
    sha256: sha256, sha256Bytes: sha256Bytes, tokenAleatorio: tokenAleatorio, senhaProvisoria: senhaProvisoria,
    suportaCripto: suportaCripto, hashSenha: hashSenha, conferirSenha: conferirSenha, avaliarSenha: avaliarSenha,
    base32: base32, novoSegredoMfa: novoSegredoMfa, codigoTotp: codigoTotp, conferirTotp: conferirTotp, enderecoOtp: enderecoOtp,
    codigosRecuperacao: codigosRecuperacao
  };
})();
