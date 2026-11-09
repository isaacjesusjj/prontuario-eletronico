# Vinculum — Prontuário Eletrônico da Clínica-Escola de Psicologia

Protótipo funcional do **Projeto Integrador de Curso (PIC)** — Análise e Desenvolvimento de Sistemas, Faculdade de Ciências Médicas da Santa Casa de São Paulo, 2º semestre de 2026.

**Site:** https://isaacjesusjj.github.io/prontuario-eletronico/

**Grupo:** Daniel Dantas, Dilson Rodrigues e Isaac de Jesus Lima.

> ⚠️ **Protótipo acadêmico, pronto para ligar o banco.** Todos os dados são fictícios. Hoje os dados ficam no navegador; o banco (PostgreSQL no Supabase) já tem schema, migração e testes prontos em [`banco/`](banco/README.md). A troca é uma linha em `js/config-banco.js`.

---

## O problema

Na clínica-escola, os registros são feitos em papel, e muitos pacientes vêm à primeira sessão e não voltam. Não existe hoje um jeito de saber **por que** eles abandonam o tratamento.

## A solução

O Vinculum acompanha o paciente da fila de espera até o encerramento, com a supervisão presente em cada registro:

- **Fila de espera online** com aviso de urgência (SAMU 192, CVV 188), validação de CPF, telefone e data de nascimento, e regra para menores (responsável legal autoriza).
- **CPF já cadastrado:** o formulário público não revela (mesma mensagem para todos); a equipe vê a duplicidade na fila e, na triagem, o novo caso é ligado ao cadastro existente.
- **Triagem e cadastro** com consentimentos separados por finalidade, cada um com data, responsável e versão do termo; revogar vira novo registro.
- **Alocação:** a direção monta os grupos e encerra os vínculos no fim do semestre; o supervisor forma duplas ou trios; o técnico aloca os pacientes (só com contrato terapêutico registrado).
- **Prontuário do caso:** anamnese, demanda e objetivos com versões, evoluções (com modelo de sessão e de acolhimento), anexos com upload real e cópia em PDF.
- **Documentos psicológicos (Res. CFP 06/2019):** declaração, atestado, relatório, laudo e parecer, cada um com as suas seções; prazo de validade; declaração sem termo clínico; laudo só com avaliação psicológica; impressão com páginas numeradas e protocolo de entrega; registro da entrega e da devolutiva; anulação com motivo.
- **Comunicações e compartilhamentos:** tudo o que é passado a terceiros fica registrado com data, destinatário, finalidade e fundamento; quebra de sigilo só pela supervisão ou pela técnica; o paciente vê com quem os dados dele foram compartilhados (LGPD, art. 18, VII).
- **Busca de paciente** no item "Buscar" (só entre os casos que a pessoa pode ver, sem o nome no endereço da página) e **contato de emergência** no cadastro.
- **Evolução com validação:** rascunho → enviada → validada (assinatura do estagiário e do supervisor, com hash do texto) → bloqueada. Correção só por adendo.
- **Fluxo de abandono:** duas faltas seguidas sem justificativa abrem o registro de contato e motivo antes de liberar a vaga.
- **Agenda com sala**: cada sessão tem sala, e a mesma sala não recebe duas sessões que se sobrepõem; filtro por sala para ver a ocupação.
- **Gráfico de atendimentos por mês** no painel e nos indicadores (presença, falta justificada e falta sem justificativa), feito sem biblioteca de terceiros, com legenda, detalhe pelo teclado e tabela com os números; cores conferidas para daltonismo, também no alto contraste.
- **Agenda em calendário** (dia, semana, mês e lista) e **lembretes** por WhatsApp ou e-mail, sem conteúdo clínico e só com autorização.
- **Acesso do paciente:** pedido de cópia, conferência de identidade e **link de leitura temporário** (72 h, confirma a data de nascimento, o sistema guarda só o hash).
- **LGPD:** aviso de privacidade, termos de uso, termo de sigilo no primeiro acesso, "Meus dados" do paciente (direitos do art. 18) e fila de pedidos com prazo.
- **Risco e segurança:** avaliação de risco no caso (tipo, nível e condutas), com ciência da supervisão; notificação compulsória registrada pelo supervisor, com órgão, lei e prazo à vista; plano de segurança feito com o paciente, que ele lê no portal. Na cópia ao responsável de criança ou adolescente, o relato de violência fica de fora.
- **Revisor de escrita clínica** (sem inteligência artificial; o texto não sai do navegador): aponta juízo de valor, linguagem estigmatizante, dado que identifica alguém e falta de plano. "Ver como o paciente lê" mostra o registro como sai na cópia.
- **Privacidade:** a técnica registra o motivo antes de abrir o conteúdo clínico de caso que não é da equipe dela; o paciente vê "quem acessou o seu prontuário"; modo discreto (iniciais no lugar de nomes) e "Cobrir tela".
- **Faltas avisadas pelo paciente** pelo portal, com motivo de lista fechada, que viram indicador. Relato urgente no formulário público mostra os contatos de crise e sobe na fila. Evolução atrasada (mais de 48 h) aparece no painel.
- **Transição de semestre:** no fim do estágio, o estagiário escreve o **resumo de transferência** (o rascunho já vem com período, sessões, demanda e objetivos tirados do prontuário) e a supervisão valida. A **passagem do caso** para a nova dupla tem lista de conferência, exige o paciente avisado e o resumo validado (ou uma justificativa) e fica registrada; a dupla anterior perde o acesso e o prontuário continua inteiro. Os casos sem dupla ativa aparecem no painel.
- **Contas:** a direção gera senha provisória e desativa ou reativa contas da equipe; a técnica cria e cuida do acesso do paciente ao portal.
- **Segurança:** senhas só como hash (PBKDF2, 600 mil iterações), política de senha do NIST (15 caracteres, sem regra de símbolo), senha provisória com troca obrigatória, bloqueio progressivo por tentativas (30 s até 15 min), **verificação em duas etapas** (código do aplicativo autenticador e códigos de recuperação), sessão que encerra por inatividade com aviso (o texto em edição vira rascunho), auditoria com cadeia de hash verificável, filtros e exportação em planilha, aviso de último acesso e tentativas sem sucesso depois do login. No banco, as mesmas regras valem para quem chamar a API direto.
- **Feito para celular e tablet:** barra de navegação embaixo (até 5 itens; o resto fica em "Mais"), topo curto com o menu da conta, campos e botões com área de toque grande, abas do prontuário que rolam para o lado. No computador, a navegação vira uma coluna à esquerda.
- **Acessibilidade** (ABNT NBR 17225 / WCAG 2.2 AA): pular para o conteúdo, A−/A+, alto contraste, VLibras (no menu da conta), erros ligados aos campos, títulos por tela. Telas conferidas com axe-core, também no celular, sem violações.
- **Indicadores agregados:** pacientes atendidos, taxa de retorno, média de sessões, motivos de abandono e de falta avisada, casos ativos e espera na fila.

