"""Testes automatizados do Vínculo (interface, regras, validadores e acessibilidade).

Abre o site num navegador de verdade (Playwright + Chrome), entra com cada perfil e confere
as regras do prontuário, os validadores, a segurança e a acessibilidade (axe-core, WCAG 2.2 AA).

Preparar (uma vez):  pip install playwright && python -m playwright install chromium
                     cd testes && npm install           (baixa o axe-core)
Rodar, na pasta do projeto:  python testes/testar_site.py
Resultado: na tela e em testes/resultado-testes.md
"""
import functools
import http.server
import json
import os
import random
import shutil
import sys
import threading
import urllib.parse
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
AXE = RAIZ / "testes" / "node_modules" / "axe-core" / "axe.min.js"
SENHA = "demonstracao2026"
DADOS = json.loads((RAIZ / "dados" / "dados-iniciais.json").read_text(encoding="utf-8"))
resultados, erros_console, axe_resumo = [], [], []


def conferir(grupo, nome, ok, detalhe=""):
    resultados.append((grupo, nome, bool(ok), detalhe))
    print(f"{'✓' if ok else '✗'} [{grupo}] {nome}" + (f" — {detalhe}" if detalhe else ""))


class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def servidor():
    manipulador = functools.partial(Silencioso, directory=str(RAIZ))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), manipulador)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://localhost:{srv.server_address[1]}/"


def cpf_novo():
    usados = {p["cpf"] for p in DADOS["pacientes"]} | {i["cpf"] for i in DADOS["inscricoes"]}
    while True:
        n = [random.randint(0, 9) for _ in range(9)]
        for _ in range(2):
            d = (sum(v * (len(n) + 1 - i) for i, v in enumerate(n)) * 10) % 11
            n.append(0 if d == 10 else d)
        c = "".join(map(str, n))
        if c not in usados and len(set(c)) > 1:
            return c


class Sessao:
    def __init__(self, navegador, base, grupo, **kw):
        # bypass_csp: só para o teste poder injetar o axe-core; o site em si continua com a política de segurança
        opcoes = dict(viewport={"width": 1280, "height": 900}, locale="pt-BR", timezone_id="America/Sao_Paulo", bypass_csp=True)
        opcoes.update(kw)
        self.ctx = navegador.new_context(**opcoes)
        self.base, self.grupo = base, grupo
        # Links externos (WhatsApp) respondem com uma página vazia: o teste confere o endereço, sem sair para a internet
        self.ctx.route("https://wa.me/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<title>wa</title>"))
        self.p = self.ctx.new_page()
        self.p.on("console", lambda m: erros_console.append((grupo, m.text)) if m.type == "error" else None)
        self.p.on("pageerror", lambda e: erros_console.append((grupo, str(e))))
        self.p.on("dialog", lambda d: d.accept())

    def abrir(self, rota=""):
        self.p.goto(self.base + rota)
        self.p.wait_for_selector("#app h1")

    def ir(self, rota):
        self.p.evaluate("r => { location.hash = r; }", rota)
        self.p.wait_for_timeout(150)

    def h1(self):
        return self.p.locator("#app h1").first.inner_text()

    def toast(self):
        return self.p.locator("#toast").inner_text()

    def js(self, codigo, arg=None):
        return self.p.evaluate(codigo, arg)

    def clicar(self, seletor):
        self.p.locator(seletor).first.click()
        self.p.wait_for_timeout(150)

    def entrar(self, login, senha=SENHA, aceitar=True):
        self.abrir("#/entrar")
        self.p.fill("#lg-usuario", login)
        self.p.fill("#lg-senha", senha)
        self.p.click("#lg-entrar")
        self.p.wait_for_function("() => location.hash !== '#/entrar' || !document.getElementById('login-erro').hidden", timeout=15000)
        self.p.wait_for_timeout(150)
        if aceitar and self.p.evaluate("location.hash") == "#/termo":
            self.p.check("#tm-ok")
            self.clicar('[data-acao="aceitar-termo"]')

    def sair(self):
        self.clicar('[data-acao="sair"]')

    def axe(self, nome, regras=None):
        if not AXE.exists():
            return
        if not self.p.evaluate("typeof window.axe !== 'undefined'"):
            self.p.add_script_tag(path=str(AXE))
        opcoes = {"runOnly": {"type": "rule", "values": regras}} if regras else {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]}}
        violacoes = self.p.evaluate("async (o) => (await axe.run(document, o)).violations.map(v => v.id + ' (' + v.nodes.length + '): ' + v.nodes[0].target.join(' '))", opcoes)
        axe_resumo.append((self.grupo, nome, violacoes))
        conferir("Acessibilidade", f"{self.grupo} · {nome}: sem violações WCAG A/AA", not violacoes, "; ".join(violacoes)[:300])

    def fechar(self):
        self.ctx.close()


