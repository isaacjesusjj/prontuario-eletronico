/* =========================================================
   telas-legal.js — aviso de privacidade, termos de uso,
   declaração de acessibilidade e matriz "regras e leis".
   Normas conferidas em nov/2026. O protótipo não substitui
   parecer jurídico nem a orientação do CRP: os pontos marcados
   "a validar" dependem da instituição.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;
PEP.telas = PEP.telas || {};

(function () {
  var esc = function (t) { return PEP.util.esc(t); };

  function tabela(cabecalho, linhas, legenda) {
    return '<div class="tabela-rolagem"><table>' + (legenda ? '<caption class="sr-only">' + esc(legenda) + '</caption>' : '') +
      '<thead><tr>' + cabecalho.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr>' + l.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }

  PEP.telas.privacidade = function () {
    var cfg = PEP.config(), inst = cfg.instituicao, R = cfg.regras;
    return '<h1>Aviso de privacidade</h1>' +
      '<p class="suave">Versão ' + esc(cfg.termos.privacidade) + ' · vigente desde ' + PEP.util.formatarData(cfg.termos.vigenciaDesde) + '. Protótipo acadêmico: nomes da instituição e do encarregado são fictícios.</p>' +
      '<div class="cartao"><h2>1. Quem cuida dos seus dados</h2><p><strong>Controlador:</strong> ' + esc(inst.controlador) + ', responsável pela ' + esc(inst.nome) + '.</p>' +
      '<p id="encarregado"><strong>Encarregado de dados (DPO):</strong> ' + esc(inst.encarregado.nome) + ' · ' + esc(inst.encarregado.email) + ' (LGPD, art. 41).</p></div>' +
      '<div class="cartao"><h2>2. Que dados usamos, para quê e com qual base legal</h2>' +
      tabela(['Momento', 'Dados', 'Para quê', 'Base legal (LGPD)'], [
        ['Fila de espera', 'Nome, nascimento, CPF, telefone, e-mail (opcional), responsável, resumo do motivo, período', 'Organizar a fila, entrar em contato e evitar inscrição duplicada', 'Tutela da saúde (art. 7º, VIII, e art. 11, II, "f")'],
        ['Atendimento (prontuário)', 'Identificação, avaliação de demanda, anamnese, evoluções, documentos emitidos, encerramento', 'Prestar o atendimento psicológico e registrá-lo', 'Tutela da saúde (art. 11, II, "f") e obrigação regulatória de manter prontuário (art. 11, II, "a"; Res. CFP 05/2025, arts. 11 e 12)'],
        ['Supervisão do estágio', 'Orientações da supervisão, ligadas ao caso', 'Formação supervisionada exigida para o serviço-escola', 'Obrigação regulatória (art. 11, II, "a"). Discussão em supervisão em grupo: consentimento específico (art. 11, I)'],
        ['Gravação de sessões', 'Áudio ou vídeo da sessão', 'Supervisão', 'Consentimento específico e revogável (art. 11, I; Código de Ética, art. 14)'],
        ['Ensino e pesquisa', 'Caso sem identificação', 'Aulas e estudos', 'Consentimento (art. 11, I) e, em pesquisa, aprovação em Comitê de Ética'],
        ['Lembretes', 'Telefone ou e-mail', 'Avisar data e hora da sessão, sem conteúdo clínico', 'Consentimento (art. 7º, I), que pode ser revogado a qualquer momento'],
        ['Contas da equipe', 'Nome, matrícula, e-mail, CRP, registros de acesso', 'Login, controle de acesso e segurança', 'Obrigação legal (art. 7º, II; Marco Civil da Internet, art. 15) e legítimo interesse na segurança (art. 7º, IX)'],
        ['Auditoria', 'Quem fez qual ação, quando e em qual caso (sem conteúdo clínico)', 'Provar quem acessou o quê e detectar acesso indevido', 'Obrigação de manter medidas de segurança (art. 46) e de registrar as operações (art. 37)']
      ], 'Dados, finalidades e bases legais') +
      '<p class="suave pequeno">Coletamos só o necessário para cada finalidade (princípio da necessidade, art. 6º, III). O formulário público não informa se um CPF já tem cadastro, para não revelar quem é atendido aqui.</p></div>' +
      '<div class="cartao"><h2>3. Com quem compartilhamos</h2><ul>' +
      '<li>Dentro da clínica: só a equipe do seu caso (estagiários da dupla ou trio e supervisor) e a psicóloga técnica responsável. A direção do curso vê apenas números agregados.</li>' +
      '<li>Fornecedor de infraestrutura (operador): banco de dados em nuvem com servidores em São Paulo, sob contrato que proíbe outros usos.</li>' +
      '<li>Autoridades, só quando a lei obrigar (por exemplo, notificação compulsória de violência — ECA, art. 13; Lei 13.819/2019).</li>' +
      '<li>Não vendemos dados, não usamos para publicidade e o site não tem rastreadores nem análise de navegação.</li></ul></div>' +
      '<div class="cartao"><h2>4. Por quanto tempo guardamos</h2>' +
      tabela(['Dado', 'Prazo', 'Fundamento'], [
        ['Prontuário', 'Mínimo de ' + R.guardaMinimaCfpAnos + ' anos; a instituição adota ' + R.guardaProntuarioAnos + ' anos desde o último registro', 'Res. CFP 05/2025, art. 18; Lei 13.787/2018, art. 6º (a validar com o jurídico)'],
        ['Registros de acesso ao site', 'Mínimo de 6 meses', 'Marco Civil da Internet, art. 15'],
        ['Auditoria do prontuário', 'Pelo mesmo prazo do prontuário', 'Prova de integridade e de acesso (LGPD, arts. 37 e 46)'],
        ['Inscrição que não virou atendimento', '12 meses depois de sair da fila, depois eliminada (proposta a validar)', 'Necessidade (art. 6º, III) e término do tratamento (art. 15)'],
        ['Registro de incidentes de segurança', 'Mínimo de 5 anos', 'Res. CD/ANPD 15/2024']
      ], 'Prazos de guarda') + '</div>' +
      '<div class="cartao"><h2>5. Seus direitos</h2><p>Você pode pedir: confirmação de que tratamos seus dados, acesso, correção, anonimização ou eliminação do que for desnecessário, portabilidade, informação sobre compartilhamento e revogação de consentimentos (LGPD, art. 18). ' +
      'Pacientes fazem isso em <strong>Meus dados (LGPD)</strong>; qualquer pessoa pode escrever ao encarregado. Respondemos em até ' + R.prazoRespostaTitularDias + ' dias (art. 19, II). Você também pode reclamar à ANPD (art. 18, § 1º).</p>' +
      '<p>O prontuário é de acesso irrestrito ao próprio paciente ou a quem ele autorizar formalmente (Res. CFP 05/2025, art. 13). A eliminação do prontuário tem limite: ele precisa ser guardado pelo prazo da seção 4 (LGPD, art. 16, I).</p></div>' +
      '<div class="cartao"><h2>6. Crianças e adolescentes</h2><p>Dados de crianças e adolescentes são tratados no melhor interesse deles (LGPD, art. 14), com participação do responsável legal na inscrição e no atendimento. A ANPD admite as bases legais dos arts. 7º e 11 para esse público, desde que prevaleça o melhor interesse (Enunciado CD/ANPD nº 1/2023). Ao responsável, a equipe comunica só o essencial para o cuidado (Código de Ética, art. 13).</p></div>' +
      '<div class="cartao"><h2>7. Como protegemos</h2><ul>' +
      '<li>Conexão criptografada (https); senhas guardadas só como hash com sal; bloqueio depois de tentativas erradas; sessão que encerra por inatividade.</li>' +
      '<li>Acesso ligado ao vínculo de estágio: quando o semestre termina, o acesso do estagiário acaba.</li>' +
      '<li>Registro imutável de acessos (auditoria com cadeia de hash) e evoluções que não podem ser alteradas depois de validadas.</li>' +
      '<li>Em caso de incidente com risco relevante, comunicamos a ANPD e as pessoas afetadas em até 3 dias úteis (Res. CD/ANPD 15/2024).</li></ul></div>' +
      '<div class="cartao"><h2>8. O que fica guardado no seu navegador</h2><p>Sem cookies de rastreamento. O site usa o armazenamento do navegador só para funcionar: a sessão de login (apagada ao fechar a aba), as preferências de acessibilidade e, neste protótipo, os dados fictícios de demonstração. As fontes são servidas pelo próprio site; o tradutor de Libras (VLibras, do Governo Federal) só é carregado se você pedir.</p></div>' +
      '<div class="cartao"><h2>9. Mudanças neste aviso</h2><p>Mudanças relevantes geram nova versão, com data, e são avisadas no próximo acesso. Consulte também os <a href="#/termos">termos de uso</a> e o <a href="https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf" target="_blank" rel="noopener">Código de Ética Profissional do Psicólogo</a>.</p></div>';
  };

  PEP.telas.termos = function () {
    var cfg = PEP.config();
    return '<h1>Termos de uso</h1><p class="suave">Versão ' + esc(cfg.termos.uso) + ' · vigente desde ' + PEP.util.formatarData(cfg.termos.vigenciaDesde) + '.</p>' +
      '<div class="cartao"><h2>1. O que é o Vínculo</h2><p>Sistema de prontuário eletrônico da ' + esc(cfg.instituicao.nome) + ', usado pela equipe (estagiários, supervisores, psicólogos técnicos e direção do curso) e pelos pacientes, cada um com acesso próprio.</p>' +
      '<div class="aviso perigo pequeno"><strong>Não é canal de emergência.</strong> Em situação de risco, ligue 192 (SAMU), 188 (CVV, 24 horas) ou procure a UPA mais próxima. Mensagens no sistema não são acompanhadas em tempo real.</div></div>' +
      '<div class="cartao"><h2>2. Sua conta</h2><ul><li>A conta é pessoal e intransferível. Não compartilhe sua senha.</li>' +
      '<li>Senha provisória deve ser trocada no primeiro acesso. A senha precisa ter pelo menos ' + PEP.regra('senhaMinimo') + ' caracteres.</li>' +
      '<li>A sessão encerra depois de ' + PEP.regra('inatividadeMinutos') + ' minutos sem uso. Saia sempre ao terminar, principalmente em computador compartilhado.</li></ul></div>' +
      '<div class="cartao"><h2>3. Regras para a equipe</h2><ul>' +
      '<li>Acesse só os casos e dados necessários para a sua função. Todo acesso é registrado.</li>' +
      '<li>Mantenha sigilo, inclusive depois do fim do estágio (Código de Ética, art. 9º). Aceite o termo de responsabilidade antes do primeiro acesso (Res. CFP 05/2025, art. 10, III).</li>' +
      '<li>Não copie, fotografe nem envie dados de pacientes por canais fora do sistema.</li>' +
      '<li>Registre de forma técnica e respeitosa: o paciente pode ler o prontuário.</li>' +
      '<li>Evolução validada não se altera; correção é feita por adendo, com autor, data e motivo.</li></ul></div>' +
      '<div class="cartao"><h2>4. Para pacientes</h2><ul><li>Você pode confirmar sessões, pedir cópia do prontuário e fazer pedidos sobre seus dados.</li>' +
      '<li>Falta avisada com antecedência não conta como abandono.</li><li>Seus direitos estão no <a href="#/privacidade">aviso de privacidade</a>.</li></ul></div>' +
      '<div class="cartao"><h2>5. Uso indevido</h2><p>Acesso sem necessidade, compartilhamento de senha ou vazamento podem levar ao bloqueio da conta, a medidas disciplinares da instituição e à responsabilização prevista em lei (LGPD, art. 42).</p></div>';
  };

  PEP.telas.acessibilidade = function () {
    return '<h1>Declaração de acessibilidade</h1>' +
      '<div class="cartao"><h2>Compromisso</h2><p>O Vínculo busca a <strong>conformidade regular da ABNT NBR 17225:2025</strong> (acessibilidade em conteúdo e aplicações web), que corresponde aos critérios de sucesso de níveis A e AA da WCAG 2.2. A acessibilidade em sites é obrigatória pela Lei Brasileira de Inclusão (Lei 13.146/2015, art. 63).</p></div>' +
      '<div class="cartao"><h2>Recursos disponíveis</h2><ul>' +
      '<li><strong>A− / A+</strong> no topo: muda o tamanho do texto (até 150%), sem quebrar o layout.</li>' +
      '<li><strong>Contraste</strong>: tema de alto contraste.</li>' +
      '<li><strong>Libras</strong>: carrega o VLibras, tradutor do Governo Federal.</li>' +
      '<li>Link "Pular para o conteúdo" como primeiro item da página (tecla Tab).</li>' +
      '<li>Todas as funções funcionam pelo teclado, com foco sempre visível.</li>' +
      '<li>Cada tela tem título próprio na aba e um título principal (h1); a mudança de tela é anunciada.</li>' +
      '<li>Campos com rótulo; erros aparecem embaixo do campo, ligados a ele, e o foco vai para o primeiro erro.</li>' +
      '<li>Login aceita colar a senha e gerenciador de senhas (WCAG 2.2, critério 3.3.8).</li>' +
      '<li>Aviso um minuto antes de a sessão encerrar por inatividade, com botão para continuar.</li>' +
      '<li>Botões com área de toque de pelo menos 24 × 24 px (WCAG 2.2, critério 2.5.8).</li>' +
      '<li>Respeita a configuração "reduzir movimento" do sistema operacional.</li></ul></div>' +
      '<div class="cartao"><h2>Como testamos</h2><p>Teste automático com <strong>axe-core</strong> em todas as telas de todos os perfis, a cada mudança (<code>testes/testar_site.py</code>), mais navegação só pelo teclado. Teste automático encontra parte dos problemas: o próximo passo é testar com pessoas que usam leitor de tela.</p></div>' +
      '<div class="cartao"><h2>Limitações conhecidas</h2><ul><li>O VLibras depende do site do Governo Federal estar no ar.</li>' +
      '<li>A cópia do prontuário em PDF usa a impressão do navegador; o PDF gerado pode não ter marcação completa para leitor de tela.</li></ul>' +
      '<p>Encontrou uma barreira? Escreva para ' + esc(PEP.config().instituicao.encarregado.email) + ' (assunto: acessibilidade).</p></div>';
  };

  // Matriz de rastreabilidade: regra → norma → onde ver → teste
  PEP.telas.regras = function () {
    var L = [
      ['Estagiário só abre os casos da própria dupla ou trio, e só enquanto o vínculo de estágio está ativo', 'LGPD, art. 6º, III (necessidade); Código de Ética, art. 9º (sigilo)', 'Entrar como Bia e abrir um caso do Enzo; entrar como Iara (vínculo encerrado)', 'Sim'],
      ['Supervisor vê só os casos dos seus grupos; direção vê só indicadores', 'LGPD, art. 6º, III; Código de Ética, art. 9º', 'Entrar como Rafael ou Marta', 'Sim'],
      ['Evolução: rascunho → enviada → validada (assinatura do estagiário e do supervisor) → bloqueada; correção só por adendo', 'Res. CFP 01/2009, art. 3º; Res. CFP 05/2025, art. 19', 'Caso → Evoluções', 'Sim'],
      ['Assinatura hoje é eletrônica simples (login e senha); documentos para terceiros pedirão assinatura avançada (gov.br) ou qualificada (ICP-Brasil)', 'Lei 14.063/2020, art. 14', 'Documentos e anexos (evolução futura)', '—'],
      ['Prontuário com identificação, demanda, objetivos, evolução, encerramento e cópia dos documentos emitidos', 'Res. CFP 05/2025, art. 12', 'Caso → Resumo; cópia em PDF', 'Sim'],
      ['Paciente tem acesso irrestrito ao prontuário; o técnico organiza a entrega, não decide', 'Res. CFP 05/2025, art. 13', 'Paciente → Meu prontuário; Técnico → Acesso do paciente', 'Sim'],
      ['Testes psicológicos fora do prontuário e da cópia; só instrumentos com parecer favorável do SATEPSI', 'Res. CFP 05/2025, art. 14; Res. CFP 31/2022', 'Caso → Avaliação psicológica', 'Sim'],
      ['Registro de supervisão separado, visível só para supervisores e estagiários', 'Res. CFP 05/2025, art. 17', 'Caso → Supervisão', 'Sim'],
      ['Termo de responsabilidade no primeiro acesso; usuário informado sobre o direito de acesso ao prontuário; Código de Ética disponível', 'Res. CFP 05/2025, art. 10, I, III e IV', 'Primeiro acesso da Bia; painel do paciente', 'Sim'],
      ['Guarda do prontuário: mínimo de 5 anos; instituição adota 20 (parametrizável)', 'Res. CFP 05/2025, art. 18; Lei 13.787/2018, art. 6º', '_config.regras no JSON', '—'],
      ['Gravação e observação informadas desde o início, com consentimento por finalidade, revogável e com histórico', 'Código de Ética, art. 14; LGPD, arts. 8º, § 5º, e 11, I', 'Triagem; Caso → Resumo; Paciente → Meus dados', 'Sim'],
      ['Menor de idade só com responsável legal; ao responsável, o essencial', 'Código de Ética, arts. 8º e 13; LGPD, art. 14; Enunciado CD/ANPD 1/2023', 'Fila de espera; caso c04', 'Sim'],
      ['Duas faltas seguidas sem justificativa abrem o fluxo de contato e motivo antes de liberar a vaga', 'Requisito do cliente (Etapa 1)', 'Caso c02 → Sessões', 'Sim'],
      ['Avaliação de risco registrada no caso (inclusive a vista na triagem); a supervisão dá ciência; o que foi avaliado não muda', 'Res. CFP 01/2009, art. 3º; Código de Ética, art. 17 (deveres do supervisor)', 'Caso → Risco e segurança; painel do supervisor', 'Sim'],
      ['Notificação compulsória feita e registrada pelo supervisor, com o órgão, o fundamento e o prazo à vista', 'Res. CFP 05/2025, art. 7º, III; ECA, arts. 13 e 245; Lei 13.819/2019, art. 6º; Lei 10.778/2003; Estatuto da Pessoa Idosa, art. 19; LBI, art. 26', 'Caso c04 → Risco e segurança', 'Sim'],
      ['Plano de segurança feito com o paciente, em versões, e disponível para ele no portal', 'Res. CFP 05/2025, art. 13 (acesso do usuário ao prontuário)', 'Caso c03 → Risco e segurança; Paciente → Meu plano de segurança', 'Sim'],
      ['Na cópia entregue ao responsável de criança ou adolescente, relato de violência e notificação ficam de fora', 'Código de Ética, art. 13 (ao responsável, o estritamente essencial)', 'Cópia em PDF do caso c04', 'Sim'],
      ['Encerramento: abandono só pelo fluxo de faltas; encaminhamento registra o serviço de destino; evolução pendente impede encerrar', 'Res. CFP 05/2025, art. 12 (encaminhamento ou encerramento no prontuário)', 'Caso → Encerramento', 'Sim'],
      ['Data e hora de cada registro e assinatura vêm do relógio do servidor; o hash da assinatura confere com o texto', 'LGPD, art. 46 (integridade); Lei 14.063/2020', 'banco/schema.sql (carimbo de tempo)', 'Sim (banco)'],
      ['Técnica fora da equipe do caso só abre o conteúdo clínico depois de registrar o motivo (vale 12 horas); cadastro e agenda continuam acessíveis', 'LGPD, art. 6º, III (necessidade); Código de Ética, art. 9º; Res. CFP 05/2025, art. 13', 'Técnica → Casos → qualquer caso ativo', 'Sim (site e banco)'],
      ['"Quem acessou o seu prontuário": o paciente vê quem acessou, quando e o motivo da técnica; para criança ou adolescente, só categorias e sem o motivo', 'LGPD, arts. 9º e 18; Código de Ética, art. 13', 'Paciente → Meus dados (LGPD)', 'Sim (site e banco)'],
      ['Modo discreto (iniciais e código no lugar de nomes; contatos ocultos) e "Cobrir tela"', 'Código de Ética, art. 9º (sigilo); LGPD, art. 46', 'Topo da tela, para quem está logado', 'Sim'],
      ['Revisor de escrita aponta juízo de valor, linguagem estigmatizante, dado que identifica alguém e falta de intervenção ou plano; não corrige nem bloqueia; regras no JSON, sem IA e sem o texto sair do navegador', 'Res. CFP 05/2025, art. 13 (o paciente pode ler); LGPD, art. 6º, III; Código de Ética, art. 17', 'Caso c03 → Evoluções (evolução devolvida da Duda)', 'Sim'],
      ['CPF validado (dígitos verificadores) e conferido contra cadastros, sem revelar no formulário público', 'LGPD, arts. 6º, V (qualidade dos dados) e 46', 'Fila de espera; Triagem da inscrição i05', 'Sim'],
      ['Direitos do titular: confirmação, acesso, correção, compartilhamento, eliminação, revogação; resposta em até 15 dias', 'LGPD, arts. 18 e 19, II', 'Paciente → Meus dados; Técnico → Pedidos LGPD', 'Sim'],
      ['Aviso de privacidade com finalidade e base legal de cada tratamento', 'LGPD, arts. 7º, 9º e 11', 'Rodapé → Aviso de privacidade', '—'],
      ['Senha: mínimo de 15 caracteres, sem regras de composição, bloqueio de senhas comuns; hash PBKDF2 com sal', 'NIST SP 800-63B-4 (2025); OWASP; LGPD, art. 46', 'Minha conta → Trocar senha', 'Sim'],
      ['Bloqueio depois de 5 tentativas; mensagem genérica; sessão encerra por inatividade', 'LGPD, art. 46; OWASP ASVS', 'Tela de login', 'Sim'],
      ['Auditoria de acessos com cadeia de hash, sem conteúdo clínico', 'LGPD, arts. 37 e 46; Marco Civil, art. 15', 'Técnico → Auditoria → Verificar integridade', 'Sim'],
      ['Anexos: só PDF, JPG ou PNG até 2 MB, conferindo o conteúdo do arquivo, com hash', 'LGPD, art. 46', 'Caso → Documentos e anexos', 'Sim'],
      ['Lembretes sem nome do serviço, do profissional ou conteúdo clínico, só com autorização', 'Código de Ética, art. 9º; LGPD, art. 7º, I', 'Caso → Sessões', 'Sim'],
      ['Incidente com risco relevante comunicado à ANPD e aos titulares em até 3 dias úteis', 'LGPD, art. 48; Res. CD/ANPD 15/2024', 'Plano de resposta (docs)', '—'],
      ['Acessibilidade nível AA', 'Lei 13.146/2015, art. 63; ABNT NBR 17225:2025 (WCAG 2.2)', 'Barra no topo; Declaração de acessibilidade', 'Sim (axe-core)'],
      ['Limite de estagiários por grupo de orientação vira só alerta configurável', 'Res. CFP 05/2025, art. 5º — suspenso por liminar do STF (ADI 7911)', 'Painel do supervisor', '—']
    ];
    return '<h1>Regras e leis</h1><p class="suave">Cada regra do sistema, a norma de onde ela vem, onde ver na tela e se há teste automático. Normas conferidas em novembro de 2026; o que depende da instituição está marcado "a validar" no aviso de privacidade.</p>' +
      '<div class="cartao">' + tabela(['Regra no sistema', 'Norma', 'Onde ver', 'Teste automático'], L.map(function (l) { return l.map(esc); }), 'Matriz de regras, normas e telas') + '</div>' +
      '<div class="aviso info pequeno">O protótipo não substitui parecer jurídico nem a orientação do Conselho Regional de Psicologia.</div>';
  };
})();