As regras e as normas de onde elas vêm estão no próprio site, em **Regras e leis** (`#/regras`).

## Como usar

- **Online:** abra o link do GitHub Pages.
- **No computador:** abra a pasta no VS Code com a extensão **Live Server** (ou rode `python -m http.server` e acesse `http://localhost:8000`). Com dois cliques no `index.html` o navegador bloqueia a leitura do JSON e a criptografia.
- Antes de apresentar, use **"Restaurar dados de demonstração"** na tela de entrada.

### Contas de demonstração

Senha de todas: **`demonstracao2026`** (no JSON só existe o hash). Na tela de login, clicar numa conta preenche o usuário e a senha.

| Perfil | Quem | Usuário | O que mostrar |
|---|---|---|---|
| Estagiário(a) | Bia · Duda · Enzo | `bia.estagiaria` · `duda.estagiaria` · `enzo.estagiario` | Bia ainda não aceitou o termo de sigilo: mostra o primeiro acesso |
| Supervisor(a) | Helena (Grupo A) · Rafael (Grupo B) | `helena.supervisora` · `rafael.supervisor` | Valida ou devolve evoluções; orientações fora do prontuário; risco e notificação (casos c03 e c04) |
| Psicólogo(a) técnico(a) | Ana Lúcia | `ana.tecnica` | Fila (inscrição i05 com CPF já cadastrado), triagem, acesso do paciente, pedidos LGPD, auditoria |
| Paciente | Paciente Exemplo 01 | `paciente01` | Confirma sessão, pede cópia, "Meus dados" |
| Direção do curso | Marta | `marta.direcao` | Indicadores, grupos, importar estudantes, encerrar vínculo |

