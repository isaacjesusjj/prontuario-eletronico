# Relatório final das melhorias — Vínculo

Para: Daniel, Dilson e Isaac. Novembro de 2026.

Este relatório resume o que mudou no prontuário, por quê, como mostrar na banca (03/12/2026) e o que ainda precisa ser validado por quem é de fora do grupo. O passo a passo da demonstração está em [`roteiro-apresentacao.md`](roteiro-apresentacao.md) (passo 9 e "Perguntas prováveis").

## Onde está o trabalho

- Tudo está no branch **`andamento-06-11`** do GitHub: https://github.com/isaacjesusjj/prontuario-eletronico/tree/andamento-06-11
- A **`main` não mudou**: o site publicado continua com a versão antiga. As melhorias só vão ao ar quando o grupo aprovar e juntar o branch na `main`. No GitHub, isso é um *pull request*: https://github.com/isaacjesusjj/prontuario-eletronico/pull/new/andamento-06-11
- Para ver antes de publicar: baixe o branch e rode `python -m http.server 8000` na pasta do projeto (detalhes no `CLAUDE.md`).

## Em números

| | Antes | Agora |
|---|---|---|
| Verificações automáticas do site | 154 | **287** |
| Telas conferidas no teste de acessibilidade (WCAG 2.2 AA) | 45 | **59** |
| Verificações do banco (PostgreSQL de verdade) | 56 | **150**, quase metade tentando burlar as regras |
| Tabelas do banco | 25 | **30** |
| Problemas no validador do JSON | 0 | **0** |

## O que mudou, na ordem problema → o que fizemos → como mostrar

| # | Problema | O que fizemos | Como mostrar |
|---|---|---|---|
| 1 | Quem chamasse a API do banco direto, sem passar pelas telas, conseguia virar técnico, gravar evolução já "validada", pedir a cópia de outro paciente e mudar datas | O próprio banco recusa: regras de transição (triggers), hora carimbada pelo servidor, hash da assinatura conferido | "Perguntas prováveis": *E se alguém chamar a API direto?* |
| 2 | Validações soltas, bloqueio de login fixo e 8 falhas no adaptador do Supabase que só apareceriam com o banco ligado | Validações de encerramento e de agenda (sessão de 50 min), limite de texto, bloqueio progressivo (30 s até 15 min), rascunho automático antes de a sessão expirar; adaptador corrigido e testado contra um servidor simulado | Passo 2 do roteiro (login) |
| 3 | Risco identificado na triagem virava só um texto na auditoria | Avaliação de risco no caso, ciência da supervisão, notificação compulsória com órgão, lei e prazo, plano de segurança que o paciente lê no portal | Passo 9: Helena → Paciente Exemplo 03; Rafael → Paciente Exemplo 04 |
| 4 | O estagiário aprende a escrever prontuário sem retorno até a supervisão | Revisor de escrita sem IA: aponta juízo de valor, linguagem estigmatizante, dado identificável e falta de plano; "Ver como o paciente lê" | Passo 9: Bia → nova evolução → "Paciente alega que a mãe é manipuladora" |
| 5 | A técnica abria qualquer prontuário sem registrar por quê | Motivo registrado antes do conteúdo clínico; o paciente vê "quem acessou"; modo discreto e "Cobrir tela" | Passo 9: Ana → Paciente Exemplo 01; paciente01 → Meus dados |
| 6 | Não se sabia por que o paciente faltava; relato urgente esperava na fila como os outros | O paciente avisa a falta pelo portal (motivo de lista fechada, vira indicador); relato urgente mostra CVV 188 e SAMU 192 e sobe na fila | Passo 9: paciente01 → "Não vou poder ir"; fila de espera com "Não aguento mais" |
| 7 | A tela prometia senha provisória, mas não havia como gerar | Direção e técnica geram senha provisória e desativam ou reativam contas; a técnica cria o acesso do paciente ao portal | Passo 9: Marta → Estudantes e contas |
| 8 | Senha vazada bastava para abrir o prontuário | Verificação em duas etapas (código do aplicativo do celular), com códigos de recuperação; no banco, quem ligou e entrou só com a senha não vê nada | Passo 9: Minha conta → Ativar |
| 9 | No fim do semestre o estagiário sai, mas o caso ficava preso numa dupla sem ninguém | Resumo de transferência (pré-preenchido, validado pela supervisão) e passagem do caso registrada, com lista de conferência; a dupla anterior perde o acesso na hora | Passo 9: Duda → resumo; Helena → passagem |

As mensagens dos commits no GitHub explicam cada mudança em detalhe e servem de cola para as perguntas.

## O que dizer ao professor sobre o JSON

O professor (no papel de PO) quer entender o JSON. O princípio continua o mesmo: **uma coleção = uma tabela**, relações por `id`, listas e regras em `_config`. O que entrou:

