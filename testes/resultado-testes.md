# Resultado dos testes do site

Gerado por `testes/testar_site.py` em 07/11/2026 01:31, no Chrome (Playwright), com axe-core 4.14.0.

**270 de 270 verificações passaram.** Acessibilidade: 57 telas conferidas (WCAG 2.0/2.1/2.2, níveis A e AA).

| Área | Passaram | Falharam |
|---|---|---|
| Público | 3 | 0 |
| Acessibilidade | 64 | 0 |
| LGPD | 14 | 0 |
| Validadores | 11 | 0 |
| CPF | 6 | 0 |
| Auditoria | 5 | 0 |
| Senha | 11 | 0 |
| Permissões | 7 | 0 |
| Evolução | 7 | 0 |
| Anamnese | 1 | 0 |
| Sessões | 5 | 0 |
| Lembretes | 3 | 0 |
| Encerramento | 5 | 0 |
| Abandono | 2 | 0 |
| Anexos | 4 | 0 |
| Agenda | 4 | 0 |
| Triagem | 1 | 0 |
| Cadastro | 1 | 0 |
| Alocação | 1 | 0 |
| Acesso do paciente | 4 | 0 |
| Paciente | 1 | 0 |
| Indicadores | 1 | 0 |
| Importação | 3 | 0 |
| Rodízio | 4 | 0 |
| Sessão | 4 | 0 |
| Demonstração | 2 | 0 |
| Celular | 4 | 0 |
| Risco | 17 | 0 |
| Revisor | 8 | 0 |
| Privacidade | 15 | 0 |
| Urgência | 5 | 0 |
| Faltas | 5 | 0 |
| Prazo | 1 | 0 |
| Contas | 7 | 0 |
| Duas etapas | 20 | 0 |
| Banco (simulado) | 13 | 0 |
| Console | 1 | 0 |

## Todas as verificações

| | Área | Verificação | Detalhe |
|---|---|---|---|
| ✓ | Público | página inicial abre e o título da aba é neutro | Entrar — Vínculo · Prontuário da Clínica-Escola |
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
| ✓ | Acessibilidade | título da aba no prontuário não leva nome do paciente | Prontuário — Vínculo · Prontuário da Clínica-Escola |
| ✓ | Evolução | contador mostra os caracteres usados e o limite |  |
| ✓ | Validadores | evolução muito curta é recusada |  |
| ✓ | Validadores | evolução acima do limite de caracteres é recusada |  |
| ✓ | Evolução | estagiária assina e envia à supervisão |  |
| ✓ | Evolução | a assinatura guarda o hash SHA-256 do texto assinado |  |
| ✓ | Validadores | anamnese sem objetivos é recusada |  |
| ✓ | Anamnese | editar cria a versão 3 e guarda as anteriores |  |
| ✓ | Sessões | presença registrada na sessão de hoje |  |
| ✓ | Sessões | presença em sessão futura é recusada |  |
| ✓ | Sessões | agendamento no mesmo horário da dupla é recusado |  |
| ✓ | Sessões | sessão que se sobrepõe a outra da dupla (cada uma ocupa 50 min) é recusada |  |
| ✓ | Validadores | horário fora do funcionamento é recusado |  |
| ✓ | Sessões | agendamento válido |  |
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
| ✓ | Banco (simulado) | login errado: nada é gravado no banco 'em nome de visitante' (fica no registro do Supabase Auth) |  |
| ✓ | Banco (simulado) | login pelo Supabase Auth e dados carregados da API |  |
| ✓ | Banco (simulado) | gravação aceita a resposta 201 sem corpo (Prefer: return=minimal) |  |
| ✓ | Banco (simulado) | data e hora vão com fuso (ISO em UTC), não como hora local solta | 2026-11-07T01:31:00.000Z |
| ✓ | Banco (simulado) | evento de auditoria vai sem hora e sem hash (quem carimba e encadeia é o banco) |  |
| ✓ | Banco (simulado) | token de acesso curto é renovado sozinho antes de vencer |  |
| ✓ | Banco (simulado) | anexo vai para o Storage no caminho <caso>/<arquivo> | /storage/v1/object/anexos/c01/arq-mw5q9qigle5n |
| ✓ | Banco (simulado) | nenhum erro de JavaScript até aqui (respostas 201 e 204 sem corpo são aceitas) |  |
| ✓ | Banco (simulado) | erro do servidor não leva para o console o conteúdo da linha recusada | Failed to load resource: the server responded with a status of 400 (Bad Request); Failed to load resource: the server responded with a status of 400 (Bad Reques |
| ✓ | Banco (simulado) | conta com segundo fator no Supabase: depois da senha, o site pede o código e ainda não entra |  |
| ✓ | Banco (simulado) | código errado: o Supabase recusa e o site avisa; código certo: desafio + verificação com o challenge_id | [{"challenge_id": "desafio-fator-1", "code": "654321"}, {"challenge_id": "desafio-fator-1", "code": "123456"}] |
| ✓ | Banco (simulado) | depois do código, todos os pedidos ao banco usam o token novo (nível aal2) |  |
| ✓ | Banco (simulado) | nenhum erro de JavaScript no login em duas etapas |  |
| ✓ | Console | nenhum erro de JavaScript no console em todas as telas |  |