Também existem `caio.estagiario`, `lia.estagiaria`, `fabio.estagiario`, `gabi.estagiaria`, `hugo.estagiario` (sem grupo) e `iara.estagiaria` (vínculo do semestre passado, encerrado: entra, mas não vê casos).

**Datas da demonstração:** os dados foram escritos como se hoje fosse 06/11/2026 (`_meta.dataBase`). O site desloca todas as datas para que esse dia vire o dia de hoje; assim, no dia da apresentação, a sessão "de hoje" e as próximas sessões continuam corretas.

O roteiro da apresentação está em [`docs/roteiro-apresentacao.md`](docs/roteiro-apresentacao.md). O resumo das melhorias de novembro, com o que validar e com quem, está em [`docs/relatorio-final.md`](docs/relatorio-final.md).

## Estrutura

```
index.html                  página única; carrega os scripts na ordem
css/estilo.css              identidade visual (verde da FCMSCSP), celular primeiro, alto contraste
fontes/                     fonte Public Sans servida pelo próprio site (licença SIL OFL)
img/                        logotipo da Faculdade (uso autorizado para o projeto)
dados/dados-iniciais.json   dados fictícios: uma coleção por tabela do banco, + _config (listas e regras)
js/config-banco.js          ÚNICO lugar para trocar o JSON pelo banco
js/repositorio.js           camada de dados: toda gravação passa por aqui
js/adaptador-supabase.js    adaptador do PostgreSQL/Supabase (desligado até a migração)
js/dados.js                 lê o JSON, configuração e datas relativas
js/seguranca.js             SHA-256, hash de senha (PBKDF2), política de senha, tokens, código da verificação em duas etapas
js/estado.js                sessão, login (com duas etapas), bloqueio progressivo e auditoria encadeada
js/validadores.js           CPF, telefone, e-mail, datas, arquivos, máscaras e erros acessíveis
js/arquivos.js              upload real (IndexedDB hoje; Supabase Storage com o banco)
js/permissoes.js            regras de acesso e de negócio (iguais às políticas RLS do banco)
js/ui.js, acessibilidade.js topo e menu da conta, navegação (barra embaixo ou coluna), rodapé, A−/A+, contraste, VLibras
js/privacidade.js           modo discreto e "Cobrir tela"
js/revisor.js               revisor de escrita clínica (regras em _config.revisorEscrita)
js/telas-*.js               telas (entrada, painéis, prontuário, risco e segurança, gestão, agenda, conta, LGPD)
js/acoes.js                 o que cada botão e formulário faz
js/inicio.js                rotas (#/rota), primeiro acesso, inatividade e inicialização
banco/                      schema PostgreSQL, migração JSON → banco, testes e projeção
testes/                     testes automáticos do site (Playwright + axe-core)
ferramentas/validar_json.py confere o JSON antes de migrar
docs/                       banco de dados e projeções, roteiro, diagramas (DER, navegação, casos de uso), LGPD, baixa fidelidade
```

Decisões técnicas: HTML, CSS e JavaScript puros, sem frameworks nem build; scripts clássicos; caminhos relativos; layout responsivo; sem chamadas a servidores de terceiros; política de segurança de conteúdo (CSP) no `index.html`.

