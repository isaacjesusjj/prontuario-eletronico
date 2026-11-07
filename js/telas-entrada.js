/* =========================================================
   telas-entrada.js — login, fila de espera pública e
   página "Sobre" (projeto, arquitetura e banco de dados).
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };

  PEP.telas.entrar = function () {
    var meta = PEP.db._meta || {};
    var motivo = PEP.estado.lerMotivoSaida();
    var cartoes = PEP.config().demo.contasDestaque.map(function (id) {
      var u = PEP.util.porId(PEP.db.usuarios, id);
      if (!u) return '';
      return '<button type="button" class="cartao perfil-cartao" data-acao="preencher-login" data-login="' + esc(u.login) + '">' +
        '<span class="perfil-tipo">' + esc(PEP.regras.nomePerfil(u.perfil)) + '</span>' +
        '<strong>' + esc(PEP.ui.nomeUsuario(u.id)) + '</strong>' +
        '<span class="suave">' + esc(PEP.regras.descricaoUsuario(u)) + '</span>' +
        '<span class="suave pequeno">Usuário: ' + esc(u.login) + '</span></button>';
    }).join('');

    return '<h1>Bem-vindo ao Vínculo</h1>' +
      '<p class="suave">Prontuário eletrônico da clínica-escola de Psicologia: do primeiro contato na fila de espera até o encerramento do caso, com supervisão em cada registro.</p>' +
      (motivo ? '<div class="aviso alerta" role="status">Sua sessão foi encerrada por ' + (motivo === 'inatividade' ? PEP.regra('inatividadeMinutos') + ' minutos sem uso' : 'tempo máximo de uso') + '. Entre de novo para continuar.</div>' : '') +
      '<form class="cartao" data-form="login" style="max-width:480px" novalidate>' +
      '<h2>Entrar</h2>' +
      '<div class="aviso perigo" id="login-erro" role="alert" hidden></div>' +
      '<div class="campo"><label for="lg-usuario">Usuário ou e-mail</label>' +
      '<input id="lg-usuario" name="usuario" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>' +
      '<div class="campo"><label for="lg-senha">Senha</label>' +
      '<div class="senha-linha"><input id="lg-senha" name="senha" type="password" autocomplete="current-password" required>' +
      '<button type="button" class="botao secundario pequeno" data-acao="mostrar-senha" data-alvo="lg-senha" aria-pressed="false">Mostrar</button></div>' +
      '<span class="dica">Pode colar a senha ou usar o gerenciador de senhas do navegador.</span></div>' +
      '<button class="botao" type="submit" id="lg-entrar">Entrar</button>' +
      (PEP.repo.adaptador().remoto ?
        '<p class="suave pequeno" style="margin:.8rem 0 0">Esqueceu a senha? Digite seu e-mail acima e <button type="button" class="botao secundario pequeno" data-acao="recuperar-senha">receba um link</button> para criar outra.</p>' :
        '<p class="suave pequeno" style="margin:.8rem 0 0">Esqueceu a senha? A coordenação (equipe) ou a psicóloga técnica (pacientes) gera uma senha provisória, que você troca no primeiro acesso.</p>') +
      '</form>' +
      '<h2 style="margin-top:1.6rem">Contas de demonstração</h2>' +
      '<p class="suave">Contas fictícias para a apresentação. Clique numa conta para preencher o login e depois em <strong>Entrar</strong>. ' +
      'Senha de todas: <strong>' + esc(meta.senhaDemonstracao || '') + '</strong> (no banco, só fica o hash).</p>' +
      '<div class="grade">' + cartoes + '</div>' +
      '<div class="cartao linha entre" style="margin-top:1rem">' +
      '<div><h2>Quer ser atendido(a)?</h2><p class="suave">Entre na fila de espera da clínica-escola. Leva 2 minutos.</p></div>' +
      '<a class="botao" href="#/inscricao">Entrar na fila de espera</a></div>' +
      '<div class="linha entre" style="margin-top:1rem">' +
      '<span class="suave pequeno">Grupo: Daniel Dantas, Dilson Rodrigues e Isaac de Jesus Lima · <a href="#/sobre">sobre o projeto</a></span>' +
      '<button class="botao secundario pequeno" data-acao="restaurar">Restaurar dados de demonstração</button></div>';
  };

  // No protótipo (dados no navegador), nenhuma clínica recebe a inscrição. Quem chegar aqui
  // procurando ajuda de verdade precisa saber disso e para onde ir.
  function avisoPrototipo() {
    if (PEP.repo.adaptador().remoto) return '';
    return '<div class="aviso alerta" role="note"><strong>Protótipo acadêmico.</strong> Nenhuma clínica recebe esta inscrição: os dados ficam só neste navegador. ' +
      'Se você procura atendimento psicológico, procure a UBS mais perto de você ou o CAPS da sua cidade. Em crise: CVV 188 (24 horas) · SAMU 192.</div>';
  }

  // Fila de espera online: poucos campos, aviso de urgência, aviso de privacidade e CPF validado
  PEP.telas.inscricao = function () {
    var periodos = PEP.ui.opcoes(PEP.lista('periodos'));
    return '<a href="#/entrar" class="suave">← Voltar</a>' +
      '<h1 style="margin-top:.5rem">Fila de espera da clínica-escola</h1>' + avisoPrototipo() +
      '<div class="aviso perigo" role="note"><strong>É urgente?</strong> Se você está em risco ou pensando em se machucar, não espere a fila: ' +
      'ligue <strong>192 (SAMU)</strong>, fale com o <strong>CVV pelo 188</strong> (24 horas, gratuito) ou procure a UPA ou o pronto-socorro mais próximo.</div>' +
      '<form class="cartao" data-form="inscricao" id="form-inscricao" novalidate>' +
      '<p class="suave pequeno">Campos com * são obrigatórios.</p>' +
      '<div class="grade-2">' +
      '<div class="campo"><label for="f-nome">Nome completo *</label><input id="f-nome" name="nome" type="text" required maxlength="80" autocomplete="name"></div>' +
      '<div class="campo"><label for="f-social">Como prefere ser chamado(a)</label><input id="f-social" name="social" type="text" maxlength="80"><span class="dica">Opcional. Respeitamos o nome social.</span></div>' +
      '<div class="campo"><label for="f-nasc">Data de nascimento *</label><input id="f-nasc" name="nascimento" type="date" required autocomplete="bday"></div>' +
      '<div class="campo"><label for="f-cpf">CPF *</label><input id="f-cpf" name="cpf" type="text" inputmode="numeric" data-mascara="cpf" maxlength="14" placeholder="000.000.000-00" autocomplete="off">' +
      '<label class="check pequeno" style="margin:.3rem 0 0"><input type="checkbox" id="f-semcpf" name="semcpf"> <span>Não tenho CPF (a equipe confirma a identidade no acolhimento)</span></label></div>' +
      '<div class="campo"><label for="f-tel">Telefone para contato *</label><input id="f-tel" name="telefone" type="tel" data-mascara="telefone" maxlength="15" placeholder="(11) 90000-0000" autocomplete="tel"></div>' +
      '<div class="campo"><label for="f-email">E-mail</label><input id="f-email" name="email" type="email" maxlength="254" autocomplete="email"><span class="dica">Opcional.</span></div>' +
      '</div>' +
      '<div class="campo"><label for="f-resp">Nome do responsável legal (obrigatório se menor de 18 anos)</label><input id="f-resp" name="responsavel" type="text" maxlength="80"></div>' +
      '<div class="campo"><label for="f-resumo">Em poucas palavras, o que te traz aqui? *</label>' +
      '<span class="dica" id="f-resumo-dica">Não precisa contar detalhes agora. Isso será conversado com cuidado no acolhimento. Até 140 caracteres.</span>' +
      '<input id="f-resumo" name="resumo" type="text" required maxlength="140" aria-describedby="f-resumo-dica"></div>' +
      // Aparece se o relato tiver sinal de urgência (_config.listas.sinaisUrgencia): urgência não espera a fila
      '<div class="aviso perigo" id="f-urgencia" role="alert" hidden><strong>O que você escreveu pode ser urgente.</strong> Não espere a fila: ' +
      'ligue <strong>188 (CVV, 24 horas)</strong>, <strong>192 (SAMU)</strong> ou vá à UPA mais próxima. Se quiser, termine a inscrição também: a equipe vai procurar você primeiro.</div>' +
      '<div class="campo"><label for="f-periodo">Melhor período</label><select id="f-periodo" name="periodo">' + periodos + '</select></div>' +
      '<div class="aviso info pequeno"><strong>Aviso de privacidade (resumo).</strong> Usamos estes dados só para organizar a fila, evitar inscrição em duplicidade (pelo CPF) e entrar em contato. ' +
      'Quem vê é só a equipe técnica da clínica-escola. Você pode pedir para sair da fila, corrigir ou consultar seus dados a qualquer momento. ' +
      '<a href="#/privacidade" target="_blank" rel="noopener">Ler o aviso completo</a> (abre em nova aba).</div>' +
      '<label class="check"><input type="checkbox" name="ciente" id="f-ciente"> <span>Li o aviso de privacidade e quero entrar na fila. *</span></label>' +
      '<label class="check" id="linha-resp-ok" hidden><input type="checkbox" name="responsavelOk" id="f-respok"> <span>Sou o(a) responsável legal e autorizo esta inscrição (obrigatório para menores de 18 anos). *</span></label>' +
      '<button class="botao" type="submit">Enviar inscrição</button></form>';
  };

  PEP.telas.inscricaoConcluida = function () {
    // Mesma mensagem para todos: o formulário público não revela se o CPF já tem cadastro
    return avisoPrototipo() + '<div class="cartao"><h1>Inscrição recebida</h1>' +
      '<p>A equipe da clínica-escola vai entrar em contato pelo telefone informado. Se você já tiver cadastro ou outra inscrição, a equipe junta as informações.</p>' +
      '<p class="suave">Se a situação ficar urgente enquanto você espera: SAMU 192 · CVV 188 (24 horas).</p>' +
      '<a class="botao secundario" href="#/entrar">Voltar ao início</a></div>';
  };

  PEP.telas.sobre = function () {
    return '<h1>Sobre o Vínculo</h1>' +
      '<div class="cartao"><h2>O projeto</h2>' +
      '<p>Protótipo funcional do Projeto Integrador de Curso (PIC) — Análise e Desenvolvimento de Sistemas, Faculdade de Ciências Médicas da Santa Casa de São Paulo, 2º semestre de 2026.</p>' +
      '<p><strong>Grupo:</strong> Daniel Dantas, Dilson Rodrigues e Isaac de Jesus Lima.</p>' +
      '<p class="suave"><strong>Versões anteriores:</strong> Etapa 1 — requisitos (Adônis Silveira, Isaac Jesus, Felipe Moretti e Giovane Guedes, 1º semestre de 2026); ' +
      'protótipo de telas v1 (Daniel Dantas, Dilson Rodrigues, Gustavo Santos e Ryan Mendes).</p></div>' +
      '<div class="cartao"><h2>O problema que o sistema ataca</h2>' +
      '<p>Registros em papel e pacientes que vêm uma vez e não voltam. O Vínculo registra faltas, abre um fluxo de contato quando há duas faltas seguidas e mostra os motivos de abandono nos indicadores.</p></div>' +
      '<div class="cartao"><h2>Como está construído</h2><div class="tabela-rolagem"><table><caption class="sr-only">Arquitetura atual e alvo</caption>' +
      '<thead><tr><th scope="col">Camada</th><th scope="col">Hoje (protótipo)</th><th scope="col">Produção (próxima etapa)</th></tr></thead><tbody>' +
      '<tr><td>Telas</td><td>HTML, CSS e JavaScript puros, no GitHub Pages</td><td>As mesmas telas, no mesmo endereço</td></tr>' +
      '<tr><td>Dados</td><td>JSON com uma coleção por tabela; cópia no navegador</td><td>PostgreSQL no Supabase, região São Paulo</td></tr>' +
      '<tr><td>Troca</td><td colspan="2"><code>js/config-banco.js</code>: muda o adaptador de <code>local</code> para <code>supabase</code>. As telas não mudam.</td></tr>' +
      '<tr><td>Login</td><td>Hash PBKDF2 com sal, bloqueio por tentativas, sessão que expira</td><td>Supabase Auth com MFA e, depois, login institucional</td></tr>' +
      '<tr><td>Quem vê o quê</td><td>Regras em <code>js/permissoes.js</code></td><td>As mesmas regras como políticas RLS no banco (<code>banco/schema.sql</code>)</td></tr>' +
      '<tr><td>Auditoria</td><td>Cadeia de hash verificável na tela</td><td>Tabela só de inserção, com trigger e cadeia de hash no banco</td></tr>' +
      '<tr><td>Arquivos</td><td>IndexedDB do navegador, com tipo, tamanho e hash conferidos</td><td>Supabase Storage em bucket privado</td></tr>' +
      '</tbody></table></div>' +
      '<p class="suave pequeno">Projeção de volume (cenário atual: 800 estudantes, 400 pacientes por semestre): cerca de 84 MB de banco por ano e 1,6 GB em 20 anos de guarda. Premissas em <code>banco/projecao.py</code>.</p></div>' +
      '<div class="cartao"><h2>Regras e leis</h2><p>Cada regra do sistema tem a norma de origem e a tela em que aparece: <a href="#/regras">ver a matriz de regras e leis</a>. ' +
      'Veja também o <a href="#/privacidade">aviso de privacidade</a>, os <a href="#/termos">termos de uso</a> e a <a href="#/acessibilidade">declaração de acessibilidade</a>.</p></div>' +
      '<div class="cartao"><h2>ODS (ONU)</h2><p><strong>ODS 3 — Saúde e bem-estar:</strong> mais continuidade no cuidado em saúde mental. ' +
      '<strong>ODS 4 — Educação de qualidade:</strong> formação supervisionada dos estudantes de Psicologia.</p></div>' +
      '<div class="aviso alerta"><strong>O que ainda é simulado:</strong> os dados ficam no navegador de quem usa, e as regras rodam no navegador. ' +
      'Com o banco ligado, as mesmas regras passam a ser aplicadas pelo servidor.</div>';
  };
})();
