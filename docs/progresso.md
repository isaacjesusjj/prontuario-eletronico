# Progresso do trabalho

Última atualização: 09/11/2026 (etapas A, B, D e os blocos 1 a 4 da etapa E concluídos e publicados). Pausa anterior: 06/11/2026, 22h30.

**Publicado em 08/11/2026:** o branch `andamento-06-11` foi juntado à `main`, e o site no ar tem todas as melhorias.

**Publicado em 09/11/2026:** o redesenho Vinculum (branch `redesign-vinculum`) foi juntado à `main`; a publicação do GitHub Pages e os testes do GitHub Actions passaram. Depois, no mesmo dia, a segunda rodada de ajustes (branch `ajustes-vinculum-2`: Libras, cores, logotipo, "Esqueci minha senha", créditos e clareza), também com publicação e testes sem erro.

Pedido em andamento: "deixar o prontuário profissional, com todas as regras de segurança de dados, login e validações, e com diferenciais". Este arquivo diz onde o trabalho parou e como continuar.

## Como retomar em casa

O branch está no GitHub. Na pasta do projeto:

```bash
git fetch origin andamento-06-11
```

```bash
git checkout andamento-06-11
```

Depois, rode os três testes (comandos no `CLAUDE.md`) antes de mexer em qualquer coisa.

## Resultado dos testes (no último commit deste branch)

| Teste | Comando | Resultado |
|---|---|---|
| Validador do JSON | `python ferramentas/validar_json.py` | **0 problemas**. 1 aviso de propósito: a sessão s40 do caso c03 está sem evolução, para mostrar o alerta de 48 h |
| Site | `python testes/testar_site.py` | **389 de 389** (73 telas conferidas com axe-core, WCAG 2.2 AA) |
| Banco | `cd banco && python3 migrar_json.py && node testar_banco.mjs` | **174 de 174** |

Antes deste trabalho eram 154 verificações no site e 56 no banco.

## O que foi feito (8 commits, cada um com os três testes verdes)

| # | Commit | O que mudou, em uma frase |
|---|---|---|
| 1 | Banco: fecha brechas de acesso e de integridade pela API | Quem chamava a API direto conseguia virar técnico, gravar evolução já validada, pedir a cópia de outro paciente e mudar datas. Agora o próprio banco recusa (triggers de regras, carimbo de tempo do servidor, hash da assinatura conferido). |
| 2 | Site e adaptador: validações, login mais resistente e banco pronto de verdade | Validações de encerramento, agenda (duração de 50 min), limite de texto, bloqueio de login progressivo (30 s → 15 min) e rascunho automático. Também corrige 8 falhas do adaptador do Supabase que só apareceriam com o banco ligado. |
| 3 | Risco e segurança | Avaliação de risco no caso, com ciência da supervisão, notificação compulsória (órgão, prazo e lei à vista) e plano de segurança (Stanley e Brown), que o paciente lê no portal. |
| 4 | Revisor de escrita clínica e "Ver como o paciente lê" | Tutor de escrita sem IA, com regras em `_config.revisorEscrita`: aponta juízo de valor, linguagem estigmatizante, dado identificável e falta de plano. O botão mostra o registro como sai na cópia do paciente. |
| 5 | Privacidade | A técnica registra o motivo antes de abrir o conteúdo clínico de caso que não é dela. O paciente vê "quem acessou o seu prontuário" (LGPD, arts. 9º e 18). Também ganha "modo discreto" e "cobrir tela". |
| 6 | Faltas avisadas pelo paciente, sinal de urgência na fila e prazo de 48 h | O paciente avisa a falta pelo portal, com motivo de uma lista fechada, e os motivos viram indicador. Relato urgente no formulário público mostra os contatos de crise e sobe na fila. |
| 7 | Contas | A direção gera senha provisória e desativa ou reativa contas. A técnica cria o acesso do paciente ao portal. |
| 8 | Verificação em duas etapas (MFA) | Código de 6 dígitos do aplicativo autenticador (RFC 6238), com códigos de recuperação e o mesmo código sem valer duas vezes. O banco não deixa ver nada quem ligou o MFA e entrou só com a senha. Regra `mfaObrigatoria` desligada no protótipo. |