## Banco de dados

PostgreSQL no Supabase (região São Paulo). Projeção (conta em `banco/projecao.py`, com as 32 tabelas): ~109 MB por ano no cenário atual (800 estudantes, 400 pacientes por semestre) e ~2,1 GB em 20 anos de guarda, mais ~2,9 GB de anexos; cabe no plano Pro (8 GB de banco). **Tudo organizado em [`docs/banco-de-dados.md`](docs/banco-de-dados.md)**: como o JSON vira o banco, as tabelas por assunto, o que o banco garante, quem vê o quê, projeções por cenário, planos e custos, guarda dos dados e próximo passo. O passo a passo para ligar está em [`banco/README.md`](banco/README.md).

## Testes

| O quê | Como rodar | Resultado |
|---|---|---|
| Site: regras, validadores, segurança, LGPD, acessibilidade | `python testes/testar_site.py` | [`testes/resultado-testes.md`](testes/resultado-testes.md) — 389 de 389 |
| Banco: schema, migração, imutabilidade, RLS por perfil, regras contra o uso direto da API, MFA, auditoria | `cd banco && python3 migrar_json.py && node testar_banco.mjs` | [`banco/resultado-teste.md`](banco/resultado-teste.md) — 174 de 174 |
| JSON antes de migrar | `python ferramentas/validar_json.py` | 0 problemas |

Preparação: `pip install playwright`, `cd testes && npm install` e `cd banco && npm install`. No GitHub, os três testes rodam sozinhos a cada envio (aba **Actions**, arquivo `.github/workflows/testes.yml`).

## Registro de correções em relação à Etapa 1

Mudanças feitas pelo grupo ao validar os requisitos da Etapa 1. **Devem ser confirmadas com o cliente.**

| O que estava | O que ficou | Por quê |
|---|---|---|
| Direção do curso via todos os prontuários, documentos e dados de pacientes | Direção vê só indicadores agregados e grupos de estágio | Sigilo (Código de Ética) e princípio da necessidade (LGPD) |
| Tabela permitia ao Psicólogo Técnico editar/remover evolução | Ninguém edita ou apaga evolução validada; correção só por adendo | Coerência com o próprio requisito de imutabilidade da Etapa 1 |
| Evolução salva pelo estudante, sem revisão | Ciclo com validação e assinatura do supervisor | Res. CFP 01/2009, art. 3º, e Res. CFP 05/2025, art. 19 |
| Técnico "autorizava" o acesso do paciente | O sistema registra o pedido, confere a identidade e entrega | O prontuário é de acesso irrestrito ao paciente (Res. CFP 05/2025, art. 13) |
| Testes psicológicos anexados ao prontuário e incluídos no PDF | Testes numa área restrita, fora do prontuário e do PDF | Res. CFP 05/2025, art. 14, e Res. CFP 01/2009 |
| Local das orientações de supervisão não definido | Registro de supervisão separado, fora do prontuário e do PDF | Res. CFP 05/2025, art. 17 |
| Duas faltas → realocar outro paciente | Duas faltas sem justificativa abrem o fluxo de contato e motivo; só então a vaga é liberada | Ataca a dor principal do cliente: saber por que o paciente não volta |
| Supervisor acessava "todos os casos" | Supervisor acessa os casos dos seus grupos | Princípio da necessidade; a técnica responsável continua vendo todos, com auditoria |
| Alocação com três responsáveis diferentes | Direção monta grupos; supervisor forma duplas/trios; técnico aloca pacientes | Inconsistência entre requisitos, casos de uso e funcionalidades |
| Escalabilidade: "800 usuários simultâneos" × "800 estudantes" | Tratado como 800 estudantes cadastrados no total | Os dois números da Etapa 1 se contradiziam (validar com o cliente) |
| Chat paciente–psicólogo e notificações (no protótipo v1) | Sem chat; lembretes sem conteúdo clínico | Mensagens de crise poderiam ficar sem ninguém olhando |
| Fila de espera sem orientação de urgência | Aviso de urgência e de privacidade no formulário público | Quem está em risco não pode esperar a fila |

