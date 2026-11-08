# CLAUDE.md — Vínculo

Contexto para o Claude Code trabalhar neste repositório. A visão geral do produto está no `README.md`; aqui ficam as regras de trabalho e o que não pode quebrar.

## O projeto

- Prontuário eletrônico da clínica-escola de Psicologia, feito no PIC (Projeto Integrador de Curso) de Análise e Desenvolvimento de Sistemas, Faculdade de Ciências Médicas da Santa Casa de São Paulo, 2º semestre de 2026.
- Grupo: Daniel Dantas, Dilson Rodrigues e Isaac de Jesus Lima.
- Site: https://isaacjesusjj.github.io/prontuario-eletronico/ (GitHub Pages, branch `main`, pasta raiz). Todo push na `main` publica o site.
- Etapas do PIC: 1) requisitos, ODS e casos de uso; 2) baixa fidelidade, diagrama de navegação e DER; 3) alta fidelidade no Figma (feita pelo grupo); 4) front-end funcional (este site). AV1 = etapas 1 e 2 (peso 4); AV2 = etapas 3 e 4 (peso 6).
- O professor avalia no papel de PO e quer entender principalmente **o JSON**: como os dados estão organizados, por que o sistema funciona e como os dados viram o banco. Ao preparar explicações para ele, siga a ordem problema → valor → evidência → próximo passo.

## Comandos

- Rodar: `python -m http.server 8000` na raiz e abrir http://localhost:8000. Com dois cliques no `index.html` não funciona, porque o navegador bloqueia o `fetch` do JSON e a criptografia.
- Preparar os testes (uma vez): `pip install playwright && python -m playwright install chromium`, `cd testes && npm install` e `cd banco && npm install`.
- Antes de todo commit, rode os três e só siga com tudo verde:
  - `python ferramentas/validar_json.py` → 0 problemas. O aviso da sessão do caso c03 sem evolução é um cenário de propósito (mostra o alerta de 48 h).
  - `python testes/testar_site.py` → hoje 270 de 270 (57 telas no axe-core).
  - `cd banco && python3 migrar_json.py && node testar_banco.mjs` → hoje 133 de 133.
- Os testes reescrevem `testes/resultado-testes.md` e `banco/resultado-teste.md` mesmo quando só a data muda. Commite esses arquivos apenas quando o resultado mudar de verdade.

## Arquitetura em poucas linhas

- HTML, CSS e JavaScript puros, sem framework nem build. Scripts clássicos (sem `type="module"`), carregados em ordem no `index.html`, todos pendurados no objeto global `PEP`.
- `js/inicio.js` inicializa: lê o JSON (`js/dados.js`), desloca as datas para que `_meta.dataBase` vire o dia de hoje, carrega a cópia de trabalho (`js/estado.js`) e desenha a tela pela rota `#/rota/...`.
- Cada tela (`js/telas-*.js`) é uma função que devolve o HTML montado a partir dos dados. Risco e segurança ficam em `js/telas-risco.js`; o revisor de escrita em `js/revisor.js` (regras em `_config.revisorEscrita`); o modo discreto em `js/privacidade.js`. Botões têm `data-acao` e formulários têm `data-form`. O `js/acoes.js` trata todos por delegação: confere a permissão, grava pelo repositório, registra a auditoria e redesenha.
- Toda gravação passa por `js/repositorio.js`. O adaptador é escolhido em `js/config-banco.js`: `'local'` hoje (JSON + cópia no navegador) e `'supabase'` quando o banco for ligado.
- `js/permissoes.js` espelha as políticas RLS de `banco/schema.sql`. Mudou um, mude o outro e rode os dois testes.
- Texto digitado por usuário sempre passa por `PEP.util.esc()` antes de entrar no HTML.
- A CSP do `index.html` não permite scripts, fontes ou chamadas a servidores de terceiros. As fontes ficam em `fontes/`.

## JSON (`dados/dados-iniciais.json`)

- Uma coleção = uma tabela de `banco/schema.sql`. O `id` é a chave primária e as relações são feitas por id, sem dados repetidos.
- Listas de opções e regras numéricas ficam em `_config` (`listas`, `regras`, `termos`, `demo`), não no código. Ex.: `regras.faltasSeguidasLimite`, `regras.tentativasLogin`, `demo.contasDestaque`.
- **Mudou o JSON → troque `_meta.versao`.** Sem isso, quem já abriu o site continua com a cópia antiga guardada no navegador.
- As datas são escritas como se hoje fosse `_meta.dataBase`; o site desloca todas.
- Senhas só como hash PBKDF2 (`js/seguranca.js`). A senha das contas de demonstração está em `_meta.senhaDemonstracao`. Nunca grave senha em texto.
- Só dados fictícios. Nunca coloque dado real de paciente, nem em exemplo, teste ou captura de tela.
- Coleção ou campo novo: atualize junto `banco/schema.sql`, `banco/migrar_json.py`, `ferramentas/validar_json.py` e os testes.

