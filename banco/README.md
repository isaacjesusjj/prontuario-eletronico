# Banco de dados do Vinculum — PostgreSQL no Supabase

O site já está pronto para trocar o JSON pelo banco. Esta pasta tem tudo o que essa troca precisa, testado num PostgreSQL de verdade.

| Arquivo | Para que serve |
|---|---|
| `schema.sql` | Cria as 32 tabelas (mais as partições da auditoria), validações, regras de transição, imutabilidade, auditoria encadeada, verificação em duas etapas e as políticas de acesso (RLS). |
| `migrar_json.py` | Lê `dados/dados-iniciais.json` e gera `dados-demo.sql`: cada coleção vira uma tabela, cada campo vira uma coluna. |
| `dados-demo.sql` | Os dados fictícios prontos para inserir (gerado pelo script acima). |
| `testar_banco.mjs` | Roda schema + migração num PostgreSQL 18 (PGlite) e faz 174 verificações, quase metade negativas (o banco tem de recusar). Resultado em `resultado-teste.md`. |
| `teste_stub_supabase.sql` | Simula o que o Supabase já traz (login, papéis, segundo fator e Storage), só para o teste. **Não rodar no Supabase.** |
| `projecao.py` | Projeção de volume por ano e em 20 anos, em três cenários. |

## Por que PostgreSQL no Supabase

- **Volume:** a projeção dá ~84 MB de banco por ano no cenário atual (800 estudantes, 400 pacientes por semestre) e ~16 GB em 20 anos no cenário ×10. Qualquer banco relacional aguenta; o PostgreSQL aguenta com folga.
- **Regras de acesso no próprio banco:** "estagiário só vê o caso da dupla dele" vira política RLS. Mesmo quem chamar a API direto, sem passar pelas telas, só recebe as linhas que pode ver.
- **Login pronto:** Supabase Auth guarda a senha com hash no servidor e oferece a verificação em duas etapas (TOTP), que o schema exige de quem a ligou.
- **Dados no Brasil:** região South America (São Paulo), `sa-east-1`.
- **Custo:** plano gratuito no PIC; em produção, plano Pro (US$ 25/mês), que tem backup diário com 7 dias e não pausa por inatividade. O gratuito pausa depois de 7 dias sem uso e não tem backup automático, por isso não serve para dados reais.
- **Sem amarra:** é PostgreSQL comum. Se a instituição preferir servidor próprio, o mesmo `schema.sql` roda (trocando só a parte de login do Supabase).

## Passo a passo da migração (cerca de 30 minutos)

1. **Criar o projeto** em supabase.com → *New project* → região **South America (São Paulo)**. Guarde a senha do banco.
2. **Criar as tabelas:** *SQL Editor* → colar `banco/schema.sql` → *Run*.
3. **Gerar e carregar os dados:** no computador, `python banco/migrar_json.py`; no *SQL Editor*, colar `banco/dados-demo.sql` → *Run*.
4. **Criar as contas de login:** *Authentication* → *Users* → *Invite user* com o e-mail de cada usuário (os e-mails estão na tabela `usuarios`). Quando a conta é criada, o trigger `vinculo_ligar_conta` liga o login ao usuário de mesmo e-mail.
5. **Arquivos:** *Storage* → *New bucket* → nome `anexos`, **privado**. O caminho de cada arquivo começa pelo caso (`<caso>/<arquivo>`): é o que a política do Storage confere.
6. **Verificação em duas etapas:** em *Authentication*, na configuração de MFA, confira se o **TOTP** (aplicativo autenticador) está ligado; nos projetos novos ele já vem ligado. Para exigir da equipe (produção), troque `app.mfa_obrigatoria()` para `select true` e `regras.mfaObrigatoria` para `true` no JSON.
7. **Ligar o site:** em `js/config-banco.js`, trocar `adaptador: 'local'` por `'supabase'` e preencher `supabaseUrl` e `supabaseChaveAnon` (*Settings* → *API*). A chave "anon" é pública por definição: quem protege os dados são as políticas RLS.
8. **Conferir:** entrar como estagiário e ver que só aparecem os casos da dupla; tentar abrir um caso de outra dupla.

Para os indicadores da direção e a verificação da auditoria pelo banco, exponha o schema `app` em *Settings* → *API* → *Exposed schemas* (funções `app.indicadores()`, `app.verificar_auditoria()` e `app.acessos_ao_meu_prontuario()`).

## O que o banco garante