def publico(nav, base):
    s = Sessao(nav, base, "Visitante")
    s.abrir()
    conferir("Público", "página inicial abre e o título da aba é neutro", "Entrar" in s.p.title() and "Paciente" not in s.p.title(), s.p.title())
    s.p.keyboard.press("Tab")
    conferir("Acessibilidade", "primeiro Tab vai para 'Pular para o conteúdo'", s.js("document.activeElement.className") == "pular")
    s.p.keyboard.press("Enter")
    s.p.wait_for_timeout(100)
    conferir("Acessibilidade", "o link de pular leva o foco ao conteúdo", s.js("document.activeElement.id") == "app")
    for rota, nome in [("#/entrar", "Entrar"), ("#/inscricao", "Fila de espera"), ("#/sobre", "Sobre"), ("#/privacidade", "Aviso de privacidade"),
                       ("#/termos", "Termos de uso"), ("#/acessibilidade", "Acessibilidade"), ("#/regras", "Regras e leis"), ("#/acesso/token-falso", "Link inválido")]:
        s.ir(rota)
        s.axe(nome)
    conferir("Público", "link de leitura inexistente mostra 'Link indisponível'", s.h1() == "Link indisponível")
    conferir("Público", "nenhum recurso de terceiros carregado na abertura", s.js("performance.getEntriesByType('resource').every(r => r.name.startsWith(location.origin))"),
             "fontes servidas pelo próprio site")

    # ---------- Fila de espera e validadores ----------
    s.ir("#/inscricao")
    s.clicar('#form-inscricao button[type="submit"]')
    conferir("Validadores", "fila: enviar vazio marca os campos obrigatórios", s.p.locator('[aria-invalid="true"]').count() >= 5, f"{s.p.locator('[aria-invalid=true]').count()} campos")
    conferir("Acessibilidade", "erro ligado ao campo por aria-describedby", "f-nome-erro" in (s.p.get_attribute("#f-nome", "aria-describedby") or ""))
    conferir("Acessibilidade", "o foco vai para o primeiro campo com erro", s.js("document.activeElement.id") == "f-nome")
    s.p.fill("#f-nome", "Maria Teste")
    s.p.fill("#f-nasc", "1990-05-10")
    s.p.fill("#f-cpf", "123.456.789-00")
    s.p.fill("#f-tel", "(11) 1234-5")
    s.p.fill("#f-resumo", "Ansiedade")
    s.p.check("#f-ciente")
    s.clicar('#form-inscricao button[type="submit"]')
    conferir("Validadores", "CPF com dígito verificador errado é recusado", "CPF inválido" in s.p.locator("#f-cpf-erro").inner_text())
    conferir("Validadores", "telefone incompleto é recusado", s.p.locator("#f-tel-erro").count() == 1)
    conferir("Validadores", "máscara de CPF aplicada na digitação", s.p.input_value("#f-cpf") == "123.456.789-00")
    p05 = next(p for p in DADOS["pacientes"] if p["id"] == "p05")
    s.p.fill("#f-cpf", p05["cpf"])
    s.p.fill("#f-tel", "11912345678")
    antes = s.js("PEP.db.inscricoes.length")
    s.clicar('#form-inscricao button[type="submit"]')
    msg = s.p.locator("#app").inner_text()
    conferir("CPF", "CPF já cadastrado: o formulário público mostra a mesma mensagem de sucesso (não revela)", s.js("location.hash") == "#/inscricao-ok" and "já tiver cadastro" in msg)
    nova = s.js("PEP.db.inscricoes[PEP.db.inscricoes.length - 1]")
    conferir("CPF", "a duplicidade fica marcada só para a equipe", s.js("PEP.db.inscricoes.length") == antes + 1 and (nova.get("duplicidade") or {}).get("id") == "p05", json.dumps(nova.get("duplicidade")))
    s.ir("#/inscricao")
    s.p.fill("#f-nome", "Joao Menor")
    s.p.fill("#f-nasc", "2015-03-03")
    s.p.check("#f-semcpf")
    s.p.fill("#f-tel", "11912345678")
    s.p.fill("#f-resumo", "Adaptação na escola")
    s.p.check("#f-ciente")
    s.clicar('#form-inscricao button[type="submit"]')
    conferir("LGPD", "menor de 18: exige responsável e autorização dele", s.p.locator("#f-resp-erro").count() == 1 and s.p.locator("#f-respok-erro").count() == 1)
    conferir("Validadores", "'Não tenho CPF' desativa o campo de CPF", s.p.is_disabled("#f-cpf"))
    s.p.fill("#f-resp", "Ana Responsavel")
    s.p.check("#f-respok")
    s.clicar('#form-inscricao button[type="submit"]')
    conferir("LGPD", "menor com responsável autorizado entra na fila", s.js("location.hash") == "#/inscricao-ok")
    conferir("Auditoria", "inscrição registrada na auditoria sem nome (só o id)", s.js("PEP.db.auditoria[PEP.db.auditoria.length-1].alvo").startswith("ins-"))

    # ---------- Login ----------
    usuarios = s.js("PEP.db.usuarios")
    conferir("Senha", "nenhuma senha guardada em texto; todas como hash PBKDF2 com 600 mil iterações",
             all("senha" not in u and u["senhaHash"].startswith("pbkdf2-sha256$600000$") for u in usuarios))
    s.ir("#/entrar")
    for i in range(5):
        s.p.fill("#lg-usuario", "bia.estagiaria")
        s.p.fill("#lg-senha", "senha-errada-123456")
        s.p.click("#lg-entrar")
        s.p.wait_for_function("() => !document.getElementById('login-erro').hidden && document.getElementById('lg-entrar').textContent === 'Entrar'", timeout=15000)
        if i == 0:
            conferir("Senha", "senha errada: mensagem genérica (não diz se errou usuário ou senha)", s.p.locator("#login-erro").inner_text() == "Usuário ou senha incorretos.")
        s.p.evaluate("document.getElementById('login-erro').hidden = true")
    s.p.fill("#lg-usuario", "bia.estagiaria")
    s.p.fill("#lg-senha", SENHA)
    s.p.click("#lg-entrar")
    s.p.wait_for_function("() => !document.getElementById('login-erro').hidden", timeout=15000)
    conferir("Senha", "5 erros bloqueiam o login, mesmo com a senha certa depois", "Muitas tentativas" in s.p.locator("#login-erro").inner_text())
    conferir("Auditoria", "tentativas registradas sem gravar a senha digitada",
             s.js("PEP.db.auditoria.filter(a => a.acao === 'Tentativa de login sem sucesso').length") >= 5 and "senha-errada" not in json.dumps(s.js("PEP.db.auditoria")))
    s.fechar()