| No JSON | Vira no banco | Para quê |
|---|---|---|
| `riscos` | tabela `riscos` | Avaliação de risco do caso (tipo, nível, condutas, ciência da supervisão) |
| `notificacoes` | tabela `notificacoes` | Notificação compulsória (órgão, protocolo), ligada ao risco |
| `planosSeguranca` | tabela `planos_seguranca` | Plano de segurança em versões, feito com o paciente |
| `acessosJustificados` | tabela `acessos_justificados` | Motivo de acesso da técnica (vale 12 h) |
| `transferencias` | tabela `transferencias` | Passagem do caso para outra dupla (de onde, para onde, resumo ou justificativa) |
| campos novos: `evolucoes.tipo`, `sessoes.avisoPaciente` e `motivoFalta`, `inscricoes.sinalUrgencia`, `encerramentos.destino` | colunas novas | Resumo de transferência, falta avisada, urgência na fila, encaminhamento com destino |
| `_config.regras` (11 regras novas) e `_config.listas` (11 listas novas), `_config.revisorEscrita` | não viram tabela: são configuração | A supervisão muda prazos, listas e regras do revisor sem mexer no código |

Frase para a banca: "Toda regra nova está em três lugares que conversam: no JSON (`_config`), no site (`js/permissoes.js`) e no banco (`banco/schema.sql`). Os testes conferem os três."

## O que validar, e com quem

Nada disso impede a apresentação, mas precisa ser confirmado antes de uso com pacientes reais.

**Supervisão clínica do curso**
- [ ] Tipos e níveis de risco e as condutas sugeridas.
- [ ] Os campos do plano de segurança (modelo de Stanley e Brown).
- [ ] As regras do revisor de escrita (palavras apontadas e sugestões).
- [ ] As três seções do resumo de transferência.
- [ ] A lista de motivos de falta que o paciente escolhe.

**Jurídico e encarregado de dados (DPO) da instituição**
- [ ] Órgãos e prazos de notificação compulsória (ECA, Lei 13.819/2019, Lei 10.778/2003, Estatuto da Pessoa Idosa, LBI).
- [ ] O que o portal mostra para criança ou adolescente (relato de violência omitido; "quem acessou" sem o motivo).
- [ ] Validade de 12 h do motivo de acesso da técnica.
- [ ] Verificação em duas etapas obrigatória para a equipe em produção.
- [ ] O registro das operações e o relatório de impacto em [`lgpd.md`](lgpd.md).

**Cliente (clínica-escola)**
- [ ] As pendências que já estavam no README (3 faltas intercaladas; "800 usuários simultâneos" × "800 estudantes").

## Limites, com honestidade

Diga isso na banca antes que perguntem: mostra maturidade.

- **O modo de hoje (dados no navegador) é protótipo e não serve para dados reais.** Para uso de verdade, é preciso ligar o Supabase (passo a passo em [`../banco/README.md`](../banco/README.md)).
- O banco foi testado num PostgreSQL de verdade (PGlite), e o adaptador, contra um servidor simulado. Ainda falta rodar contra um projeto Supabase criado.
- Ficam para funções no servidor (*Edge Functions*): o link de leitura do paciente, o convite por e-mail e desligar o MFA de quem perdeu o celular.
- A verificação em duas etapas está pronta, mas desligada como obrigatória no protótipo, para a demonstração não exigir celular.
- A assinatura é eletrônica simples (login + hash). Documento enviado a terceiros deveria usar assinatura avançada (gov.br).
- As escalas PHQ-9 e GAD-7 ficaram de fora, por decisão do grupo. Podem entrar depois, só com as pontuações.
- **O Figma (Etapa 3) foi feito a partir das telas antigas.** As telas novas (risco e segurança, passagem do caso, verificação em duas etapas, revisor, contas) ainda não estão nele.

## Próximos passos sugeridos

1. Cada integrante abre o branch, percorre o passo 9 do roteiro e anota dúvidas.
2. Levar a lista "O que validar" à supervisão e, se possível, ao jurídico.
3. Atualizar o Figma com as telas novas, se o professor for cobrar a Etapa 3 junto.
4. Quando o grupo aprovar: juntar o branch na `main` pelo *pull request* (isso publica o site). Antes, rodar os três testes.
5. Depois do PIC: ligar o banco seguindo o `banco/README.md`.

## Glossário rápido

- **Branch:** uma cópia paralela do projeto no GitHub, onde o trabalho é feito sem mexer no site publicado.
- **Pull request (PR):** o pedido para juntar um branch na `main`; o grupo revisa antes de aceitar.
- **RLS (segurança por linha):** regra do banco que decide quais linhas cada pessoa pode ver.
- **Trigger:** regra que o banco executa sozinho ao gravar (por exemplo, recusar evolução já validada).
- **Hash:** uma "impressão digital" do texto; se o texto muda, o hash muda. Prova que nada foi alterado.
- **MFA / verificação em duas etapas:** além da senha, um código de 6 dígitos do aplicativo do celular, que muda a cada 30 segundos (padrão TOTP).
- **Edge Function:** um pedaço de código que roda no servidor do Supabase, para o que não pode ficar no navegador.
