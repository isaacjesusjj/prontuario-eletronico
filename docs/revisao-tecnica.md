# Revisão técnica independente do Vinculum (novembro de 2026)

Branch `revisao-tecnica`. Pedido: validar e revisar todo o projeto e o site, com autonomia para corrigir (prompts em [`docs/prompts/`](prompts/)). Nada foi publicado na `main`.

## Resumo para o grupo (5 linhas)

1. O que **impede ver** o prontuário estava sólido. O que falhava era a **escrita fora de ordem**: ações que conferiam "quem é" mas não "em que estado está" (ex.: encerrar por abandono sem faltas, trocar a dupla sem a passagem, reabrir caso encerrado).
2. Foram **54 achados**: 6 altos, 19 médios, 22 baixos e 7 que precisam de decisão. Todos os defeitos foram corrigidos, cada um com teste.
3. Três problemas apareciam **pela tela, sem console**: a direção lia nomes de pacientes ao encerrar um estágio, a busca ficava para a próxima pessoa e o paciente "avisava" falta depois do horário. Os três estão corrigidos.
4. Os testes cresceram de **389 para 417** no site e de **174 para 201** no banco, todos passando, também no GitHub Actions. Um teste de mutação mostrou três regras que nenhum teste protegia; agora protege.
5. Ficam para decisão do grupo, da clínica ou do jurídico: o que a estagiária vê da equipe, o termo de sigilo exigido também no banco, o e-mail do responsável para lembretes e a situação da Res. CFP 05/2025 no STF (ADI 7911).

## O que foi conferido e como

| O quê | Como | Resultado |
|---|---|---|
| Linha de base | Os três testes na `main` (`31bd555`) | Validador sem problemas · site 389/389 · banco 174/174 |
| Regras de negócio nas ações | Scripts que chamam cada ação "por fora" (como pelo console), com botão e campos falsos, em contexto novo, com 6 perfis + visitante (`docs/revisao/parcial/b1` a `b5`) | 36 achados (RS-01 a RS-36), em [`revisao/achados/regras-site.md`](revisao/achados/regras-site.md) |
| XSS na saída | Carga com `<img onerror>` em ~285 campos de texto livre; todas as rotas e abas com 6 perfis (`parcial/xss_e_pular.py`) | 0 achados |
| XSS em atributos | Busca por atributos montados sem `esc()` | Só ids gerados pelo sistema, nunca texto digitado |
| CSP, armazenamento, console | Leitura do `index.html` e dos `localStorage`/`sessionStorage`/`console` | CSP justa (exceção só do VLibras); termo da busca não vai para endereço, título nem console; erros do adaptador filtrados (`erroSeguro`) |
| Banco por fora do site | Sonda com ~60 operações proibidas pela API (`parcial/sonda_banco.mjs`) | Só 2 aceitas, ambas de projeto (D-01 e D-02) |
| Paridade site × banco × JSON | Cada regra corrigida no site conferida no `schema.sql`; listas do `_config` × `check` do banco | 2 lacunas no banco (BD-01, BD-02), corrigidas; listas coerentes |
| Celular e acessibilidade | Varredura de todas as rotas de 6 perfis em 320 e 390 px, normal, alto contraste e texto em 150%: rolagem lateral, alvos < 24 px, campos < 16 px, h1, ids repetidos, contraste (axe) (`parcial/varredura.py`) | 1 achado (A11Y-01, texto em 150%), corrigido; depois, **0 telas com problema** |
| Os testes provam o que dizem? | Cada teste novo rodado contra o código antigo (tem de falhar) e 7 mutações de regras centrais | 3 regras sem proteção (TST-01 a 03), agora com teste |
| Código | Funções exportadas e definidas sem uso; tamanho dos arquivos | Nenhuma sem uso; JS + CSS = 506 KB sem compressão |
| Documentação | Números e caminhos de menu em `README.md`, `CLAUDE.md`, `docs/*.md`, `banco/README.md`, tela "Regras e leis" e roteiro; `projecao.py` × `banco-de-dados.md` | Caminhos desatualizados corrigidos (DOC-01); projeção bate com o documento |
| Normas | Busca das resoluções mais citadas (CFP 05/2025 e 06/2019) | Existem e dizem o que o site afirma; ver D-03 sobre a ADI 7911 |

Telas abertas de verdade com o Playwright, nos perfis `bia.estagiaria`, `helena.supervisora`, `ana.tecnica`, `paciente01`, `marta.direcao` e visitante (mais `enzo.estagiario`, de fora, e `iara.estagiaria`, do semestre passado), em 320, 390 e 1280 px.

## Achados

Gravidade: **alto** = quebra regra central ou expõe dado; **médio** = regra contornável ou perda de dado; **baixo** = robustez, texto ou detalhe.

### Altos