def estagiaria(nav, base):
    s = Sessao(nav, base, "Estagiária Bia")
    s.entrar("bia.estagiaria", aceitar=False)
    conferir("LGPD", "primeiro acesso: termo de sigilo antes de tudo (Res. CFP 05/2025, art. 10, III)", s.js("location.hash") == "#/termo" and s.js("document.getElementById('menu').innerHTML") == "")
    s.ir("#/casos")
    conferir("LGPD", "sem aceitar o termo, não navega", s.js("location.hash") == "#/termo")
    s.clicar('[data-acao="aceitar-termo"]')
    conferir("LGPD", "aceitar exige marcar a caixa", s.p.locator("#tm-ok-erro").count() == 1)
    s.p.check("#tm-ok")
    s.clicar('[data-acao="aceitar-termo"]')
    conferir("LGPD", "aceite registrado com versão e data", s.js("location.hash") == "#/painel" and s.js("PEP.db.aceites.some(a => a.usuarioId === 'u-est1' && a.termo === 'sigilo' && a.versao)"))
    conferir("Senha", "sessão fica no sessionStorage (acaba ao fechar a aba)", s.js("!!sessionStorage.getItem('vinculo-sessao-v2') && !localStorage.getItem('vinculo-sessao-v2')"))
    s.axe("Painel")
    s.ir("#/casos")
    conferir("Permissões", "estagiária vê só os casos da própria dupla", s.p.locator("a.cartao-link").count() == 2)
    s.ir("#/caso/c04")
    conferir("Permissões", "caso de outra dupla: acesso negado", s.h1() == "Acesso não permitido")
    conferir("Auditoria", "tentativa negada fica na auditoria", s.js("PEP.db.auditoria[PEP.db.auditoria.length-1].acao") == "Tentativa de acesso negada ao prontuário")
    for aba in ["resumo", "evolucoes", "sessoes", "documentos", "restrita", "supervisao", "encerramento"]:
        s.ir(f"#/caso/c01/{aba}")
        s.axe(f"Caso · {aba}")
    conferir("Acessibilidade", "título da aba no prontuário não leva nome do paciente", "Paciente" not in s.p.title(), s.p.title())

    # Evolução
    s.ir("#/caso/c01/evolucoes")
    s.clicar("details.cartao summary")
    s.p.fill("#nova-texto", "curto")
    s.clicar('[data-acao="nova-evolucao"][data-modo="enviar"]')
    conferir("Validadores", "evolução muito curta é recusada", s.p.locator("#nova-texto-erro").count() == 1)
    s.p.fill("#nova-texto", "Sessão de teste. Tema: rotina de sono. Intervenção: psicoeducação. Plano: registro diário.")
    s.clicar('[data-acao="nova-evolucao"][data-modo="enviar"]')
    nova = s.js("PEP.db.evolucoes[PEP.db.evolucoes.length-1]")
    conferir("Evolução", "estagiária assina e envia à supervisão", nova["status"] == "enviada" and s.js(f"PEP.regras.assinaturasVigentes(PEP.util.porId(PEP.db.evolucoes, '{nova['id']}')).length") == 1)
    conferir("Evolução", "a assinatura guarda o hash SHA-256 do texto assinado", s.js(f"PEP.db.assinaturas.filter(a => a.alvoId === '{nova['id']}')[0].hash") == s.js(f"PEP.seguranca.sha256(PEP.util.porId(PEP.db.evolucoes, '{nova['id']}').texto)"))

    # Anamnese versionada
    s.ir("#/caso/c01")
    s.clicar('summary:has-text("Atualizar anamnese")')
    s.p.fill("#an-objetivos", "")
    s.clicar('[data-acao="salvar-anamnese"]')
    conferir("Validadores", "anamnese sem objetivos é recusada", s.p.locator("#an-objetivos-erro").count() == 1)
    s.p.fill("#an-objetivos", "Objetivo atualizado no teste: consolidar a rotina de sono.")
    s.clicar('[data-acao="salvar-anamnese"]')
    conferir("Anamnese", "editar cria a versão 3 e guarda as anteriores", "Versão 3" in s.p.locator("#app").inner_text() and s.js("PEP.regras.anamnesesDoCaso(PEP.util.porId(PEP.db.casos,'c01')).length") == 3)

    # Presença, agenda e lembrete
    s.ir("#/caso/c01/sessoes")
    s.clicar('[data-acao="registrar-presenca"][data-id="s30"][data-valor="presente"]')
    conferir("Sessões", "presença registrada na sessão de hoje", s.js("PEP.util.porId(PEP.db.sessoes,'s30').presenca") == "presente")
    s.clicar('[data-acao="registrar-presenca"][data-id="s31"][data-valor="presente"]')
    conferir("Sessões", "presença em sessão futura é recusada", "a partir do dia da sessão" in s.toast())
    s31 = s.js("PEP.util.porId(PEP.db.sessoes,'s31')")
    s.p.fill("#ag-data", s31["data"])
    s.p.fill("#ag-hora", s31["hora"])
    s.clicar('[data-acao="agendar-sessao"]')
    conferir("Sessões", "agendamento no mesmo horário da dupla é recusado", "já tem sessão" in s.p.locator("#ag-hora-erro").inner_text())
    s.p.fill("#ag-hora", "06:00")
    s.clicar('[data-acao="agendar-sessao"]')
    conferir("Validadores", "horário fora do funcionamento é recusado", s.p.locator("#ag-hora-erro").count() == 1)
    s.p.fill("#ag-hora", "15:30")
    s.clicar('[data-acao="agendar-sessao"]')
    conferir("Sessões", "agendamento válido", "Sessão agendada" in s.toast())
    with s.p.expect_popup() as aba:
        s.clicar('[data-acao="lembrete"][data-canal="whatsapp"][data-id="s31"]')
    url = aba.value.url
    texto = urllib.parse.unquote(url)
    conferir("Lembretes", "lembrete abre o WhatsApp com o número do paciente", url.startswith("https://wa.me/5511900000001"), url[:60])
    conferir("Lembretes", "a mensagem não tem nome do paciente, do serviço nem conteúdo clínico", "Paciente" not in texto and "Psicologia" not in texto and "ansiedade" not in texto.lower())
    aba.value.close()
    conferir("Lembretes", "lembrete registrado (quem, quando, canal)", s.js("PEP.db.lembretes.filter(l => l.sessaoId === 's31').length") == 1)

    # Upload real
    s.ir("#/caso/c01/documentos")
    s.p.set_input_files("#ax-arquivo", files=[{"name": "falso.pdf", "mimeType": "application/pdf", "buffer": b"isto nao e um pdf"}])
    s.clicar('[data-acao="anexar"]')
    s.p.wait_for_timeout(400)
    conferir("Anexos", "arquivo renomeado para .pdf é recusado (confere o conteúdo, não só a extensão)", "não corresponde" in s.p.locator("#app").inner_text())
    s.p.set_input_files("#ax-arquivo", files=[{"name": "laudo grande.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\n" + b"0" * (3 * 1024 * 1024)}])
    s.clicar('[data-acao="anexar"]')
    s.p.wait_for_timeout(600)
    conferir("Anexos", "arquivo acima de 2 MB é recusado", "passa de 2 MB" in s.p.locator("#app").inner_text())
    s.p.set_input_files("#ax-arquivo", files=[{"name": "encaminhamento CAPS.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"}])
    s.p.fill("#ax-desc", "Encaminhamento de teste")
    s.clicar('[data-acao="anexar"]')
    s.p.wait_for_timeout(600)
    ultimo = s.js("PEP.db.anexos[PEP.db.anexos.length-1]")
    conferir("Anexos", "PDF válido guardado com hash e nome seguro", ultimo["nome"] == "encaminhamento-CAPS.pdf" and len(ultimo.get("hash") or "") == 64)
    with s.p.expect_popup() as aba:
        s.clicar(f'[data-acao="abrir-anexo"][data-id="{ultimo["id"]}"]')
    conferir("Anexos", "anexo abre do armazenamento do navegador", aba.value.url.startswith("blob:"))
    aba.value.close()

    # Agenda
    s.ir("#/agenda")
    conferir("Agenda", "visão de semana", "Semana de" in s.p.locator(".agenda-titulo").inner_text())
    s.axe("Agenda · semana")
    s.clicar('.seletor a:has-text("Mês")')
    conferir("Agenda", "visão de mês", "de 20" in s.p.locator(".agenda-titulo").inner_text() and s.p.locator("table.mes").count() == 1)
    s.axe("Agenda · mês")
    s.clicar('.seletor a:has-text("Dia")')
    conferir("Agenda", "visão de dia", s.p.locator(".agenda-titulo").count() == 1)
    s.axe("Agenda · dia")
    s.clicar('a:has-text("Próximo")')
    conferir("Agenda", "navegar para o próximo dia", s.js("location.hash").startswith("#/agenda/dia/"))

    # Troca de senha
    s.ir("#/conta")
    s.axe("Minha conta")
    s.p.fill("#ts-atual", SENHA)
    s.p.fill("#ts-nova", "senha123")
    s.p.fill("#ts-confirma", "senha123")
    s.clicar('#form-senha button[type="submit"]')
    s.p.wait_for_timeout(1500)
    conferir("Senha", "senha curta e comum é recusada", s.p.locator("#ts-nova-erro").count() == 1)
    s.p.fill("#ts-nova", "bia.estagiaria-2026-xyz")
    s.p.fill("#ts-confirma", "bia.estagiaria-2026-xyz")
    s.clicar('#form-senha button[type="submit"]')
    s.p.wait_for_timeout(1500)
    conferir("Senha", "senha com o próprio usuário é recusada", "seu nome, seu usuário" in s.p.locator("#ts-nova-erro").inner_text())
    nova_senha = "chuva fina na janela azul"
    s.p.fill("#ts-atual", SENHA)
    s.p.fill("#ts-nova", nova_senha)
    s.p.fill("#ts-confirma", nova_senha)
    conferir("Senha", "medidor mostra a força da senha enquanto digita", "Força: " in s.p.locator("#ts-forca").inner_text() and "atende" in s.p.locator("#ts-forca").inner_text())
    s.clicar('#form-senha button[type="submit"]')
    s.p.wait_for_function("() => document.getElementById('toast').textContent.indexOf('Senha alterada') !== -1", timeout=15000)
    s.sair()
    s.entrar("bia.estagiaria", nova_senha)
    conferir("Senha", "entra com a senha nova (frase, sem símbolo obrigatório)", s.js("location.hash") == "#/painel")
    s.fechar()