**Sugestão para validar com o cliente:** perda de vaga também com 3 faltas intercaladas sem justificativa (regra comum em clínicas-escola).

## Registro de correções do protótipo (novembro de 2026)

Falhas encontradas na revisão do protótipo e corrigidas. Os commits do branch `andamento-06-11` detalham cada uma.

| O que estava | O que ficou | Por quê |
|---|---|---|
| Pela API, sem passar pelas telas, dava para mudar o próprio perfil para técnico, gravar evolução já "validada", pedir a cópia de outro paciente e retroagir datas | O banco recusa: triggers com as regras de transição, só a coluna `senha_provisoria` muda na própria conta, hora carimbada pelo servidor, hash da assinatura conferido | A regra precisa valer no banco, não só na tela (o site pode ser contornado) |
| Encerramento manual deixava encerrar por abandono sem a tentativa de contato | Abandono só pelo fluxo de faltas; encaminhamento exige o serviço de destino; evolução pendente impede encerrar | O motivo do abandono é o dado que o cliente mais quer |
| Conflito de agenda só com a mesma hora exata | Conflito pela duração da sessão (50 min) | Duas sessões às 14h e 14h30 se sobrepunham |
| Bloqueio de login sempre de 30 s | Bloqueio progressivo (30 s, 60 s, 2 min... até 15 min) | Dificulta adivinhar senha sem atrapalhar quem só errou uma vez |
| Adaptador do Supabase com 8 falhas que só apareceriam com o banco ligado (inclusão sempre falhava, hora sem fuso, token sem renovação, erro com dados no console...) | Corrigido e testado contra um servidor simulado | O banco precisa funcionar na primeira vez que for ligado |
| Risco identificado na triagem virava só um texto na auditoria | Avaliação de risco no caso, com ciência da supervisão, notificação e plano de segurança | Ninguém era avisado nem acompanhava o risco |
| A tela de login prometia senha provisória, mas não havia como gerar | Direção e técnica geram senha provisória e cuidam das contas | Promessa da tela sem função por trás |
| No alto contraste, o aviso flutuante ("toast") ficava com letra branca em fundo branco | Fundo preto, letra branca e borda amarela | Justamente quem precisa do contraste não lia as confirmações |
| Técnica abria qualquer prontuário sem registro do porquê | Motivo registrado antes de abrir o conteúdo clínico de caso que não é dela | Princípio da necessidade (LGPD, art. 6º, III) e prestação de contas ao paciente |

## Redesenho Vinculum (novembro de 2026)

Pedido do grupo: visual mais limpo, identidade da Faculdade Santa Casa, foco em celular e tablet e menos redundância. Os testes do site ganharam a etapa "navegação e identidade".

