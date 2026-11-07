// Teste do banco do Vínculo num PostgreSQL de verdade (PGlite = PostgreSQL compilado para rodar no Node).
// Roda o schema, migra o JSON e confere: contagens, validações, imutabilidade, auditoria encadeada,
// regras de acesso (RLS) de cada perfil e indicadores.
// Uso:  cd banco && npm install && python3 migrar_json.py && node testar_banco.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ler = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const json = JSON.parse(ler('../dados/dados-iniciais.json'));
const db = new PGlite();
const resultados = [];
let falhas = 0;

function conferir(nome, ok, detalhe = '') {
  resultados.push({ nome, ok, detalhe });
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${nome}${detalhe ? ' — ' + detalhe : ''}`);
}
async function erroEsperado(nome, sql, params = []) {
  try { await db.query(sql, params); conferir(nome, false, 'o banco aceitou'); }
  catch (e) { conferir(nome, true, 'recusado: ' + e.message.split('\n')[0].slice(0, 90)); }
}
const valores = async (sql, params = []) => (await db.query(sql, params)).rows;

// Executa como um usuário logado (igual ao Supabase: papel "authenticated" + id e nível do token).
// aal = como a pessoa entrou: 'aal1' só com a senha; 'aal2' com a senha e o código do aplicativo (MFA)
async function como(usuarioId, fn, aal = 'aal1') {
  const [{ auth_id }] = await valores('select auth_id from usuarios where id = $1', [usuarioId]);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${auth_id}', false);
    select set_config('request.jwt.claims', '${JSON.stringify({ sub: auth_id, aal })}', false);`);
  try { return await fn(); } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);`);
  }
}
async function comoVisitante(fn) {
  await db.exec('set role anon;');
  try { return await fn(); } finally { await db.exec('reset role;'); }
}
const ids = async (tabela) => (await valores(`select id from ${tabela} order by id`)).map((r) => r.id).join(',');

// ---------- 1. Schema e migração ----------
const t0 = Date.now();
await db.exec(ler('teste_stub_supabase.sql'));
await db.exec(ler('schema.sql'));
conferir('schema.sql roda sem erro', true, (await valores("select count(*)::int n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'"))[0].n + ' tabelas');
await db.exec(ler('dados-demo.sql'));
const colecoes = Object.keys(json).filter((k) => !k.startsWith('_') && json[k].length);
const snake = (s) => s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
let todas = true, totalJson = 0, totalBanco = 0;
for (const c of colecoes) {
  const [{ n }] = await valores(`select count(*)::int n from ${snake(c)}`);
  totalJson += json[c].length; totalBanco += n;
  if (n !== json[c].length) { todas = false; conferir(`contagem de ${c}`, false, `JSON ${json[c].length} × banco ${n}`); }
}
conferir('migração JSON → banco: mesmas quantidades em todas as tabelas', todas, `${totalBanco} registros em ${colecoes.length} tabelas (${Date.now() - t0} ms)`);

// ---------- 2. Validação dentro do banco ----------
await erroEsperado('CPF com dígito verificador errado é recusado', "insert into pacientes (nome, data_nascimento, cpf, telefone) values ('Teste Cpf', '1990-01-01', '12345678900', '11912345678')");
await erroEsperado('CPF repetido é recusado', `insert into pacientes (nome, data_nascimento, cpf, telefone) values ('Teste Dup', '1990-01-01', '${json.pacientes[0].cpf}', '11912345678')`);
await erroEsperado('telefone inválido é recusado', "insert into pacientes (nome, data_nascimento, cpf, telefone) values ('Teste Tel', '1990-01-01', '', '123')");
await erroEsperado('presença fora da lista é recusada', "insert into sessoes (caso_id, data, hora, presenca) values ('c01', '2026-12-01', '14:00', 'talvez')");
await erroEsperado('documento sem finalidade é recusado (Res. CFP 05/2025, art. 12)', "insert into documentos (caso_id, tipo, titulo, finalidade, destinatario, autor_id) values ('c01', 'Declaração', 'Declaração', '', 'Paciente', 'u-est1')");

// ---------- 3. Imutabilidade (vale até para o administrador do banco) ----------
await erroEsperado('evolução validada não pode ser editada', "update evolucoes set texto = 'alterado depois de validado' where id = 'e01'");
await erroEsperado('evolução não pode ser apagada', "delete from evolucoes where id = 'e04'");
await erroEsperado('rascunho não pula direto para validada', "update evolucoes set status = 'validada' where id = 'e04'");
await erroEsperado('consentimento não pode ser alterado (revogar = novo registro)', "update consentimentos set concedido = true where id = 'cs01'");
await erroEsperado('assinatura não pode ser apagada', "delete from assinaturas where id = 'as01'");
await erroEsperado('auditoria não pode ser alterada', "update auditoria set acao = 'nada aconteceu'");
await erroEsperado('auditoria não pode ser apagada', 'delete from auditoria');

// ---------- 4. Auditoria encadeada ----------
const [{ quebra }] = await valores('select app.verificar_auditoria() as quebra');
conferir('cadeia de hash da auditoria íntegra depois da migração', quebra === null);
const eventos = await valores(`select id, to_char(em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI') as em, usuario_id, acao, alvo, hash_anterior, hash from auditoria order by seq`);
const mesmoCalculo = eventos.every((e) => createHash('sha256').update(JSON.stringify([e.id, e.em, e.usuario_id, e.acao, e.alvo, e.hash_anterior]), 'utf8').digest('hex') === e.hash);
conferir('o hash do banco é igual ao calculado pelo navegador (mesma fórmula de js/estado.js)', mesmoCalculo, eventos.length + ' eventos');
await db.exec("alter table auditoria disable trigger so_insercao; update auditoria set acao = 'evento adulterado' where id = 'au02'; alter table auditoria enable trigger so_insercao;");
const [{ quebra: q2 }] = await valores('select app.verificar_auditoria() as quebra');
conferir('adulteração direta no banco (desligando o trigger) é detectada', q2 !== null, 'quebra no evento seq ' + q2);
await db.exec("alter table auditoria disable trigger so_insercao; update auditoria set acao = 'Assinou e enviou evolução' where id = 'au02'; alter table auditoria enable trigger so_insercao;");

// ---------- 5. Quem vê o quê (RLS) ----------
const esperado = {
  'u-est1': 'c01,c02', 'u-est2': 'c01,c02', 'u-est3': 'c03', 'u-est5': 'c04,c05,c06', 'u-est9': '', 'u-est8': '',
  'u-sup1': 'c01,c02,c03', 'u-sup2': 'c04,c05,c06', 'u-tec': 'c01,c02,c03,c04,c05,c06,c07', 'u-dir': '', 'u-pac1': 'c01'
};
const nomes = Object.fromEntries(json.usuarios.map((u) => [u.id, u.nome || 'Paciente Exemplo 01']));
for (const [uid, casos] of Object.entries(esperado)) {
  const vistos = await como(uid, () => ids('casos'));
  conferir(`${nomes[uid]} vê só os casos permitidos`, vistos === casos, `vê [${vistos || 'nenhum'}]`);
}
conferir('Iara (vínculo de estágio encerrado em 31/07) não vê evoluções', (await como('u-est9', () => ids('evolucoes'))) === '');
conferir('rascunho só o autor vê (Caio não vê o rascunho da Bia)', !(await como('u-est2', () => ids('evolucoes'))).split(',').includes('e04') && (await como('u-est1', () => ids('evolucoes'))).split(',').includes('e04'));
conferir('paciente não lê a tabela de evoluções (recebe a cópia pelo fluxo de acesso)', (await como('u-pac1', () => ids('evolucoes'))) === '');
conferir('direção não lê evoluções nem pacientes', (await como('u-dir', () => ids('evolucoes'))) === '' && (await como('u-dir', () => ids('pacientes'))) === '');
conferir('registro de supervisão: técnico não vê', (await como('u-tec', () => ids('orientacoes'))) === '');
conferir('registro de supervisão: Helena vê os dos seus grupos', (await como('u-sup1', () => ids('orientacoes'))) === 'o01,o03');
conferir('registro de supervisão: Bia vê só o do caso dela', (await como('u-est1', () => ids('orientacoes'))) === 'o01');
conferir('avaliação psicológica: Duda (do caso) vê, Bia não', (await como('u-est3', () => ids('avaliacoes'))) === 'av01' && (await como('u-est1', () => ids('avaliacoes'))) === '');
conferir('paciente vê só o próprio cadastro', (await como('u-pac1', () => ids('pacientes'))) === 'p01');
conferir('fila de espera: só o técnico lê', (await como('u-est1', () => ids('inscricoes'))) === '' && (await como('u-tec', () => ids('inscricoes'))).split(',').length === json.inscricoes.length);
conferir('auditoria: só o técnico lê', (await como('u-est1', () => ids('auditoria'))) === '' && (await como('u-tec', () => ids('auditoria'))) !== '');

// ---------- 6. Escrita com as regras ----------
await como('u-est1', async () => {
  await erroEsperado('Bia não escreve evolução no caso do Enzo', "insert into evolucoes (caso_id, autor_id, status, texto) values ('c04', 'u-est1', 'rascunho', 'Tentativa de registro em caso alheio')");
  await db.query("insert into evolucoes (id, caso_id, autor_id, status, texto) values ('e-teste', 'c01', 'u-est1', 'rascunho', 'Sessão de teste. Tema, intervenção e plano.')");
  await db.query("update evolucoes set status = 'enviada' where id = 'e-teste'");
  conferir('Bia escreve e envia evolução no próprio caso', true);
});
await como('u-sup2', async () => {
  const r = await db.query("update evolucoes set status = 'validada' where id = 'e-teste'");
  conferir('Rafael (outro grupo) não consegue validar evolução do Grupo A', r.affectedRows === 0);
});
await como('u-sup1', async () => {
  const r = await db.query("update evolucoes set status = 'validada' where id = 'e-teste'");
  conferir('Helena (supervisora do caso) valida', r.affectedRows === 1);
});
await como('u-est1', async () => {
  // A política nem deixa a linha "aparecer" para o UPDATE (0 linhas); o trigger barraria de qualquer jeito
  let bloqueado;
  try { bloqueado = (await db.query("update evolucoes set texto = 'Texto trocado depois da validação' where id = 'e-teste'")).affectedRows === 0; }
  catch (e) { bloqueado = true; }
  const [{ texto }] = await valores("select texto from evolucoes where id = 'e-teste'");
  conferir('depois de validada, nem a autora edita', bloqueado && texto.indexOf('trocado') === -1, '0 linhas alteradas; texto original mantido');
});
await como('u-pac1', async () => {
  const r = await db.query("update sessoes set confirmada = true where id = 's31'");
  conferir('paciente confirma presença na própria sessão', r.affectedRows === 1);
  await erroEsperado('paciente não altera a presença', "update sessoes set presenca = 'falta-justificada' where id = 's31'");
  await db.query("insert into consentimentos (caso_id, finalidade, concedido, termo_versao, registrado_por) values ('c01', 'gravacao', false, '2026.1', 'u-pac1')");
  conferir('paciente revoga um consentimento opcional', true);
  await erroEsperado('paciente não mexe no contrato terapêutico', "insert into consentimentos (caso_id, finalidade, concedido, termo_versao, registrado_por) values ('c01', 'contrato', false, '2026.1', 'u-pac1')");
  await erroEsperado('paciente não consegue ver indicadores', 'select app.indicadores()');
});

// ---------- 6b. Quem chama a API direto não contorna as regras ----------
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
await como('u-est1', async () => {
  await erroEsperado('estagiária não se promove a técnica pela API (perfil e CRP não mudam)', "update usuarios set perfil = 'tecnico', crp = 'CRP falso' where id = 'u-est1'");
  const r = await db.query("update usuarios set senha_provisoria = false where id = 'u-est1'");
  conferir('a única coluna da própria conta que muda pela API é "senha provisória"', r.affectedRows === 1);
  await erroEsperado('evolução não nasce validada (quem valida é o supervisor)', "insert into evolucoes (caso_id, autor_id, status, texto) values ('c01', 'u-est1', 'validada', 'Tentativa de pular a supervisão.')");
  await erroEsperado('evolução não se liga a sessão de outro caso', "insert into evolucoes (caso_id, sessao_id, autor_id, status, texto) values ('c01', 's13', 'u-est1', 'rascunho', 'Sessão de outro caso, outra dupla.')");
  await erroEsperado('estagiária não muda a dupla do caso', "update casos set subgrupo_id = 'd-a2' where id = 'c01'");
  await erroEsperado('sessão passada não entra já com presença (presença só no dia)', "insert into sessoes (caso_id, data, hora, presenca) values ('c01', '2026-10-01', '10:00', 'presente')");
  await erroEsperado('abandono só depois de registrar a tentativa de contato', "insert into encerramentos (caso_id, tipo, motivo, registro, registrado_por) values ('c02', 'abandono', 'Não informado', 'Sem contato.', 'u-est1')");
  await erroEsperado('encaminhamento exige o serviço da rede que vai receber', "insert into encerramentos (caso_id, tipo, motivo, registro, registrado_por) values ('c02', 'encaminhamento', 'Demanda de outro serviço', 'Encaminhada à rede com relatório.', 'u-est1')");
  await erroEsperado('ninguém grava evento de auditoria em nome de visitante', "insert into auditoria (usuario_id, acao, alvo) values ('visitante', 'Tentativa de login sem sucesso', 'helena')");
  // Assinatura: o hash precisa ser o do texto e a hora é a do servidor
  const texto = 'Sessão de teste. Tema, intervenção e plano para a próxima.';
  await db.query("insert into evolucoes (id, caso_id, autor_id, status, texto) values ('e-teste2', 'c01', 'u-est1', 'rascunho', $1)", [texto]);
  await db.query("update evolucoes set status = 'enviada' where id = 'e-teste2'");
  await erroEsperado('assinatura com hash de outro texto é recusada', "insert into assinaturas (alvo_tipo, alvo_id, usuario_id, papel, hash) values ('evolucao', 'e-teste2', 'u-est1', 'estagiario', $1)", [sha('outro texto')]);
  await db.query("insert into assinaturas (id, alvo_tipo, alvo_id, usuario_id, papel, em, hash) values ('as-teste', 'evolucao', 'e-teste2', 'u-est1', 'estagiario', '2020-01-01 10:00', $1)", [sha(texto)]);
  await erroEsperado('evento de auditoria com data retroativa é recusado', "insert into auditoria (usuario_id, acao, alvo, em) values ('u-est1', 'Assinou e enviou evolução', 'c01', '2020-01-01 10:00')");
  await db.query("insert into auditoria (id, usuario_id, acao, alvo) values ('au-teste', 'u-est1', 'Assinou e enviou evolução', 'c01')");
});
const [{ hoje_ass, hoje_aud }] = await valores(`select (select em::date = current_date from assinaturas where id = 'as-teste') as hoje_ass,
  (select em::date = current_date from auditoria where id = 'au-teste') as hoje_aud`);
conferir('a data da assinatura e da auditoria é a do servidor (data retroativa enviada é ignorada)', hoje_ass && hoje_aud);
const [{ perfil }] = await valores("select perfil from usuarios where id = 'u-est1'");
conferir('depois da tentativa, o perfil da Bia continua "estagiario"', perfil === 'estagiario');
conferir('conta de paciente: Bia (equipe do caso) vê; Duda (outra dupla) não vê', (await como('u-est1', () => ids('usuarios'))).split(',').includes('u-pac1')
  && !(await como('u-est3', () => ids('usuarios'))).split(',').includes('u-pac1'));
await como('u-tec', async () => {
  await erroEsperado('ninguém troca o paciente de um caso', "update casos set paciente_id = 'p02' where id = 'c01'");
  await erroEsperado('a limpeza da fila não roda pela API (só o agendador do banco)', 'select app.eliminar_inscricoes_antigas()');
});
await como('u-est5', async () => {
  await erroEsperado('caso encerrado não é reaberto (quem volta ganha caso novo na triagem)', "update casos set status = 'ativo' where id = 'c05'");
});
await como('u-sup1', async () => {
  await erroEsperado('supervisora não reativa o vínculo de quem já saiu (Iara)', "update alocacoes set fim = null where id = 'al08'");
  await erroEsperado('supervisora não encerra vínculo de estágio (é da direção)', "update alocacoes set fim = current_date where id = 'al01'");
});
await como('u-pac1', async () => {
  await erroEsperado('paciente não pede cópia do prontuário de outra pessoa', "insert into solicitacoes (paciente_id, caso_id, status) values ('p01', 'c02', 'recebida')");
  const r = await db.query("insert into solicitacoes (paciente_id, caso_id, status) values ('p01', 'c01', 'recebida')");
  conferir('paciente pede cópia do próprio prontuário', r.affectedRows === 1);
});
await comoVisitante(async () => {
  await erroEsperado('visitante não consulta os indicadores (não é tratado como administrador)', 'select app.indicadores()');
  await erroEsperado('visitante não roda a verificação da auditoria', 'select app.verificar_auditoria()');
});
// Storage: o caminho do arquivo começa pelo caso; só quem vê o caso envia e baixa
await como('u-est1', async () => {
  await db.query("insert into storage.objects (bucket_id, name) values ('anexos', 'c01/arq-teste')");
  await erroEsperado('anexo: estagiária não envia arquivo para caso de outra dupla', "insert into storage.objects (bucket_id, name) values ('anexos', 'c04/arq-intruso')");
});
const vistosEnzo = await como('u-est5', async () => (await valores("select count(*)::int n from storage.objects where name = 'c01/arq-teste'"))[0].n);
const vistosBia = await como('u-est1', async () => (await valores("select count(*)::int n from storage.objects where name = 'c01/arq-teste'"))[0].n);
conferir('anexo: quem não é da equipe do caso não baixa o arquivo', vistosEnzo === 0 && vistosBia === 1);
// Supabase Auth: a conta só é ligada ao usuário depois que o e-mail é confirmado
await db.query("insert into usuarios (id, nome, login, email, perfil, cargo) values ('u-teste', 'Conta Teste', 'conta.teste', 'conta.teste@clinica.example.org', 'direcao', 'Direção')");
await db.query("insert into auth.users (id, email) values ('11111111-1111-4111-8111-111111111111', 'conta.teste@clinica.example.org')");
const [{ antes }] = await valores("select auth_id is null as antes from usuarios where id = 'u-teste'");
await db.query("update auth.users set email_confirmed_at = now() where id = '11111111-1111-4111-8111-111111111111'");
const [{ depois }] = await valores("select auth_id = '11111111-1111-4111-8111-111111111111' as depois from usuarios where id = 'u-teste'");
conferir('login novo só é ligado à conta depois de o e-mail ser confirmado (ninguém "toma" a conta)', antes && depois);
const [{ quebra: q4 }] = await valores('select app.verificar_auditoria() as quebra');
conferir('depois das tentativas, a cadeia da auditoria continua íntegra', q4 === null);

// ---------- 6c. Risco e segurança ----------
conferir('risco: Duda (do caso) vê a avaliação; Bia (outra dupla) não vê; o paciente não lê a tabela',
  (await como('u-est3', () => ids('riscos'))) === 'r01' && (await como('u-est1', () => ids('riscos'))) === '' && (await como('u-pac1', () => ids('riscos'))) === '');
await como('u-est3', async () => {
  await erroEsperado('risco: a avaliação registrada não muda (nova avaliação, nunca edição)', "update riscos set descricao = 'Texto trocado depois.' where id = 'r01'");
  await erroEsperado('risco: estagiária não registra notificação compulsória (é do supervisor)', "insert into notificacoes (risco_id, caso_id, orgao, registrado_por) values ('r01', 'c03', 'vigilancia', 'u-est3')");
  await db.query("insert into riscos (id, caso_id, registrado_por, tipo, nivel, descricao, condutas, ciencia_em, ciencia_por) values ('r-teste', 'c03', 'u-est3', 'autolesao', 'moderado', 'Relata cortes superficiais na semana; sem intenção suicida.', '[\"plano-seguranca\"]', now(), 'u-est3')");
  await erroEsperado('risco: estagiária não dá a ciência da supervisão', "update riscos set ciencia_em = now(), ciencia_por = 'u-est3' where id = 'r-teste'");
  await erroEsperado('risco: encerrar o acompanhamento antes da ciência da supervisão é recusado', "update riscos set encerrado_em = now(), encerramento_nota = 'Melhorou bastante.' where id = 'r-teste'");
});
const [rTeste] = await valores("select ciencia_em is null as sem_ciencia from riscos where id = 'r-teste'");
conferir('risco: a ciência não vem preenchida por quem registra (o banco limpa)', rTeste.sem_ciencia);
await como('u-sup1', async () => {
  await db.query("update riscos set ciencia_em = '2020-01-01', ciencia_por = 'u-est1' where id = 'r-teste'");
  await erroEsperado('risco: notificação ligada a risco de outro caso é recusada', "insert into notificacoes (risco_id, caso_id, orgao, registrado_por) values ('r02', 'c03', 'vigilancia', 'u-sup1')");
  await db.query("insert into notificacoes (risco_id, caso_id, orgao, registrado_por) values ('r-teste', 'c03', 'vigilancia', 'u-sup1')");
  await erroEsperado('risco: encerrar o acompanhamento exige o motivo', "update riscos set encerrado_em = now(), encerramento_nota = '' where id = 'r-teste'");
});
const [rCiencia] = await valores("select ciencia_por, ciencia_em::date = current_date as hoje from riscos where id = 'r-teste'");
conferir('risco: a supervisora dá ciência e o banco grava quem e quando (não o que foi enviado)', rCiencia.ciencia_por === 'u-sup1' && rCiencia.hoje);
conferir('risco: a supervisora registra a notificação do próprio caso', (await valores("select count(*)::int n from notificacoes where risco_id = 'r-teste'"))[0].n === 1);
await como('u-est5', async () => {
  await erroEsperado('risco: caso encerrado não recebe avaliação nova', "insert into riscos (caso_id, registrado_por, tipo, nivel, descricao) values ('c05', 'u-est5', 'crise-aguda', 'alto', 'Tentativa de registro em caso encerrado.')");
});
await como('u-est1', async () => {
  const campos = "caso_id, versao, autor_id, sinais_alerta, estrategias_proprias, servicos, revisado_com_paciente";
  await erroEsperado('plano de segurança só existe construído com o paciente', `insert into planos_seguranca (${campos}) values ('c01', 1, 'u-est1', 'Insônia', 'Caminhar', 'CVV 188', false)`);
  await erroEsperado('plano de segurança: a versão é sempre a seguinte da última', `insert into planos_seguranca (${campos}) values ('c01', 3, 'u-est1', 'Insônia', 'Caminhar', 'CVV 188', true)`);
  await db.query(`insert into planos_seguranca (id, ${campos}) values ('ps-teste', 'c01', 1, 'u-est1', 'Insônia por duas noites', 'Caminhar; respiração', 'CVV 188; SAMU 192', true)`);
  await erroEsperado('plano de segurança não é editado (nova versão, nunca edição)', "update planos_seguranca set servicos = 'outro' where id = 'ps-teste'");
});
conferir('plano de segurança: o paciente do caso lê o próprio plano; estagiária de outra dupla não',
  (await como('u-pac1', () => ids('planos_seguranca'))) === 'ps-teste' && !(await como('u-est3', () => ids('planos_seguranca'))).split(',').includes('ps-teste'));
const [{ q5 }] = await valores('select app.verificar_auditoria() as q5');
conferir('depois do módulo de risco, a cadeia da auditoria continua íntegra', q5 === null);

// ---------- 6d. Motivo de acesso da técnica e "quem acessou meu prontuário" ----------
const evoC01 = (await valores("select id from evolucoes where caso_id = 'c01' and status = 'validada'")).map((r) => r.id);
conferir('técnica não lê as evoluções de um caso antes de registrar o motivo do acesso',
  !(await como('u-tec', () => ids('evolucoes'))).split(',').some((id) => evoC01.includes(id)));
conferir('sem motivo, a técnica continua vendo casos, cadastro e agenda (camada operacional)',
  (await como('u-tec', () => ids('casos'))).split(',').length === json.casos.length && (await como('u-tec', () => ids('sessoes'))) !== '');
const anC07 = json.anamneses.find((a) => a.casoId === 'c07').id;
conferir('técnica lê a anamnese do caso recém-triado, que ainda espera alocação', (await como('u-tec', () => ids('anamneses'))).split(',').includes(anC07));
await como('u-est1', async () => {
  await erroEsperado('motivo de acesso é registro da técnica (estagiária não registra)', "insert into acessos_justificados (usuario_id, caso_id, motivo) values ('u-est1', 'c01', 'auditoria')");
});
await como('u-tec', async () => {
  await erroEsperado('motivo "outro" exige a descrição', "insert into acessos_justificados (usuario_id, caso_id, motivo) values ('u-tec', 'c01', 'outro')");
  await db.query("insert into acessos_justificados (id, usuario_id, caso_id, motivo) values ('aj-teste', 'u-tec', 'c01', 'pedido-paciente')");
  await erroEsperado('motivo de acesso registrado não muda', "update acessos_justificados set motivo = 'auditoria' where id = 'aj-teste'");
});
const vistasTec = (await como('u-tec', () => ids('evolucoes'))).split(',');
conferir('com o motivo registrado, a técnica lê as evoluções daquele caso, e só dele',
  evoC01.every((id) => vistasTec.includes(id)) && !vistasTec.includes('e21'));
const acessos = await como('u-pac1', () => valores('select * from app.acessos_ao_meu_prontuario()'));
const [{ n: esperadoAcessos }] = await valores("select (select count(*) from auditoria where alvo in ('c01', 'p01')) + (select count(*) from acessos_justificados where caso_id = 'c01') as n");
conferir('"quem acessou meu prontuário": o paciente vê o motivo da técnica e os eventos do próprio caso, e só deles',
  acessos.some((a) => a.motivo === 'pedido-paciente' && a.quem === 'Ana Lúcia') && acessos.some((a) => a.acao === 'Registrou informações no prontuário' && a.quem === 'Caio')
  && !acessos.some((a) => a.quem !== 'Você' && /risco|notifica/i.test(a.acao))
  && acessos.length === Number(esperadoAcessos), `${acessos.length} registros`);
conferir('"quem acessou": quem não é o paciente recebe a lista vazia', (await como('u-tec', () => valores('select * from app.acessos_ao_meu_prontuario()'))).length === 0);
// Portal de adolescente (c04, com avaliação de risco e notificação): costuma ser usado pelo responsável
await db.query("insert into usuarios (id, login, email, perfil, paciente_id, auth_id) values ('u-pac4', 'paciente04', 'paciente04@example.org', 'paciente', 'p04', '22222222-2222-4222-8222-222222222222')");
await como('u-tec', () => db.query("insert into acessos_justificados (usuario_id, caso_id, motivo) values ('u-tec', 'c04', 'risco-urgencia')"));
await como('u-sup2', () => db.query("insert into auditoria (usuario_id, acao, alvo) values ('u-sup2', 'Registrou notificação compulsória (conselho-tutelar)', 'c04')"));
const acessosMenor = await como('u-pac4', () => valores('select * from app.acessos_ao_meu_prontuario()'));
conferir('"quem acessou" de criança ou adolescente: sem o motivo da técnica e sem menção a risco ou notificação (Código de Ética, art. 13)',
  acessosMenor.length === 2 && acessosMenor.every((a) => a.motivo === null && !/risco|notifica/i.test(a.acao))
  && acessosMenor.some((a) => a.quem === 'Rafael' && a.acao === 'Registrou informações no prontuário'), acessosMenor.map((a) => a.quem + ': ' + a.acao).join('; '));

// ---------- 6e. "Não vou poder ir": o paciente avisa a falta ----------
await como('u-pac1', async () => {
  await erroEsperado('paciente não avisa falta em sessão que já passou', "update sessoes set presenca = 'falta-justificada', aviso_paciente = true, motivo_falta = 'saude' where id = 's29'");
  await erroEsperado('paciente não registra falta comum (só o aviso, que vira falta justificada)', "update sessoes set presenca = 'falta' where id = 's32'");
  await erroEsperado('aviso de falta só com motivo da lista (sem texto livre)', "update sessoes set presenca = 'falta-justificada', aviso_paciente = true, motivo_falta = 'texto livre' where id = 's32'");
  const r = await db.query("update sessoes set presenca = 'falta-justificada', aviso_paciente = true, motivo_falta = 'trabalho-estudo' where id = 's32'");
  conferir('paciente avisa, antes da sessão, que não vai (vira falta justificada, com a hora do servidor)', r.affectedRows === 1);
});
const [s32] = await valores("select presenca, avisado_em::date = current_date as hoje from sessoes where id = 's32'");
conferir('o aviso fica registrado com a data do servidor', s32.presenca === 'falta-justificada' && s32.hoje);
await como('u-est1', async () => {
  await erroEsperado('a equipe não registra um aviso "em nome" do paciente', "update sessoes set presenca = 'falta-justificada', aviso_paciente = true, motivo_falta = 'saude' where id = 's33'");
});

// ---------- 6f. Contas da equipe e acesso do paciente ao portal ----------
await como('u-dir', async () => {
  const r = await db.query("update usuarios set ativo = false where id = 'u-est8'");
  conferir('direção desativa a conta de um estagiário (o histórico continua)', r.affectedRows === 1);
  await erroEsperado('direção não muda o perfil de ninguém pela API', "update usuarios set perfil = 'tecnico' where id = 'u-est7'");
  await erroEsperado('ninguém desativa a própria conta', "update usuarios set ativo = false where id = 'u-dir'");
  const r2 = await db.query("update usuarios set ativo = false where id = 'u-pac1'");
  conferir('direção não mexe no acesso de paciente ao portal (é da técnica)', r2.affectedRows === 0);
});
await como('u-est1', async () => {
  const r = await db.query("update usuarios set ativo = false where id = 'u-est2'");
  conferir('estagiária não desativa a conta de outra pessoa', r.affectedRows === 0);
});
await como('u-tec', async () => {
  await db.query("insert into usuarios (id, login, email, perfil, paciente_id, senha_provisoria) values ('u-pac3', 'paciente03', 'paciente03@example.org', 'paciente', 'p03', true)");
  conferir('técnica cria o acesso de um paciente ao portal', true);
  await erroEsperado('técnica não cria conta de equipe', "insert into usuarios (login, email, perfil, crp) values ('falso.supervisor', 'falso@clinica.example.org', 'supervisor', 'CRP 00/0')");
  await db.query("update usuarios set ativo = false where id = 'u-pac1'");
});
conferir('conta desativada não vê mais nada (nem os próprios dados)', (await como('u-pac1', () => ids('pacientes'))) === '');
await como('u-tec', () => db.query("update usuarios set ativo = true where id = 'u-pac1'"));
conferir('conta reativada volta a ver o que é dela', (await como('u-pac1', () => ids('pacientes'))) === 'p01');

// ---------- 6g. Verificação em duas etapas (MFA) ----------
const authDe = async (id) => (await valores('select auth_id from usuarios where id = $1', [id]))[0].auth_id;
const casosSup1 = await como('u-sup1', () => ids('casos'));
await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [await authDe('u-sup1')]);
conferir('MFA ligado: só com a senha (aal1), o supervisor não vê nenhum caso', casosSup1 !== '' && (await como('u-sup1', () => ids('casos'))) === '');
conferir('... mas vê a própria conta (o site precisa do nome e do perfil para pedir o código)', (await como('u-sup1', () => ids('usuarios'))) === 'u-sup1');
await como('u-sup1', () => erroEsperado('... e não grava nada, nem auditoria em nome próprio',
  "insert into auditoria (usuario_id, acao, alvo) values ('u-sup1', 'Abriu o prontuário', 'c01')"));