def supervisora(nav, base):
    s = Sessao(nav, base, "Supervisora Helena")
    s.entrar("helena.supervisora")
    s.ir("#/supervisao")
    s.axe("Validação")
    s.ir("#/caso/c01/evolucoes")
    s.clicar('[data-acao="devolver-evolucao"][data-id="e18"]')
    conferir("Evolução", "devolver exige comentário", s.p.locator("#com-e18-erro").count() == 1)
    s.clicar('[data-acao="validar-evolucao"][data-id="e18"]')
    conferir("Evolução", "supervisora valida e assina", s.js("PEP.util.porId(PEP.db.evolucoes,'e18').status") == "validada"
             and len(s.js("PEP.regras.assinaturasVigentes(PEP.util.porId(PEP.db.evolucoes,'e18'))")) == 2)
    conferir("Evolução", "evolução validada não tem mais campo de edição", s.p.locator("#ev-e18").count() == 0 and s.p.locator('[data-acao="validar-evolucao"][data-id="e18"]').count() == 0)
    texto_antes = s.js("PEP.util.porId(PEP.db.evolucoes,'e18').texto")
    s.js("PEP.acoes['salvar-evolucao'](Object.assign(document.createElement('button'), {}), null)") if False else None
    s.clicar('details:has(#adtxt-e18) summary')
    s.p.fill("#adtxt-e18", "Complemento: paciente trouxe o registro de pensamentos na sessão seguinte.")
    s.clicar('[data-acao="adicionar-adendo"][data-id="e18"]')
    conferir("Evolução", "correção depois de validada só por adendo; o texto original fica intacto",
             s.js("PEP.regras.adendosDe('e18').length") == 1 and s.js("PEP.util.porId(PEP.db.evolucoes,'e18').texto") == texto_antes)
    s.ir("#/caso/c04")
    conferir("Permissões", "supervisora não abre caso de outro grupo", s.h1() == "Acesso não permitido")
    s.ir("#/caso/c03/supervisao")
    conferir("Permissões", "supervisora vê o registro de supervisão do seu grupo", s.p.locator("text=Conversar com a Duda").count() == 1)
    for rota, nome in [("#/painel", "Painel"), ("#/alocacao", "Duplas e trios"), ("#/indicadores", "Indicadores")]:
        s.ir(rota)
        s.axe(nome)
    s.fechar()


