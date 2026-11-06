# Resultado do teste do banco

Gerado por `banco/testar_banco.mjs` em 2026-11-06 04:01 (UTC), num PostgreSQL 18.6 (PGlite).

**56 de 56 verificações passaram.**

| | Verificação | Detalhe |
|---|---|---|
| ✓ | schema.sql roda sem erro | 29 tabelas |
| ✓ | migração JSON → banco: mesmas quantidades em todas as tabelas | 263 registros em 23 tabelas (2667 ms) |
| ✓ | CPF com dígito verificador errado é recusado | recusado: new row for relation "pacientes" violates check constraint "pacientes_cpf_check" |
| ✓ | CPF repetido é recusado | recusado: duplicate key value violates unique constraint "pacientes_cpf_unico" |
| ✓ | telefone inválido é recusado | recusado: value for domain app.telefone violates check constraint "telefone_check" |
| ✓ | presença fora da lista é recusada | recusado: new row for relation "sessoes" violates check constraint "sessoes_presenca_check" |
| ✓ | documento sem finalidade é recusado (Res. CFP 05/2025, art. 12) | recusado: new row for relation "documentos" violates check constraint "documentos_finalidade_check" |
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
| ✓ | paciente não altera a presença | recusado: Paciente só pode confirmar presença. |
| ✓ | paciente revoga um consentimento opcional |  |
| ✓ | paciente não mexe no contrato terapêutico | recusado: new row violates row-level security policy for table "consentimentos" |
| ✓ | paciente não consegue ver indicadores | recusado: Perfil sem acesso aos indicadores. |
| ✓ | visitante se inscreve na fila sem login |  |
| ✓ | visitante não lê a fila | recusado: permission denied for table inscricoes |
| ✓ | visitante não lê pacientes | recusado: permission denied for table pacientes |
| ✓ | o banco marca a duplicidade do CPF sozinho (sem avisar quem preencheu) | {"id":"p05","tipo":"paciente"} |
| ✓ | a inscrição gerou evento de auditoria e a cadeia continua íntegra |  |
| ✓ | indicadores do banco = indicadores da tela | atendidos 6, retorno 83%, em risco 1, motivos {"Horário incompatível":1} |
| ✓ | caso com 2 faltas seguidas aparece em risco de abandono (c02) |  |

Tamanho do banco de demonstração: 9.4 MB (inclui o catálogo do PostgreSQL). Maiores tabelas: usuarios 96 KB, assinaturas 80 KB, alocacoes 64 KB, auditoria_2026 64 KB, casos 64 KB.
