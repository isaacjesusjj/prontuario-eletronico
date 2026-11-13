# Orquestrador: (1) link "Pular para o conteúdo" com rotas por hash; (2) varredura de saída sem escape:
# injeta uma carga em todos os campos de texto livre do PEP.db e visita todas as rotas de cada perfil.
import sys, json
sys.argv = ["x"]; sys.path.insert(0, "/home/user/isaacjesusjj/prontuario-eletronico/testes")
import testar_site as t
from playwright.sync_api import sync_playwright
CARGA = '"><img src=x onerror="window.__xss=(window.__xss||0)+1"><b class="xssmark">X</b>\''
FUZZ = """(carga) => { let n = 0; const pula = /^(id|.*Id|.*Por|login|senha.*|hash.*|perfil|status|tipo|presenca|data.*|em|hora|cpf|telefone|.*Telefone|inicio|fim|versao|papel|alvoTipo|nivel|canal.*|modalidade|finalidade|mfa.*|sala|motivoFalta|orgao|arquivoId|expiraEm|token.*)$/;
  for (const [c, lista] of Object.entries(PEP.db)) { if (c.startsWith('_') || !Array.isArray(lista)) continue;
    for (const r of lista) for (const [k, v] of Object.entries(r)) {
      if (typeof v === 'string' && v && !pula.test(k) && !/^\\d{4}-\\d{2}-\\d{2}/.test(v)) { r[k] = v + carga; n++; }
      else if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) if (typeof v2 === 'string') { v[k2] = v2 + carga; n++; }
      else if (Array.isArray(v)) v.forEach((x, i) => { if (typeof x === 'string' && / /.test(x)) { v[i] = x + carga; n++; } });
    } }
  return n; }"""
CASOS = ["c01","c02","c03","c04","c05","c06","c07"]
ABAS = ["resumo","evolucoes","risco","sessoes","documentos","supervisao","restrita","encerramento"]
def rotas(perfil):
    r = ["#/painel","#/casos","#/busca","#/conta","#/mais","#/agenda/dia","#/agenda/semana","#/agenda/mes","#/agenda/lista","#/sobre","#/regras","#/privacidade"]
    r += [f"#/caso/{c}/{a}" for c in CASOS for a in ABAS] + [f"#/imprimir/{c}" for c in CASOS]
    r += ["#/supervisao","#/alocacao","#/indicadores","#/fila","#/solicitacoes","#/pedidos-lgpd","#/auditoria","#/estudantes","#/meu-prontuario","#/meus-dados","#/meu-plano"]
    r += [f"#/triagem/i0{i}" for i in range(1,6)] + [f"#/paciente/p0{i}/editar" for i in range(1,8)] + ["#/documento/doc01","#/documento/dc01","#/documento/d01"]
    return r
srv, base = t.servidor(); achados = []
with sync_playwright() as p:
    nav = p.chromium.launch()
    # (1) pular para o conteúdo
    s = t.Sessao(nav, base, "pular"); s.entrar("helena.supervisora"); s.ir("#/caso/c01/evolucoes")
    s.p.evaluate("document.querySelector('a.pular').focus()"); s.p.keyboard.press("Enter"); s.p.wait_for_timeout(300)
    print("PULAR: hash =", s.js("location.hash"), "| h1 =", s.h1(), "| foco em:", s.js("document.activeElement.id || document.activeElement.tagName"))
    s.fechar()
    # (2) saída sem escape
    for login in ["bia.estagiaria","helena.supervisora","rafael.supervisor","ana.tecnica","marta.direcao","paciente01"]:
        s = t.Sessao(nav, base, "xss-"+login); s.entrar(login)
        if login == "ana.tecnica":   # abre o conteúdo clínico de todos os casos
            s.js("PEP.db.casos.forEach(c => PEP.db.acessosJustificados.push({id:'aj-'+c.id, usuarioId: PEP.estado.usuarioAtual().id, casoId:c.id, motivo:'responsabilidade-tecnica', detalhe:'', em: PEP.util.agora()}))")
        docs = s.js("PEP.db.documentos.map(d => d.id)")
        n = s.js(FUZZ, CARGA); s.js("PEP.app.renderizar()")
        for r in rotas(login) + [f"#/documento/{d}" for d in docs]:
            s.ir(r)
            s.p.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            x = s.js("({x: window.__xss||0, m: document.querySelectorAll('.xssmark').length, erro: (document.querySelector('#app h1')||{}).textContent})")
            if x["x"] or x["m"] or x["erro"] == "Erro ao montar a tela":
                achados.append((login, r, x)); s.js("window.__xss=0; document.querySelectorAll('.xssmark').forEach(e=>e.remove())")
        # menu da conta e toasts
        s.p.click("#botao-conta"); x = s.js("document.querySelectorAll('#topo .xssmark, #menu .xssmark, #rodape .xssmark').length")
        if x: achados.append((login, "topo/menu", x))
        print(login, "campos alterados:", n)
        s.fechar()
    nav.close()
srv.shutdown()
print(len(achados), "achados"); [print(a) for a in achados]