def tecnica(nav, base):
    s = Sessao(nav, base, "Técnica Ana")
    s.entrar("ana.tecnica")
    s.ir("#/fila")
    conferir("CPF", "fila sinaliza a inscrição com CPF já cadastrado", s.p.locator('tr:has-text("Pessoa Inscrita 05") >> text=CPF já cadastrado').count() == 1)
    s.axe("Fila de espera")
    s.ir("#/caso/c01/supervisao")
    conferir("Permissões", "técnica não vê o registro de supervisão (fica fora do prontuário)", s.p.locator('.abas a:has-text("Supervisão")').count() == 0)
    s.ir("#/triagem/i05")
    conferir("CPF", "triagem avisa que o CPF já é de um paciente", "CPF já cadastrado: Paciente Exemplo 05" in s.p.locator("#app").inner_text())
    s.axe("Triagem")
    n_pac = s.js("PEP.db.pacientes.length")
    s.clicar('[data-acao="concluir-triagem"]')
    conferir("CPF", "paciente que volta: novo caso ligado ao cadastro existente, sem duplicar",
             s.js("PEP.db.pacientes.length") == n_pac and s.js("PEP.db.casos[PEP.db.casos.length-1].pacienteId") == "p05", s.toast())
    s.ir("#/triagem/i01")
    s.p.fill("#tr-cpf", "111.111.111-11")
    s.p.select_option("#tr-grupo", "g-a")
    s.p.uncheck("#tr-c-contrato")
    s.clicar('[data-acao="concluir-triagem"]')
    conferir("Validadores", "triagem: CPF com dígitos repetidos é recusado", s.p.locator("#tr-cpf-erro").count() == 1)
    conferir("LGPD", "triagem: alocar sem contrato terapêutico é recusado", s.p.locator("#tr-c-contrato-erro").count() == 1)
    s.p.fill("#tr-cpf", cpf_novo())
    s.p.check("#tr-c-contrato")
    s.p.check("#tr-c-lembretes")
    s.clicar('[data-acao="concluir-triagem"]')
    novo = s.js("PEP.db.casos[PEP.db.casos.length-1]")
    conferir("Triagem", "triagem cria paciente, caso ativo, anamnese v1 e um consentimento por finalidade",
             novo["status"] == "ativo" and s.js(f"PEP.db.consentimentos.filter(c => c.casoId === '{novo['id']}').length") == 5
             and s.js(f"PEP.db.anamneses.filter(a => a.casoId === '{novo['id']}').length") == 1)
    conferir("LGPD", "consentimento guarda data, responsável e versão do termo",
             s.js(f"PEP.db.consentimentos.filter(c => c.casoId === '{novo['id']}').every(c => c.em && c.registradoPor === 'u-tec' && c.termoVersao)"))

    # Edição do cadastro
    s.ir("#/paciente/p01/editar")
    s.axe("Editar cadastro")
    s.p.fill("#pc-tel", "123")
    p02 = next(p for p in DADOS["pacientes"] if p["id"] == "p02")
    s.p.fill("#pc-cpf", p02["cpf"])
    s.clicar('[data-acao="salvar-paciente"]')
    conferir("CPF", "edição: CPF de outro paciente é recusado", "já está cadastrado" in s.p.locator("#pc-cpf-erro").inner_text())
    conferir("Validadores", "edição: telefone inválido é recusado", s.p.locator("#pc-tel-erro").count() == 1)
    p01 = next(p for p in DADOS["pacientes"] if p["id"] == "p01")
    s.p.fill("#pc-cpf", p01["cpf"])
    s.p.fill("#pc-tel", "(11) 98888-7777")
    s.clicar('[data-acao="salvar-paciente"]')
    conferir("Cadastro", "edição válida salva e vai para a auditoria sem os valores",
             s.js("PEP.util.porId(PEP.db.pacientes,'p01').telefone") == "11988887777" and s.js("PEP.db.auditoria.some(a => a.acao === 'Editou cadastro do paciente' && a.alvo === 'p01')")
             and "98888" not in json.dumps(s.js("PEP.db.auditoria")))

    # Alocação exige contrato
    s.ir("#/alocacao")
    s.axe("Alocação")
    s.clicar('[data-acao="alocar-caso"][data-id="c07"]')
    conferir("LGPD", "caso sem contrato terapêutico não é alocado", "contrato terapêutico" in s.toast())
    s.ir("#/caso/c07")
    s.clicar('[data-acao="registrar-consentimento"][data-fin="contrato"]')
    s.ir("#/alocacao")
    s.clicar('[data-acao="alocar-caso"][data-id="c07"]')
    conferir("Alocação", "com o contrato registrado, o caso é alocado", s.js("PEP.util.porId(PEP.db.casos,'c07').status") == "ativo")

    # Auditoria
    s.ir("#/auditoria")
    s.clicar('[data-acao="verificar-auditoria"]')
    conferir("Auditoria", "verificação: cadeia íntegra", "Cadeia íntegra" in s.p.locator("#app").inner_text())
    s.axe("Auditoria")
    s.js("PEP.db.auditoria[1].acao = 'evento adulterado pelo console'")
    s.clicar('[data-acao="verificar-auditoria"]')
    conferir("Auditoria", "adulterar um evento pelo F12 é detectado", "Cadeia quebrada no evento 2" in s.p.locator("#app").inner_text())
    s.js("PEP.db.auditoria[1].acao = 'Assinou e enviou evolução'")

    # Pedidos LGPD
    s.ir("#/pedidos-lgpd")
    s.axe("Pedidos LGPD")
    s.p.fill("#resp-pt02", "Os dados são compartilhados só com a equipe do caso e com o provedor do banco de dados, sob contrato.")
    s.clicar('[data-acao="responder-titular"][data-id="pt02"]')
    conferir("LGPD", "técnica responde pedido do titular (art. 18)", s.js("PEP.util.porId(PEP.db.pedidosTitular,'pt02').status") == "respondido")
    for rota, nome in [("#/painel", "Painel"), ("#/indicadores", "Indicadores"), ("#/solicitacoes", "Acesso do paciente"), ("#/casos", "Casos")]:
        s.ir(rota)
        s.axe(nome)

    # Acesso do paciente com link temporário
    s.sair()
    s.entrar("paciente01")
    s.ir("#/meu-prontuario")
    s.clicar('[data-acao="solicitar-copia"]')
    s.sair()
    s.entrar("ana.tecnica")
    s.ir("#/solicitacoes")
    s.clicar('[data-acao="conferir-identidade"]')
    s.clicar('[data-acao="gerar-link"]')
    link = s.p.input_value("#link-gerado")
    conferir("Acesso do paciente", "link temporário gerado; o sistema guarda só o hash do token",
             "#/acesso/" in link and s.js("PEP.db.linksAcesso[0].tokenHash") == s.js("t => PEP.seguranca.sha256(t)", link.split("#/acesso/")[1]) and link.split("#/acesso/")[1] not in json.dumps(s.js("PEP.db")))
    s.clicar('[data-acao="marcar-entregue"]')
    leitor = s.ctx.new_page()
    leitor.on("dialog", lambda d: d.accept())
    leitor.goto(link)
    leitor.wait_for_selector("#lk-nasc")
    leitor.fill("#lk-nasc", "2000-01-01")
    leitor.click('#form-link button[type="submit"]')
    leitor.wait_for_timeout(200)
    conferir("Acesso do paciente", "data de nascimento errada não abre o prontuário", leitor.locator("#lk-nasc-erro").count() == 1)
    leitor.fill("#lk-nasc", p01["dataNascimento"])
    leitor.click('#form-link button[type="submit"]')
    leitor.wait_for_timeout(300)
    copia = leitor.locator("#app").inner_text()
    conferir("Acesso do paciente", "com a data certa, o paciente lê a cópia", "Prontuário psicológico — cópia" in copia)
    conferir("Acesso do paciente", "a cópia não traz supervisão, testes nem rascunho (Res. CFP 05/2025, arts. 14 e 17)",
             "Bom início" not in copia and "Instrumento" not in copia and "Rascunho:" not in copia)
    leitor.close()
    s.fechar()


