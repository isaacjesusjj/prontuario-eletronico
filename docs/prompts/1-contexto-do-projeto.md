# Prompt 1 — Contexto do projeto (para uma nova sessão do Claude)

> Cole este texto como primeira mensagem de uma sessão nova (ou peça: "leia `docs/prompts/1-contexto-do-projeto.md`"). Ele explica o projeto inteiro e onde paramos. Atualizado em 13/11/2026.

---

Olá! Você vai trabalhar no **Vinculum**, o prontuário eletrônico da clínica-escola de Psicologia da Faculdade de Ciências Médicas da Santa Casa de São Paulo (FCMSCSP). Antes de qualquer coisa, leia este texto inteiro e depois, no repositório, o `CLAUDE.md`, o `README.md` e o `docs/progresso.md`.

## Quem somos e para que serve

- Eu sou o Isaac de Jesus Lima, aluno de Análise e Desenvolvimento de Sistemas (ADS). O grupo é Daniel Dantas, Dilson Rodrigues e eu.
- É o nosso **PIC** (Projeto Integrador de Curso), 2º semestre de 2026. As etapas são:
  1. requisitos, ODS e casos de uso;
  2. baixa fidelidade, diagrama de navegação e DER;
  3. alta fidelidade no Figma (feita pelo grupo);
  4. front-end funcional (este site).

  A AV1 vale as etapas 1 e 2 (peso 4); a AV2, as etapas 3 e 4 (peso 6).
- O professor avalia no papel de **PO** (dono do produto) e quer entender principalmente **o JSON**: como os dados estão organizados, por que o sistema funciona e como os dados viram o banco. Explicações para ele seguem a ordem **problema → valor → evidência → próximo passo**.
- Sou leigo em várias partes técnicas: explique em português simples, sem jargão.

## Onde fica

- Site: https://isaacjesusjj.github.io/prontuario-eletronico/ (GitHub Pages, publicado a partir da branch `main`).
- Repositório: `isaacjesusjj/prontuario-eletronico` (público). **Todo envio para a `main` publica o site.**
- Os testes rodam sozinhos no GitHub a cada envio (`.github/workflows/testes.yml`, aba Actions).

## O que o sistema faz (resumo)

O Vinculum acompanha o paciente da fila de espera até o encerramento, com a supervisão em cada registro. Os perfis são estagiário, supervisor, técnica, direção e paciente. As principais funções:

- **Fila e cadastro:** fila de espera pública com aviso de urgência, triagem e cadastro com consentimentos.
- **Estágio:** alocação em duplas e trios; transição de semestre com resumo de transferência.
- **Atendimento:** agenda com sala; evoluções com validação e assinatura do supervisor (depois de validada, correção só por adendo); fluxo de abandono depois de 2 faltas.
- **Risco:** avaliação, notificação compulsória e plano de segurança.
- **Documentos:** documentos psicológicos (Res. CFP 06/2019) e comunicações a terceiros.
- **Direitos do paciente:** portal do paciente e LGPD (cópia do prontuário, link temporário, "quem acessou").
- **Segurança:** auditoria em corrente de hash, verificação em duas etapas (TOTP), modo discreto, revisor de escrita clínica sem IA e indicadores com gráfico.
- **Acessibilidade:** WCAG 2.2 AA, alto contraste e Libras (VLibras).

A matriz de regras e leis fica na tela "Regras e leis" (`#/regras`).

## Arquitetura