| Garantia | Como |
|---|---|
| CPF válido e sem repetição | `app.cpf_valido()` (mesma conta de `js/validadores.js`) + índice único |
| Listas fechadas (presença, status, finalidade...) | `check (... in (...))` |
| Evolução validada não muda; correção só por adendo | trigger `app.evolucao_regras` (vale até para o administrador); evolução nova só em caso ativo e de sessão com presença |
| Ninguém pula etapa pela API | triggers `regras` em casos, alocações, sessões, encerramentos, assinaturas (hash do texto conferido), riscos, notificações, planos, usuários e links (máximo de 72 h) |
| Data e hora não são retroagidas | trigger `carimbo`: hora do servidor em cada registro |
| Conteúdo clínico só para a equipe do caso | `app.pode_ver_clinico()`: a técnica de fora da equipe só abre depois de registrar o motivo (`acessos_justificados`, vale 12 h) |
| Senha vazada sozinha não abre o prontuário | `app.mfa_ok()` dentro de `app.usuario_atual()`: quem ligou a verificação em duas etapas e entrou só com a senha (`aal1`) não vê nem grava nada |
| Passagem do caso no fim do estágio | `transferencias` + `app.transferencia_regras`: só técnica ou supervisor do caso, nada esperando a supervisão, paciente avisado, resumo de transferência validado (ou justificativa); o caso só troca de dupla por aqui, e a dupla anterior perde o acesso na hora |
| Documento psicológico completo | `app.documento_regras`: seções obrigatórias de cada modalidade, prazo de validade e laudo só com avaliação; `app.evento_documento_regras`: entrega e devolutiva só de documento assinado pelo supervisor, uma vez cada, anulação só antes da entrega |
| Comunicação a terceiros registrada | `comunicacoes` + `app.comunicacao_regras`: fundamento obrigatório quando a lei pede, quebra de sigilo só pela supervisão ou técnica; o paciente lê só o que ficou visível para ele |
| Sala sem choque de horário | `app.sessao_regras`: sessão nova com sala; a mesma sala não recebe duas sessões agendadas sobrepostas (50 min), entre todas as duplas |
| Contato de emergência coerente | nome e telefone juntos ou nenhum; telefone com DDD |
| Risco acompanhado | `riscos` não é apagado; ciência e encerramento com quem e quando; notificação só pelo supervisor do caso |
| Assinaturas, consentimentos, anamneses, adendos, auditoria: só inserção | trigger `app.bloquear_alteracao` |
| Quem vê o quê | políticas RLS com `app.pode_ver_caso()`, `app.eh_estagiario_do_caso()` (vínculo ativo), `app.eh_supervisor_do_caso()` |
| Duplicidade de CPF na fila pública, sem revelar | trigger `app.inscricao_ao_inserir` (o visitante não lê nada) |
| Auditoria à prova de adulteração | trigger `app.auditoria_encadear`: SHA-256 encadeado com a mesma fórmula do navegador; `app.verificar_auditoria()` |
| Direção vê só números | função `app.indicadores()`: agrega sem nomes; a direção não lê tabelas clínicas |
| Retenção | `app.eliminar_inscricoes_antigas()` (agendar com pg_cron); auditoria particionada por ano |

## Rodar o teste

```bash
cd banco
npm install            # baixa o PGlite (PostgreSQL que roda no Node)
python3 migrar_json.py
node testar_banco.mjs  # 174 verificações; resultado em resultado-teste.md
```

## Limites conhecidos (próximos passos)

- O adaptador `js/adaptador-supabase.js` foi escrito seguindo a documentação da API, mas ainda não rodou contra um projeto Supabase criado (passo 7 acima).
- Ações que gravam em mais de uma tabela (validar = mudar status + assinar) vão em duas requisições. Em produção, viram funções no banco (RPC) para gravar numa transação só.
- A leitura do prontuário por link temporário, com o banco ligado, deve passar por uma Edge Function que confere token e data de nascimento no servidor.
- Também viram Edge Function (com a chave `service_role`, que nunca vai para o site): o convite por e-mail do paciente novo e desligar a verificação em duas etapas de quem perdeu o celular (`DELETE /auth/v1/admin/users/{id}/factors/{fator}`).
- Com o banco ligado, a estagiária não vê as sessões das outras duplas: se escolher uma sala ocupada, quem recusa é o banco, e o site mostra a mensagem genérica de erro. Próximo passo: uma função que liste os horários ocupados por sala, sem dados do paciente.
- Os erros de código da verificação em duas etapas, com o banco ligado, ficam no registro do Supabase Auth (*Authentication* → *Logs*), não na tabela `auditoria`: antes do código a conta não grava nada.
- A política de conteúdo (CSP) está numa tag `<meta>`; no GitHub Pages não dá para enviar cabeçalhos HTTP (como proteção contra *clickjacking*). Com hospedagem própria, vira cabeçalho.