def paciente(nav, base):
    s = Sessao(nav, base, "Paciente")
    s.entrar("paciente01")
    s.axe("Painel")
    s.clicar('[data-acao="confirmar-sessao"]')
    conferir("Paciente", "paciente confirma presença", "Presença confirmada" in s.toast())
    s.ir("#/meus-dados")
    s.axe("Meus dados")
    s.clicar('[data-acao="paciente-consentimento"][data-fin="lembretes"]')
    conferir("LGPD", "paciente revoga lembretes; vira novo registro (histórico preservado)",
             s.js("PEP.regras.consentiu(PEP.util.porId(PEP.db.casos,'c01'),'lembretes')") is False and s.js("PEP.regras.historicoConsentimento(PEP.util.porId(PEP.db.casos,'c01'),'lembretes').length") == 2)
    conferir("LGPD", "contrato terapêutico não tem botão de revogar para o paciente", s.p.locator('[data-acao="paciente-consentimento"][data-fin="contrato"]').count() == 0)
    s.p.select_option("#pt-tipo", "acesso")
    s.p.fill("#pt-desc", "Quero uma cópia dos meus dados cadastrais.")
    s.clicar('[data-acao="pedido-titular"]')
    conferir("LGPD", "paciente faz pedido de titular com prazo", "15 dias" in s.toast())
    for rota, nome in [("#/agenda", "Minhas sessões"), ("#/meu-prontuario", "Meu prontuário"), ("#/conta", "Minha conta")]:
        s.ir(rota)
        s.axe(nome)
    s.ir("#/caso/c01")
    conferir("Permissões", "paciente não navega no prontuário (recebe cópia)", s.h1() == "Acesso não permitido")
    s.fechar()