conferir('com o código do aplicativo (aal2), volta a ver os casos dos seus grupos', (await como('u-sup1', () => ids('casos'), 'aal2')) === casosSup1);
const casosEst1 = await como('u-est1', () => ids('casos'));
await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'unverified')", [await authDe('u-est1')]);
conferir('configuração começada e não confirmada não bloqueia a conta', casosEst1 !== '' && (await como('u-est1', () => ids('casos'))) === casosEst1);
await db.exec('create or replace function app.mfa_obrigatoria() returns boolean language sql stable as $$ select true $$');
conferir('MFA obrigatório (produção): equipe sem o segundo fator não vê nada até configurar', (await como('u-est1', () => ids('casos'))) === '');
conferir('... e com o código (aal2), vê de novo', (await como('u-est1', () => ids('casos'), 'aal2')) === casosEst1);
conferir('MFA obrigatório não vale para o paciente (o portal precisa ser simples)', (await como('u-pac1', () => ids('pacientes'))) === 'p01');
await db.exec('create or replace function app.mfa_obrigatoria() returns boolean language sql stable as $$ select false $$');
await db.query('delete from auth.mfa_factors');

// ---------- 7. Visitante (formulário público da fila) ----------
const p05 = json.pacientes.find((p) => p.id === 'p05');
await comoVisitante(async () => {
  await db.query(`insert into inscricoes (id, nome, data_nascimento, cpf, telefone, resumo, periodo, aviso_versao) values ('i-teste', 'Visitante Teste', '2003-04-11', '${p05.cpf}', '11912345678', 'Quero atendimento', 'Tarde', '2026.1')`);
  conferir('visitante se inscreve na fila sem login', true);
  await erroEsperado('visitante não lê a fila', 'select * from inscricoes');
  await erroEsperado('visitante não lê pacientes', 'select * from pacientes');
});
const [ins] = await valores("select duplicidade from inscricoes where id = 'i-teste'");
conferir('o banco marca a duplicidade do CPF sozinho (sem avisar quem preencheu)', ins.duplicidade && ins.duplicidade.tipo === 'paciente' && ins.duplicidade.id === 'p05', JSON.stringify(ins.duplicidade));
const [{ quebra: q3 }] = await valores('select app.verificar_auditoria() as quebra');
conferir('a inscrição gerou evento de auditoria e a cadeia continua íntegra', q3 === null);

