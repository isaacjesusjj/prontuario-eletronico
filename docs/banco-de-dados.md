# Banco de dados e projeções de uso — Vinculum

Tudo sobre os dados do Vinculum num lugar só: como estão organizados hoje (JSON), como viram o banco (PostgreSQL no Supabase), o que o banco garante, quanto ele vai crescer e quanto custa. Segue a ordem **problema → valor → evidência → próximo passo**.

> **Resumo para a banca**
> - Hoje os dados ficam num JSON com **32 coleções**. Cada coleção já é uma tabela do banco, e cada campo já é uma coluna.
> - O banco escolhido é o **PostgreSQL no Supabase**, na região de São Paulo. As regras de acesso ficam dentro do próprio banco.
> - No cenário atual (800 estudantes, 400 pacientes por semestre), o banco cresce cerca de **109 MB por ano**. Em 20 anos de guarda são cerca de **2,1 GB**, mais **2,9 GB** de anexos.
> - Isso cabe com folga no plano **Pro** (US$ 25/mês), que inclui 8 GB de banco e 100 GB de arquivos. O plano gratuito serve só para o protótipo.
> - A evidência é o banco testado num PostgreSQL de verdade, com **174 verificações**. Quase metade delas confere que o banco **recusa** o que é proibido.

---

## 1. O problema

- **Registros em papel:** não dá para saber por que o paciente abandona, quem leu o prontuário, nem quando.
- **Sigilo e LGPD:** dado de saúde é dado sensível. O estagiário só pode ver os casos da própria dupla, e só enquanto o estágio dura. Não basta esconder na tela: quem chamar o servidor direto também não pode ver.
- **Guarda longa:** o prontuário precisa ficar guardado por anos, sem ser alterado, com prova de quem fez o quê.

## 2. A escolha e o porquê

| Critério | Escolha | Por quê |
|---|---|---|
| Tipo de banco | Relacional (PostgreSQL) | Os dados são muito ligados entre si (paciente → caso → sessão → evolução → assinatura). Relacional garante essas ligações e não deixa dado órfão |
| Onde roda | Supabase, região South America (São Paulo), `sa-east-1` | Dados no Brasil; login pronto (com verificação em duas etapas); arquivos privados (Storage); API gerada a partir das tabelas |
| Quem vê o quê | Políticas RLS (*Row Level Security*) no próprio banco | A regra vale até para quem chamar a API sem passar pelas telas |
| Sem amarra | PostgreSQL comum | Se a instituição preferir servidor próprio, o mesmo `banco/schema.sql` roda; só a parte de login do Supabase muda |

## 3. Do JSON ao banco

### Como o JSON está organizado (`dados/dados-iniciais.json`)

| Parte | O que tem | Vai para o banco? |
|---|---|---|
| `_meta` | Versão dos dados, data-base da demonstração, senha das contas de teste | Não (só serve ao protótipo) |
| `_config` | 31 listas de opções (presença, salas, motivos de falta...) e 30 regras numéricas (faltas seguidas, tempo de sessão, guarda...) | Fica no site. O banco repete as **listas fechadas** como regras `check` e as **regras de negócio** como gatilhos (*triggers*) |
| 32 coleções | `pacientes`, `casos`, `sessoes`, `evolucoes`, `assinaturas`, `auditoria`... | Sim: **uma coleção = uma tabela** |

### As três regras da tradução

1. **Uma coleção vira uma tabela, e cada campo vira uma coluna.** O nome muda só na forma: `casoId` vira `caso_id`.
2. **O `id` é a chave primária. As ligações são feitas por id**, sem repetir dados. A evolução guarda `casoId`, não o nome do paciente.
3. **O que o banco faz sozinho não vai do JSON:**
   - as senhas: quem guarda o hash é o Supabase Auth;
   - o segredo da verificação em duas etapas;
   - os hashes da auditoria: o banco recalcula a corrente.

### Exemplo lado a lado (dados fictícios)

No JSON:

```json
{ "id": "e01", "casoId": "c01", "sessaoId": "s01", "autorId": "u-est1", "data": "2026-08-19",
  "status": "validada", "texto": "Sessão 1. Acolhimento e contrato terapêutico...", "comentarioSupervisor": "", "tipo": "sessao" }
```

