# Progresso do trabalho

Última atualização: 08/11/2026 (etapas A, documentação, e B, transição de semestre, concluídas). Pausa anterior: 06/11/2026, 22h30.

Branch: `andamento-06-11`. A `main` (que publica o site) **não foi alterada**: o site no ar continua igual.

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
| Site | `python testes/testar_site.py` | **287 de 287** (59 telas conferidas com axe-core, WCAG 2.2 AA) |
| Banco | `cd banco && python3 migrar_json.py && node testar_banco.mjs` | **150 de 150** |

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

Ficou **por fazer**:

1. **Escalas PHQ-9 e GAD-7** (opcional): só o lançamento do escore, com gráfico, e o item 9 abrindo a avaliação de risco. O texto oficial em português não pôde ser conferido nesta sessão, porque os sites estavam bloqueados. Por isso o plano é não reproduzir os itens, só os escores.

## Próximo passo

1. Etapa C (opcional, perguntar ao grupo antes): escalas PHQ-9 e GAD-7 só com escores.
2. Etapa D: relatório final para o grupo (o que dizer na banca e o que validar).
3. Revisão do grupo. Só depois de aprovado, abrir o PR para a `main` (o merge publica o site).

## Para validar com quem é de fora do grupo

- **Supervisão clínica**: os níveis de risco e as condutas, o texto do plano de segurança, a lista de motivos de falta, as regras do revisor de escrita e as seções do resumo de transferência.
- **Jurídico ou encarregado de dados (DPO)**: os órgãos e prazos de notificação compulsória e o que o portal mostra para criança ou adolescente. Também: a validade de 12 h do motivo de acesso da técnica e o MFA obrigatório para a equipe em produção.
- **Lembrete**: o modo local (dados no navegador) é protótipo e **não serve para dados reais**. Para uso de verdade, é preciso ligar o Supabase, criar as Edge Functions (link do paciente, convite por e-mail e desligar o MFA de quem perdeu o celular), ativar o MFA obrigatório e ter as aprovações da instituição.

## Observação sobre os branches

- `andamento-06-11` tem tudo e está no GitHub: os 8 commits de trabalho, os deste documento, o da documentação e o da transição de semestre.
- `melhorias-prontuario` existia só nesta máquina e tem os 7 primeiros commits. Não precisa ser usado: o `andamento-06-11` o substitui.