// ---------- 8. Indicadores (mesma conta da tela) ----------
const porCaso = {};
json.sessoes.forEach((s) => { if (s.presenca === 'presente') porCaso[s.casoId] = (porCaso[s.casoId] || 0) + 1; });
const atendidos = Object.keys(porCaso).length;
const esperadoInd = { atendidos, taxaRetorno: Math.round(100 * Object.values(porCaso).filter((n) => n >= 2).length / atendidos),
  presente: json.sessoes.filter((s) => s.presenca === 'presente').length,
  ativos: json.casos.filter((c) => c.status === 'ativo').length,
  fila: json.inscricoes.filter((i) => i.status === 'aguardando').length + 1 };   // +1: a inscrição do visitante no passo 7
const ind = await como('u-dir', async () => (await valores('select app.indicadores() as i'))[0].i);
conferir('indicadores do banco = indicadores da tela', ind.atendidos === esperadoInd.atendidos && Number(ind.taxaRetorno) === esperadoInd.taxaRetorno && ind.presencas.presente === esperadoInd.presente
  && ind.casosAtivos === esperadoInd.ativos && ind.naFila === esperadoInd.fila,
  `atendidos ${ind.atendidos}, retorno ${ind.taxaRetorno}%, em risco ${ind.emRisco}, ativos ${ind.casosAtivos}, na fila ${ind.naFila}, motivos ${JSON.stringify(ind.motivosAbandono)}`);