No banco (gerado por `banco/migrar_json.py`):

```sql
insert into evolucoes (id, caso_id, sessao_id, autor_id, data, status, texto, comentario_supervisor, tipo)
values ('e01', 'c01', 's01', 'u-est1', '2026-08-19', 'validada', 'Sessão 1. Acolhimento e contrato terapêutico...', '', 'sessao');
```

E a tabela confere sozinha: `status` só aceita os 4 valores da lista; `texto` tem de 10 a 5.000 caracteres; evolução devolvida exige comentário da supervisão; `caso_id` precisa existir em `casos`.

### Como o site troca o JSON pelo banco

Toda gravação passa por `js/repositorio.js`. O adaptador é escolhido numa linha de `js/config-banco.js`:

- `'local'` (hoje): JSON e uma cópia guardada no navegador;
- `'supabase'`: o banco de verdade.

As telas não mudam.

## 4. As tabelas, por assunto

São 32 tabelas, mais as partições anuais da auditoria. O desenho completo, com as ligações, está no DER de [`diagramas.md`](diagramas.md).

| Assunto | Tabelas | O que guardam |
|---|---|---|
| Pessoas e acesso | `usuarios`, `pacientes`, `aceites`, `acessos_justificados` | Contas da equipe e dos pacientes; cadastro do paciente (com contato de emergência); aceite dos termos com versão; motivo registrado pela técnica antes de abrir caso de fora da equipe |
| Estágio | `grupos`, `subgrupos`, `alocacoes`, `transferencias` | Grupos de orientação, duplas e trios; vínculo de estágio com início e fim (o acesso nasce e morre com ele); passagem do caso para outra dupla no fim do semestre |
| Fila e caso | `inscricoes`, `casos`, `anamneses`, `consentimentos`, `encerramentos` | Fila de espera pública; o caso; anamnese em versões; consentimento por finalidade; alta, desistência, abandono ou encaminhamento |
| Atendimento | `sessoes`, `evolucoes`, `assinaturas`, `adendos`, `lembretes`, `contatos` | Agenda com sala e presença; registro de cada sessão; assinaturas do estagiário e do supervisor (com hash do texto); correção só por adendo; lembretes sem conteúdo clínico; tentativas de contato no fluxo de abandono |
| Supervisão e avaliação | `orientacoes`, `avaliacoes` | Ficam fora do prontuário e da cópia do paciente |
| Risco | `riscos`, `notificacoes`, `planos_seguranca` | Avaliação de risco com ciência da supervisão; notificação compulsória; plano de segurança feito com o paciente |
| Documentos | `documentos`, `eventos_documento`, `comunicacoes`, `anexos` | Documentos psicológicos (Res. CFP 06/2019); entrega, devolutiva e anulação; o que foi comunicado a terceiros; anexos (o arquivo vai para o Storage privado, a tabela guarda tipo, tamanho e hash) |
| Direitos do paciente | `solicitacoes`, `links_acesso`, `pedidos_titular` | Pedido de cópia; link de leitura temporário (o banco guarda só o hash); pedidos pela LGPD |
| Auditoria | `auditoria` (+ uma partição por ano) | Quem fez o quê e quando, em corrente de hash. Só aceita inclusão |

Nos dados de demonstração há 268 registros em 26 tabelas. As outras 6 começam vazias e se enchem quando alguém usa as telas.

## 5. O que o banco garante (evidência)

O banco foi testado num PostgreSQL 18 de verdade (PGlite), com `banco/testar_banco.mjs`: **174 verificações**. Quase metade é negativa: confere que o banco **recusa**. A lista completa está em [`banco/README.md`](../banco/README.md). Os pontos principais:

- **Nada é apagado nem retroagido:**
  - evolução validada não muda; correção só por adendo;
  - assinaturas, consentimentos, adendos e auditoria só aceitam inclusão;
  - a hora de cada registro é a do servidor.