def direcao(nav, base):
    s = Sessao(nav, base, "Direção Marta")
    s.entrar("marta.direcao")
    s.ir("#/indicadores")
    conferir("Indicadores", "direção vê indicadores agregados", s.p.locator(".numero").first.inner_text() == "6")
    s.axe("Indicadores")
    s.ir("#/casos")
    conferir("Permissões", "direção não navega em prontuários", s.h1() == "Acesso não permitido")
    s.ir("#/estudantes")
    s.axe("Estudantes")
    csv = ("nome;matricula;email\nJoana Exemplo;20240101;joana.exemplo@aluno.example.org\n"
           "Duplicado Exemplo;20230001;dup.exemplo@aluno.example.org\nEmail Ruim;20240103;email-ruim")
    s.p.fill("#im-texto", csv)
    s.clicar('[data-acao="conferir-importacao"]')
    s.p.wait_for_timeout(300)
    tabela = s.p.locator("#form-importar table").inner_text().lower()
    conferir("Importação", "conferência aponta matrícula repetida e e-mail inválido", "matrícula já cadastrada" in tabela and "e-mail inválido" in tabela and "1 válida" in tabela)
    s.clicar('[data-acao="importar-estudantes"]')
    s.p.wait_for_selector("td.codigo", timeout=20000)
    provisoria = s.p.locator("td.codigo").first.inner_text()
    conferir("Importação", "conta criada com senha provisória (mostrada uma vez)", len(provisoria) == 19 and s.js("PEP.db.usuarios.some(u => u.login === 'joana.exemplo' && u.senhaProvisoria)"))
    s.ir("#/alocacao")
    s.axe("Grupos de estágio")
    s.clicar('[data-acao="encerrar-estagio"][data-id="u-est2"]')
    conferir("Rodízio", "direção encerra o vínculo de estágio do Caio", "Vínculo encerrado" in s.toast())
    s.sair()
    s.entrar("joana.exemplo", provisoria, aceitar=False)
    conferir("Senha", "senha provisória obriga a trocar no primeiro acesso", s.js("location.hash") == "#/trocar-senha")
    s.ir("#/painel")
    conferir("Senha", "sem trocar a senha provisória, não navega", s.js("location.hash") == "#/trocar-senha")
    s.p.fill("#ts-atual", provisoria)
    s.p.fill("#ts-nova", "minha frase secreta de estudo")
    s.p.fill("#ts-confirma", "minha frase secreta de estudo")
    s.clicar('#form-senha button[type="submit"]')
    s.p.wait_for_function("() => location.hash === '#/termo'", timeout=15000)
    s.p.check("#tm-ok")
    s.clicar('[data-acao="aceitar-termo"]')
    conferir("Importação", "estudante importada chega ao painel sem grupo e sem casos", "ainda sem grupo" in s.p.locator("#app").inner_text())
    s.sair()
    s.entrar("caio.estagiario")
    s.ir("#/casos")
    conferir("Rodízio", "com o vínculo encerrado, Caio não vê mais nenhum caso", s.p.locator("a.cartao-link").count() == 0)
    s.ir("#/caso/c01")
    conferir("Rodízio", "e não abre o caso que atendia", s.h1() == "Acesso não permitido")
    s.fechar()


def vinculo_encerrado(nav, base):
    s = Sessao(nav, base, "Iara (semestre passado)")
    s.entrar("iara.estagiaria")
    conferir("Rodízio", "estagiária do semestre passado entra, mas sem acesso a casos", "vínculo de estágio encerrado" in s.p.locator("#app").inner_text() and s.js("PEP.regras.casosVisiveis(PEP.estado.usuarioAtual()).length") == 0)
    s.fechar()