As mensagens completas dos commits (`git log main..andamento-06-11`) explicam o porquê de cada mudança: servem de roteiro para a banca.

## O que ficou pela metade

Nada ficou pela metade no código: a pausa foi feita logo depois de um commit com tudo verde.

**Feito em 08/11 (etapa A, documentação):**

- `CLAUDE.md`: contagens dos testes, regras novas que não podem quebrar e pendências.
- `README.md`: funcionalidades novas, registro de correções do protótipo e registro de decisões.
- `docs/diagramas.md`: DER com as tabelas novas, navegação e casos de uso (os três diagramas foram conferidos: o Mermaid lê e desenha sem erro).
- `docs/lgpd.md` (registro das operações e relatório de impacto), `banco/README.md` (29 tabelas, garantias, MFA e Edge Functions) e `docs/roteiro-apresentacao.md` (passo 9 com os diferenciais e respostas novas). Os passos novos do roteiro foram percorridos no site e funcionam.
- Tela "Regras e leis": linha da verificação em duas etapas.

**Feito em 08/11 (etapa B, transição de semestre):**

- **Resumo de transferência**: evolução de tipo `transferencia`, sem sessão. O rascunho já vem com período, sessões, faltas, demanda e objetivos tirados do prontuário; o estagiário completa três seções (lista em `_config.listas.secoesResumoTransferencia`) e a supervisão valida como uma evolução. O risco não entra no texto (fica na aba própria, que não sai na cópia de criança ou adolescente).
- **Passagem do caso** (quadro no resumo do caso): lista de conferência (o que impede e o que é só atenção), nova dupla com estagiário ativo, paciente avisado e resumo validado ou justificativa. Fica registrada na tabela nova `transferencias`; a dupla anterior perde o acesso na hora e o prontuário continua inteiro.
- **Avisos**: caso sem dupla ativa no painel da supervisão e da técnica e na alocação; ao encerrar o estágio do último da dupla, a direção é avisada de quais casos ficam sem dupla.
- **Banco**: tabela `transferencias`, triggers `app.transferencia_regras` e `app.transferencia_aplicar`; caso com dupla só muda de dupla pela passagem. O paciente vê "passou o seu atendimento para outra dupla" em "quem acessou".
- Testes novos: 17 no site e 17 no banco.

**Feito em 08/11 (etapa D, relatório final):** [`relatorio-final.md`](relatorio-final.md), com o que mudou (problema → o que fizemos → como mostrar), o que dizer sobre o JSON, o que validar e com quem, os limites e os próximos passos.

**Feito em 08/11 (etapa E, blocos 1 e 2, a partir da comparação com outro prontuário):** feito no branch `melhorias-bloco-1-2` e publicado na `main` no mesmo dia.

