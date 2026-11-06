/* =========================================================
   config-banco.js — ÚNICO lugar para trocar o JSON pelo banco.

   adaptador: 'local'    → dados do JSON, cópia no navegador (hoje)
              'supabase' → PostgreSQL no Supabase (região São Paulo)

   Para migrar: siga banco/README.md (criar o projeto, rodar
   schema.sql e dados-demo.sql) e preencha os dois campos abaixo.
   A chave "anon" é pública por definição: quem protege os dados
   são as políticas de acesso (RLS) do banco, não a chave.
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.configBanco = {
  adaptador: 'local',
  supabaseUrl: '',          // ex.: https://xxxx.supabase.co
  supabaseChaveAnon: ''     // Settings → API → anon public
};