- **Ninguém pula etapa pela API.** Gatilhos com as regras de transição em casos, sessões, evoluções, riscos, documentos e passagem de caso, entre outros.
- **Listas fechadas e formatos.** Conferidos com `check`: CPF válido e sem repetição, telefone com DDD, sala sem choque de horário.
- **Auditoria à prova de adulteração.** Corrente de SHA-256, com a mesma fórmula usada no navegador. `app.verificar_auditoria()` acusa qualquer mudança.
- **Senha vazada sozinha não basta.** Quem ligou a verificação em duas etapas e entrou só com a senha não vê nada.

## 6. Quem vê o quê (políticas RLS)

| Perfil | Vê |
|---|---|
| Estagiário | Só os casos da própria dupla ou trio, com vínculo de estágio ativo |
| Supervisor | Os casos dos seus grupos |
| Técnica | Todos os casos. Para abrir o conteúdo clínico de caso de fora da equipe, registra o motivo antes (vale 12 h, fica na auditoria e o paciente pode ver) |
| Direção | Só números agregados (`app.indicadores()`), nunca prontuário |
| Paciente | Só o próprio prontuário: pela cópia pedida ou pelo link temporário |
| Visitante | Só consegue se inscrever na fila. Não lê nada |

## 7. Projeções de uso

A conta está em `banco/projecao.py`. As premissas ficam no topo do arquivo: mudou um número, rode `python banco/projecao.py` de novo.

### Premissas principais

| Premissa | Valor | De onde vem |
|---|---|---|
| Contas de estudantes | 800 | Requisitos da Etapa 1 (validar: a Etapa 1 também fala em "800 usuários simultâneos") |
| Pacientes por semestre | 400 | Requisitos da Etapa 1 |
| Estagiários atendendo por semestre | 120 | Estimativa (duplas e trios) |
| Sessões agendadas por paciente no semestre | 12, com 80% de presença | Semestre de ~18 semanas, nem todo paciente é semanal |
| Casos novos | 60% dos pacientes do semestre | O resto continua do semestre anterior |
| Eventos de auditoria | 12 por sessão e 2 por login | Abrir prontuário, presença, evolução, validação... |
| Anexos | 0,8 por caso, 400 KB em média | O site aceita até 2 MB por arquivo |
| Tamanho de cada linha | Medido no banco de teste, mais índices | Valor conservador nos textos clínicos (a evolução vai até 5.000 caracteres) |

### Resultado

| Cenário | Registros novos por ano | Banco por ano | Banco em 5 anos | Banco em 20 anos | Anexos em 20 anos | Pessoas ao mesmo tempo (pico) | Usuários ativos por mês |
|---|---|---|---|---|---|---|---|
| **Atual** (800 estudantes, 400 pacientes por semestre) | ~270 mil | ~109 MB | ~0,53 GB | ~2,1 GB | ~2,9 GB | ~47 (~5 pedidos por segundo) | ~900 |
| **Crescimento ×3** | ~810 mil | ~327 MB | ~1,6 GB | ~6,4 GB | ~8,8 GB | ~129 (~13 por segundo) | ~2.700 |
| **Estresse ×10** | ~2,7 milhões | ~1,1 GB | ~5,3 GB | ~21,3 GB | ~29,3 GB | ~415 (~42 por segundo) | ~8.900 |

**Onde o banco cresce.** A **auditoria** responde por cerca de 81% das linhas e 65% do espaço: guardar quem abriu cada prontuário custa mais do que o próprio prontuário. Em seguida vêm as evoluções (~21% do espaço) e as assinaturas.

**Por que isso é pouco.** Um PostgreSQL comum trabalha bem com centenas de GB e milhares de pedidos por segundo. O pico do cenário atual (~47 pessoas, ~5 pedidos por segundo) é pequeno para ele.

## 8. Planos e custos

| Plano | Banco incluído | Arquivos incluídos | Preço | Serve para |
|---|---|---|---|---|
| Supabase Free | 0,5 GB | 1 GB | US$ 0 | Protótipo e apresentação. Pausa depois de 7 dias sem uso e não tem backup automático: **não serve para dado real** |
| Supabase Pro | 8 GB | 100 GB | US$ 25 por mês (cerca de US$ 300 por ano) | Produção: não pausa, backup diário guardado por 7 dias |