- Bloco 1: contato de emergência; "Inserir modelo" na evolução; busca de paciente; último acesso depois do login; auditoria com filtros e planilha; guarda de menor a partir dos 18 anos; contrato com a Res. CFP 13/2022; testes no GitHub Actions.
- Bloco 2: documentos psicológicos da Res. CFP 06/2019 (cinco modalidades, impressão e protocolo) e comunicações e compartilhamentos.
- Bloco 3 (feito no branch `melhorias-bloco-3` e publicado na `main` no mesmo dia): sala na agenda, com recusa de sala ocupada (site e banco) e filtro por sala; gráfico de atendimentos por mês no painel e nos indicadores (sem biblioteca de terceiros, cores validadas para daltonismo); e a correção do aviso flutuante invisível no alto contraste.
- Banco de dados e projeções (09/11, branch `banco-e-projecoes`): documento novo [`banco-de-dados.md`](banco-de-dados.md), que organiza num lugar só o JSON → banco, as 32 tabelas por assunto, o que o banco garante, quem vê o quê, as projeções por cenário, planos, custos e guarda. A projeção (`banco/projecao.py`) passou a contar as 32 tabelas, com o tamanho das linhas medido no banco de teste: cenário atual ~109 MB/ano (antes 84) e ~2,1 GB em 20 anos (antes 1,6).
- Bloco 4, segunda rodada (09/11, branch `ajustes-vinculum-2`, publicado na `main` no mesmo dia): Libras consertado (o VLibras 7 passou a redirecionar para o jsDelivr, que a política de segurança bloqueava; avatar testado de verdade no navegador); menos branco (topo verde, fundo esverdeado, rodapé verde-escuro); Vinculum em destaque na entrada com o logotipo da Faculdade menor embaixo; "Esqueci minha senha" numa tela curta; nomes do grupo na entrada e no rodapé; uma frase explicando cada aba, cada item do "Mais" e as telas principais. Também corrigida a coluna de navegação, que passava por cima do topo no fim das páginas longas.
- Bloco 4 (feito em 09/11 no branch `redesign-vinculum` e publicado na `main` no mesmo dia): redesenho aprovado pelo grupo. Nome **Vinculum** no site e em todos os documentos (o endereço continua o mesmo); verde da Faculdade e uma fonte só; logotipo da Faculdade (com autorização) na entrada, no "Sobre" e nos documentos impressos; no celular, topo curto com o menu da conta e barra de navegação embaixo (o resto em "Mais"); no computador, coluna à esquerda; painel com uma linha de números e uma lista de pendências; prontuário com 6 abas; pedidos da técnica num item só; busca numa página própria; entrada curta. Detalhes na seção "Redesenho Vinculum" do `README.md`. Testes novos: etapa "navegação e identidade" (celular, computador, menu da conta, abas, pendências, logotipo).

Ficou **de fora, por decisão do grupo**:

1. **Escalas PHQ-9 e GAD-7** (opcional): só o lançamento do escore, com gráfico, e o item 9 abrindo a avaliação de risco. O texto oficial em português não pôde ser conferido nesta sessão, porque os sites estavam bloqueados. Por isso o plano é não reproduzir os itens, só os escores.

## Próximo passo

1. Revisão do grupo: cada integrante percorre o passo 9 do roteiro (lista em `relatorio-final.md`).
2. Validar com a supervisão e o jurídico (lista abaixo e no relatório).
3. Atualizar o Figma com as telas novas, se a Etapa 3 for cobrada junto.
4. Próximas conversas: passo a passo do banco de dados e versão em aplicativo (instalável no celular ou outra opção). O Figma (Etapa 3) precisa ganhar o visual novo.

## Para validar com quem é de fora do grupo

- **Supervisão clínica**: os níveis de risco e as condutas, o texto do plano de segurança, a lista de motivos de falta, as regras do revisor de escrita e as seções do resumo de transferência.
- **Jurídico ou encarregado de dados (DPO)**: os órgãos e prazos de notificação compulsória e o que o portal mostra para criança ou adolescente. Também: a validade de 12 h do motivo de acesso da técnica e o MFA obrigatório para a equipe em produção.
- **Lembrete**: o modo local (dados no navegador) é protótipo e **não serve para dados reais**. Para uso de verdade, é preciso ligar o Supabase, criar as Edge Functions (link do paciente, convite por e-mail e desligar o MFA de quem perdeu o celular), ativar o MFA obrigatório e ter as aprovações da instituição.

## Observação sobre os branches

- `andamento-06-11` tem tudo e está no GitHub: os 8 commits de trabalho, os deste documento, o da documentação, o da transição de semestre e o do relatório final.
- `melhorias-prontuario` existia só nesta máquina e tem os 7 primeiros commits. Não precisa ser usado: o `andamento-06-11` o substitui.
