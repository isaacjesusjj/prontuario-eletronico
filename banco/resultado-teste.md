# Resultado do teste do banco

Gerado por `banco/testar_banco.mjs` em 2026-11-08 20:01 (UTC), num PostgreSQL 18.6 (PGlite).

**152 de 152 verificações passaram.**

| | Verificação | Detalhe |
|---|---|---|
| ✓ | schema.sql roda sem erro | 34 tabelas |
| ✓ | migração JSON → banco: mesmas quantidades em todas as tabelas | 268 registros em 26 tabelas (1694 ms) |
| ✓ | CPF com dígito verificador errado é recusado | recusado: new row for relation "pacientes" violates check constraint "pacientes_cpf_check" |
| ✓ | CPF repetido é recusado | recusado: duplicate key value violates unique constraint "pacientes_cpf_unico" |
| ✓ | telefone inválido é recusado | recusado: value for domain app.telefone violates check constraint "telefone_check" |
| ✓ | presença fora da lista é recusada | recusado: Sessão nova entra como agendada: a presença é registrada a partir do dia da sessão. |
| ✓ | documento sem finalidade é recusado (Res. CFP 05/2025, art. 12) | recusado: new row for relation "documentos" violates check constraint "documentos_finalidade_check" |
| ✓ | contato de emergência sem telefone é recusado (nome e telefone vão juntos) | recusado: new row for relation "pacientes" violates check constraint "pacientes_check" |
| ✓ | telefone do contato de emergência fora do formato é recusado | recusado: new row for relation "pacientes" violates check constraint "pacientes_emergencia_telefone_ |
| ✓ | evolução validada não pode ser editada | recusado: Evolução validada é imutável: registre um adendo. |
| ✓ | evolução não pode ser apagada | recusado: Evolução não pode ser apagada. |
| ✓ | rascunho não pula direto para validada | recusado: Mudança de status inválida: rascunho → validada. |
| ✓ | consentimento não pode ser alterado (revogar = novo registro) | recusado: A tabela consentimentos é só de inserção: UPDATE não é permitido (registro permanente). |
| ✓ | assinatura não pode ser apagada | recusado: A tabela assinaturas é só de inserção: DELETE não é permitido (registro permanente). |
| ✓ | auditoria não pode ser alterada | recusado: A tabela auditoria_2026 é só de inserção: UPDATE não é permitido (registro permanente). |
| ✓ | auditoria não pode ser apagada | recusado: A tabela auditoria_2026 é só de inserção: DELETE não é permitido (registro permanente). |
| ✓ | cadeia de hash da auditoria íntegra depois da migração |  |
| ✓ | o hash do banco é igual ao calculado pelo navegador (mesma fórmula de js/estado.js) | 5 eventos |
| ✓ | adulteração direta no banco (desligando o trigger) é detectada | quebra no evento seq 2 |
| ✓ | Bia vê só os casos permitidos | vê [c01,c02] |
| ✓ | Caio vê só os casos permitidos | vê [c01,c02] |
| ✓ | Duda vê só os casos permitidos | vê [c03] |
| ✓ | Enzo vê só os casos permitidos | vê [c04,c05,c06] |
| ✓ | Iara vê só os casos permitidos | vê [nenhum] |
| ✓ | Hugo vê só os casos permitidos | vê [nenhum] |
| ✓ | Helena vê só os casos permitidos | vê [c01,c02,c03] |
| ✓ | Rafael vê só os casos permitidos | vê [c04,c05,c06] |
| ✓ | Ana Lúcia vê só os casos permitidos | vê [c01,c02,c03,c04,c05,c06,c07] |
| ✓ | Marta vê só os casos permitidos | vê [nenhum] |
| ✓ | Paciente Exemplo 01 vê só os casos permitidos | vê [c01] |
| ✓ | Iara (vínculo de estágio encerrado em 31/07) não vê evoluções |  |
| ✓ | rascunho só o autor vê (Caio não vê o rascunho da Bia) |  |
| ✓ | paciente não lê a tabela de evoluções (recebe a cópia pelo fluxo de acesso) |  |
| ✓ | direção não lê evoluções nem pacientes |  |
| ✓ | registro de supervisão: técnico não vê |  |
| ✓ | registro de supervisão: Helena vê os dos seus grupos |  |
| ✓ | registro de supervisão: Bia vê só o do caso dela |  |
| ✓ | avaliação psicológica: Duda (do caso) vê, Bia não |  |
| ✓ | paciente vê só o próprio cadastro |  |
| ✓ | fila de espera: só o técnico lê |  |
| ✓ | auditoria: só o técnico lê |  |
| ✓ | Bia não escreve evolução no caso do Enzo | recusado: new row violates row-level security policy for table "evolucoes" |
| ✓ | Bia escreve e envia evolução no próprio caso |  |
| ✓ | Rafael (outro grupo) não consegue validar evolução do Grupo A |  |
| ✓ | Helena (supervisora do caso) valida |  |
| ✓ | depois de validada, nem a autora edita | 0 linhas alteradas; texto original mantido |
| ✓ | paciente confirma presença na própria sessão |  |
| ✓ | paciente não altera a presença | recusado: Paciente só pode confirmar presença ou avisar, antes da sessão, que não vai. |
| ✓ | paciente revoga um consentimento opcional |  |
| ✓ | paciente não mexe no contrato terapêutico | recusado: new row violates row-level security policy for table "consentimentos" |
| ✓ | paciente não consegue ver indicadores | recusado: Perfil sem acesso aos indicadores. |
| ✓ | estagiária não se promove a técnica pela API (perfil e CRP não mudam) | recusado: permission denied for table usuarios |
| ✓ | a única coluna da própria conta que muda pela API é "senha provisória" |  |
| ✓ | evolução não nasce validada (quem valida é o supervisor) | recusado: Evolução nova entra como rascunho ou enviada: quem valida é o supervisor. |
| ✓ | evolução não se liga a sessão de outro caso | recusado: A sessão da evolução precisa ser do mesmo caso e ter presença registrada. |
| ✓ | estagiária não muda a dupla do caso | recusado: Para trocar a dupla de um caso em andamento, registre a passagem do caso. |
| ✓ | sessão passada não entra já com presença (presença só no dia) | recusado: Sessão nova entra como agendada: a presença é registrada a partir do dia da sessão. |
| ✓ | abandono só depois de registrar a tentativa de contato | recusado: Abandono só depois de registrar a tentativa de contato. |
| ✓ | encaminhamento exige o serviço da rede que vai receber | recusado: new row for relation "encerramentos" violates check constraint "encerramentos_check" |
| ✓ | ninguém grava evento de auditoria em nome de visitante | recusado: new row violates row-level security policy for table "auditoria" |
| ✓ | assinatura com hash de outro texto é recusada | recusado: O hash da assinatura não confere com o texto da evolução. |
| ✓ | evento de auditoria com data retroativa é recusado | recusado: A hora do evento de auditoria é definida pelo servidor. |
| ✓ | a data da assinatura e da auditoria é a do servidor (data retroativa enviada é ignorada) |  |
| ✓ | depois da tentativa, o perfil da Bia continua "estagiario" |  |
| ✓ | conta de paciente: Bia (equipe do caso) vê; Duda (outra dupla) não vê |  |
| ✓ | ninguém troca o paciente de um caso | recusado: Paciente e início do caso não mudam. |
| ✓ | a limpeza da fila não roda pela API (só o agendador do banco) | recusado: permission denied for function eliminar_inscricoes_antigas |
| ✓ | caso encerrado não é reaberto (quem volta ganha caso novo na triagem) | recusado: Caso encerrado não é reaberto: o paciente que volta ganha um caso novo na triagem. |
| ✓ | supervisora não reativa o vínculo de quem já saiu (Iara) | recusado: Vínculo encerrado não é reaberto nem alterado: crie um vínculo novo. |
| ✓ | supervisora não encerra vínculo de estágio (é da direção) | recusado: Só a direção encerra o vínculo de estágio. |
| ✓ | paciente não pede cópia do prontuário de outra pessoa | recusado: new row violates row-level security policy for table "solicitacoes" |
| ✓ | paciente pede cópia do próprio prontuário |  |
| ✓ | visitante não consulta os indicadores (não é tratado como administrador) | recusado: Perfil sem acesso aos indicadores. |
| ✓ | visitante não roda a verificação da auditoria | recusado: Só a psicóloga técnica verifica a auditoria. |
| ✓ | anexo: estagiária não envia arquivo para caso de outra dupla | recusado: new row violates row-level security policy for table "objects" |
| ✓ | anexo: quem não é da equipe do caso não baixa o arquivo |  |
| ✓ | login novo só é ligado à conta depois de o e-mail ser confirmado (ninguém "toma" a conta) |  |
| ✓ | depois das tentativas, a cadeia da auditoria continua íntegra |  |
| ✓ | risco: Duda (do caso) vê a avaliação; Bia (outra dupla) não vê; o paciente não lê a tabela |  |
| ✓ | risco: a avaliação registrada não muda (nova avaliação, nunca edição) | recusado: A avaliação de risco registrada não muda: registre uma nova avaliação. |
| ✓ | risco: estagiária não registra notificação compulsória (é do supervisor) | recusado: new row violates row-level security policy for table "notificacoes" |
| ✓ | risco: estagiária não dá a ciência da supervisão | recusado: Quem dá ciência é o supervisor do caso. |
| ✓ | risco: encerrar o acompanhamento antes da ciência da supervisão é recusado | recusado: A supervisão precisa dar ciência antes de encerrar o acompanhamento. |
| ✓ | risco: a ciência não vem preenchida por quem registra (o banco limpa) |  |
| ✓ | risco: notificação ligada a risco de outro caso é recusada | recusado: A notificação precisa estar ligada a uma avaliação de risco do mesmo caso. |
| ✓ | risco: encerrar o acompanhamento exige o motivo | recusado: Escreva por que o acompanhamento do risco foi encerrado. |
| ✓ | risco: a supervisora dá ciência e o banco grava quem e quando (não o que foi enviado) |  |
| ✓ | risco: a supervisora registra a notificação do próprio caso |  |
| ✓ | risco: caso encerrado não recebe avaliação nova | recusado: Só caso ativo recebe avaliação de risco. |
| ✓ | plano de segurança só existe construído com o paciente | recusado: new row for relation "planos_seguranca" violates check constraint "planos_seguranca_revisa |
| ✓ | plano de segurança: a versão é sempre a seguinte da última | recusado: A versão do plano precisa ser a seguinte da última. |
| ✓ | plano de segurança não é editado (nova versão, nunca edição) | recusado: permission denied for table planos_seguranca |
| ✓ | plano de segurança: o paciente do caso lê o próprio plano; estagiária de outra dupla não |  |
| ✓ | depois do módulo de risco, a cadeia da auditoria continua íntegra |  |
| ✓ | técnica não lê as evoluções de um caso antes de registrar o motivo do acesso |  |
| ✓ | sem motivo, a técnica continua vendo casos, cadastro e agenda (camada operacional) |  |
| ✓ | técnica lê a anamnese do caso recém-triado, que ainda espera alocação |  |
| ✓ | motivo de acesso é registro da técnica (estagiária não registra) | recusado: new row violates row-level security policy for table "acessos_justificados" |
| ✓ | motivo "outro" exige a descrição | recusado: new row for relation "acessos_justificados" violates check constraint "acessos_justificado |
| ✓ | motivo de acesso registrado não muda | recusado: permission denied for table acessos_justificados |
| ✓ | com o motivo registrado, a técnica lê as evoluções daquele caso, e só dele |  |
| ✓ | "quem acessou meu prontuário": o paciente vê o motivo da técnica e os eventos do próprio caso, e só deles | 4 registros |
| ✓ | "quem acessou": quem não é o paciente recebe a lista vazia |  |
| ✓ | "quem acessou" de criança ou adolescente: sem o motivo da técnica e sem menção a risco ou notificação (Código de Ética, art. 13) | Ana Lúcia: Registrou o motivo do acesso ao prontuário; Rafael: Registrou informações no prontuário |
| ✓ | paciente não avisa falta em sessão que já passou | recusado: Paciente só pode confirmar presença ou avisar, antes da sessão, que não vai. |
| ✓ | paciente não registra falta comum (só o aviso, que vira falta justificada) | recusado: Paciente só pode confirmar presença ou avisar, antes da sessão, que não vai. |
| ✓ | aviso de falta só com motivo da lista (sem texto livre) | recusado: new row for relation "sessoes" violates check constraint "sessoes_motivo_falta_check" |
| ✓ | paciente avisa, antes da sessão, que não vai (vira falta justificada, com a hora do servidor) |  |
| ✓ | o aviso fica registrado com a data do servidor |  |
| ✓ | a equipe não registra um aviso "em nome" do paciente | recusado: O aviso de falta é do próprio paciente. |
| ✓ | direção desativa a conta de um estagiário (o histórico continua) |  |
| ✓ | direção não muda o perfil de ninguém pela API | recusado: permission denied for table usuarios |
| ✓ | ninguém desativa a própria conta | recusado: Ninguém desativa ou reativa a própria conta. |
| ✓ | direção não mexe no acesso de paciente ao portal (é da técnica) |  |
| ✓ | estagiária não desativa a conta de outra pessoa |  |
| ✓ | técnica cria o acesso de um paciente ao portal |  |
| ✓ | técnica não cria conta de equipe | recusado: new row violates row-level security policy for table "usuarios" |
| ✓ | conta desativada não vê mais nada (nem os próprios dados) |  |
| ✓ | conta reativada volta a ver o que é dela |  |
| ✓ | MFA ligado: só com a senha (aal1), o supervisor não vê nenhum caso |  |
| ✓ | ... mas vê a própria conta (o site precisa do nome e do perfil para pedir o código) |  |
| ✓ | ... e não grava nada, nem auditoria em nome próprio | recusado: new row violates row-level security policy for table "auditoria" |
| ✓ | com o código do aplicativo (aal2), volta a ver os casos dos seus grupos |  |
| ✓ | configuração começada e não confirmada não bloqueia a conta |  |
| ✓ | MFA obrigatório (produção): equipe sem o segundo fator não vê nada até configurar |  |
| ✓ | ... e com o código (aal2), vê de novo |  |
| ✓ | MFA obrigatório não vale para o paciente (o portal precisa ser simples) |  |
| ✓ | estagiária não passa o caso para outra dupla | recusado: A passagem é feita pela técnica ou pelo supervisor do caso (para outra dupla do mesmo grup |
| ✓ | resumo de transferência não é de uma sessão | recusado: new row for relation "evolucoes" violates check constraint "evolucoes_check1" |
| ✓ | estagiária escreve o resumo de transferência e envia à supervisão |  |
| ✓ | supervisor de outro grupo não passa o caso | recusado: A passagem é feita pela técnica ou pelo supervisor do caso (para outra dupla do mesmo grup |
| ✓ | supervisor não passa o caso para outro grupo (é a técnica que muda o grupo) | recusado: A passagem é feita pela técnica ou pelo supervisor do caso (para outra dupla do mesmo grup |
| ✓ | evolução esperando a supervisão impede a passagem (o resumo enviado ainda não foi validado) | recusado: Há evolução esperando a supervisão: valide ou devolva antes de passar o caso. |
| ✓ | caso em andamento não troca de dupla direto, sem registrar a passagem | recusado: Para trocar a dupla de um caso em andamento, registre a passagem do caso. |
| ✓ | sem resumo validado, a passagem exige justificativa | recusado: new row for relation "transferencias" violates check constraint "transferencias_check" |
| ✓ | a passagem só acontece com o paciente avisado | recusado: new row for relation "transferencias" violates check constraint "transferencias_paciente_a |
| ✓ | com o resumo validado, o supervisor passa o caso: o banco grava de onde saiu e quem registrou, e muda a dupla | {"de_subgrupo_id":"d-a2","registrado_por":"u-sup1","subgrupo_id":"d-a1"} |
| ✓ | a dupla anterior perde o acesso na hora |  |
| ✓ | a nova dupla vê o caso com o prontuário inteiro (as evoluções da dupla anterior e o resumo) | 7 evoluções |
| ✓ | o mesmo resumo não serve para outra passagem | recusado: O resumo precisa ser o resumo de transferência validado desta passagem (cada resumo vale p |
| ✓ | passagem registrada não muda (nem pelo administrador do banco) | recusado: A tabela transferencias é só de inserção: UPDATE não é permitido (registro permanente). |
| ✓ | a técnica passa o caso para outro grupo, com justificativa (sem resumo) |  |
| ✓ | no outro grupo, o novo supervisor vê o caso e o anterior deixa de ver |  |
| ✓ | o paciente vê a passagem como "passou o seu atendimento para outra dupla" |  |
| ✓ | visitante se inscreve na fila sem login |  |
| ✓ | visitante não lê a fila | recusado: permission denied for table inscricoes |
| ✓ | visitante não lê pacientes | recusado: permission denied for table pacientes |
| ✓ | o banco marca a duplicidade do CPF sozinho (sem avisar quem preencheu) | {"id":"p05","tipo":"paciente"} |
| ✓ | a inscrição gerou evento de auditoria e a cadeia continua íntegra |  |
| ✓ | indicadores do banco = indicadores da tela | atendidos 6, retorno 83%, em risco 1, ativos 4, na fila 6, motivos {"Horário incompatível":1} |
| ✓ | caso com 2 faltas seguidas aparece em risco de abandono (c02) |  |
| ✓ | indicadores trazem os motivos das faltas avisadas pelo paciente | {"transporte":1,"trabalho-estudo":1} |

Tamanho do banco de demonstração: 10.0 MB (inclui o catálogo do PostgreSQL). Maiores tabelas: usuarios 96 KB, assinaturas 80 KB, casos 64 KB, alocacoes 64 KB, auditoria_2026 64 KB.