| O que estava | O que ficou | Por quê |
|---|---|---|
| Nome Vínculo | **Vinculum** ("laço", em latim), no site e em todos os documentos; o endereço do site continua o mesmo | Decisão do grupo |
| Lilás e dourado, duas fontes (serifa nos títulos) | Verde da FCMSCSP (`#007931`), uma fonte só (Public Sans), fundo claro, logotipo da Faculdade na entrada, no "Sobre" e nos documentos impressos | Identidade da instituição; menos peso visual e menos arquivos para baixar |
| No celular, topo com 9 botões ocupava um terço da tela | Topo de 56 px: marca e um botão da conta, que abre modo discreto, cobrir a tela, tamanho do texto, contraste, Libras, Minha conta e Sair | O conteúdo aparece logo na primeira tela |
| Menu em faixa que rolava para o lado, no alto | Barra fixa embaixo, ao alcance do polegar (até 5 itens; o resto em "Mais"); no computador, coluna à esquerda | Padrão de aplicativo de celular; o técnico tinha 10 itens numa faixa |
| Painel com até 5 avisos coloridos empilhados, 3 a 4 cartões de número e cartões que repetiam o menu | Uma linha de números, uma lista única de "Pendências" (cada item diz o que fazer) e as próximas sessões | Menos coisa para ler; nada importante fica escondido |
| Prontuário com 8 abas em 4 linhas no celular | 6 abas que rolam para o lado: Resumo, Evoluções, Risco, Sessões, Documentos e Área restrita (supervisão + avaliação psicológica, que ficam fora do prontuário); encerramento por um botão no fim do Resumo | O encerramento é usado uma vez por caso; supervisão e avaliação têm a mesma regra (fora da cópia do paciente) |
| Técnica com "Acesso do paciente" e "Pedidos LGPD" em itens separados | Um item, "Pedidos", com as duas partes lado a lado | São os dois tipos de pedido do paciente |
| Campo de busca no menu, em toda tela | Página "Buscar" | Um lugar só; no celular não cabia no menu |
| Entrada com 2.900 px de altura no celular | Entrada curta: login, contas de demonstração em grade de duas colunas e a fila de espera | O que importa aparece sem rolar |
| Rótulos e cabeçalhos de tabela em caixa alta | Texto normal, selos arredondados | Caixa alta é mais difícil de ler |
| Campos com letra de 15,5 px | Campos com 16 px e 44 px de altura | Abaixo de 16 px o iPhone dá zoom ao tocar no campo; 44 px é o alvo de toque recomendado |

**Segunda rodada (pedido do grupo, 09/11):**

| O que estava | O que ficou | Por quê |
|---|---|---|
| Muito branco: topo, cartões e fundo quase todos brancos | Topo verde, fundo esverdeado, rodapé verde-escuro; os cartões brancos se destacam do fundo | Identidade mais presente e telas menos "lavadas" |
| Logotipo da Faculdade acima do Vinculum, do mesmo tamanho | Vinculum em destaque numa faixa verde e o logotipo da Faculdade menor, embaixo, na versão branca oficial da Faculdade | O sistema é o produto; a Faculdade assina embaixo. O arquivo do logotipo tem 303 × 85 px: em até 32 px de altura ele fica nítido também em celular de tela densa |
| **Libras não funcionava** | VLibras 7 carregando e o avatar sinalizando (testado de verdade no navegador) | O VLibras mudou na versão 7: o endereço do gov.br agora redireciona para o jsDelivr, que a política de segurança do site bloqueava. A política libera agora o gov.br e só o caminho do VLibras no jsDelivr; o estatístico de uso que vem com o VLibras (PostHog, nos EUA) continua bloqueado |
| "Esqueceu a senha?" era um parágrafo longo dentro do login | Link "Esqueci minha senha" logo abaixo da senha, que abre uma tela curta: quem gera a senha provisória (equipe: coordenação; paciente: psicóloga técnica). Com o banco ligado, a mesma tela manda o link por e-mail, com a mesma resposta exista ou não a conta | Login mais curto e instrução mais clara |
| Nomes do grupo só numa linha pequena no fim da entrada | Quadro "Quem fez o Vinculum" na entrada e os nomes no rodapé de todas as telas | Crédito à vista |
| Abas e itens sem explicação | Uma frase sob as abas do prontuário dizendo o que há em cada uma; explicação curta em cada item do "Mais"; frase sob o título das telas principais | Quem chega agora entende cada parte sem perguntar |

O VLibras envia ao serviço do Governo Federal o texto que a pessoa toca para traduzir. O site avisa isso na hora e na declaração de acessibilidade, e recomenda não traduzir texto do prontuário (registrado também em `docs/lgpd.md`).

Os 5 pedidos de confirmação (`window.confirm`) continuam: restaurar dados, falta sem justificativa, encerrar estágio, desativar conta e desligar a verificação em duas etapas. Todos protegem ações difíceis de desfazer.

