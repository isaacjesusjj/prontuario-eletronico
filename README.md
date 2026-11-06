# Vínculo — Prontuário Eletrônico da Clínica-Escola de Psicologia

Protótipo funcional do **Projeto Integrador de Curso (PIC)** — Análise e Desenvolvimento de Sistemas, Faculdade de Ciências Médicas da Santa Casa de São Paulo, 2º semestre de 2026.

**Site:** https://isaacjesusjj.github.io/prontuario-eletronico/

**Grupo:** Daniel Dantas, Dilson Rodrigues e Isaac de Jesus Lima.

> ⚠️ **Protótipo acadêmico, pronto para ligar o banco.** Todos os dados são fictícios. Hoje os dados ficam no navegador; o banco (PostgreSQL no Supabase) já tem schema, migração e testes prontos em [`banco/`](banco/README.md). A troca é uma linha em `js/config-banco.js`.

---

## O problema

Na clínica-escola, os registros são feitos em papel, e muitos pacientes vêm à primeira sessão e não voltam. Não existe hoje um jeito de saber **por que** eles abandonam o tratamento.

## A solução

O Vínculo acompanha o paciente da fila de espera até o encerramento, com a supervisão presente em cada registro:

- **Fila de espera online** com aviso de urgência (SAMU 192, CVV 188), validação de CPF, telefone e data de nascimento, e regra para menores (responsável legal autoriza).
- **CPF já cadastrado:** o formulário público não revela (mesma mensagem para todos); a equipe vê a duplicidade na fila e, na triagem, o novo caso é ligado ao cadastro existente.
- **Triagem e cadastro** com consentimentos separados por finalidade, cada um com data, responsável e versão do termo; revogar vira novo registro.
- **Alocação:** a direção monta os grupos e encerra os vínculos no fim do semestre; o supervisor forma duplas ou trios; o técnico aloca os pacientes (só com contrato terapêutico registrado).
- **Prontuário do caso:** anamnese, demanda e objetivos com versões, evoluções, documentos, anexos com upload real e cópia em PDF.
- **Evolução com validação:** rascunho → enviada → validada (assinatura do estagiário e do supervisor, com hash do texto) → bloqueada. Correção só por adendo.
- **Fluxo de abandono:** duas faltas seguidas sem justificativa abrem o registro de contato e motivo antes de liberar a vaga.
- **Agenda em calendário** (dia, semana, mês e lista) e **lembretes** por WhatsApp ou e-mail, sem conteúdo clínico e só com autorização.
- **Acesso do paciente:** pedido de cópia, conferência de identidade e **link de leitura temporário** (72 h, confirma a data de nascimento, o sistema guarda só o hash).
- **LGPD:** aviso de privacidade, termos de uso, termo de sigilo no primeiro acesso, "Meus dados" do paciente (direitos do art. 18) e fila de pedidos com prazo.
- **Segurança:** senhas só como hash (PBKDF2, 600 mil iterações), política de senha do NIST (15 caracteres, sem regra de símbolo), senha provisória com troca obrigatória, bloqueio por tentativas, sessão que encerra por inatividade com aviso, auditoria com cadeia de hash verificável.
- **Acessibilidade** (ABNT NBR 17225 / WCAG 2.2 AA): pular para o conteúdo, A−/A+, alto contraste, VLibras, erros ligados aos campos, títulos por tela. 45 telas conferidas com axe-core, sem violações.
- **Indicadores agregados:** pacientes atendidos, taxa de retorno, média de sessões, motivos de abandono e espera na fila.

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
| Supervisor(a) | Helena (Grupo A) · Rafael (Grupo B) | `helena.supervisora` · `rafael.supervisor` | Valida ou devolve evoluções; orientações fora do prontuário |
| Psicólogo(a) técnico(a) | Ana Lúcia | `ana.tecnica` | Fila (inscrição i05 com CPF já cadastrado), triagem, acesso do paciente, pedidos LGPD, auditoria |
| Paciente | Paciente Exemplo 01 | `paciente01` | Confirma sessão, pede cópia, "Meus dados" |
| Direção do curso | Marta | `marta.direcao` | Indicadores, grupos, importar estudantes, encerrar vínculo |

Também existem `caio.estagiario`, `lia.estagiaria`, `fabio.estagiario`, `gabi.estagiaria`, `hugo.estagiario` (sem grupo) e `iara.estagiaria` (vínculo do semestre passado, encerrado: entra, mas não vê casos).

**Datas da demonstração:** os dados foram escritos como se hoje fosse 06/11/2026 (`_meta.dataBase`). O site desloca todas as datas para que esse dia vire o dia de hoje; assim, no dia da apresentação, a sessão "de hoje" e as próximas sessões continuam corretas.

O roteiro da apresentação está em [`docs/roteiro-apresentacao.md`](docs/roteiro-apresentacao.md).

## Estrutura

