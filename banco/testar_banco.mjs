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

// Executa como um usuário logado (igual ao Supabase: papel "authenticated" + id do token)
async function como(usuarioId, fn) {
  const [{ auth_id }] = await valores('select auth_id from usuarios where id = $1', [usuarioId]);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${auth_id}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
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
  presente: json.sessoes.filter((s) => s.presenca === 'presente').length };
const ind = await como('u-dir', async () => (await valores('select app.indicadores() as i'))[0].i);
conferir('indicadores do banco = indicadores da tela', ind.atendidos === esperadoInd.atendidos && Number(ind.taxaRetorno) === esperadoInd.taxaRetorno && ind.presencas.presente === esperadoInd.presente,
  `atendidos ${ind.atendidos}, retorno ${ind.taxaRetorno}%, em risco ${ind.emRisco}, motivos ${JSON.stringify(ind.motivosAbandono)}`);
conferir('caso com 2 faltas seguidas aparece em risco de abandono (c02)', ind.emRisco === 1);

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
