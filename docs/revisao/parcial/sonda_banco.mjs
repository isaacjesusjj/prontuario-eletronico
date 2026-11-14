// Sondagem do banco: tenta o que um usuário mal-intencionado tentaria pela API. "ACEITOU" em tentativa proibida = achado.
import { PGlite } from '../../../banco/node_modules/@electric-sql/pglite/dist/index.js';
import { readFileSync } from 'node:fs';
const B = new URL('../../../banco/', import.meta.url).pathname;
const db = new PGlite();
for (const f of ['teste_stub_supabase.sql', 'schema.sql', 'dados-demo.sql']) await db.exec(readFileSync(B + f, 'utf8'));
// contas de login para todos (como o convite aceito)
await db.exec(`insert into auth.users (id, email, email_confirmed_at) select gen_random_uuid(), email, now() from usuarios where auth_id is null and email is not null;`);
const q = async (sql, p = []) => (await db.query(sql, p)).rows;
async function como(uid, fn, aal = 'aal1') {
  const [{ auth_id }] = await q('select auth_id from usuarios where id = $1', [uid]);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${auth_id}', false); select set_config('request.jwt.claims', '${JSON.stringify({ sub: auth_id, aal })}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);`); }
}
async function anon(fn) { await db.exec('set role anon;'); try { return await fn(); } finally { await db.exec('reset role;'); } }
async function tenta(nome, quem, sql, esperado /* 'recusa' | 'zero' | 'ok' */) {
  let r; const run = async () => { try { const x = await db.query(sql); return { ok: true, n: x.rows.length, af: x.affectedRows, linha: JSON.stringify(x.rows[0] || '').slice(0, 90) }; } catch (e) { return { ok: false, msg: e.message.split('\n')[0].slice(0, 80) }; } };
  r = quem === 'anon' ? await anon(run) : await como(quem, run);
  const passou = !r.ok || (r.n === 0 && !r.af);
  const veredito = esperado === 'ok' ? (r.ok ? 'ok' : 'BLOQUEOU O QUE DEVIA PASSAR') : (passou ? 'ok (recusado/vazio)' : '*** ACEITOU ***');
  console.log(`${veredito.padEnd(22)} | ${quem.padEnd(8)} | ${nome} | ${r.ok ? `linhas=${r.n} afetadas=${r.af} ${r.linha}` : r.msg}`);
}
const U = await q('select id, perfil, login from usuarios order by id'); console.log(U.map(u => u.id + ':' + u.perfil).join(' '));
// --- visitante ---
await tenta('visitante lê pacientes', 'anon', 'select * from pacientes');
await tenta('visitante chama indicadores', 'anon', 'select app.indicadores()');
await tenta('visitante chama verificar_auditoria', 'anon', 'select app.verificar_auditoria()');
await tenta('visitante lê usuarios', 'anon', 'select * from usuarios');
await tenta('visitante lê inscricoes', 'anon', 'select * from inscricoes');
// --- estagiária da dupla 1 (u-est1) contra caso de outra dupla (c04) e dados gerais ---
await tenta('estagiária lê evoluções de caso alheio (c04)', 'u-est1', "select * from evolucoes where caso_id = 'c04'");
await tenta('estagiária lê pacientes de caso alheio', 'u-est1', "select p.* from pacientes p join casos c on c.paciente_id = p.id where c.id = 'c04'");
await tenta('estagiária lê e-mails de todos os usuários', 'u-est1', "select email, matricula from usuarios where id not in ('u-est1')");
await tenta('estagiária lê auditoria', 'u-est1', 'select * from auditoria');
await tenta('estagiária chama indicadores', 'u-est1', 'select app.indicadores()');
await tenta('estagiária vira técnica', 'u-est1', "update usuarios set perfil = 'tecnico' where id = 'u-est1'");
await tenta('estagiária lê links_acesso', 'u-est1', 'select * from links_acesso');
await tenta('estagiária insere evolução já validada', 'u-est1', "insert into evolucoes (caso_id, sessao_id, autor_id, status, texto) values ('c01', 's01', 'u-est1', 'validada', 'texto forjado com mais de dez letras')");
await tenta('estagiária muda texto de evolução validada', 'u-est1', "update evolucoes set texto = texto || ' alterado' where status = 'validada' and caso_id = 'c01'");
await tenta('estagiária move evolução para outro caso', 'u-est1', "update evolucoes set caso_id = 'c02' where caso_id = 'c01' and status = 'rascunho'");
await tenta('estagiária troca o autor do rascunho', 'u-est1', "update evolucoes set autor_id = 'u-est2' where caso_id = 'c01' and status = 'rascunho'");
await tenta('estagiária apaga sessão', 'u-est1', "delete from sessoes where caso_id = 'c01'");
await tenta('estagiária assina como supervisora', 'u-est1', "insert into assinaturas (alvo_tipo, alvo_id, usuario_id, papel) values ('evolucao', 'e01', 'u-sup1', 'supervisor')");
await tenta('estagiária registra auditoria em nome de outro', 'u-est1', "insert into auditoria (usuario_id, acao, alvo) values ('u-sup1', 'Forjado', 'c01')");
await tenta('estagiária marca presença em sessão futura', 'u-est1', "update sessoes set presenca = 'presente' where caso_id = 'c01' and data > current_date");
await tenta('estagiária muda a sessão de caso (c01 → c04)', 'u-est1', "update sessoes set caso_id = 'c04' where caso_id = 'c01' and presenca = 'agendada'");
await tenta('estagiária registra notificação compulsória', 'u-est1', "insert into notificacoes (risco_id, orgao, registrado_por) select id, 'vigilancia', 'u-est1' from riscos limit 1");
await tenta('estagiária lê orientações de caso alheio', 'u-est1', "select * from orientacoes where caso_id = 'c04'");
await tenta('estagiária encerra caso direto (status)', 'u-est1', "update casos set status = 'encerrado' where id = 'c01'");
await tenta('estagiária muda a dupla do caso', 'u-est1', "update casos set subgrupo_id = 'd-a2' where id = 'c01'");
await tenta('estagiária reabre o próprio vínculo/alocação', 'u-est1', "update alocacoes set fim = null where estagiario_id = 'u-est1'");
await tenta('estagiária desativa a supervisora', 'u-est1', "update usuarios set ativo = false where id = 'u-sup1'");
// --- vínculo encerrado e sem grupo ---
const iara = U.find(u => u.login === 'iara.estagiaria')?.id, hugo = U.find(u => u.login === 'hugo.estagiario')?.id;
if (iara) { await tenta('vínculo encerrado lê casos', iara, 'select * from casos'); await tenta('vínculo encerrado lê evoluções', iara, 'select * from evolucoes'); await tenta('vínculo encerrado lê pacientes', iara, 'select * from pacientes'); }
if (hugo) await tenta('sem grupo lê casos', hugo, 'select * from casos');
// --- supervisor de outro grupo (u-sup2) contra c01 ---
await tenta('supervisor de outro grupo lê c01', 'u-sup2', "select * from evolucoes where caso_id = 'c01'");
await tenta('supervisor de outro grupo valida evolução de c01', 'u-sup2', "update evolucoes set status = 'validada' where caso_id = 'c01' and status = 'enviada'");
await tenta('supervisor de outro grupo lê orientações de c01', 'u-sup2', "select * from orientacoes where caso_id = 'c01'");
// --- técnica sem motivo ---
await tenta('técnica sem motivo lê evoluções', 'u-tec', 'select * from evolucoes');
await tenta('técnica sem motivo lê anamneses', 'u-tec', 'select * from anamneses');
await tenta('técnica sem motivo lê riscos', 'u-tec', 'select * from riscos');
await tenta('técnica lê orientações (fora do prontuário)', 'u-tec', 'select * from orientacoes');
await tenta('técnica lê casos (capa)', 'u-tec', 'select * from casos', 'ok');
// --- direção ---
await tenta('direção lê casos', 'u-dir', 'select * from casos');
await tenta('direção lê pacientes', 'u-dir', 'select * from pacientes');
await tenta('direção lê evoluções', 'u-dir', 'select * from evolucoes');
await tenta('direção lê inscrições', 'u-dir', 'select * from inscricoes');
await tenta('direção lê sessões', 'u-dir', 'select * from sessoes');
await tenta('direção chama indicadores', 'u-dir', 'select app.indicadores()', 'ok');
// --- paciente (u-pac1 = paciente do c01) ---
await tenta('paciente lê evoluções (deve ser só pela cópia)', 'u-pac1', 'select * from evolucoes');
await tenta('paciente lê outros pacientes', 'u-pac1', "select * from pacientes where id <> (select paciente_id from usuarios where id = 'u-pac1')");
await tenta('paciente lê orientações', 'u-pac1', 'select * from orientacoes');
await tenta('paciente lê avaliações', 'u-pac1', 'select * from avaliacoes');
await tenta('paciente lê riscos', 'u-pac1', 'select * from riscos');
await tenta('paciente lê usuarios (equipe)', 'u-pac1', "select email from usuarios where id <> 'u-pac1'");
await tenta('paciente lê sessões de outros casos', 'u-pac1', "select * from sessoes where caso_id <> 'c01'");
await tenta('paciente troca a sala da própria sessão', 'u-pac1', "update sessoes set sala = 'Sala 4' where caso_id = 'c01' and presenca = 'agendada'");
await tenta('paciente marca a própria presença', 'u-pac1', "update sessoes set presenca = 'presente' where caso_id = 'c01' and presenca = 'agendada' and data <= current_date");
await tenta('paciente lê comunicações escondidas', 'u-pac1', "select * from comunicacoes where visivel_paciente = false");
await tenta('paciente lê auditoria', 'u-pac1', 'select * from auditoria');
// --- MFA: quem ligou e entrou só com a senha ---
await db.exec(`insert into auth.mfa_factors (user_id, status) select auth_id, 'verified' from usuarios where id = 'u-sup1'`);
await tenta('supervisora com MFA ligado e sessão aal1 lê casos', 'u-sup1', 'select * from casos');
await db.exec(`delete from auth.mfa_factors`);
// --- conta desativada ---
await db.exec(`set app.migracao = 'on'; update usuarios set ativo = false where id = 'u-est3'; reset app.migracao;`);
await tenta('conta desativada lê casos', 'u-est3', 'select * from casos');
await tenta('conta desativada se reativa', 'u-est3', "update usuarios set ativo = true where id = 'u-est3'");