conferir('caso com 2 faltas seguidas aparece em risco de abandono (c02)', ind.emRisco === 1);
conferir('indicadores trazem os motivos das faltas avisadas pelo paciente', ind.motivosFaltaAvisada.transporte === 1 && ind.motivosFaltaAvisada['trabalho-estudo'] === 1,
  JSON.stringify(ind.motivosFaltaAvisada));

// ---------- 9. Tamanho ----------
const tam = await valores(`select relname as tabela, pg_total_relation_size(c.oid)::int as bytes from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') order by bytes desc limit 5`);
const [{ total }] = await valores('select pg_database_size(current_database())::bigint as total');

console.log(`\n${resultados.length - falhas} de ${resultados.length} verificações passaram.`);
const md = ['# Resultado do teste do banco', '', `Gerado por \`banco/testar_banco.mjs\` em ${new Date().toISOString().slice(0, 16).replace('T', ' ')} (UTC), num PostgreSQL ${(await valores('show server_version'))[0].server_version} (PGlite).`, '',
  `**${resultados.length - falhas} de ${resultados.length} verificações passaram.**`, '', '| | Verificação | Detalhe |', '|---|---|---|',
  ...resultados.map((r) => `| ${r.ok ? '✓' : '✗'} | ${r.nome} | ${r.detalhe.replace(/\|/g, '/')} |`), '',
  `Tamanho do banco de demonstração: ${(Number(total) / 1048576).toFixed(1)} MB (inclui o catálogo do PostgreSQL). Maiores tabelas: ${tam.map((t) => t.tabela + ' ' + (t.bytes / 1024).toFixed(0) + ' KB').join(', ')}.`];
writeFileSync(new URL('resultado-teste.md', import.meta.url), md.join('\n') + '\n');
process.exit(falhas ? 1 : 0);