| ID | Onde | Problema | O que foi feito | Status |
|---|---|---|---|---|
| RS-01 | `acoes.js` (`registrar-contato`, `encerrar-abandono`); `schema.sql` (`encerramento_regras`) | Encerramento por abandono com 0 faltas; motivo em texto livre ia para o indicador | Site e banco exigem 2 faltas seguidas e contato feito depois da primeira falta da sequência atual; canal, resultado e motivo só da lista | Corrigido |
| RS-02 | `acoes.js` (`atribuir-caso`) | Supervisor trocava a dupla de caso em andamento sem a passagem (o banco já recusava) | Só caso ativo sem dupla, para dupla com estagiário ativo | Corrigido |
| RS-03 | `acoes.js` (`alocar-caso`) | Técnica reabria caso encerrado e realocava caso em andamento (o banco já recusava) | Só caso aguardando alocação, para grupo que existe | Corrigido |
| RS-04 | `permissoes.js` (`podeAnularDocumento`) | Autora sem vínculo anulava documento assinado | Autora só enquanto vê o caso (o banco já exigia) | Corrigido |
| RS-05 | `acoes.js` (`encerrar-estagio`) | Direção lia nomes de pacientes no aviso (pela tela) | O aviso diz só quantos casos ficam sem dupla | Corrigido |
| ORQ-01 | `index.html`, `ui.js` | "Pular para o conteúdo" trocava o endereço para `#app` e caía em "Página não encontrada" | O link leva o foco sem mudar o endereço | Corrigido |

### Médios

| ID | Problema | O que foi feito | Status |
|---|---|---|---|
| RS-06 | Técnica abria e incluía anexo sem registrar o motivo | Anexo pede o mesmo acesso do conteúdo clínico (site e banco) | Corrigido |
| RS-07 | Laudo sem avaliação psicológica; limites de tamanho só no HTML | A ação confere a avaliação e os limites | Corrigido |
| RS-08 | Paciente "avisava" falta depois do horário da sessão (pela tela) | Comparação por data **e** hora, no site e no banco (fuso de São Paulo no banco) | Corrigido |
| RS-09 | Lembrete ignorava "Não quero lembretes" e o canal escolhido | Só os canais autorizados e de sessão agendada | Corrigido |
| RS-10 | Termo da busca ficava para a próxima pessoa na mesma aba | Memória das telas zerada na troca de usuário | Corrigido |
| RS-11 | Rascunho por inatividade apagava o resumo de transferência em edição | Guarda o resumo e repõe os campos depois de redesenhar | Corrigido |
| RS-12 | Ações funcionavam antes do termo de sigilo e com senha provisória | Guarda única (`comGuarda`) nega tudo que não seja do primeiro acesso | Corrigido no site; banco: ver D-05 |
| RS-13 / BD-01 | "Gerou cópia do prontuário" entrava na auditoria de caso alheio e aparecia ao paciente | Site confere quem imprime; banco só aceita evento sobre caso que a pessoa vê (`app.alvo_de_auditoria_ok`) | Corrigido |
| RS-14 | Pedido de cópia entregue sem conferir identidade, duplicado e voltando de estado | Fluxo em ordem no site e no banco (`app.solicitacao_regras`) | Corrigido |
| RS-15 | Resposta ao titular sobrescrita | Só pedido aberto (site e `app.pedido_titular_regras`) | Corrigido |
| RS-16 / BD-02 | Triagem repetida criava paciente e caso em dobro | Só inscrição aguardando (site e `app.inscricao_regras`) | Corrigido |
| RS-17 | Evolução ligada a sessão de outro caso, futura ou que já tinha evolução | Só sessão do caso, com presença e sem evolução; índice único no banco | Corrigido |
| RS-18 | Adendo sem motivo | Motivo da lista (site e `check` no banco) | Corrigido |
| RS-19 | Rascunho da dupla antiga impedia o resumo da nova | Conta só resumo enviado/validado ou da dupla atual | Corrigido |
| RS-31 | Id inexistente estourava erro no meio de 20 ações | Permissão sobre registro que não existe é sempre "não" (embrulho em `permissoes.js`) | Corrigido |
| A11Y-01 | Texto em 150% no celular: botão do topo e e-mail longo empurravam a tela (34 px) | Quebra de palavra longa; no celular, com 150%, o topo mostra só o símbolo | Corrigido |
| TST-01 | Nenhum teste pegava "estagiária valida evolução" | Teste novo | Corrigido |
| TST-02 | Nenhum teste pegava o fluxo de abandono abrindo com 1 falta | Teste de fronteira (1 × 2 faltas) | Corrigido |
| TST-03 | Nenhum teste pegava a direção abrindo prontuário pelo endereço | Teste com `#/caso/c01`, `/evolucoes` e `#/imprimir/c01` | Corrigido |

### Baixos