- HTML, CSS e JavaScript **puros**: sem framework e sem build. Scripts clássicos, carregados em ordem no `index.html` e pendurados no objeto global `PEP`.
- **Rotas:** `#/rota/...`, em `js/inicio.js`.
- **Telas:** `js/telas-*.js`. Cada uma é uma função que devolve o HTML.
- **Ações:** botões com `data-acao` e formulários com `data-form`, tratados em `js/acoes.js`.
- **Permissões:** `js/permissoes.js`, que espelha as políticas RLS do banco.
- **Dados hoje:** `dados/dados-iniciais.json`, com 32 coleções, mais `_config` (listas e regras) e `_meta`. Cada coleção é uma tabela do banco. O site guarda uma cópia de trabalho no navegador (adaptador `'local'`).
- **Banco pronto, ainda desligado:** PostgreSQL no Supabase, região São Paulo. Os arquivos são:
  - `banco/schema.sql`: 32 tabelas, RLS, gatilhos de regras, imutabilidade e auditoria;
  - `banco/migrar_json.py`: converte o JSON em `dados-demo.sql`;
  - `banco/testar_banco.mjs`: testa tudo num PostgreSQL real (PGlite).

  A troca do JSON pelo banco é uma linha em `js/config-banco.js`.
- **Documentação principal:**
  - `docs/banco-de-dados.md`: o banco e as projeções de uso;
  - `docs/opcoes-gratuitas.md`: opções sem custo, e se o JSON aguentaria;
  - `docs/diagramas.md`: DER, navegação e casos de uso;
  - `docs/lgpd.md`, `docs/relatorio-final.md` e `docs/roteiro-apresentacao.md`.

## Como rodar e testar

- Site: `python -m http.server 8000` na raiz e abrir `http://localhost:8000`.
- Preparação, uma vez só: `pip install playwright`, `python -m playwright install chromium` (pode já estar instalado), `cd testes && npm install` e `cd banco && npm install`.
- **Os três testes, antes de todo commit, e só seguir com tudo verde:**
  - `python ferramentas/validar_json.py` → 0 problemas (o aviso da sessão s40 do caso c03 é de propósito);
  - `python testes/testar_site.py` → hoje **389 de 389** (73 telas no axe-core);
  - `cd banco && python3 migrar_json.py && node testar_banco.mjs` → hoje **174 de 174**.
- Os testes reescrevem `testes/resultado-testes.md` e `banco/resultado-teste.md` mesmo quando só a data muda. Esses dois arquivos só entram no commit quando o resultado muda de verdade.
- A etapa de testes do Libras ao vivo só roda se houver acesso ao `vlibras.gov.br`. Sem acesso, ela é pulada e aparece um aviso.

## Ambiente de nuvem (se a sessão rodar no Claude Code na web)

- Setup script:
  `if [ -d prontuario-eletronico ]; then (cd prontuario-eletronico/testes && npm ci --silent) && (cd prontuario-eletronico/banco && npm ci --silent); fi`
- Domínios liberados (só para o Libras e para o site da Faculdade): `fcmsantacasasp.edu.br`, `www.fcmsantacasasp.edu.br`, `vlibras.gov.br`, `www.vlibras.gov.br`, `dicionario2.vlibras.gov.br`, `traducao2.vlibras.gov.br`, `repositorio.vlibras.gov.br`, `cdn.jsdelivr.net`.
- Se o `gh` não estiver autenticado, publique com `git merge --ff-only` e `git push origin main`. Envie cada branch novo com `git push -u origin <branch>`.

## Estado em 13/11/2026 (tudo publicado na `main`)

1. **Blocos 1 a 3** (comparação com o prontuário de outro grupo):
   - contato de emergência, modelos de evolução, busca e último acesso;
   - auditoria com filtros e planilha;
   - documentos psicológicos e comunicações a terceiros;
   - sala na agenda e gráfico de atendimentos.
2. **Redesenho Vinculum** (antes "Vínculo"):
   - verde da FCMSCSP (`#007931`), uma fonte só (Public Sans) e o logotipo da Faculdade, com autorização;
   - pensado primeiro para o celular: barra de navegação embaixo (até 5 itens, o resto em "Mais") e coluna à esquerda a partir de 960 px;
   - menu da conta no topo (preferências, Minha conta e Sair);
   - painel com números e uma lista de "Pendências";
   - prontuário com 6 abas;
   - pedidos da técnica num item só.
