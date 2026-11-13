"""Apoio dos scripts exploratórios (revisor `exploratorio`). Não altera o repositório.

Usa o servidor do harness (porta livre) e um contexto próprio do Playwright:
sem bypass de CSP, diálogos registrados (e aceitos), erros de console guardados.
"""
import sys
sys.argv = ["x"]
sys.path.insert(0, "/home/user/isaacjesusjj/prontuario-eletronico/testes")
import testar_site as t  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402,F401

PASTA = "/tmp/claude-0/-home-user/874b50e8-de17-525e-9269-1db64f1d00a2/scratchpad/revisao/exploratorio"
SENHA = "demonstracao2026"
CEL = {"width": 390, "height": 844}
PC = {"width": 1280, "height": 900}


class S:
    """Uma aba num contexto (o contexto guarda o localStorage; cada aba tem o seu sessionStorage)."""

    def __init__(self, nav, base, nome="x", viewport=CEL, ctx=None, aceitar_dialogo=True, **kw):
        self.base, self.nome = base, nome
        self.erros, self.dialogos = [], []
        self.aceitar = aceitar_dialogo
        if ctx is None:
            op = dict(viewport=viewport, locale="pt-BR", timezone_id="America/Sao_Paulo",
                      has_touch=viewport["width"] < 700, is_mobile=viewport["width"] < 700)
            op.update(kw)
            ctx = nav.new_context(**op)
            ctx.route("https://wa.me/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<title>wa</title>"))
        self.ctx = ctx
        self.p = ctx.new_page()
        self.ligar(self.p)

    def ligar(self, pagina):
        pagina.on("console", lambda m: self.erros.append(m.text) if m.type == "error" else None)
        pagina.on("pageerror", lambda e: self.erros.append("PAGEERROR " + str(e)))
        pagina.on("dialog", self._dialogo)

    def _dialogo(self, d):
        self.dialogos.append(d.message)
        d.accept() if self.aceitar else d.dismiss()

    def abrir(self, rota=""):
        self.p.goto(self.base + rota)
        self.p.wait_for_selector("#app h1, #app h2", timeout=20000)

    def ir(self, rota):
        self.p.evaluate("r => { location.hash = r; }", rota)
        self.p.wait_for_timeout(200)

    def rota(self):
        return self.p.evaluate("location.hash")

    def h1(self):
        l = self.p.locator("#app h1")
        return l.first.inner_text() if l.count() else "(sem h1)"

    def toast(self):
        return self.p.evaluate("() => { var t = document.getElementById('toast'); return (t.classList.contains('visivel') ? '' : '[oculto] ') + t.textContent; }")

    def js(self, codigo, arg=None):
        return self.p.evaluate(codigo, arg)

    def texto(self, sel="#app"):
        return self.p.locator(sel).first.inner_text()

    def clicar(self, seletor, n=0):
        alvo = self.p.locator(seletor).nth(n)
        if alvo.count() and not alvo.is_visible() and alvo.evaluate("e => !!e.closest('#menu-conta')"):
            self.p.click("#botao-conta")
        alvo.click()
        self.p.wait_for_timeout(200)

    def abrir_details(self, sel=None):
        """Abre todos os <details> (ou os do seletor) como a pessoa faria ao tocar no resumo."""
        self.p.evaluate("s => document.querySelectorAll(s || '#app details').forEach(d => d.open = true)", sel)

    def entrar(self, login, senha=SENHA, aceitar=True):
        self.abrir("#/entrar")
        self.p.fill("#lg-usuario", login)
        self.p.fill("#lg-senha", senha)
        self.p.click("#lg-entrar")
        self.p.wait_for_function("() => location.hash !== '#/entrar' || !document.getElementById('login-erro').hidden", timeout=30000)
        self.p.wait_for_timeout(200)
        if aceitar and self.rota() == "#/termo":
            self.p.check("#tm-ok")
            self.clicar('[data-acao="aceitar-termo"]')

    def sair(self):
        self.clicar('[data-acao="sair"]')

    def justificar(self, caso, motivo="responsabilidade-tecnica"):
        self.ir(f"#/caso/{caso}")
        if self.p.locator("#form-justificativa").count():
            self.p.check(f"#jt-motivo-{motivo}")
            self.clicar('[data-acao="justificar-acesso"]')
            self.p.wait_for_timeout(300)

    def foto(self, nome, cheia=True):
        caminho = f"{PASTA}/fotos/{nome}.png"
        self.p.screenshot(path=caminho, full_page=cheia)
        return caminho

    def rolagem_lateral(self):
        return self.p.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")


def log(*a):
    print(*a, flush=True)