| ID | Problema | Status |
|---|---|---|
| RS-20 | Técnica sem motivo via o selo de risco do caso | Corrigido |
| RS-21 a RS-23, RS-25 | Entrega de documento repetida; consentimento inventado ou em caso encerrado; avaliação, orientação e comunicação em caso encerrado; troca de dupla regravando o vínculo (site e banco) | Corrigido |
| RS-24 | Bloqueio de login contado pelo texto digitado (usuário e e-mail davam dois contadores) | Corrigido: conta por conta |
| RS-26 a RS-30 | Alocar id inexistente; data impossível na agenda; confirmar sessão passada; tipo de pedido e termo inventados; anamnese assinada duas vezes | Corrigido |
| RS-32 | Texto do lembrete com o nome do serviço | Corrigido (a parte do e-mail do responsável é a D-04) |
| RS-33 | Texto do campo "usuário" ia inteiro para a auditoria (podia ser a senha digitada no campo errado) | Corrigido |
| RS-34 a RS-36 | Concordância "Declaração emitido"; listas do risco; importação em dobro | Corrigido |
| ORQ-02, DOC-01 | Caminhos de menu antigos na tela "Regras e leis" e no roteiro | Corrigido, com teste |
| ORQ-03 | CSS sem uso | Corrigido |
| TST-04 | Sem o axe-core instalado, a checagem de acessibilidade era pulada em silêncio | Corrigido: vira falha |
| TST-05 | Teste do anexo dependia do tempo da nova aba | Corrigido |
| A11Y-02 | Caixas de seleção de 20 px, etiquetas-link de 22 px | Corrigido: 24 px e 28 px |

### Precisam de decisão (não mudei sozinho)

| ID | Assunto | Situação hoje | Recomendação |
|---|---|---|---|
| D-01 | A estagiária vê e-mail e matrícula de toda a equipe (política `ver` de `usuarios`) | Por projeto: a equipe se enxerga | Mostrar só nome e perfil a quem não é da coordenação |
| D-02 | A técnica vê a anamnese de caso recém-triado sem registrar motivo | Por projeto: ela mesma fez a triagem | Manter; registrar no documento de LGPD |
| D-03 | A Res. CFP 05/2025 tem dispositivos suspensos pelo STF (ADI 7911). O site já marca o art. 5º como suspenso. Fontes parciais citam também trechos dos arts. 6º e 7º | O site cita o art. 7º, III na notificação compulsória (junto com o ECA e as leis específicas) | O jurídico confere a decisão na ADI 7911; se o 7º, III estiver suspenso, a notificação fica apoiada só nas leis |
| D-04 | Lembrete por e-mail para menor de idade vai ao e-mail do paciente (o WhatsApp vai ao responsável) | Não existe e-mail do responsável no cadastro | Acrescentar o campo (JSON, banco, migração, validador) se a clínica usar e-mail |
| D-05 | O termo de sigilo é exigido no site, não no banco | Pela API, quem não aceitou o termo lê o que o perfil permite | Ao ligar o banco, exigir o aceite vigente em `app.usuario_atual()` |
| D-06 | No modo local (protótipo), a sessão fica no navegador e pode ser forjada pelo console | Inerente ao protótipo | Resolvido ao ligar o banco (RLS com o token do Supabase) |
| D-07 | O contrato terapêutico não é revogável; quem não quer continuar encerra o caso | Implementado assim no site e no banco (RS-22) | O grupo confirma com a clínica |

## Commits

| Commit | Assunto |
|---|---|
| `b048e7e` | Estado salvo da revisão (pausa) |
| `3072579` | Banco: regras de estado nos gatilhos (abandono, pedidos, consentimento, contatos) |
| `d31dd54` | Site: as ações repetem as condições da tela (RS-01 a RS-36), acessibilidade (ORQ-01 a 03) |
| `4b3e066` | Achados de regras-site, scripts de apoio e ponto de retomada |
| `f69c92e` | Site: permissão sobre registro que não existe é sempre "não" (RS-31) |
| `e70fa16` | Banco: triagem uma vez só e auditoria só sobre caso que a pessoa vê |
| `920a007` | Acessibilidade: texto em 150% no celular sem rolagem lateral |
| `6cd8aaf` | Testes: lacunas achadas por mutação |
| `82eda50` | Textos: caminhos de menu na matriz de regras e no roteiro |
| `29b77b1` | Dupla definida só para quem está sem dupla (RS-25) |
| (este) | Relatório e documentos atualizados |

## O que ficou para depois

1. **As decisões D-01 a D-07** acima.
2. **Rodar a revisão com o banco ligado** (Supabase de verdade): o adaptador está testado contra um servidor simulado, não contra o Supabase.
3. **Teste com usuários reais** (estagiários e supervisão) no celular: a varredura confere regras de acessibilidade, não a clareza para quem usa.
4. **Leitor de tela de verdade** (NVDA ou TalkBack): os testes conferem rótulos, foco e anúncio de página, mas não substituem uma pessoa usando.

## Como verificar

```bash
python ferramentas/validar_json.py
```

```bash
python testes/testar_site.py
```

```bash
cd banco && python3 migrar_json.py && node testar_banco.mjs
```

Resultados esperados: validador sem problemas (um aviso de propósito, a sessão s40 do caso c03), **417 de 417** no site (73 telas no axe-core) e **201 de 201** no banco. No GitHub, aba **Actions** do branch `revisao-tecnica`.

Os scripts de apoio da revisão estão em [`revisao/parcial/`](revisao/parcial/) (rodam de qualquer pasta e gravam as saídas na pasta temporária do sistema). A etapa `regras_nas_acoes` do teste do site repete as principais burlas.