3. **Segunda rodada:**
   - Libras funcionando: o VLibras 7 redireciona os arquivos para o jsDelivr, e a CSP do site libera só esse caminho; o estatístico de uso PostHog fica bloqueado de propósito;
   - topo verde e menos branco;
   - Vinculum em destaque, com o logotipo da Faculdade menor embaixo;
   - tela "Esqueci minha senha";
   - nomes do grupo na entrada e no rodapé;
   - uma frase explicando cada aba.
4. **Documentos** do banco de dados e das opções gratuitas. A projeção (`banco/projecao.py`) conta as 32 tabelas: no cenário atual, ~109 MB por ano e ~2,1 GB em 20 anos.

O histórico detalhado, com o porquê de cada mudança, está no `README.md` (registros de correções e de decisões), no `docs/progresso.md` e nas mensagens de commit.

## Regras do projeto (não quebre)

As regras completas estão no `CLAUDE.md`. As principais:

- **Só dados fictícios.** Nunca dado real de paciente, nem em exemplo, teste ou captura de tela. **Nunca senha em texto:** só hash PBKDF2.
- **Mudou o JSON → troque `_meta.versao`.** Coleção ou campo novo: atualize junto `banco/schema.sql`, `banco/migrar_json.py`, `ferramentas/validar_json.py` e os testes. Mudou `js/permissoes.js`: mude as políticas RLS e rode os dois testes.
- **Nada é apagado.** Evolução validada não muda (correção só por adendo); revogação vira registro novo; sessão é cancelada, não excluída.
- **O acesso nasce e morre com o vínculo de estágio:**
  - estagiário: só a própria dupla ou trio;
  - supervisor: os seus grupos;
  - técnica: todos, registrando o motivo antes de abrir caso de fora da equipe;
  - direção: só números;
  - paciente: só o próprio prontuário.
- **Texto digitado** sempre passa por `PEP.util.esc()` antes de entrar no HTML.
- **CSP:** nada de scripts, fontes ou chamadas a terceiros, além da exceção do VLibras.
- **Visual:** não mude a identidade (verde, Public Sans, logotipo, navegação) sem pedido do grupo. Correção de erro ou de acessibilidade pode, desde que avisada.
- **Escrita:** português do Brasil em textos, comentários, commits e respostas. Código simples e comentado, porque o grupo precisa explicar cada parte na banca.
- **Registro:** mudanças relevantes vão no `README.md` (registro de correções e de decisões) e no `docs/progresso.md`.
- **Publicação na `main`** só quando eu disser "pode publicar".

## Pendências conhecidas

- **Validar com a clínica:**
  - perda de vaga também com 3 faltas intercaladas;
  - as mudanças nos requisitos da Etapa 1;
  - "800 usuários simultâneos" × "800 estudantes";
  - os números reais de pacientes por semestre (para a projeção).
- **Validar com a supervisão e o encarregado de dados:**
  - níveis e condutas de risco, órgãos e prazos de notificação;
  - plano de segurança, motivos de acesso e de falta;
  - regras do revisor de escrita;
  - seções do resumo de transferência e dos documentos;
  - o artigo da Res. CFP 13/2022;
  - a guarda de menor contada a partir dos 18 anos;
  - o uso do VLibras com texto clínico.
- **Próximos assuntos:** ligar o banco (Supabase Free para a banca; servidor da Faculdade para um piloto real), versão em aplicativo, telas novas no Figma e escalas PHQ-9 e GAD-7 (adiadas pelo grupo).
- **Produção:** verificação em duas etapas obrigatória para a equipe, login institucional, assinatura avançada (gov.br), funções no servidor (Edge Functions) e backup.

Quando terminar de ler, me diga em poucas linhas o que entendeu do projeto e confirme que os três testes passam no seu ambiente.