## Registro de decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Nome | Vinculum (antes Vínculo) | "Laço", em latim: remete ao vínculo terapêutico, ao problema do paciente que não volta e ao acesso que nasce e morre com o vínculo de estágio |
| Identidade visual | Verde da Faculdade Santa Casa (`#007931`), uma fonte só (Public Sans), logotipo da Faculdade com autorização | Escolha do grupo; tons ajustáveis no topo de `css/estilo.css` |
| VLibras | Endereço oficial (vlibras.gov.br/app), carregado só quando a pessoa pede; na CSP, só o gov.br, as APIs do VLibras e o caminho dele no jsDelivr | Libras funcionando sem abrir o site para scripts de terceiros nem para estatística de uso |
| Navegação | Barra embaixo no celular e no tablet em pé; coluna à esquerda a partir de 960 px; preferências e Sair no menu da conta | O sistema será usado mais em celular e tablet |
| Tecnologia das telas | HTML, CSS e JS puros | Exigência da Etapa 4 e facilidade para explicar o código |
| Banco | PostgreSQL no Supabase, região São Paulo | Volume pequeno; regras de acesso no próprio banco (RLS); login com MFA; dados no Brasil; custo zero no PIC |
| Dados | JSON com uma coleção por tabela, sem dados repetidos; listas e regras em `_config` | A migração vira "uma coleção = uma tabela"; regra muda sem mexer no código |
| Senha | NIST SP 800-63B-4: 15 caracteres, sem regra de composição, lista de senhas comuns; PBKDF2 600 mil | Recomendação atual; regras de símbolo geram senhas piores |
| CPF repetido no formulário público | Mesma mensagem para todos; duplicidade só para a equipe | Avisar "CPF já cadastrado" revelaria quem é paciente da clínica |
| Datas da demonstração | Relativas a `_meta.dataBase` | A demonstração não "envelhece" até o dia da apresentação |
| Fontes | Servidas pelo próprio site | Nenhum dado de navegação vai para terceiros |
| Exclusões | Nada é apagado; correção por adendo, revogação por novo registro, sessão cancelada | Imutabilidade do prontuário e trilha completa |
| Notificação compulsória | Só o supervisor registra; o sistema sugere o órgão, a lei e o prazo, e a supervisão decide | Res. CFP 05/2025, art. 7º, III: a responsabilidade técnica é do supervisor |
| Plano de segurança | Modelo de Stanley e Brown, em versões, feito com o paciente e assinado pela supervisão | Intervenção breve com evidência; o paciente precisa ter o plano à mão |
| Revisor de escrita | Regras transparentes em `_config.revisorEscrita`, sem IA; só aponta, não corrige nem bloqueia | O texto clínico não sai do navegador e a supervisão ajusta as regras |
| "Quem acessou" para o paciente | Categorias ("Abriu o prontuário"), não o texto interno da auditoria; para menor de idade, sem o motivo | LGPD, arts. 9º e 18; o portal pode estar com o responsável (Código de Ética, art. 13) |
| Aviso de falta pelo paciente | Lista fechada de motivos, sem texto livre | O sistema não é canal de crise; o aviso lembra CVV 188 e SAMU 192 |
| Documentos psicológicos | Cinco modalidades da Res. CFP 06/2019, com as seções em `_config.listas.modalidadesDocumento`; o documento nunca muda: entrega, devolutiva e anulação são registros novos | A norma que todo psicólogo usa; nada é apagado |
| Comunicações a terceiros | Tabela própria, com fundamento obrigatório para comunicação autorizada, requisição e quebra de sigilo; visível ao paciente por padrão, escondida só com motivo | LGPD, art. 18, VII; Código de Ética, arts. 10 e 13 |
| Gráfico | HTML e CSS próprios (sem biblioteca), colunas empilhadas, cores validadas para daltonismo; a direção recebe só os totais de `app.indicadores` | Nada de servidor de terceiros; o número é o mesmo no site e no banco |
| Busca de paciente | Só entre os casos visíveis; o termo fica na memória da página, não no endereço | O endereço vai para o histórico do navegador: nome de paciente não pode ir junto |
| Transição de semestre | Resumo de transferência (rascunho gerado do prontuário, sem IA) validado pela supervisão; passagem registrada em tabela própria; sem resumo, só com justificativa | O caso continua; quem atende muda. A nova dupla precisa saber o que foi feito, e a anterior perde o acesso (Código de Ética, art. 15) |
| Verificação em duas etapas | Código do aplicativo autenticador (TOTP) e códigos de recuperação; obrigatória para a equipe só em produção; paciente não é obrigado | Senha vazada sozinha não abre o prontuário; o portal do paciente precisa ser simples |

