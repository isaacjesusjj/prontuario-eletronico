/* =========================================================
   telas-conta.js — minha conta (troca de senha), termo de
   sigilo no primeiro acesso, "Meus dados" do paciente (LGPD)
   e leitura do prontuário por link temporário.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };
  var data = function (t) { return PEP.util.formatarData(t); };

  function formularioSenha(obrigatorio) {
    var min = PEP.regra('senhaMinimo');
    return '<form class="cartao" data-form="trocar-senha" id="form-senha" style="max-width:560px" novalidate>' +
      '<h2>' + (obrigatorio ? 'Crie sua senha' : 'Trocar senha') + '</h2>' +
      '<div class="campo"><label for="ts-atual">' + (obrigatorio ? 'Senha provisória' : 'Senha atual') + '</label><input id="ts-atual" type="password" autocomplete="current-password"></div>' +
      '<div class="campo"><label for="ts-nova">Nova senha</label>' +
      '<div class="senha-linha"><input id="ts-nova" type="password" autocomplete="new-password" aria-describedby="ts-regras ts-forca" maxlength="' + PEP.regra('senhaMaximo') + '">' +
      '<button type="button" class="botao secundario pequeno" data-acao="mostrar-senha" data-alvo="ts-nova" aria-pressed="false">Mostrar</button></div>' +
      '<div class="medidor" aria-hidden="true"><span id="ts-barra"></span></div>' +
      '<span class="dica" id="ts-forca" aria-live="polite">Força: —</span>' +
      '<ul class="regras-senha dica" id="ts-regras">' +
      '<li>Pelo menos ' + min + ' caracteres — uma frase curta é mais fácil de lembrar e mais difícil de adivinhar.</li>' +
      '<li>Não precisa de símbolo nem de maiúscula obrigatória (recomendação do NIST, 2025).</li>' +
      '<li>Não pode ter seu nome, seu usuário, a palavra "senha" nem estar entre as senhas mais usadas.</li></ul></div>' +
      '<div class="campo"><label for="ts-confirma">Repita a nova senha</label><input id="ts-confirma" type="password" autocomplete="new-password"></div>' +
      '<button class="botao" type="submit">Salvar senha</button></form>';
  }

  // ---------- Verificação em duas etapas ----------
  PEP.telas._mfaNovo = null;     // { segredo, uri, fatorId } enquanto a pessoa configura o app
  PEP.telas._mfaCodigos = null;  // códigos de recuperação: aparecem uma vez
  var mfaExigido = function (u) { return PEP.estado.mfaExigido(u); };

  function cartaoMfa(u) {
    var remoto = PEP.repo.adaptador().remoto, n = PEP.telas._mfaNovo, html = '<div class="cartao" id="mfa"><h2>Verificação em duas etapas</h2>';
    if (PEP.telas._mfaCodigos) {
      html += '<div class="aviso info" role="status"><strong>Códigos de recuperação</strong> (aparecem só agora): guarde em lugar seguro, fora do celular. Cada um vale uma vez, se você perder o aparelho.' +
        '<ul class="codigos-recuperacao">' + PEP.telas._mfaCodigos.map(function (c) { return '<li class="codigo">' + esc(c) + '</li>'; }).join('') + '</ul>' +
        '<button class="botao secundario pequeno" data-acao="mfa-fechar-codigos">Já guardei</button></div>';
    }
    if (u.mfaAtivo && !n) {
      html += '<p><span class="etiqueta validada">ativa</span> Ao entrar, além da senha, o sistema pede o código do seu aplicativo autenticador.' +
        (u.mfaDesde ? ' Ativada em ' + data(u.mfaDesde) + '.' : '') + '</p>' +
        (!remoto ? '<p class="suave pequeno">Códigos de recuperação que ainda valem: ' + (u.mfaRecuperacao || []).length + '.</p>' : '') +
        '<div class="campo"><label for="mfa-codigo-atual">Código atual do aplicativo (para mudar a configuração)</label>' +
        '<input id="mfa-codigo-atual" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="max-width:12rem"></div><div class="linha">' +
        (!remoto ? '<button class="botao secundario pequeno" data-acao="mfa-novos-codigos">Gerar novos códigos de recuperação</button>' : '') +
        (mfaExigido(u) ? '<span class="suave pequeno">Obrigatória para o seu perfil.</span>' : '<button class="botao secundario pequeno" data-acao="mfa-desativar">Desativar</button>') + '</div>';
      return html + '</div>';
    }
    if (!n) {
      return html + '<p>Proteja sua conta com um segundo passo: além da senha, um código de 6 dígitos que muda a cada 30 segundos no seu celular ' +
        '(Google Authenticator, Microsoft Authenticator ou outro aplicativo de código). Quem descobrir sua senha não entra sem o celular.</p>' +
        (mfaExigido(u) ? '<div class="aviso info pequeno">Para o seu perfil, a verificação em duas etapas é obrigatória.</div>' : '') +
        '<button class="botao" data-acao="mfa-iniciar">Ativar a verificação em duas etapas</button></div>';
    }
    var grupos = String(n.segredo).match(/.{1,4}/g).join(' ');
    return html + '<ol><li>No aplicativo autenticador, escolha <strong>adicionar conta</strong> e depois <strong>inserir uma chave de configuração</strong>.</li>' +
      '<li>Nome da conta: <strong>Vinculum</strong>. Chave: <span class="codigo" id="mfa-chave">' + esc(grupos) + '</span> (tipo: baseado no tempo).</li>' +
      '<li>Digite abaixo o código de 6 dígitos que o aplicativo mostrar.</li></ol>' +
      '<details><summary class="pequeno">Endereço para aplicativos que aceitam link (otpauth)</summary><p class="codigo pequeno">' + esc(n.uri) + '</p></details>' +
      '<form data-form="mfa-ativar" id="form-mfa" novalidate><div class="campo"><label for="mfa-codigo-novo">Código do aplicativo</label>' +
      '<input id="mfa-codigo-novo" name="codigo" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="max-width:12rem"></div>' +
      '<div class="linha"><button class="botao" type="submit">Confirmar e ativar</button><button type="button" class="botao secundario" data-acao="mfa-cancelar">Cancelar</button></div></form></div>';
  }

  // Primeiro acesso com MFA obrigatório para o perfil (regras.mfaObrigatoria)
  PEP.telas.configurarMfa = function (u) {
    return '<h1>Verificação em duas etapas</h1><div class="aviso info">A coordenação exige a verificação em duas etapas para o seu perfil antes do primeiro uso. Leva dois minutos.</div>' +
      cartaoMfa(u) + '<p><button class="botao secundario" data-acao="sair">Sair</button></p>';
  };

  PEP.telas.trocarSenhaObrigatoria = function (u) {
    return '<h1>Primeiro acesso</h1><div class="aviso info">Sua conta está com uma senha provisória. Crie sua senha pessoal para continuar.</div>' + formularioSenha(true);
  };

  PEP.telas.conta = function (u) {
    var aceites = PEP.db.aceites.filter(function (a) { return a.usuarioId === u.id; });
    var nomesTermo = { sigilo: 'Termo de responsabilidade e sigilo', uso: 'Termos de uso e aviso de privacidade' };
    return '<h1>Minha conta</h1>' +
      '<div class="cartao"><h2>Dados da conta</h2><p><strong>Nome:</strong> ' + esc(PEP.ui.nomeUsuario(u.id)) + '<br><strong>Usuário:</strong> ' + esc(u.login) +
      '<br><strong>E-mail:</strong> ' + esc(u.email) + '<br><strong>Perfil:</strong> ' + esc(PEP.regras.nomePerfil(u.perfil)) +
      (u.matricula ? '<br><strong>Matrícula:</strong> ' + esc(u.matricula) : '') + (u.crp ? '<br><strong>CRP:</strong> ' + esc(u.crp) : '') + '</p>' +
      '<p class="suave pequeno">A sessão encerra sozinha depois de ' + PEP.regra('inatividadeMinutos') + ' minutos sem uso e quando a aba é fechada.</p></div>' +
      formularioSenha(false) + cartaoMfa(u) +
      '<div class="cartao"><h2>Termos aceitos</h2>' + (aceites.length ? '<ul>' + aceites.map(function (a) {
        return '<li>' + esc(nomesTermo[a.termo] || a.termo) + ' · versão ' + esc(a.versao) + ' · ' + data(a.em) + '</li>';
      }).join('') + '</ul>' : '<p class="vazio">Nenhum.</p>') + '<p class="pequeno"><a href="#/termos">Termos de uso</a> · <a href="#/privacidade">Aviso de privacidade</a></p></div>';
  };

  // ---------- Termo no primeiro acesso ----------
  PEP.telas.termo = function (u) {
    var versao;
    if (u.perfil === 'paciente') {
      versao = PEP.config().termos.uso;
      return '<h1>Antes de começar</h1><div class="cartao"><h2>Termos de uso e aviso de privacidade (versão ' + esc(versao) + ')</h2>' +
        '<p>Este espaço é seu: aqui você confirma sessões, pede cópia do prontuário e acompanha seus dados. Seus dados de saúde são tratados para o seu atendimento (LGPD, art. 11, II, "f") e guardados pelo prazo exigido para prontuários.</p>' +
        '<p>Você pode, a qualquer momento: ver e corrigir seus dados, saber com quem são compartilhados, revogar autorizações opcionais (como gravação e lembretes) e falar com o encarregado de dados.</p>' +
        '<p class="pequeno"><a href="#/termos" target="_blank" rel="noopener">Ler os termos de uso</a> · <a href="#/privacidade" target="_blank" rel="noopener">Ler o aviso de privacidade</a> (abrem em nova aba)</p>' +
        '<label class="check"><input type="checkbox" id="tm-ok"> <span>Li e concordo com os termos de uso e com o aviso de privacidade.</span></label>' +
        '<div class="linha"><button class="botao" data-acao="aceitar-termo" data-termo="uso">Continuar</button><button class="botao secundario" data-acao="sair">Sair</button></div></div>';
    }
    versao = PEP.config().termos.sigilo;
    return '<h1>Termo de responsabilidade e sigilo</h1>' +
      '<div class="aviso info">Antes do primeiro acesso, todo usuário da equipe aceita este termo. Para estagiários, ele é exigido pela Res. CFP 05/2025, art. 10, III.</div>' +
      '<div class="cartao termo"><h2>Versão ' + esc(versao) + '</h2><ol>' +
      '<li>Vou acessar só os casos e as informações necessárias para a minha função, no período do meu vínculo.</li>' +
      '<li>Vou manter sigilo sobre tudo o que souber no atendimento, inclusive depois do fim do estágio (Código de Ética, art. 9º).</li>' +
      '<li>Não vou copiar, fotografar, imprimir nem enviar dados de pacientes fora do sistema (WhatsApp, e-mail pessoal, redes sociais, nuvem pessoal).</li>' +
      '<li>Não vou compartilhar minha senha nem deixar a sessão aberta em computador compartilhado.</li>' +
      '<li>Vou registrar com linguagem técnica e respeitosa, sabendo que o paciente pode ler o prontuário (Res. CFP 05/2025, art. 13).</li>' +
      '<li>Sei que todo acesso fica registrado na auditoria e que o uso indevido pode gerar medidas disciplinares e responsabilização (LGPD, arts. 42 e 46).</li>' +
      '<li>Se perceber acesso indevido ou vazamento, aviso imediatamente a coordenação e o encarregado de dados.</li></ol>' +
      '<label class="check"><input type="checkbox" id="tm-ok"> <span>Li e aceito o termo de responsabilidade e sigilo.</span></label>' +
      '<div class="linha"><button class="botao" data-acao="aceitar-termo" data-termo="sigilo">Aceitar e continuar</button><button class="botao secundario" data-acao="sair">Sair</button></div></div>';
  };

  // ---------- Paciente: quem acessou o meu prontuário (LGPD, arts. 9º e 18) ----------
  // Com o banco ligado, a lista vem pronta de app.acessos_ao_meu_prontuario() (o paciente não lê a auditoria)
  PEP.telas._acessosRemotos = null;
  function cartaoAcessos(u) {
    var lista = PEP.repo.adaptador().remoto ? PEP.telas._acessosRemotos : PEP.regras.acessosAoProntuario(u);
    var titulo = '<h2>Quem acessou o seu prontuário</h2>';
    if (!lista) return '<div class="cartao">' + titulo + '<p class="vazio" role="status">Carregando…</p></div>';
    var motivos = {};
    PEP.lista('motivosAcessoTecnico').forEach(function (m) { motivos[m.id] = m.nome; });
    return '<div class="cartao">' + titulo + '<p class="suave pequeno">Cada acesso e cada registro da equipe ficam guardados. Quando a psicóloga técnica abre o seu prontuário ' +
      'sem ser da sua equipe, ela registra o motivo, e ele aparece aqui.</p>' +
      (lista.length ? '<div class="tabela-rolagem"><table><caption class="sr-only">Acessos ao seu prontuário, do mais recente para o mais antigo</caption>' +
        '<thead><tr><th scope="col">Quando</th><th scope="col">Quem</th><th scope="col">O quê</th></tr></thead><tbody>' +
        lista.slice(0, 30).map(function (a) {
          return '<tr><td>' + data(a.quando) + '</td><td>' + esc(a.quem) +
            (a.papel && a.quem !== 'Você' ? '<br><span class="suave pequeno">' + esc(PEP.regras.nomePerfil(a.papel)) + '</span>' : '') + '</td><td>' + esc(a.acao) +
            (a.motivo ? '<br><span class="suave pequeno">Motivo: ' + esc(motivos[a.motivo] || a.motivo) + (a.detalhe ? ' — ' + esc(a.detalhe) : '') + '</span>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="vazio">Nenhum acesso registrado.</p>') + '</div>';
  }

  // ---------- Paciente: meus dados (LGPD) ----------
  PEP.telas.meusDados = function (u) {
    if (u.perfil !== 'paciente') return PEP.ui.semPermissao();
    var p = PEP.regras.pacienteDoUsuario(u);
    var casos = PEP.db.casos.filter(function (c) { return c.pacienteId === p.id; });
    var caso = casos[casos.length - 1];
    var tipos = PEP.ui.opcoes(PEP.lista('tiposPedidoTitular'));
    var meus = PEP.db.pedidosTitular.filter(function (x) { return x.titularTipo === 'paciente' && x.titularId === p.id; })
      .sort(function (a, b) { return b.em.localeCompare(a.em); });
    var nomesTipo = {};
    PEP.lista('tiposPedidoTitular').forEach(function (t) { nomesTipo[t.valor] = t.nome; });

    var consent = caso ? PEP.lista('finalidadesConsentimento').map(function (f) {
      var c = PEP.regras.consentimentoAtual(caso, f.id);
      var sim = c && c.concedido;
      var botao = f.obrigatoria ? '<span class="suave pequeno">necessário para o atendimento</span>' :
        '<button class="botao secundario pequeno" data-acao="paciente-consentimento" data-caso="' + caso.id + '" data-fin="' + f.id + '" data-valor="' + (sim ? 'nao' : 'sim') + '">' + (sim ? 'Revogar' : 'Autorizar') + '</button>';
      return '<tr><td>' + esc(f.nome) + '</td><td>' + (sim ? '<span class="etiqueta validada">autorizado</span>' : '<span class="etiqueta rascunho">não autorizado</span>') + '</td><td>' + botao + '</td></tr>';
    }).join('') : '';

    return '<h1>Meus dados (LGPD)</h1>' +
      '<p class="suave">Seus direitos como titular dos dados estão no art. 18 da LGPD. A resposta vem em até ' + PEP.regra('prazoRespostaTitularDias') + ' dias.</p>' +
      '<div class="cartao"><h2>Dados cadastrais que a clínica guarda</h2><p><strong>Nome:</strong> ' + esc(p.nome) + (p.nomeSocial ? ' (' + esc(p.nomeSocial) + ')' : '') +
      '<br><strong>Nascimento:</strong> ' + data(p.dataNascimento) + '<br><strong>CPF:</strong> ' + esc(PEP.validar.ocultarCpf(p.cpf)) +
      '<br><strong>Telefone:</strong> ' + esc(PEP.validar.formatarTelefone(p.telefone)) + '<br><strong>E-mail:</strong> ' + esc(p.email || '—') +
      (p.responsavelNome ? '<br><strong>Responsável legal:</strong> ' + esc(p.responsavelNome) : '') +
      (p.emergenciaNome ? '<br><strong>Contato de emergência:</strong> ' + esc(p.emergenciaNome) + (p.emergenciaVinculo ? ' (' + esc(p.emergenciaVinculo) + ')' : '') +
        ', ' + esc(PEP.validar.formatarTelefone(p.emergenciaTelefone)) : '') + '</p>' +
      '<p class="suave pequeno">O conteúdo clínico (evoluções, anamnese) fica no prontuário: peça a cópia em <a href="#/meu-prontuario">Meu prontuário</a>.</p></div>' +
      (function () {   // LGPD, art. 18, VII: com quem a clínica compartilhou dados seus
        var l = PEP.regras.comunicacoesVisiveisAoPaciente(u);
        return '<div class="cartao" id="compartilhamentos"><h2>Com quem seus dados foram compartilhados</h2>' + (l.length ? '<ul>' + l.map(function (x) {
          var t = PEP.regras.tipoComunicacao(x.tipo);
          return '<li>' + data(x.data) + ' · ' + esc(t ? t.nome : x.tipo) + ' · para <strong>' + esc(x.destinatario) + '</strong> · ' + esc(x.finalidade) + '</li>';
        }).join('') + '</ul>' : '<p class="vazio">Nenhum compartilhamento registrado.</p>') +
          '<p class="suave pequeno">Você tem direito de saber com quem seus dados foram compartilhados (LGPD, art. 18, VII). Dúvidas: faça um pedido abaixo.</p></div>';
      })() +
      (caso ? '<div class="cartao"><h2>Minhas autorizações</h2><div class="tabela-rolagem"><table><thead><tr><th scope="col">Finalidade</th><th scope="col">Situação</th><th scope="col"></th></tr></thead><tbody>' + consent +
        '</tbody></table></div><p class="suave pequeno">Revogar não apaga o que foi feito antes com a sua autorização (LGPD, art. 8º, § 5º); vale daqui para frente.</p></div>' : '') +
      '<div class="cartao" id="form-titular"><h2>Fazer um pedido sobre meus dados</h2>' +
      '<div class="campo"><label for="pt-tipo">O que você quer?</label><select id="pt-tipo">' + tipos + '</select></div>' +
      '<div class="campo"><label for="pt-desc">Explique (sem precisar contar nada do atendimento)</label><textarea id="pt-desc" style="min-height:80px" maxlength="500"></textarea></div>' +
      '<p class="suave pequeno">Pedidos de eliminação têm um limite: o prontuário precisa ser guardado por pelo menos ' + PEP.regra('guardaMinimaCfpAnos') + ' anos (Res. CFP 05/2025, art. 18) e a instituição adota ' + PEP.regra('guardaProntuarioAnos') + ' anos (Lei 13.787/2018). Dados que não são do prontuário podem ser eliminados.</p>' +
      '<button class="botao" data-acao="pedido-titular">Enviar pedido</button></div>' +
      (meus.length ? '<div class="cartao"><h2>Meus pedidos</h2><ul>' + meus.map(function (x) {
        return '<li>' + data(x.em) + ' — ' + esc(nomesTipo[x.tipo] || x.tipo) + ': ' + (x.status === 'respondido' ? '<strong>respondido</strong> — ' + esc(x.resposta) : 'em análise') + '</li>';
      }).join('') + '</ul></div>' : '') +
      cartaoAcessos(u) +
      '<p class="pequeno">Encarregado de dados: ' + esc(PEP.config().instituicao.encarregado.nome) + ' · ' + esc(PEP.config().instituicao.encarregado.email) + '</p>';
  };

  // ---------- Leitura do prontuário por link temporário ----------
  PEP.telas._linkLiberado = null; // fica só na memória da página

  PEP.telas.acessoLink = function (token) {
    var hash = PEP.seguranca.sha256(token || '');
    var link = PEP.db.linksAcesso.filter(function (l) { return l.tokenHash === hash; })[0];
    var valido = link && !link.revogadoEm && link.expiraEm >= PEP.util.agora();
    if (!valido) {
      return '<h1>Link indisponível</h1><div class="aviso alerta">Este link de leitura não existe, expirou ou foi revogado. Peça um novo à clínica-escola.</div><a href="#/entrar">Ir para o início</a>';
    }
    var caso = PEP.util.porId(PEP.db.casos, link.casoId);
    if (PEP.telas._linkLiberado === link.id) {
      return '<div class="linha entre nao-imprimir" style="margin-bottom:1rem"><span class="suave pequeno">Link válido até ' + data(link.expiraEm) + '</span>' +
        '<button class="botao" data-acao="imprimir" data-caso="' + caso.id + '">Imprimir / salvar em PDF</button></div>' + PEP.telas.copiaProntuario(caso, 'para leitura do(a) paciente');
    }
    return '<h1>Seu prontuário</h1><form class="cartao" data-form="abrir-link" id="form-link" style="max-width:480px" novalidate>' +
      '<input type="hidden" name="token" value="' + esc(token) + '">' +
      '<p>Para sua proteção, confirme sua data de nascimento antes de abrir.</p>' +
      '<div class="campo"><label for="lk-nasc">Data de nascimento</label><input id="lk-nasc" name="nascimento" type="date" required></div>' +
      '<button class="botao" type="submit">Abrir meu prontuário</button>' +
      '<p class="suave pequeno" style="margin-top:.8rem">Depois de ' + PEP.regra('tentativasLink') + ' tentativas erradas, o link é bloqueado.</p></form>';
  };
})();
