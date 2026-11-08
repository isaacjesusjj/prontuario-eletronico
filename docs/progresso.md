# Progresso: pausa de 06/11/2026, 22h30

Branch: `andamento-06-11`. A `main` (que publica o site) **não foi alterada**: o site no ar continua igual.

Pedido em andamento: "deixar o prontuário profissional, com todas as regras de segurança de dados, login e validações, e com diferenciais". Este arquivo diz onde o trabalho parou e como continuar.

## Como retomar em casa

Se o branch já estiver no GitHub:

```bash
git fetch origin andamento-06-11
```

```bash
git checkout andamento-06-11
```

Se o branch ainda não estiver no GitHub (o envio pela sessão do Claude foi recusado por falta de permissão), use o pacote `andamento-06-11.bundle`. Ele traz os commits feitos depois da `main` atual (c21115c). Na pasta do projeto, ajuste o caminho do arquivo:

```bash
git fetch origin
```

```bash
git fetch ~/Downloads/andamento-06-11.bundle andamento-06-11:andamento-06-11
```

```bash
git checkout andamento-06-11
```

```bash
git push -u origin andamento-06-11
```

Depois, rode os três testes (comandos no `CLAUDE.md`) antes de mexer em qualquer coisa.

## Resultado dos testes (no último commit deste branch)

| Teste | Comando | Resultado |
|---|---|---|
| Validador do JSON | `python ferramentas/validar_json.py` | **0 problemas**. 1 aviso de propósito: a sessão s40 do caso c03 está sem evolução, para mostrar o alerta de 48 h |
| Site | `python testes/testar_site.py` | **270 de 270** (57 telas conferidas com axe-core, WCAG 2.2 AA) |
| Banco | `cd banco && python3 migrar_json.py && node testar_banco.mjs` | **133 de 133** |

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

Ficou **por fazer** (planejado, não começado):

1. **Documentação desatualizada.** `CLAUDE.md` ainda fala em 154 e 56 verificações (agora são 270 e 133) e ainda lista o MFA como pendência. O `README.md` não tem o registro de correções e decisões destes 8 commits. Faltam também `docs/roteiro-apresentacao.md` (novos passos da demonstração), `docs/diagramas.md` (DER com as tabelas novas `riscos`, `notificacoes`, `planos_seguranca` e `acessos_justificados`), `docs/lgpd.md` (RIPD) e `banco/README.md` (MFA e o que fica para Edge Function).
2. **Tela "Regras e leis"**: falta a linha da verificação em duas etapas (as outras funções novas já têm a sua).
3. **Transição de semestre**: resumo de transferência do caso, checklist, lista de casos sem dupla ativa e realocação.
4. **Escalas PHQ-9 e GAD-7** (opcional): só o lançamento do escore, com gráfico, e o item 9 abrindo a avaliação de risco. O texto oficial em português não pôde ser conferido nesta sessão, porque os sites estavam bloqueados. Por isso o plano é não reproduzir os itens, só os escores.

## Próximo passo

1. Atualizar o `CLAUDE.md` (contagens e pendências) e o `README.md` (registro de correções e de decisões).
2. Acrescentar a linha do MFA em "Regras e leis" e rodar os três testes.
3. Fazer a transição de semestre.
4. Atualizar os documentos da pasta `docs/` e o `banco/README.md`.
5. Revisão do grupo. Só depois de aprovado, abrir o PR para a `main` (o merge publica o site).

## Para validar com quem é de fora do grupo

- **Supervisão clínica**: os níveis de risco e as condutas, o texto do plano de segurança, a lista de motivos de falta e as regras do revisor de escrita.
- **Jurídico ou encarregado de dados (DPO)**: os órgãos e prazos de notificação compulsória e o que o portal mostra para criança ou adolescente. Também: a validade de 12 h do motivo de acesso da técnica e o MFA obrigatório para a equipe em produção.
- **Lembrete**: o modo local (dados no navegador) é protótipo e **não serve para dados reais**. Para uso de verdade, é preciso ligar o Supabase, criar as Edge Functions (link do paciente, convite por e-mail e desligar o MFA de quem perdeu o celular), ativar o MFA obrigatório e ter as aprovações da instituição.

## Observação sobre os branches

- `andamento-06-11` tem tudo: os 8 commits de trabalho e os deste documento.
- `melhorias-prontuario` existia só nesta máquina e tem os 7 primeiros commits. Não precisa ser usado: o `andamento-06-11` o substitui.
