# Varredura de celular e contraste: todas as rotas x perfis, em 320 e 390 px; rolagem lateral, alvos pequenos,
# campos com fonte < 16px, h1 duplicado, ids duplicados; e contraste (axe) no tema normal e no alto contraste.
import sys, json
sys.argv = ["x"]; import pathlib; sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / "testes"))
import testar_site as t
from playwright.sync_api import sync_playwright
CASOS = ["c01","c02","c03","c04","c07"]; ABAS = ["resumo","evolucoes","risco","sessoes","documentos","supervisao","restrita","encerramento"]
PUB = ["#/entrar","#/esqueci-senha","#/inscricao","#/sobre","#/privacidade","#/termos","#/acessibilidade","#/regras"]
def rotas(login):
    base = ["#/painel","#/conta","#/mais","#/agenda/dia","#/agenda/semana","#/agenda/mes","#/agenda/lista"]
    if login.startswith("paciente"): return base + ["#/meu-prontuario","#/meus-dados","#/meu-plano"]
    if login.startswith("marta"): return ["#/painel","#/conta","#/indicadores","#/alocacao","#/estudantes"]
    r = base + ["#/casos","#/busca"] + [f"#/caso/{c}/{a}" for c in CASOS for a in ABAS]
    if "supervis" in login: r += ["#/supervisao","#/alocacao","#/indicadores","#/imprimir/c01"]
    if "tecnica" in login: r += ["#/fila","#/triagem/i01","#/triagem/i03","#/alocacao","#/solicitacoes","#/pedidos-lgpd","#/indicadores","#/auditoria","#/paciente/p01/editar","#/imprimir/c01"]
    return r
MEDIR = """() => { const W = innerWidth, r = {};
  r.rolagem = document.documentElement.scrollWidth - W;
  r.vazam = [...document.querySelectorAll('#app *, #topo *, #rodape *')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > W + 1 && !e.closest('.tabela-rolagem, .abas, .sr-only, [hidden], details:not([open]) > :not(summary)') && getComputedStyle(e).position !== 'fixed'; }).slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().right));
  r.alvos = [...document.querySelectorAll('a, button, select, summary, input:not([type=hidden]), textarea, [tabindex="0"]')].filter(e => { const b = e.getBoundingClientRect(); if (!b.width || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return false; const emTexto = e.tagName === 'A' && e.parentElement && /^(P|LI|SPAN|SMALL|TD|DIV|STRONG|H1|H2|H3|DD)$/.test(e.parentElement.tagName) && getComputedStyle(e).display === 'inline'; return !emTexto && !e.closest('.sr-only') && (b.width < 24 || b.height < 24); }).slice(0, 5).map(e => e.tagName + '.' + String(e.className).slice(0, 25) + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 18) + '"');
  r.campos = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')].filter(e => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).length;
  r.h1 = document.querySelectorAll('h1').length;
  const ids = {}; document.querySelectorAll('[id]').forEach(e => ids[e.id] = (ids[e.id] || 0) + 1); r.idsDup = Object.keys(ids).filter(k => ids[k] > 1);
  r.fonteMin = Math.min(...[...document.querySelectorAll('#app *')].filter(e => e.offsetParent && e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => parseFloat(getComputedStyle(e).fontSize)));
  return r; }"""
AXE = "async () => (await axe.run(document, {runOnly: {type: 'rule', values: ['color-contrast']}})).violations.flatMap(v => v.nodes.map(n => n.target.join(' ') + ' ' + JSON.stringify((n.any[0]||{}).data||{}).slice(0, 110)))"
srv, base = t.servidor(); out = []
def medir(s, quem, rota, larg, contraste):
    s.p.evaluate("document.querySelectorAll('#app details').forEach(d => d.open = true)")
    m = s.js(MEDIR); prob = []
    if m["rolagem"] > 1: prob.append(f"rolagem lateral {m['rolagem']}px {m['vazam']}")
    if m["alvos"]: prob.append(f"alvos<24: {m['alvos']}")
    if m["campos"]: prob.append(f"{m['campos']} campos <16px")
    if m["h1"] != 1: prob.append(f"h1={m['h1']}")
    if m["idsDup"]: prob.append(f"ids duplicados {m['idsDup'][:4]}")
    if m["fonteMin"] < 12: prob.append(f"fonte mínima {m['fonteMin']}")
    if not s.p.evaluate("typeof window.axe !== 'undefined'"): s.p.add_script_tag(path=str(t.AXE))
    v = s.p.evaluate(AXE)
    if v: prob.append(f"contraste({'AC' if contraste is True else 'normal'}): {v[:3]}")
    if prob: out.append(f"{quem} {larg} {('AC ' if contraste is True else 'FONTE+ ' if contraste else '')}{rota}: " + " | ".join(prob))
with sync_playwright() as p:
    nav = p.chromium.launch()
    for larg in (320, 390):
        for login in [None, "bia.estagiaria", "helena.supervisora", "ana.tecnica", "paciente01", "marta.direcao"]:
            s = t.Sessao(nav, base, "v", viewport={"width": larg, "height": 780})
            if login:
                s.entrar(login)
                if login == "ana.tecnica": s.js("PEP.db.casos.forEach(c => PEP.db.acessosJustificados.push({id:'aj-'+c.id, usuarioId:'u-tec', casoId:c.id, motivo:'responsabilidade-tecnica', detalhe:'', em: PEP.util.agora()}))")
            else: s.abrir("#/entrar")
            for contraste in ((False, True, "fonte") if larg == 390 else (False,)):
                if contraste is True: s.js("PEP.acessibilidade.alternarContraste()")
                if contraste == "fonte": s.js("PEP.acessibilidade.alternarContraste(); for (var i = 0; i < 6; i++) PEP.acessibilidade.mudarFonte(1)")
                for r in (rotas(login) if login else PUB):
                    s.ir(r); medir(s, login or "visitante", r, larg, contraste)
            s.fechar()
    nav.close()
srv.shutdown()
print(len(out), "telas com problema"); print("\n".join(out))
