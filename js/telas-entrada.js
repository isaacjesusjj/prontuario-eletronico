/* =========================================================
   telas-entrada.js — entrada (escolha de perfil), fila de
   espera pública e página "Sobre".
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };

  // Contas de demonstração mostradas abaixo do login (clicar preenche o formulário)
  var DESTAQUES = ['u-tec', 'u-sup1', 'u-sup2', 'u-est1', 'u-est3', 'u-est5', 'u-pac1', 'u-dir'];

  PEP.telas.entrar = function () {
    var meta = PEP.db._meta || {};
    var cartoes = DESTAQUES.map(function (id) {
      var u = PEP.util.porId(PEP.db.usuarios, id);
      if (!u) return '';
      return '<button type="button" class="cartao perfil-cartao" data-acao="preencher-login" data-login="' + esc(u.login) + '">' +
        '<span class="perfil-tipo">' + esc(PEP.regras.nomePerfil(u.perfil)) + '</span>' +
        '<strong>' + esc(u.nome) + '</strong>' +
        '<span class="suave">' + esc(u.descricao) + '</span>' +
        '<span class="suave pequeno">Usuário: ' + esc(u.login) + '</span></button>';
    }).join('');

    return '<h1>Bem-vindo ao Vínculo</h1>' +
      '<p class="suave">Prontuário eletrônico da clínica-escola de Psicologia: do primeiro contato na fila de espera até o encerramento do caso, com supervisão em cada registro.</p>' +
      // Formulário de login: cada perfil vê só o que precisa depois de entrar
      '<form class="cartao" data-form="login" style="max-width:480px">' +
      '<h2>Entrar</h2>' +
      '<div class="aviso perigo" id="login-erro" role="alert" hidden></div>' +
      '<div class="campo"><label for="lg-usuario">Usuário</label>' +
      '<input id="lg-usuario" name="usuario" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>' +
      '<div class="campo"><label for="lg-senha">Senha</label>' +
      '<input id="lg-senha" name="senha" type="password" autocomplete="current-password" required></div>' +
      '<button class="botao" type="submit" id="lg-entrar">Entrar</button>' +
      '<p class="suave pequeno" style="margin:.8rem 0 0">Esqueceu a senha? Procure a secretaria da clínica-escola.</p></form>' +
      '<h2 style="margin-top:1.6rem">Contas de demonstração</h2>' +
      '<p class="suave">Contas fictícias para a apresentação. Clique numa conta para preencher o login e depois em <strong>Entrar</strong>. ' +
      'Senha de todas: <strong>' + esc(meta.senhaDemonstracao || '') + '</strong></p>' +
      '<div class="grade">' + cartoes + '</div>' +
      '<div class="cartao linha entre" style="margin-top:1rem">' +
      '<div><h2>Quer ser atendido(a)?</h2><p class="suave">Entre na fila de espera da clínica-escola. Leva 2 minutos.</p></div>' +
      '<a class="botao" href="#/inscricao">Entrar na fila de espera</a></div>' +
      '<div class="linha entre" style="margin-top:1rem">' +
      '<span class="suave pequeno">Grupo: Daniel Dantas, Dilson Rodrigues e Isaac de Jesus Lima · <a href="#/sobre">sobre o projeto</a></span>' +
      '<button class="botao secundario pequeno" data-acao="restaurar">Restaurar dados de demonstração</button></div>';
  };

  // Fila de espera online: poucos campos, aviso de urgência e de privacidade
  PEP.telas.inscricao = function () {
    return '<a href="#/entrar" class="suave">← Voltar</a>' +
      '<h1 style="margin-top:.5rem">Fila de espera da clínica-escola</h1>' +
      '<div class="aviso perigo" role="alert"><strong>É urgente?</strong> Se você está em risco ou pensando em se machucar, não espere a fila: ' +
      'ligue <strong>192 (SAMU)</strong>, fale com o <strong>CVV pelo 188</strong> (24 horas, gratuito) ou procure a UPA ou o pronto-socorro mais próximo.</div>' +
      '<form class="cartao" data-form="inscricao">' +
      '<div class="campo"><label for="f-nome">Como você prefere ser chamado(a)?</label><input id="f-nome" name="nome" type="text" required maxlength="80"></div>' +
      '<div class="grade-2">' +
      '<div class="campo"><label for="f-idade">Idade</label><input id="f-idade" name="idade" type="number" min="1" max="120" required></div>' +
      '<div class="campo"><label for="f-contato">Telefone ou e-mail para contato</label><input id="f-contato" name="contato" type="text" required maxlength="80"></div>' +
      '</div>' +
      '<div class="campo"><label for="f-resp">Nome do responsável (se for menor de 18 anos)</label><input id="f-resp" name="responsavel" type="text" maxlength="80"></div>' +
      '<div class="campo"><label for="f-resumo">Em poucas palavras, o que te traz aqui?</label>' +
      '<span class="dica">Não precisa contar detalhes agora. Isso será conversado com cuidado no acolhimento.</span>' +
      '<input id="f-resumo" name="resumo" type="text" required maxlength="140"></div>' +
      '<div class="campo"><label for="f-periodo">Melhor período</label><select id="f-periodo" name="periodo"><option>Manhã</option><option>Tarde</option><option>Noite</option></select></div>' +
      '<div class="aviso info pequeno"><strong>Aviso de privacidade.</strong> Usamos estes dados só para organizar a fila e entrar em contato. ' +
      'Eles são vistos apenas pela equipe da clínica-escola. Você pode pedir para sair da fila a qualquer momento.</div>' +
      '<label class="check"><input type="checkbox" name="ciente" required> <span>Li o aviso de privacidade e quero entrar na fila.</span></label>' +
      '<button class="botao" type="submit">Enviar inscrição</button></form>';
  };

  PEP.telas.inscricaoConcluida = function () {
    return '<div class="cartao"><h1>Inscrição recebida</h1>' +
      '<p>A equipe da clínica-escola vai entrar em contato pelo telefone ou e-mail informado.</p>' +
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
      '<div class="cartao"><h2>Regras que seguimos</h2><ul>' +
      '<li>Estagiário vê só os casos em que está alocado; supervisor, só os dos seus grupos; direção do curso, só indicadores.</li>' +
      '<li>Evolução validada não se edita nem se apaga: correção só por adendo.</li>' +
      '<li>Registro e documentos com identificação e assinatura do estagiário e do supervisor.</li>' +
      '<li>O paciente tem direito de acesso ao próprio prontuário.</li>' +
      '<li>Testes psicológicos e orientações de supervisão ficam fora do prontuário.</li></ul>' +
      '<p class="suave pequeno">Referências: Resoluções CFP 05/2025 e 01/2009, Código de Ética Profissional do Psicólogo e LGPD.</p></div>' +
      '<div class="cartao"><h2>ODS (ONU)</h2><p><strong>ODS 3 — Saúde e bem-estar:</strong> mais continuidade no cuidado em saúde mental. ' +
      '<strong>ODS 4 — Educação de qualidade:</strong> formação supervisionada dos estudantes de Psicologia.</p></div>' +
      '<div class="aviso alerta"><strong>O que é simulado:</strong> login, permissões e banco de dados rodam no navegador, só para demonstração. ' +
      'Autenticação real, servidor, banco de dados e criptografia são as próximas etapas.</div>';
  };
})();