def inatividade(nav, base):
    s = Sessao(nav, base, "Inatividade")
    s.p.clock.install(time=datetime(2026, 11, 6, 10, 0))
    s.entrar("ana.tecnica")
    s.p.clock.fast_forward("14:05")
    s.p.wait_for_timeout(300)
    conferir("Sessão", "aviso 1 minuto antes de encerrar por inatividade (WCAG 2.2.1)", s.p.is_visible("#aviso-sessao") and "segundos" in s.p.locator("#aviso-sessao-texto").inner_text())
    s.clicar('[data-acao="continuar-sessao"]')
    conferir("Sessão", "botão 'Continuar conectado' mantém a sessão", not s.p.is_visible("#aviso-sessao") and s.js("location.hash") == "#/painel")
    s.p.clock.fast_forward("15:30")
    s.p.wait_for_timeout(300)
    conferir("Sessão", "sem uso por 15 minutos, a sessão encerra e avisa o motivo", s.js("location.hash") == "#/entrar" and "15 minutos sem uso" in s.p.locator("#app").inner_text())
    s.fechar()


def datas_relativas(nav, base):
    s = Sessao(nav, base, "Dia da apresentação")
    s.p.clock.install(time=datetime(2026, 12, 3, 9, 0))
    s.entrar("bia.estagiaria")
    conferir("Demonstração", "em 03/12/2026 os dados andam 27 dias e a sessão 'de hoje' cai no dia", s.js("PEP.db._meta.deslocamentoDias") == 27
             and s.js("PEP.util.porId(PEP.db.sessoes,'s30').data") == "2026-12-03")
    conferir("Demonstração", "data de nascimento não é deslocada", s.js("PEP.util.porId(PEP.db.pacientes,'p01').dataNascimento") == "1997-03-14")
    s.fechar()


def celular_e_preferencias(nav, base):
    s = Sessao(nav, base, "Celular", viewport={"width": 390, "height": 844})
    s.entrar("ana.tecnica")
    for rota in ["#/painel", "#/agenda", "#/caso/c01/sessoes", "#/fila"]:
        s.ir(rota)
        conferir("Celular", f"sem rolagem lateral em {rota}", s.js("document.documentElement.scrollWidth <= window.innerWidth + 1"), str(s.js("document.documentElement.scrollWidth")))
    s.fechar()
    s = Sessao(nav, base, "Alto contraste")
    s.entrar("ana.tecnica")
    s.clicar('[data-acao="alto-contraste"]')
    conferir("Acessibilidade", "botão de alto contraste liga o tema e informa o estado (aria-pressed)", s.js("document.documentElement.classList.contains('contraste')") and s.p.get_attribute('[data-acao="alto-contraste"]', "aria-pressed") == "true")
    for rota in ["#/painel", "#/caso/c01", "#/agenda"]:
        s.ir(rota)
        s.axe("contraste " + rota, regras=["color-contrast"])
    for _ in range(3):
        s.clicar('[data-acao="fonte-maior"]')
    conferir("Acessibilidade", "texto em 150% sem rolagem lateral", s.js("document.documentElement.style.fontSize") == "150%" and s.js("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    s.fechar()


def main():
    srv, base = servidor()
    with sync_playwright() as p:
        chrome = shutil.which("google-chrome") or shutil.which("chrome")
        nav = p.chromium.launch(executable_path=chrome, args=["--no-sandbox"]) if chrome else p.chromium.launch()
        for etapa in (publico, estagiaria, supervisora, tecnica, paciente, direcao, vinculo_encerrado, inatividade, datas_relativas, celular_e_preferencias):
            try:
                etapa(nav, base)
            except Exception as e:  # uma etapa quebrada não esconde as outras
                conferir("Execução", f"etapa {etapa.__name__} terminou sem erro", False, str(e).split("\n")[0][:200])
        nav.close()
    srv.shutdown()
    conferir("Console", "nenhum erro de JavaScript no console em todas as telas", not erros_console, "; ".join(f"{g}: {m}" for g, m in erros_console)[:300])

    ok = sum(1 for r in resultados if r[2])
    telas_axe = len(axe_resumo)
    print(f"\n{ok} de {len(resultados)} verificações passaram ({telas_axe} telas checadas com axe-core).")
    grupos = {}
    for g, n, k, d in resultados:
        grupos.setdefault(g, [0, 0])
        grupos[g][0 if k else 1] += 1
    linhas = ["# Resultado dos testes do site", "",
              f"Gerado por `testes/testar_site.py` em {datetime.now().strftime('%d/%m/%Y %H:%M')}, no Chrome (Playwright), com axe-core {json.loads((RAIZ / 'testes/node_modules/axe-core/package.json').read_text())['version'] if AXE.exists() else '—'}.", "",
              f"**{ok} de {len(resultados)} verificações passaram.** Acessibilidade: {telas_axe} telas conferidas (WCAG 2.0/2.1/2.2, níveis A e AA).", "",
              "| Área | Passaram | Falharam |", "|---|---|---|"] + [f"| {g} | {v[0]} | {v[1]} |" for g, v in grupos.items()] + ["", "## Todas as verificações", "", "| | Área | Verificação | Detalhe |", "|---|---|---|---|"]
    linhas += [f"| {'✓' if k else '✗'} | {g} | {n} | {d.replace('|', '/')[:160]} |" for g, n, k, d in resultados]
    (RAIZ / "testes" / "resultado-testes.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    sys.exit(0 if ok == len(resultados) else 1)


if __name__ == "__main__":
    main()