## ODS (Agenda 2030 da ONU)

- **ODS 3 — Saúde e bem-estar:** mais continuidade no cuidado em saúde mental.
- **ODS 4 — Educação de qualidade:** formação supervisionada dos estudantes de Psicologia.

## Créditos

- **Etapa 1 (requisitos, 1º semestre de 2026):** Adônis Silveira, Isaac Jesus, Felipe Moretti e Giovane Guedes.
- **Protótipo de telas v1:** Daniel Dantas, Dilson Rodrigues, Gustavo Santos e Ryan Mendes.

## Próximas etapas

1. Etapa 1 revisada: correções acima, ODS e casos de uso atualizados ([`docs/diagramas.md`](docs/diagramas.md)).
2. Etapa 2: baixa fidelidade ([`docs/baixa-fidelidade/`](docs/baixa-fidelidade/)), diagrama de navegação e DER ([`docs/diagramas.md`](docs/diagramas.md)).
3. Etapa 3: protótipo de alta fidelidade no Figma (feito pelo grupo, a partir das telas do site).
4. Ligar o banco: seguir [`banco/README.md`](banco/README.md).
5. Andamento detalhado e próximos passos: [`docs/progresso.md`](docs/progresso.md).
6. Produção: MFA obrigatório para a equipe, login institucional, assinatura avançada (gov.br) para documentos enviados a terceiros, Edge Functions (link do paciente, convite por e-mail, desligar o MFA de quem perdeu o celular), backup no plano Pro.

## Referências

- Lei Geral de Proteção de Dados — Lei nº 13.709/2018; Res. CD/ANPD nº 15/2024 (incidentes); Enunciado CD/ANPD nº 1/2023 (crianças e adolescentes)
- Resolução CFP nº 05/2025 (estágios e serviço-escola; art. 5º suspenso por liminar do STF na ADI 7911)
- Resolução CFP nº 01/2009 (registro documental e prontuário)
- Código de Ética Profissional do Psicólogo (Resolução CFP nº 10/2005)
- Resolução CFP nº 06/2019 (documentos), nº 31/2022 (avaliação psicológica e SATEPSI), nº 09/2024 (atendimento por TDICs)
- Lei nº 13.787/2018 (guarda de prontuário em meio digital); Lei nº 14.063/2020 (assinaturas eletrônicas)
- Marco Civil da Internet — Lei nº 12.965/2014, art. 15
- Lei Brasileira de Inclusão — Lei nº 13.146/2015, art. 63; ABNT NBR 17225:2025 (WCAG 2.2)
- NIST SP 800-63B-4 (2025); OWASP Password Storage Cheat Sheet; RFC 6238 (código de uso único por tempo, TOTP)
- Notificação compulsória: ECA (Lei nº 8.069/1990), arts. 13 e 245; Lei nº 13.819/2019, art. 6º; Lei nº 10.778/2003 (redação da Lei nº 13.931/2019); Estatuto da Pessoa Idosa (Lei nº 10.741/2003), art. 19; Lei Brasileira de Inclusão, art. 26; Portaria GM/MS nº 1.271/2014
- Plano de segurança: Stanley, B. e Brown, G. K. (2012). Safety Planning Intervention. *Cognitive and Behavioral Practice*, 19(2), 256–264
