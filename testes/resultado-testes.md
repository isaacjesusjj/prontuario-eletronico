# Resultado dos testes do site

Gerado por `testes/testar_site.py` em 09/11/2026 18:53, no Chrome (Playwright), com axe-core 4.14.0.

**389 de 389 verificações passaram.** Acessibilidade: 73 telas conferidas (WCAG 2.0/2.1/2.2, níveis A e AA).

| Área | Passaram | Falharam |
|---|---|---|
| Público | 3 | 0 |
| Acessibilidade | 82 | 0 |
| LGPD | 14 | 0 |
| Validadores | 11 | 0 |
| CPF | 6 | 0 |
| Auditoria | 8 | 0 |
| Senha | 15 | 0 |
| Permissões | 7 | 0 |
| Evolução | 8 | 0 |
| Anamnese | 1 | 0 |
| Sessões | 5 | 0 |
| Sala | 3 | 0 |
| Lembretes | 3 | 0 |
| Encerramento | 5 | 0 |
| Abandono | 2 | 0 |
| Anexos | 4 | 0 |
| Agenda | 4 | 0 |
| Triagem | 1 | 0 |
| Cadastro | 6 | 0 |
| Alocação | 1 | 0 |
| Acesso do paciente | 4 | 0 |
| Paciente | 1 | 0 |
| Indicadores | 1 | 0 |
| Importação | 3 | 0 |
| Rodízio | 4 | 0 |
| Sessão | 4 | 0 |
| Demonstração | 2 | 0 |
| Celular | 18 | 0 |
| Identidade | 4 | 0 |
| Painel | 1 | 0 |
| Caso | 4 | 0 |
| Menu da conta | 5 | 0 |
| Pedidos | 1 | 0 |
| Computador | 1 | 0 |
| Créditos | 3 | 0 |
| Clareza | 3 | 0 |
| Libras | 3 | 0 |
| Risco | 17 | 0 |
| Revisor | 8 | 0 |
| Privacidade | 15 | 0 |
| Urgência | 5 | 0 |
| Faltas | 5 | 0 |
| Prazo | 1 | 0 |
| Contas | 7 | 0 |
| Duas etapas | 20 | 0 |
| Transição | 15 | 0 |
| Acesso | 3 | 0 |
| Busca | 2 | 0 |
| Documentos | 12 | 0 |
| Comunicações | 7 | 0 |
| Gráfico | 7 | 0 |
| Banco (simulado) | 13 | 0 |
| Console | 1 | 0 |

## Todas as verificações