## Regras de negócio que não podem quebrar

- Evolução: rascunho → enviada → (devolvida ⇄ reenviada) → validada, com assinatura do estagiário e do supervisor do caso → bloqueada. Depois de validada, nada é editado nem apagado: correção só por adendo, com autor, data e motivo.
- Nada é apagado em lugar nenhum: revogação vira novo registro e sessão é cancelada, não excluída.
- O acesso nasce e morre com o vínculo. O estagiário só vê os casos da própria dupla ou trio, com alocação ativa. O supervisor vê só os casos dos seus grupos. O técnico vê todos, com auditoria. A direção vê só indicadores agregados, nunca prontuário. O paciente vê só o próprio prontuário, pelo pedido de cópia ou pelo link temporário.
- Ficam fora do prontuário e da cópia do paciente: as orientações de supervisão e o material de avaliação psicológica.
- Abandono: `faltasSeguidasLimite` faltas seguidas sem justificativa abrem o fluxo de contato. A vaga só é liberada com tentativa de contato registrada, e o motivo alimenta os indicadores.
- Presença e falta só a partir do dia da sessão (a falta justificada pode vir antes). Agendamento só de hoje em diante.
- Login: mensagem de erro genérica, bloqueio progressivo após `tentativasLogin` erros (até `bloqueioLoginMaximoSegundos`) e auditoria das tentativas sem a senha. A sessão encerra por inatividade e o texto em edição vira rascunho antes.
- Verificação em duas etapas (TOTP): o mesmo código não vale duas vezes; códigos de recuperação de uso único, guardados só como hash. No banco, `app.mfa_ok()` dentro de `app.usuario_atual()`: quem ligou o MFA e entrou só com a senha (aal1) não vê nada. `regras.mfaObrigatoria` fica `false` no protótipo e `true` em produção (junto com `app.mfa_obrigatoria()`).
- Risco: registrado no caso, não muda depois; a supervisão dá ciência; a notificação compulsória só o supervisor registra. Na cópia ao responsável de criança ou adolescente, relato de violência e notificação ficam de fora.
- Técnica fora da equipe do caso registra o motivo antes de abrir o conteúdo clínico (vale `justificativaValidadeHoras`). O paciente vê "quem acessou" por categoria; para menor de idade, sem o motivo.
- O paciente só avisa falta de sessão futura, com motivo de lista fechada (sem texto livre: o sistema não é canal de crise).
- Lembretes nunca têm conteúdo clínico. Não existe chat entre paciente e equipe.
- Base normativa: Res. CFP 05/2025 e 01/2009, Código de Ética Profissional do Psicólogo e LGPD. Os artigos estão na skill do projeto e na tela "Regras e leis" do site (`#/regras`).

## Como trabalhar aqui

- Português do Brasil em textos, comentários, commits e respostas.
- Código simples e comentado: o grupo precisa explicar cada parte na banca.
- Não mude o visual (lilás + dourado; Source Serif 4 nos títulos e Public Sans no texto; variáveis no topo de `css/estilo.css`) sem pedido do grupo. Correção de erro ou de acessibilidade pode, desde que seja avisada.
- Quando o grupo mandar uma versão nova, faça primeiro um commit com a versão deles como veio e depois um commit separado com as correções, para a revisão ficar visível.
- Registre mudanças relevantes no `README.md` (registro de correções e registro de decisões).
- Ao terminar, relate o que mudou e por quê: o grupo apresenta e precisa saber o que dizer.

## Pendências

- O andamento detalhado (o que foi feito, o que falta e o próximo passo) está em `docs/progresso.md`. O trabalho em curso fica no branch `andamento-06-11`.
- Validar com o cliente: perda de vaga também com 3 faltas intercaladas (`regras.faltasIntercaladasSugestao`), as mudanças nos requisitos da Etapa 1 (tabela no README) e "800 usuários simultâneos" × "800 estudantes".
- Ligar o banco: seguir `banco/README.md` e trocar o adaptador em `js/config-banco.js`.
- Fazer: transição de semestre (resumo de transferência, checklist, casos sem dupla ativa, realocação). Opcional: escalas PHQ-9 e GAD-7 só com escores.
- Validar com a supervisão e o jurídico/encarregado: níveis e condutas de risco, órgãos e prazos de notificação, plano de segurança, motivos de acesso e de falta, regras do revisor de escrita.
- Produção: ligar o MFA obrigatório para a equipe, login institucional, assinatura avançada (gov.br) para documentos enviados a terceiros, Edge Functions (link do paciente, convite por e-mail, desligar o MFA de quem perdeu o celular) e backup.

## Skill do projeto

`.claude/skills/prontuario-clinica-escola-psicologia/` reúne o conhecimento clínico, ético e legal do domínio: CFP, LGPD, UX clínica e o modelo de domínio de um serviço-escola. Use ao propor telas, dados ou regras.