**Quando cada plano fica pequeno:**

| Cenário | Plano gratuito | Plano Pro |
|---|---|---|
| Atual | Passa do limite no **5º ano** (pelo banco) | **Não passa** em 20 anos |
| Crescimento ×3 | Passa do limite no **2º ano** | **Não passa** em 20 anos |
| Estresse ×10 | Passa do limite já no **1º ano** | O banco passa de 8 GB no **8º ano** |

No cenário ×10, o que passar de 8 GB custa US$ 0,125 por GB por mês. No 20º ano seriam ~13 GB a mais, cerca de **US$ 1,70 por mês**. Há outra saída: a auditoria é particionada por ano, e os anos antigos podem ir para um armazenamento mais barato.

**Sem dinheiro?** O leque de opções gratuitas está em [`opcoes-gratuitas.md`](opcoes-gratuitas.md). Ele compara o próprio JSON, o GitHub como banco, os planos gratuitos (Supabase, Neon, Firebase, Turso, Cloudflare D1, MongoDB, Appwrite, Nhost), programas de código aberto instalados (Supabase instalado, PocketBase) e créditos de estudante.

Preços e limites conferidos em novembro de 2026 em fontes públicas sobre o Supabase. Confirmar em supabase.com/pricing antes de contratar.

Fontes: [MakerKit](https://makerkit.dev/blog/saas/supabase-pricing), [UI Bakery](https://uibakery.io/blog/supabase-pricing), [Schematic](https://schematichq.com/blog/supabase-pricing), [DesignRevision](https://designrevision.com/blog/supabase-pricing).

## 9. Guarda e eliminação

| Dado | Por quanto tempo | Como |
|---|---|---|
| Prontuário | 20 anos depois do último registro (Lei 13.787/2018, art. 6º; o mínimo do CFP é 5 anos). Para menor de idade, a regra `guardaMenorDesde18` conta a partir dos 18 anos | Nada é apagado antes. O site mostra no Resumo do caso a data até quando o prontuário é guardado |
| Inscrição que não virou atendimento | 12 meses | `app.eliminar_inscricoes_antigas()`, agendada no banco (pg_cron) |
| Auditoria | Junto com o prontuário | Partições por ano: fáceis de arquivar sem mexer nas outras |
| Anexos | Junto com o prontuário | Storage privado; o caminho começa pelo caso (é o que a política de acesso confere) |

## 10. Limites conhecidos

- O adaptador do Supabase foi testado contra um servidor simulado, mas ainda não rodou num projeto Supabase criado.
- Ações que gravam em mais de uma tabela vão em duas requisições. Exemplo: validar uma evolução muda o status e grava a assinatura. Em produção, viram funções no banco (RPC) para gravar tudo de uma vez.
- Três tarefas precisam de funções no servidor (Edge Functions): o link de leitura do paciente, o convite por e-mail e desligar a verificação em duas etapas de quem perdeu o celular.
- As premissas da projeção são estimativas. Os números reais da clínica (pacientes por semestre, sessões, anexos) devem substituí-las.

## 11. Próximo passo

1. **Validar as premissas com a clínica.** Pacientes por semestre, frequência das sessões e se "800" quer dizer estudantes cadastrados ou pessoas ao mesmo tempo. Depois, rodar `python banco/projecao.py`.
2. **Ligar o banco (cerca de 30 minutos).** Passo a passo em [`banco/README.md`](../banco/README.md):
   - criar o projeto em São Paulo;
   - rodar `schema.sql` e `dados-demo.sql`;
   - convidar as contas;
   - criar o bucket privado `anexos`;
   - trocar o adaptador em `js/config-banco.js`.
3. **Produção.** Plano Pro, verificação em duas etapas obrigatória para a equipe, Edge Functions, backup conferido (teste de restauração) e as aprovações da instituição.

**Como conferir tudo:**

```bash
python ferramentas/validar_json.py
```

```bash
cd banco && python3 migrar_json.py && node testar_banco.mjs
```

```bash
python banco/projecao.py
```