```
index.html                  página única; carrega os scripts na ordem
css/estilo.css              identidade visual, acessibilidade e alto contraste
fontes/                     fontes servidas pelo próprio site (licença SIL OFL)
dados/dados-iniciais.json   dados fictícios: uma coleção por tabela do banco, + _config (listas e regras)
js/config-banco.js          ÚNICO lugar para trocar o JSON pelo banco
js/repositorio.js           camada de dados: toda gravação passa por aqui
js/adaptador-supabase.js    adaptador do PostgreSQL/Supabase (desligado até a migração)
js/dados.js                 lê o JSON, configuração e datas relativas
js/seguranca.js             SHA-256, hash de senha (PBKDF2), política de senha, tokens
js/estado.js                sessão, login, bloqueio e auditoria encadeada
js/validadores.js           CPF, telefone, e-mail, datas, arquivos, máscaras e erros acessíveis
js/arquivos.js              upload real (IndexedDB hoje; Supabase Storage com o banco)
js/permissoes.js            regras de acesso e de negócio (iguais às políticas RLS do banco)
js/ui.js, acessibilidade.js topo, menu, rodapé, A−/A+, contraste, VLibras
js/telas-*.js               telas (entrada, painéis, prontuário, gestão, agenda, conta, LGPD)
js/acoes.js                 o que cada botão e formulário faz
js/inicio.js                rotas (#/rota), primeiro acesso, inatividade e inicialização
banco/                      schema PostgreSQL, migração JSON → banco, testes e projeção
testes/                     testes automáticos do site (Playwright + axe-core)
ferramentas/validar_json.py confere o JSON antes de migrar
docs/                       roteiro, diagramas (DER, navegação, casos de uso), LGPD, baixa fidelidade
```

Decisões técnicas: HTML, CSS e JavaScript puros, sem frameworks nem build; scripts clássicos; caminhos relativos; layout responsivo; sem chamadas a servidores de terceiros; política de segurança de conteúdo (CSP) no `index.html`.

## Banco de dados

PostgreSQL no Supabase (região São Paulo). Projeção: ~84 MB por ano no cenário atual (800 estudantes, 400 pacientes por semestre) e ~1,6 GB em 20 anos de guarda. Tudo em [`banco/README.md`](banco/README.md): schema, migração, passo a passo e garantias.

## Testes

| O quê | Como rodar | Resultado |
|---|---|---|
| Site: regras, validadores, segurança, LGPD, acessibilidade | `python testes/testar_site.py` | [`testes/resultado-testes.md`](testes/resultado-testes.md) — 154 de 154 |
| Banco: schema, migração, imutabilidade, RLS por perfil, auditoria | `cd banco && node testar_banco.mjs` | [`banco/resultado-teste.md`](banco/resultado-teste.md) — 56 de 56 |
| JSON antes de migrar | `python ferramentas/validar_json.py` | 0 problemas |

Preparação: `pip install playwright`, `cd testes && npm install` e `cd banco && npm install`.

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

## Registro de decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Nome | Vínculo | Remete ao vínculo terapêutico e ao problema do paciente que não volta |
| Identidade visual | Lilás institucional com detalhes dourados e títulos em serifa | Escolha do grupo; tons ajustáveis no topo de `css/estilo.css` |
| Tecnologia das telas | HTML, CSS e JS puros | Exigência da Etapa 4 e facilidade para explicar o código |
| Banco | PostgreSQL no Supabase, região São Paulo | Volume pequeno; regras de acesso no próprio banco (RLS); login com MFA; dados no Brasil; custo zero no PIC |
| Dados | JSON com uma coleção por tabela, sem dados repetidos; listas e regras em `_config` | A migração vira "uma coleção = uma tabela"; regra muda sem mexer no código |
| Senha | NIST SP 800-63B-4: 15 caracteres, sem regra de composição, lista de senhas comuns; PBKDF2 600 mil | Recomendação atual; regras de símbolo geram senhas piores |
| CPF repetido no formulário público | Mesma mensagem para todos; duplicidade só para a equipe | Avisar "CPF já cadastrado" revelaria quem é paciente da clínica |
| Datas da demonstração | Relativas a `_meta.dataBase` | A demonstração não "envelhece" até o dia da apresentação |
| Fontes | Servidas pelo próprio site | Nenhum dado de navegação vai para terceiros |
| Exclusões | Nada é apagado; correção por adendo, revogação por novo registro, sessão cancelada | Imutabilidade do prontuário e trilha completa |

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
5. Produção: MFA, login institucional, assinatura avançada (gov.br) para documentos enviados a terceiros, Edge Function para o link do paciente, backup no plano Pro.

## Referências

- Lei Geral de Proteção de Dados — Lei nº 13.709/2018; Res. CD/ANPD nº 15/2024 (incidentes); Enunciado CD/ANPD nº 1/2023 (crianças e adolescentes)
- Resolução CFP nº 05/2025 (estágios e serviço-escola; art. 5º suspenso por liminar do STF na ADI 7911)
- Resolução CFP nº 01/2009 (registro documental e prontuário)
- Código de Ética Profissional do Psicólogo (Resolução CFP nº 10/2005)
- Resolução CFP nº 06/2019 (documentos), nº 31/2022 (avaliação psicológica e SATEPSI), nº 09/2024 (atendimento por TDICs)
- Lei nº 13.787/2018 (guarda de prontuário em meio digital); Lei nº 14.063/2020 (assinaturas eletrônicas)
- Marco Civil da Internet — Lei nº 12.965/2014, art. 15
- Lei Brasileira de Inclusão — Lei nº 13.146/2015, art. 63; ABNT NBR 17225:2025 (WCAG 2.2)
- NIST SP 800-63B-4 (2025); OWASP Password Storage Cheat Sheet