| | Área | Verificação | Detalhe |
|---|---|---|---|
| ✓ | Público | página inicial abre e o título da aba é neutro | Entrar — Vinculum · Prontuário da Clínica-Escola |
| ✓ | Acessibilidade | primeiro Tab vai para 'Pular para o conteúdo' |  |
| ✓ | Acessibilidade | o link de pular leva o foco ao conteúdo |  |
| ✓ | Acessibilidade | Visitante · Entrar: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Visitante · Fila de espera: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Visitante · Sobre: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Visitante · Aviso de privacidade: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Visitante · Termos de uso: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Visitante · Acessibilidade: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Visitante · Regras e leis: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Visitante · Link inválido: sem violações WCAG A/AA |  |
| ✓ | Público | link de leitura inexistente mostra 'Link indisponível' |  |
| ✓ | Público | nenhum recurso de terceiros carregado na abertura | fontes servidas pelo próprio site |
| ✓ | LGPD | formulário público avisa que é protótipo (nenhuma clínica recebe a inscrição) e indica a rede |  |
| ✓ | Validadores | fila: enviar vazio marca os campos obrigatórios | 6 campos |
| ✓ | Acessibilidade | erro ligado ao campo por aria-describedby |  |
| ✓ | Acessibilidade | o foco vai para o primeiro campo com erro |  |
| ✓ | Validadores | CPF com dígito verificador errado é recusado |  |
| ✓ | Validadores | telefone incompleto é recusado |  |
| ✓ | Validadores | máscara de CPF aplicada na digitação |  |
| ✓ | CPF | CPF já cadastrado: o formulário público mostra a mesma mensagem de sucesso (não revela) |  |
| ✓ | CPF | a duplicidade fica marcada só para a equipe | {"tipo": "paciente", "id": "p05"} |
| ✓ | LGPD | menor de 18: exige responsável e autorização dele |  |
| ✓ | Validadores | 'Não tenho CPF' desativa o campo de CPF |  |
| ✓ | LGPD | menor com responsável autorizado entra na fila |  |
| ✓ | Auditoria | inscrição registrada na auditoria sem nome (só o id) |  |
| ✓ | Senha | nenhuma senha guardada em texto; todas como hash PBKDF2 com 600 mil iterações |  |
| ✓ | Senha | senha errada: mensagem genérica (não diz se errou usuário ou senha) |  |
| ✓ | Senha | 5 erros bloqueiam o login, mesmo com a senha certa depois |  |
| ✓ | Auditoria | tentativas registradas sem gravar a senha digitada |  |
| ✓ | LGPD | primeiro acesso: termo de sigilo antes de tudo (Res. CFP 05/2025, art. 10, III) |  |
| ✓ | LGPD | sem aceitar o termo, não navega |  |
| ✓ | LGPD | aceitar exige marcar a caixa |  |
| ✓ | LGPD | aceite registrado com versão e data |  |
| ✓ | Senha | sessão fica no sessionStorage (acaba ao fechar a aba) |  |
| ✓ | Acessibilidade | Estagiária Bia · Painel: sem violações WCAG A/AA |  |
| ✓ | Permissões | estagiária vê só os casos da própria dupla |  |
| ✓ | Permissões | caso de outra dupla: acesso negado |  |
| ✓ | Auditoria | tentativa negada fica na auditoria |  |
| ✓ | Acessibilidade | Estagiária Bia · Caso · resumo: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Estagiária Bia · Caso · evolucoes: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Estagiária Bia · Caso · sessoes: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Estagiária Bia · Caso · documentos: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Estagiária Bia · Caso · restrita: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Estagiária Bia · Caso · supervisao: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Estagiária Bia · Caso · encerramento: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | título da aba no prontuário não leva nome do paciente | Prontuário — Vinculum · Prontuário da Clínica-Escola |
| ✓ | Evolução | contador mostra os caracteres usados e o limite |  |
| ✓ | Validadores | evolução muito curta é recusada |  |
| ✓ | Validadores | evolução acima do limite de caracteres é recusada |  |
| ✓ | Evolução | estagiária assina e envia à supervisão |  |
| ✓ | Evolução | a assinatura guarda o hash SHA-256 do texto assinado |  |
| ✓ | Validadores | anamnese sem objetivos é recusada |  |
| ✓ | Anamnese | editar cria a versão 3 e guarda as anteriores |  |
| ✓ | Sessões | presença registrada na sessão de hoje |  |
| ✓ | Sessões | presença em sessão futura é recusada |  |
| ✓ | Sala | agendamento sem sala é recusado |  |
| ✓ | Sessões | agendamento no mesmo horário da dupla é recusado |  |
| ✓ | Sessões | sessão que se sobrepõe a outra da dupla (cada uma ocupa 50 min) é recusada |  |
| ✓ | Validadores | horário fora do funcionamento é recusado |  |
| ✓ | Sala | a mesma sala não recebe duas sessões que se sobrepõem, mesmo de duplas diferentes |  |
| ✓ | Sessões | agendamento válido (com a sala) |  |
| ✓ | Lembretes | lembrete abre o WhatsApp com o número do paciente | https://wa.me/5511900000001?text=Ol%C3%A1!%20Lembrete%3A%20v |
| ✓ | Lembretes | a mensagem não tem nome do paciente, do serviço nem conteúdo clínico |  |
| ✓ | Lembretes | lembrete registrado (quem, quando, canal) |  |
| ✓ | Encerramento | com evolução aguardando a supervisão, encerrar fica bloqueado e a tela diz por quê |  |
| ✓ | Encerramento | abandono não aparece no encerramento manual (só pelo fluxo de faltas) |  |
| ✓ | Encerramento | a tela mostra até quando o prontuário fica guardado |  |
| ✓ | Abandono | liberar a vaga sem tentativa de contato é recusado |  |
| ✓ | Abandono | com o contato registrado, o caso é encerrado por abandono com o motivo informado |  |
| ✓ | Anexos | arquivo renomeado para .pdf é recusado (confere o conteúdo, não só a extensão) |  |
| ✓ | Anexos | arquivo acima de 2 MB é recusado |  |
| ✓ | Anexos | PDF válido guardado com hash e nome seguro |  |
| ✓ | Anexos | anexo abre do armazenamento do navegador |  |
| ✓ | Agenda | visão de semana |  |
| ✓ | Acessibilidade | Estagiária Bia · Agenda · semana: sem violações WCAG A/AA |  |
| ✓ | Agenda | visão de mês |  |
| ✓ | Acessibilidade | Estagiária Bia · Agenda · mês: sem violações WCAG A/AA |  |
| ✓ | Agenda | visão de dia |  |
| ✓ | Acessibilidade | Estagiária Bia · Agenda · dia: sem violações WCAG A/AA |  |
| ✓ | Agenda | navegar para o próximo dia |  |
| ✓ | Acessibilidade | Estagiária Bia · Minha conta: sem violações WCAG A/AA |  |
| ✓ | Senha | senha curta e comum é recusada |  |
| ✓ | Senha | senha com o próprio usuário é recusada |  |
| ✓ | Senha | medidor mostra a força da senha enquanto digita |  |
| ✓ | Senha | entra com a senha nova (frase, sem símbolo obrigatório) |  |
| ✓ | Acessibilidade | Supervisora Helena · Validação: sem violações WCAG A/AA |  |
| ✓ | Evolução | devolver exige comentário |  |
| ✓ | Evolução | supervisora valida e assina |  |
| ✓ | Evolução | evolução validada não tem mais campo de edição |  |
| ✓ | Evolução | correção depois de validada só por adendo; o texto original fica intacto |  |
| ✓ | Permissões | supervisora não abre caso de outro grupo |  |
| ✓ | Permissões | supervisora vê o registro de supervisão do seu grupo |  |
| ✓ | Encerramento | encaminhamento sem o serviço de destino é recusado |  |
| ✓ | Encerramento | encaminhamento com destino encerra o caso e mostra para onde o paciente foi |  |
| ✓ | Acessibilidade | Supervisora Helena · Painel: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Supervisora Helena · Duplas e trios: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Supervisora Helena · Indicadores: sem violações WCAG A/AA |  |
| ✓ | CPF | fila sinaliza a inscrição com CPF já cadastrado |  |
| ✓ | Acessibilidade | Técnica Ana · Fila de espera: sem violações WCAG A/AA |  |
| ✓ | Permissões | técnica não vê o registro de supervisão (fica fora do prontuário) |  |
| ✓ | CPF | triagem avisa que o CPF já é de um paciente |  |
| ✓ | Acessibilidade | Técnica Ana · Triagem: sem violações WCAG A/AA |  |
| ✓ | CPF | paciente que volta: novo caso ligado ao cadastro existente, sem duplicar |  |
| ✓ | Validadores | triagem: CPF com dígitos repetidos é recusado |  |
| ✓ | LGPD | triagem: alocar sem contrato terapêutico é recusado |  |
| ✓ | Triagem | triagem cria paciente, caso ativo, anamnese v1 e um consentimento por finalidade |  |
| ✓ | LGPD | consentimento guarda data, responsável e versão do termo |  |
| ✓ | Acessibilidade | Técnica Ana · Editar cadastro: sem violações WCAG A/AA |  |
| ✓ | CPF | edição: CPF de outro paciente é recusado |  |
| ✓ | Validadores | edição: telefone inválido é recusado |  |
| ✓ | Cadastro | edição válida salva e vai para a auditoria sem os valores |  |
| ✓ | Acessibilidade | Técnica Ana · Alocação: sem violações WCAG A/AA |  |
| ✓ | LGPD | caso sem contrato terapêutico não é alocado |  |
| ✓ | Alocação | com o contrato registrado, o caso é alocado |  |
| ✓ | Auditoria | verificação: cadeia íntegra |  |
| ✓ | Acessibilidade | Técnica Ana · Auditoria: sem violações WCAG A/AA |  |
| ✓ | Auditoria | adulterar um evento pelo F12 é detectado |  |
| ✓ | Acessibilidade | Técnica Ana · Pedidos LGPD: sem violações WCAG A/AA |  |
| ✓ | LGPD | técnica responde pedido do titular (art. 18) |  |
| ✓ | Acessibilidade | Técnica Ana · Painel: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Técnica Ana · Indicadores: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Técnica Ana · Acesso do paciente: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Técnica Ana · Casos: sem violações WCAG A/AA |  |
| ✓ | Acesso do paciente | link temporário gerado; o sistema guarda só o hash do token |  |
| ✓ | Acesso do paciente | data de nascimento errada não abre o prontuário |  |
| ✓ | Acesso do paciente | com a data certa, o paciente lê a cópia |  |
| ✓ | Acesso do paciente | a cópia não traz supervisão, testes nem rascunho (Res. CFP 05/2025, arts. 14 e 17) |  |
| ✓ | Acessibilidade | Paciente · Painel: sem violações WCAG A/AA |  |
| ✓ | Paciente | paciente confirma presença |  |
| ✓ | Acessibilidade | Paciente · Meus dados: sem violações WCAG A/AA |  |
| ✓ | LGPD | paciente revoga lembretes; vira novo registro (histórico preservado) |  |
| ✓ | LGPD | contrato terapêutico não tem botão de revogar para o paciente |  |
| ✓ | LGPD | paciente faz pedido de titular com prazo |  |
| ✓ | Acessibilidade | Paciente · Minhas sessões: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Paciente · Meu prontuário: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Paciente · Minha conta: sem violações WCAG A/AA |  |
| ✓ | Permissões | paciente não navega no prontuário (recebe cópia) |  |
| ✓ | Indicadores | direção vê indicadores agregados |  |
| ✓ | Acessibilidade | Direção Marta · Indicadores: sem violações WCAG A/AA |  |
| ✓ | Permissões | direção não navega em prontuários |  |
| ✓ | Acessibilidade | Direção Marta · Estudantes: sem violações WCAG A/AA |  |
| ✓ | Importação | conferência aponta matrícula repetida e e-mail inválido |  |
| ✓ | Importação | conta criada com senha provisória (mostrada uma vez) |  |
| ✓ | Acessibilidade | Direção Marta · Grupos de estágio: sem violações WCAG A/AA |  |
| ✓ | Rodízio | direção encerra o vínculo de estágio do Caio |  |
| ✓ | Senha | senha provisória obriga a trocar no primeiro acesso |  |
| ✓ | Senha | sem trocar a senha provisória, não navega |  |
| ✓ | Importação | estudante importada chega ao painel sem grupo e sem casos |  |
| ✓ | Rodízio | com o vínculo encerrado, Caio não vê mais nenhum caso |  |
| ✓ | Rodízio | e não abre o caso que atendia |  |
| ✓ | Rodízio | estagiária do semestre passado entra, mas sem acesso a casos |  |
| ✓ | Sessão | aviso 1 minuto antes de encerrar por inatividade (WCAG 2.2.1) |  |
| ✓ | Sessão | botão 'Continuar conectado' mantém a sessão |  |
| ✓ | Sessão | sem uso por 15 minutos, a sessão encerra e avisa o motivo |  |
| ✓ | Demonstração | em 03/12/2026 os dados andam 27 dias e a sessão 'de hoje' cai no dia |  |
| ✓ | Demonstração | data de nascimento não é deslocada |  |
| ✓ | Celular | sem rolagem lateral em #/painel | 390 |
| ✓ | Celular | sem rolagem lateral em #/agenda | 390 |
| ✓ | Celular | sem rolagem lateral em #/caso/c01/sessoes | 390 |
| ✓ | Celular | sem rolagem lateral em #/fila | 390 |
| ✓ | Acessibilidade | botão de alto contraste liga o tema e informa o estado (aria-pressed) |  |
| ✓ | Acessibilidade | Alto contraste · contraste #/painel: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Alto contraste · contraste #/caso/c01: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Alto contraste · contraste #/agenda: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | texto em 150% sem rolagem lateral |  |
| ✓ | Identidade | entrada mostra o logotipo da faculdade (servido pelo site, com texto alternativo) e o nome Vinculum |  |
| ✓ | Identidade | uma fonte só (Public Sans) em títulos e textos |  |
| ✓ | Celular | entrada sem rolagem lateral e sem barra de navegação (ainda sem login) |  |
| ✓ | Acessibilidade | sem login, o botão do topo abre as opções de acessibilidade (aria-expanded) |  |
| ✓ | Celular | barra de navegação fixa embaixo, com 4 itens e o atual marcado (aria-current) |  |
| ✓ | Celular | alvos de toque da navegação e do botão da conta com pelo menos 44 px | [44.375, 64, 64, 64, 64] |
| ✓ | Celular | o conteúdo não fica escondido atrás da barra (espaço reservado embaixo) |  |
| ✓ | Celular | sem rolagem lateral em #/painel (estagiária) | 390 |
| ✓ | Celular | sem rolagem lateral em #/casos (estagiária) | 390 |
| ✓ | Celular | sem rolagem lateral em #/caso/c01/resumo (estagiária) | 390 |
| ✓ | Celular | sem rolagem lateral em #/caso/c01/evolucoes (estagiária) | 390 |
| ✓ | Celular | sem rolagem lateral em #/agenda (estagiária) | 390 |
| ✓ | Celular | sem rolagem lateral em #/busca (estagiária) | 390 |
| ✓ | Celular | sem rolagem lateral em #/conta (estagiária) | 390 |
| ✓ | Painel | números numa linha só e pendências numa lista (sem avisos empilhados no topo) |  |
| ✓ | Acessibilidade | Navegação no celular · Celular · painel: sem violações WCAG A/AA |  |
| ✓ | Caso | a aba atual fica à vista na faixa de abas que rola para o lado |  |
| ✓ | Menu da conta | o botão da conta abre o menu com as preferências, Minha conta e Sair |  |
| ✓ | Acessibilidade | Navegação no celular · Celular · menu da conta aberto: sem violações WCAG A/AA |  |
| ✓ | Menu da conta | Esc fecha o menu e o foco volta ao botão da conta |  |
| ✓ | Menu da conta | ligar o modo discreto redesenha a tela e o menu continua aberto, com o estado à vista |  |
| ✓ | Menu da conta | clicar fora fecha o menu |  |
| ✓ | Menu da conta | "Minha conta" abre a tela da conta e fecha o menu |  |
| ✓ | Celular | quem tem mais de 5 itens vê 4 na barra e o "Mais" com o resto |  |
| ✓ | Celular | "Mais" lista Duplas e trios, Indicadores e Buscar, além da conta e das páginas informativas |  |
| ✓ | Acessibilidade | Navegação no celular · Celular · Mais: sem violações WCAG A/AA |  |
| ✓ | Celular | item que mora no "Mais" deixa o "Mais" marcado na barra |  |
| ✓ | Caso | seis abas: Resumo, Evoluções, Risco, Sessões, Documentos e Área restrita | Resumo, Evoluções, Risco, Sessões, Documentos, Área restrita |
| ✓ | Caso | o encerramento abre pelo botão no fim do Resumo, com a aba Resumo marcada |  |
| ✓ | Caso | a Área restrita junta supervisão e avaliação psicológica, com um seletor entre as duas |  |
| ✓ | Pedidos | a técnica tem um item só, "Pedidos", com cópia do prontuário e direitos LGPD lado a lado |  |
| ✓ | Computador | a navegação vira uma coluna à esquerda com os 7 itens, sem o "Mais" |  |
| ✓ | Identidade | topo verde (menos branco) e, na entrada, a marca grande fica na faixa verde (a do topo some para não repetir) |  |
| ✓ | Identidade | logotipo da Faculdade embaixo do Vinculum, menor (até 34 px de altura) e nítido em tela densa (o arquivo tem o dobro dos pixels mostrados) |  |
| ✓ | Créditos | a entrada mostra "Quem fez o Vinculum" com os três nomes do grupo | Daniel Dantas, Dilson Rodrigues, Isaac de Jesus Lima |
| ✓ | Créditos | o rodapé de toda tela traz os nomes do grupo e o logotipo branco da Faculdade |  |
| ✓ | Acessibilidade | Entrada e clareza · Celular · entrada: sem violações WCAG A/AA |  |
| ✓ | Senha | "Esqueci minha senha" abre uma tela curta que diz a quem pedir (equipe: coordenação; paciente: psicóloga técnica) |  |
| ✓ | Acessibilidade | Entrada e clareza · Esqueci minha senha: sem violações WCAG A/AA |  |
| ✓ | Senha | quem já entrou não fica na tela de "Esqueci minha senha" (volta ao início) |  |
| ✓ | Créditos | depois de entrar, o rodapé continua com os nomes do grupo e a marca volta ao topo |  |
| ✓ | Clareza | cada aba do prontuário tem uma frase dizendo o que há nela |  |
| ✓ | Clareza | no "Mais", cada item tem uma explicação curta |  |
| ✓ | Clareza | as telas principais têm uma frase logo abaixo do título explicando para que servem |  |
| ✓ | Senha | banco ligado: e-mail inválido é recusado no campo, sem chamar o servidor |  |
| ✓ | Senha | banco ligado: o pedido vai ao Supabase Auth e a resposta não revela se a conta existe |  |
| ✓ | Libras | a política de segurança libera o VLibras (gov.br e só o caminho dele no jsDelivr) e não libera o estatístico de uso (PostHog) | default-src 'self'; script-src 'self' https://vlibras.gov.br https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/; style-src 'self' 'unsafe-inline' https://vlibras.gov |
| ✓ | Libras | o item Libras abre o VLibras na hora (fecha o menu) e o avatar carrega | get_avatar, on_load_player, on_playing_state_change, update_progress |
| ✓ | Libras | nenhum pedido vai para o estatístico de uso do VLibras (PostHog) |  |
| ✓ | Acessibilidade | Risco e segurança · Caso · risco e segurança: sem violações WCAG A/AA |  |
| ✓ | Risco | a aba mostra os números de urgência (SAMU 192, CVV 188) |  |
| ✓ | Risco | avaliação sem descrição é recusada |  |
| ✓ | Risco | avaliação registrada aguardando a ciência da supervisão, com selo no cabeçalho do caso |  |
| ✓ | Risco | estagiária não vê o registro de notificação compulsória (é do supervisor) |  |
| ✓ | Risco | plano sem os campos essenciais e sem confirmar que foi feito com o paciente é recusado |  |
| ✓ | Risco | plano de segurança salvo como versão 1 |  |
| ✓ | Risco | o painel da supervisora avisa a avaliação aguardando a ciência dela |  |
| ✓ | Risco | supervisora dá ciência (quem e quando ficam registrados) |  |
| ✓ | Risco | supervisora registra a notificação compulsória, com o fundamento legal à vista |  |
| ✓ | Risco | supervisora assina o plano de segurança |  |
| ✓ | Acessibilidade | Risco e segurança · Meu plano de segurança: sem violações WCAG A/AA |  |
| ✓ | Risco | paciente lê o próprio plano de segurança no portal, com os números de urgência |  |
| ✓ | Risco | na triagem, 'risco identificado' abre os campos da avaliação |  |
| ✓ | Risco | triagem com risco exige descrever o que foi observado |  |
| ✓ | Risco | o caso já nasce com a avaliação de risco da triagem, aguardando a supervisão |  |
| ✓ | Risco | o painel da técnica destaca o caso com risco que ainda não tem grupo |  |
| ✓ | Risco | cópia de adolescente omite o relato de violência e a notificação (Código de Ética, art. 13); só a equipe é avisada |  |
| ✓ | Risco | cópia de adulto traz a avaliação de risco e o plano de segurança |  |
| ✓ | Revisor | aponta 'alega', juízo de valor, telefone e nome de terceiro no texto | duvida, juizo, identificacao, identificacao, estrutura, estrutura |
| ✓ | Revisor | registro técnico com tema, intervenção e plano não recebe apontamento |  |
| ✓ | Revisor | 'alega' não é apontado dentro de outra palavra ('alegações') |  |
| ✓ | Revisor | na evolução devolvida, o revisor aponta falta de intervenção e de plano |  |
| ✓ | Revisor | enquanto a estagiária escreve, o revisor sugere 'relata' no lugar de 'alega' |  |
| ✓ | Revisor | 'Ver como o paciente lê' mostra o texto do jeito que sai na cópia |  |
| ✓ | Acessibilidade | Revisor de escrita · Evolução com revisor e prévia: sem violações WCAG A/AA |  |
| ✓ | Revisor | o revisor não bloqueia: a estagiária decide e envia |  |
| ✓ | Revisor | na fila de validação, a supervisora vê os apontamentos para orientar |  |
| ✓ | Privacidade | técnica fora da equipe vê a capa do caso e o pedido de motivo, não o conteúdo clínico |  |
| ✓ | Privacidade | só ver a capa do caso não gera o evento 'Abriu o prontuário' |  |
| ✓ | Acessibilidade | Privacidade na tela · Motivo do acesso: sem violações WCAG A/AA |  |
| ✓ | Privacidade | sem escolher o motivo, não abre |  |
| ✓ | Privacidade | motivo 'outro' exige a descrição |  |
| ✓ | Privacidade | com o motivo, o prontuário abre e a auditoria registra o motivo |  |
| ✓ | Privacidade | a abertura com motivo é registrada uma vez só (sem evento duplicado) |  |
| ✓ | Privacidade | caso recém-triado, ainda sem grupo, abre sem pedir motivo |  |
| ✓ | Privacidade | a cópia em PDF também pede o motivo |  |
| ✓ | Privacidade | modo discreto: pacientes aparecem pelas iniciais e pelo código do caso |  |
| ✓ | Privacidade | modo discreto continua ao navegar (fila sem nomes por extenso) |  |
| ✓ | Privacidade | modo discreto oculta telefone e e-mail na identificação |  |
| ✓ | Privacidade | 'Cobrir tela' esconde tudo na hora e leva o foco para a cortina |  |
| ✓ | Acessibilidade | Privacidade na tela · Tela coberta: sem violações WCAG A/AA |  |
| ✓ | Privacidade | a tela volta como estava, sem sair do sistema |  |
| ✓ | Acessibilidade | Privacidade na tela · Meus dados com acessos: sem violações WCAG A/AA |  |
| ✓ | Privacidade | o paciente vê quem acessou o prontuário e o motivo registrado pela técnica |  |
| ✓ | Privacidade | a lista mostra a categoria da ação, não o texto interno da auditoria |  |
| ✓ | Urgência | relato com sinal de urgência mostra na hora CVV 188 e SAMU 192 (sem bloquear a inscrição) |  |
| ✓ | Urgência | relato sem sinal de urgência não mostra o alerta |  |
| ✓ | Urgência | a inscrição guarda o sinal de urgência (calculado do relato) |  |
| ✓ | Urgência | o painel da técnica avisa a inscrição urgente |  |
| ✓ | Urgência | na fila, a inscrição com sinal de urgência aparece primeiro, marcada para contato no mesmo dia |  |
| ✓ | Faltas | indicadores mostram por que o paciente avisou que não iria |  |
| ✓ | Acessibilidade | Faltas avisadas e urgência · Painel do paciente com aviso de falta: sem violações WCAG A/AA |  |
| ✓ | Faltas | o paciente avisa que não vai: vira falta justificada, com o motivo |  |
| ✓ | Faltas | o painel do paciente confirma o aviso |  |
| ✓ | Faltas | o painel da estagiária mostra a falta avisada, para oferecer outro horário |  |
| ✓ | Faltas | na aba de sessões, a equipe vê que a falta foi avisada pelo paciente e o motivo |  |
| ✓ | Prazo | o painel da estagiária mostra a evolução atrasada (mais de 48 h) |  |
| ✓ | Acessibilidade | Contas · Estudantes e contas: sem violações WCAG A/AA |  |
| ✓ | Contas | direção gera senha provisória (aparece uma vez; nos dados fica só o hash) |  |
| ✓ | Contas | direção desativa uma conta (o histórico continua) |  |
| ✓ | Contas | a direção não tem botões para a própria conta |  |
| ✓ | Contas | com a senha provisória, o primeiro acesso obriga a trocar |  |
| ✓ | Contas | conta desativada não entra (mesma mensagem genérica de senha errada) |  |
| ✓ | Contas | técnica cria o acesso do paciente ao portal (usuário a partir do e-mail, senha provisória) |  |
| ✓ | Contas | o paciente entra com a senha provisória e precisa trocá-la |  |
| ✓ | Senha | bloqueio progressivo: 30 s no 1º bloqueio e 60 s no 2º (quem tenta adivinhar fica cada vez mais lento) | Muitas tentativas sem sucesso. Aguarde 30 segundos e tente de novo. / Muitas tentativas sem sucesso. Aguarde 60 segundos e tente de novo. |
| ✓ | Sessão | o texto que estava sendo escrito vira rascunho antes de a sessão encerrar por inatividade |  |
| ✓ | Duas etapas | o código de 6 dígitos bate com os exemplos oficiais da RFC 6238 (é o mesmo que o celular calcula) | 287082, 081804, 050471, 005924, 279037, 353130 |
| ✓ | Duas etapas | ativar mostra a chave para o aplicativo autenticador (160 bits em base32) e o endereço otpauth |  |
| ✓ | Acessibilidade | Duas etapas · Minha conta · ativar duas etapas: sem violações WCAG A/AA |  |
| ✓ | Duas etapas | código errado na ativação não liga a verificação (o campo avisa) |  |
| ✓ | Duas etapas | com o código certo, liga e mostra 8 códigos de recuperação uma vez só (nos dados fica só o hash) |  |
| ✓ | Acessibilidade | Duas etapas · Minha conta · códigos de recuperação: sem violações WCAG A/AA |  |
| ✓ | Duas etapas | os códigos somem da tela depois de "Já guardei" |  |
| ✓ | Duas etapas | com a verificação ligada, a senha certa não basta: o site pede o código e ainda não entra |  |
| ✓ | Acessibilidade | Duas etapas · Entrar · código do aplicativo: sem violações WCAG A/AA |  |
| ✓ | Duas etapas | o mesmo código não entra duas vezes: o da ativação já não vale (RFC 6238, seção 5.2) | Código incorreto. Confira o aplicativo e tente de novo. |
| ✓ | Duas etapas | com o código do momento, entra |  |
| ✓ | Duas etapas | o código errado fica na auditoria, sem o código digitado |  |
| ✓ | Duas etapas | celular perdido: entra com um código de recuperação, que deixa de valer |  |
| ✓ | Duas etapas | o mesmo código de recuperação não entra de novo | Código incorreto. Confira o aplicativo e tente de novo. |
| ✓ | Duas etapas | errar o código também bloqueia por um tempo (5 erros → 30 s), como a senha | Muitas tentativas sem sucesso. Aguarde 30 segundos e tente de novo. |
| ✓ | Duas etapas | "Voltar" desiste do código e volta para usuário e senha |  |
| ✓ | Duas etapas | a direção vê quem tem a verificação ligada |  |
| ✓ | Duas etapas | celular e códigos perdidos: a direção desliga a verificação da conta (com auditoria) e a pessoa configura de novo |  |
| ✓ | Duas etapas | com a verificação desligada, entra só com a senha |  |
| ✓ | Duas etapas | obrigatória para a equipe: no primeiro acesso, configura antes de tudo (sem menu e sem atalho para outra tela) | #/configurar-mfa |
| ✓ | Acessibilidade | Duas etapas · Primeiro acesso · duas etapas obrigatórias: sem violações WCAG A/AA |  |
| ✓ | Duas etapas | configurou: os códigos de recuperação aparecem antes de seguir, e não há botão de desativar (é obrigatória) |  |
| ✓ | Duas etapas | ... e só depois de "Já guardei" segue para o termo de sigilo | #/termo |
| ✓ | Duas etapas | para o paciente, não é obrigatória (o portal precisa ser simples) |  |
| ✓ | Transição | o resumo de transferência já vem com período, sessões, demanda e objetivos tirados do prontuário | Período: de 29/08/2026 a 09/11/2026 · 7 sessões com presença · 1 falta(s), 1 justificada(s). Demanda: Dificuldade em lid |
| ✓ | Acessibilidade | Transição de semestre · Caso · resumo de transferência: sem violações WCAG A/AA |  |
| ✓ | Transição | sem completar as seções, o resumo não é enviado (o campo diz o que falta) |  |
| ✓ | Transição | completo, o resumo é assinado e enviado à supervisão (sem sessão vinculada) |  |
| ✓ | Transição | o quadro da passagem mostra o que falta; evolução esperando a validação impede (botão desligado) |  |
| ✓ | Transição | a supervisora valida o resumo de transferência como valida uma evolução |  |
| ✓ | Transição | sem resumo validado, a passagem pede justificativa e a confirmação de que o paciente foi avisado |  |
| ✓ | Transição | com a justificativa, o caso passa para a outra dupla e a passagem fica registrada |  |
| ✓ | Transição | ao encerrar o estágio, a direção é avisada de que o caso fica sem dupla ativa (só quando sai o último da dupla) | Encerrar o vínculo de estágio de Lia? O acesso aos casos termina agora.  Fica sem dupla ativa: Paciente Exemplo 02, Paciente Exemplo 03. Combine com a supervisã |
| ✓ | Transição | a técnica vê os casos sem dupla ativa na alocação |  |
| ✓ | Transição | o painel da supervisão avisa o caso sem dupla ativa (nas pendências) |  |
| ✓ | Acessibilidade | Transição de semestre · Caso · passagem do caso: sem violações WCAG A/AA |  |
| ✓ | Transição | com o resumo validado, o caso passa para a nova dupla sem pedir justificativa |  |
| ✓ | Transição | depois da passagem, o caso sai das pendências |  |
| ✓ | Transição | a nova dupla lê o resumo de transferência no prontuário |  |
| ✓ | Transição | e vê de onde o caso veio |  |
| ✓ | Transição | o resumo entra na cópia do prontuário, com o nome |  |
| ✓ | Acesso | no primeiro acesso não há aviso de último acesso |  |
| ✓ | Evolução | "Inserir modelo" põe os tópicos no texto; o segundo modelo vai para o fim, sem apagar o que foi escrito |  |
| ✓ | Busca | a busca acha o paciente da própria dupla (sem acento e sem diferenciar maiúscula) e o nome não vai para o endereço |  |
| ✓ | Acessibilidade | Cadastro, busca e auditoria · Busca de paciente: sem violações WCAG A/AA |  |
| ✓ | Busca | paciente de outra dupla não aparece na busca |  |
| ✓ | Acesso | depois do login aparecem o último acesso e as 2 tentativas sem sucesso desde então | Seu último acesso foi em 09/11/2026 15:53. Desde então, 2 tentativa(s) de entrar com o seu usuário não deram certo. Se n |
| ✓ | Acesso | o aviso de último acesso fecha |  |
| ✓ | Acessibilidade | Cadastro, busca e auditoria · Editar cadastro com contato de emergência: sem violações WCAG A/AA |  |
| ✓ | Cadastro | contato de emergência sem telefone é recusado |  |
| ✓ | Cadastro | com nome e telefone, o contato de emergência é salvo |  |
| ✓ | Cadastro | na aba de risco, o contato de emergência do paciente aparece com link de telefone |  |
| ✓ | Cadastro | no modo discreto, o contato de emergência some da tela |  |
| ✓ | Cadastro | a guarda do prontuário de quem era menor conta a partir dos 18 anos (regra configurável) | 2049-05-09 · 2049-05-09 |
| ✓ | Auditoria | o filtro da auditoria reduz a lista |  |
| ✓ | Acessibilidade | Cadastro, busca e auditoria · Auditoria com filtro: sem violações WCAG A/AA |  |
| ✓ | Auditoria | a planilha (CSV) sai com o filtro, separador ponto e vírgula e a fórmula neutralizada (apóstrofo na frente) | ﻿"Clínica-Escola de Psicologia (fictícia, para o protótipo) · Vinculum · trilha  |
| ✓ | Auditoria | a exportação também fica na auditoria |  |
| ✓ | Documentos | declaração com termo clínico é recusada e o campo diz qual termo revisar (Res. CFP 06/2019, art. 9º) | Declaração não traz sintoma, diagnóstico nem situação clínica (Res. CFP 06/2019, art. 9º). Revise: ansiedade, crise. |
| ✓ | Documentos | declaração sem termo clínico é emitida e assinada pela estagiária (falta o supervisor) |  |
| ✓ | Documentos | laudo sem avaliação psicológica registrada no caso não pode ser emitido |  |
| ✓ | Acessibilidade | Documentos e comunicações · Documentos · emitir relatório: sem violações WCAG A/AA |  |
| ✓ | Documentos | relatório vazio: cada seção obrigatória e o prazo de validade são cobrados |  |
| ✓ | Documentos | relatório completo é emitido com as seções da Res. CFP 06/2019 |  |
| ✓ | Documentos | sem a assinatura do supervisor, o documento não é impresso |  |
| ✓ | Documentos | assinado pelo supervisor, o documento tem validade, cabeçalho, seções, validade no último parágrafo, local e data por extenso e protocolo de entrega |  |
| ✓ | Acessibilidade | Documentos e comunicações · Documento psicológico (leitura e impressão): sem violações WCAG A/AA |  |
| ✓ | Documentos | na impressão, o protocolo de entrega sai em página separada |  |
| ✓ | Documentos | entrega sem dizer a quem é recusada |  |
| ✓ | Documentos | a entrega fica registrada (protocolo) e o relatório mostra a devolutiva pendente |  |
| ✓ | Documentos | devolutiva registrada; documento entregue não pode mais ser anulado |  |
| ✓ | Comunicações | a supervisão tem a opção de quebra de sigilo |  |
| ✓ | Documentos | a estagiária anula a própria declaração ainda não entregue, com motivo (continua no prontuário, sem validade) |  |
| ✓ | Comunicações | a estagiária não tem a opção de quebra de sigilo |  |
| ✓ | Comunicações | comunicação autorizada sem o fundamento é recusada |  |
| ✓ | Comunicações | esconder do paciente exige o motivo |  |
| ✓ | Comunicações | as duas comunicações ficam registradas no caso |  |
| ✓ | Acessibilidade | Documentos e comunicações · Documentos · comunicações registradas: sem violações WCAG A/AA |  |
| ✓ | Comunicações | a cópia do prontuário leva as comunicações visíveis, e não a escondida |  |
| ✓ | Comunicações | a paciente vê com quem os dados foram compartilhados (LGPD, art. 18, VII), menos o que a equipe escondeu com motivo |  |
| ✓ | Gráfico | o painel da supervisão mostra os 6 meses, com a legenda das três séries e o total no topo das colunas |  |
| ✓ | Gráfico | cada coluna diz, para quem usa leitor de tela, o mês e os três números | outubro de 2026: 8 presença, 1 falta justificada, 2 falta sem justificativa |
| ✓ | Gráfico | com o teclado (Tab), a coluna mostra o detalhe do mês |  |
| ✓ | Gráfico | Esc fecha o detalhe |  |
| ✓ | Gráfico | "Ver os números" abre a tabela com todos os valores |  |
| ✓ | Acessibilidade | Gráfico e salas · Painel com gráfico: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | Gráfico e salas · Painel com gráfico no alto contraste: sem violações WCAG A/AA |  |
| ✓ | Acessibilidade | no alto contraste, o aviso flutuante fica legível (antes era branco no branco) |  |
| ✓ | Gráfico | a direção vê o gráfico só com os totais (sem nomes) |  |
| ✓ | Gráfico | o gráfico também aparece em Indicadores |  |
| ✓ | Sala | o filtro da agenda mostra só a ocupação da sala escolhida | 10 sessões |
| ✓ | Acessibilidade | Gráfico e salas · Agenda filtrada por sala: sem violações WCAG A/AA |  |
| ✓ | Banco (simulado) | login errado: nada é gravado no banco 'em nome de visitante' (fica no registro do Supabase Auth) |  |
| ✓ | Banco (simulado) | login pelo Supabase Auth e dados carregados da API |  |
| ✓ | Banco (simulado) | gravação aceita a resposta 201 sem corpo (Prefer: return=minimal) |  |
| ✓ | Banco (simulado) | data e hora vão com fuso (ISO em UTC), não como hora local solta | 2026-11-09T18:53:00.000Z |
| ✓ | Banco (simulado) | evento de auditoria vai sem hora e sem hash (quem carimba e encadeia é o banco) |  |
| ✓ | Banco (simulado) | token de acesso curto é renovado sozinho antes de vencer |  |
| ✓ | Banco (simulado) | anexo vai para o Storage no caminho <caso>/<arquivo> | /storage/v1/object/anexos/c01/arq-mw9md7kkyejq |
| ✓ | Banco (simulado) | nenhum erro de JavaScript até aqui (respostas 201 e 204 sem corpo são aceitas) |  |
| ✓ | Banco (simulado) | erro do servidor não leva para o console o conteúdo da linha recusada | Failed to load resource: the server responded with a status of 400 (Bad Request); Failed to load resource: the server responded with a status of 400 (Bad Reques |
| ✓ | Banco (simulado) | conta com segundo fator no Supabase: depois da senha, o site pede o código e ainda não entra |  |
| ✓ | Banco (simulado) | código errado: o Supabase recusa e o site avisa; código certo: desafio + verificação com o challenge_id | [{"challenge_id": "desafio-fator-1", "code": "654321"}, {"challenge_id": "desafio-fator-1", "code": "123456"}] |
| ✓ | Banco (simulado) | depois do código, todos os pedidos ao banco usam o token novo (nível aal2) |  |
| ✓ | Banco (simulado) | nenhum erro de JavaScript no login em duas etapas |  |
| ✓ | Console | nenhum erro de JavaScript no console em todas as telas |  |
