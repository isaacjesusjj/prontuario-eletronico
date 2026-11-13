# Ajudantes comuns dos scripts de burla (revisor regras-site).
# Uso: from base import *; with site() as (nav, base): s = sessao(nav, base, "nome"); ...
import sys, json, contextlib
ARGS = sys.argv[1:]
sys.argv = ["x"]
sys.path.insert(0, "/home/user/isaacjesusjj/prontuario-eletronico/testes")
import testar_site as t
from playwright.sync_api import sync_playwright

PASTA = "/tmp/claude-0/-home-user/874b50e8-de17-525e-9269-1db64f1d00a2/scratchpad/revisao/regras-site"

# Funções injetadas na página: chamam a ação "por fora", com botão falso e campos montados no DOM
JS = r"""
window.burla = function (nome, dados, campos) {
  var b = document.createElement('button');
  Object.keys(dados || {}).forEach(function (k) { b.setAttribute('data-' + k, dados[k]); });
  var caixa = document.createElement('div'); caixa.id = 'burla-caixa'; caixa.style.display = 'none';
  Object.keys(campos || {}).forEach(function (id) {
    var v = campos[id], e;
    if (v && typeof v === 'object' && v.check !== undefined) { e = document.createElement('input'); e.type = 'checkbox'; e.checked = !!v.check; }
    else if (v && typeof v === 'object' && v.radio) { e = document.createElement('input'); e.type = 'radio'; e.name = v.radio; e.value = v.value; e.checked = true; }
    else { e = document.createElement('textarea'); e.value = v; }
    e.id = id; caixa.appendChild(e);
  });
  document.body.insertBefore(caixa, document.body.firstChild);
  var t = document.getElementById('toast'); t.textContent = '';
  var r = 'ok';
  try { PEP.acoes[nome](b); } catch (err) { r = 'ERRO: ' + err.message; }
  caixa.remove();
  return { r: r, toast: t.textContent, hash: location.hash };
};
window.burlaForm = function (nome, attrs, campos) {
  var f = document.createElement('form'); f.style.display = 'none';
  Object.keys(attrs || {}).forEach(function (k) { f.setAttribute(k, attrs[k]); });
  (campos || []).forEach(function (c) {
    var e = document.createElement(c.tag || 'input');
    if (c.type) e.type = c.type;
    if (c.name) e.name = c.name;
    if (c.id) e.id = c.id;
    if (c.tag === 'select') { var o = document.createElement('option'); o.value = c.value; o.selected = true; e.appendChild(o); }
    else if (c.type === 'checkbox') e.checked = !!c.checked;
    else e.value = c.value === undefined ? '' : c.value;
    f.appendChild(e);
  });
  document.body.insertBefore(f, document.body.firstChild);
  var t = document.getElementById('toast'); t.textContent = '';
  var r = 'ok';
  try { PEP.formularios[nome](f); } catch (err) { r = 'ERRO: ' + err.message; }
  f.remove();
  return { r: r, toast: t.textContent, hash: location.hash };
};
window.conta = function (col) { return PEP.db[col].length; };
"""


@contextlib.contextmanager
def site():
    srv, base = t.servidor()
    with sync_playwright() as p:
        nav = p.chromium.launch()
        try:
            yield nav, base
        finally:
            nav.close()
            srv.shutdown()


class S(t.Sessao):
    def entrar(self, login, senha=t.SENHA, aceitar=True):
        super().entrar(login, senha, aceitar)
        self.p.evaluate("() => {" + JS + "}")

    def inj(self):
        self.p.evaluate("() => {" + JS + "}")

    def burla(self, nome, dados=None, campos=None, espera=250):
        r = self.p.evaluate("([n,d,c]) => window.burla(n,d,c)", [nome, dados or {}, campos or {}])
        self.p.wait_for_timeout(espera)
        r["toast2"] = self.toast()
        return r

    def form(self, nome, attrs=None, campos=None, espera=250):
        r = self.p.evaluate("([n,a,c]) => window.burlaForm(n,a,c)", [nome, attrs or {}, campos or []])
        self.p.wait_for_timeout(espera)
        r["toast2"] = self.toast()
        return r

    def texto(self):
        return self.p.locator("#app").inner_text()


def sessao(nav, base, nome, **kw):
    return S(nav, base, nome, **kw)


def mostra(rotulo, valor):
    print(f"{rotulo}: {json.dumps(valor, ensure_ascii=False) if not isinstance(valor, str) else valor}")
