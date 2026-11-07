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
import re
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

    def justificar(self, caso, motivo="responsabilidade-tecnica"):
        # Técnica: registra o motivo do acesso ao conteúdo clínico do caso (se ainda não tiver)
        self.ir(f"#/caso/{caso}")
        if self.p.locator("#form-justificativa").count():
            self.p.check(f"#jt-motivo-{motivo}")
            self.clicar('[data-acao="justificar-acesso"]')
            self.p.wait_for_timeout(150)

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
    conferir("LGPD", "formulário público avisa que é protótipo (nenhuma clínica recebe a inscrição) e indica a rede",
             "Nenhuma clínica recebe esta inscrição" in s.p.locator("#app").inner_text() and "CAPS" in s.p.locator("#app").inner_text())
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
    conferir("Evolução", "contador mostra os caracteres usados e o limite", s.p.locator("#nova-texto-contador").inner_text() == "5 de 5000 caracteres")
    s.clicar('[data-acao="nova-evolucao"][data-modo="enviar"]')
    conferir("Validadores", "evolução muito curta é recusada", s.p.locator("#nova-texto-erro").count() == 1)
    s.js("() => { document.getElementById('nova-texto').value = 'x'.repeat(5001); }")  # passa por cima do maxlength
    s.clicar('[data-acao="nova-evolucao"][data-modo="rascunho"]')
    conferir("Validadores", "evolução acima do limite de caracteres é recusada", "no máximo 5000" in s.p.locator("#nova-texto-erro").inner_text())
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
    h31 = int(s31["hora"][:2]) * 60 + int(s31["hora"][3:])
    s.p.fill("#ag-hora", f"{(h31 + 30) // 60:02d}:{(h31 + 30) % 60:02d}")
    s.clicar('[data-acao="agendar-sessao"]')
    conferir("Sessões", "sessão que se sobrepõe a outra da dupla (cada uma ocupa 50 min) é recusada", "já tem sessão" in s.p.locator("#ag-hora-erro").inner_text())
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

    # Encerramento: o prontuário precisa estar completo; abandono só pelo fluxo de faltas
    s.ir("#/caso/c01/encerramento")
    conferir("Encerramento", "com evolução aguardando a supervisão, encerrar fica bloqueado e a tela diz por quê",
             s.p.is_disabled('[data-acao="encerrar-caso"]') and "aguardando a validação" in s.p.locator("#app").inner_text())
    conferir("Encerramento", "abandono não aparece no encerramento manual (só pelo fluxo de faltas)", s.p.locator('#enc-tipo option[value="abandono"]').count() == 0)
    conferir("Encerramento", "a tela mostra até quando o prontuário fica guardado", "Guarda do prontuário até" in s.p.locator("#app").inner_text())
    s.ir("#/caso/c02/sessoes")
    s.clicar('[data-acao="encerrar-abandono"]')
    conferir("Abandono", "liberar a vaga sem tentativa de contato é recusado", "tentativa de contato" in s.toast())
    s.p.select_option("#ct-resultado", "Desistiu")
    s.p.select_option("#ct-motivo", "Transporte ou distância")
    s.clicar('[data-acao="registrar-contato"]')
    s.clicar('[data-acao="encerrar-abandono"]')
    enc = s.js("PEP.db.encerramentos.filter(e => e.casoId === 'c02')[0]") or {}
    conferir("Abandono", "com o contato registrado, o caso é encerrado por abandono com o motivo informado",
             enc.get("tipo") == "abandono" and enc.get("motivo") == "Transporte ou distância" and s.js("PEP.util.porId(PEP.db.casos,'c02').status") == "encerrado")

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
    # Encaminhamento à rede: exige o serviço de destino
    s.ir("#/caso/c02/encerramento")
    s.p.select_option("#enc-tipo", "encaminhamento")
    s.p.fill("#enc-motivo", "Demanda de acompanhamento psiquiátrico")
    s.p.fill("#enc-registro", "Paciente orientada sobre o encaminhamento; relatório só com o necessário.")
    s.clicar('[data-acao="encerrar-caso"]')
    conferir("Encerramento", "encaminhamento sem o serviço de destino é recusado", s.p.locator("#enc-destino-erro").count() == 1)
    s.p.fill("#enc-destino", "CAPS (adulto)")
    s.clicar('[data-acao="encerrar-caso"]')
    conferir("Encerramento", "encaminhamento com destino encerra o caso e mostra para onde o paciente foi",
             s.js("PEP.util.porId(PEP.db.casos,'c02').status") == "encerrado" and "Encaminhado para: CAPS (adulto)" in s.p.locator("#app").inner_text())
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
    s.justificar("c01")   # o contraste é conferido no prontuário aberto, não só na tela do motivo
    s.clicar('[data-acao="alto-contraste"]')
    conferir("Acessibilidade", "botão de alto contraste liga o tema e informa o estado (aria-pressed)", s.js("document.documentElement.classList.contains('contraste')") and s.p.get_attribute('[data-acao="alto-contraste"]', "aria-pressed") == "true")
    for rota in ["#/painel", "#/caso/c01", "#/agenda"]:
        s.ir(rota)
        s.axe("contraste " + rota, regras=["color-contrast"])
    for _ in range(3):
        s.clicar('[data-acao="fonte-maior"]')
    conferir("Acessibilidade", "texto em 150% sem rolagem lateral", s.js("document.documentElement.style.fontSize") == "150%" and s.js("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    s.fechar()


def risco_e_seguranca(nav, base):
    s = Sessao(nav, base, "Risco e segurança")
    # Estagiária: avaliação de risco e plano de segurança feito com o paciente
    s.entrar("bia.estagiaria")
    s.ir("#/caso/c01/risco")
    s.axe("Caso · risco e segurança")
    conferir("Risco", "a aba mostra os números de urgência (SAMU 192, CVV 188)", "192" in s.p.locator("#app").inner_text() and "188" in s.p.locator("#app").inner_text())
    s.clicar("#form-risco summary")
    s.clicar('[data-acao="registrar-risco"]')
    conferir("Risco", "avaliação sem descrição é recusada", s.p.locator("#rk-desc-erro").count() == 1)
    s.p.select_option("#rk-tipo", "ideacao-suicida")
    s.p.check("#rk-nivel-moderado")
    s.p.fill("#rk-desc", "Relata pensamentos de morte nas últimas semanas, sem plano. Rede de apoio presente.")
    s.p.check("#rk-c-plano-seguranca")
    s.clicar('[data-acao="registrar-risco"]')
    r = s.js("PEP.db.riscos[PEP.db.riscos.length-1]")
    selo = s.p.locator('a.etiqueta.perigo[href="#/caso/c01/risco"]')
    conferir("Risco", "avaliação registrada aguardando a ciência da supervisão, com selo no cabeçalho do caso",
             r["casoId"] == "c01" and not r.get("cienciaEm") and selo.count() == 1 and "aguardando ciência" in (selo.text_content() or ""))
    conferir("Risco", "estagiária não vê o registro de notificação compulsória (é do supervisor)", s.p.locator('[data-acao="registrar-notificacao"]').count() == 0)
    s.clicar("#plano summary")
    s.clicar('[data-acao="salvar-plano"]')
    conferir("Risco", "plano sem os campos essenciais e sem confirmar que foi feito com o paciente é recusado",
             s.p.locator("#pl-sinaisAlerta-erro").count() == 1 and s.p.locator("#pl-revisado-erro").count() == 1)
    s.p.fill("#pl-sinaisAlerta", "Insônia por duas noites seguidas; vontade de ficar sozinha.")
    s.p.fill("#pl-estrategiasProprias", "Respiração lenta; caminhar; escrever no caderno.")
    s.p.fill("#pl-pessoasAjuda", "A amiga de infância (o telefone fica com a paciente).")
    s.p.check("#pl-revisado")
    s.clicar('[data-acao="salvar-plano"]')
    conferir("Risco", "plano de segurança salvo como versão 1", s.js("PEP.regras.planoAtual(PEP.util.porId(PEP.db.casos,'c01')).versao") == 1)
    s.sair()
    # Supervisora: aviso no painel, ciência, notificação e assinatura do plano
    s.entrar("helena.supervisora")
    conferir("Risco", "o painel da supervisora avisa a avaliação aguardando a ciência dela", "aguardando a sua ciência" in s.p.locator("#app").inner_text())
    s.ir("#/caso/c01/risco")
    s.clicar(f'[data-acao="dar-ciencia-risco"][data-id="{r["id"]}"]')
    conferir("Risco", "supervisora dá ciência (quem e quando ficam registrados)", s.js(f"PEP.util.porId(PEP.db.riscos,'{r['id']}').cienciaPor") == "u-sup1")
    s.clicar(f'details:has([data-acao="registrar-notificacao"][data-id="{r["id"]}"]) summary')
    s.p.select_option(f"#nt-orgao-{r['id']}", "vigilancia")
    s.clicar(f'[data-acao="registrar-notificacao"][data-id="{r["id"]}"]')
    conferir("Risco", "supervisora registra a notificação compulsória, com o fundamento legal à vista",
             s.js("PEP.db.notificacoes.length") == len(DADOS["notificacoes"]) + 1 and "Lei 13.819/2019" in s.p.locator("#app").inner_text())
    s.clicar('[data-acao="assinar-plano"]')
    conferir("Risco", "supervisora assina o plano de segurança", "Assinado por" in s.p.locator("#plano").inner_text())
    s.sair()
    # Paciente: o plano no portal
    s.entrar("paciente01")
    s.ir("#/meu-plano")
    s.axe("Meu plano de segurança")
    texto = s.p.locator("#app").inner_text()
    conferir("Risco", "paciente lê o próprio plano de segurança no portal, com os números de urgência", "Insônia por duas noites" in texto and "188" in texto)
    s.sair()
    # Técnica: triagem com risco e cópia de adolescente
    s.entrar("ana.tecnica")
    s.ir("#/triagem/i02")
    s.p.select_option("#tr-risco", "risco")
    conferir("Risco", "na triagem, 'risco identificado' abre os campos da avaliação", s.p.is_visible("#tr-rk-desc"))
    s.clicar('[data-acao="concluir-triagem"]')
    conferir("Risco", "triagem com risco exige descrever o que foi observado", s.p.locator("#tr-rk-desc-erro").count() == 1)
    s.p.fill("#tr-rk-desc", "Relata ideação suicida passiva desde o luto; nega plano. Orientada sobre o CVV.")
    s.clicar('[data-acao="concluir-triagem"]')
    novo = s.js("PEP.db.casos[PEP.db.casos.length-1]")
    conferir("Risco", "o caso já nasce com a avaliação de risco da triagem, aguardando a supervisão",
             s.js(f"PEP.db.riscos.some(r => r.casoId === '{novo['id']}' && r.registradoPor === 'u-tec' && !r.cienciaEm)"))
    s.ir("#/painel")
    conferir("Risco", "o painel da técnica destaca o caso com risco que ainda não tem grupo", "Risco visto na triagem" in s.p.locator("#app").inner_text())
    s.justificar("c04", "pedido-paciente")
    s.ir("#/imprimir/c04")
    tela = s.p.locator("#app").inner_text()
    copia = tela.split("Prontuário psicológico — cópia")[-1]
    conferir("Risco", "cópia de adolescente omite o relato de violência e a notificação (Código de Ética, art. 13); só a equipe é avisada",
             "Relata agressão física" not in copia and "Conselho Tutelar" not in copia and "omite 2 registro(s)" in tela)
    s.justificar("c03", "pedido-paciente")
    s.ir("#/imprimir/c03")
    copia3 = s.p.locator("#app").inner_text()
    conferir("Risco", "cópia de adulto traz a avaliação de risco e o plano de segurança", "Avaliações de risco" in copia3 and "Plano de segurança (versão 1" in copia3)
    s.fechar()


def revisor_de_escrita(nav, base):
    s = Sessao(nav, base, "Revisor de escrita")
    s.entrar("duda.estagiaria")
    # As regras, direto
    achados = s.js("PEP.revisor.analisar('O paciente alega que a mãe é manipuladora. Contato: (11) 91234-5678. Conversou com Joana.').map(a => a.tipo)")
    conferir("Revisor", "aponta 'alega', juízo de valor, telefone e nome de terceiro no texto",
             "duvida" in achados and "juizo" in achados and achados.count("identificacao") >= 2, ", ".join(achados))
    limpo = s.js("PEP.revisor.analisar('Sessão 5. Tema: rotina de sono. Intervenção: psicoeducação sobre higiene do sono. Plano: registro diário até a próxima sessão.')")
    conferir("Revisor", "registro técnico com tema, intervenção e plano não recebe apontamento", limpo == [])
    conferir("Revisor", "'alega' não é apontado dentro de outra palavra ('alegações')", s.js("PEP.revisor.analisar('Sem alegações novas nesta semana.').length") == 0)
    # A evolução devolvida da Duda: o revisor aponta o que a supervisão devolveu
    s.ir("#/caso/c03/evolucoes")
    conferir("Revisor", "na evolução devolvida, o revisor aponta falta de intervenção e de plano",
             "intervenção" in s.p.locator("#ev-e05-revisor").inner_text() and "plano" in s.p.locator("#ev-e05-revisor").inner_text())
    novo_texto = "Sessão 3. Paciente alega briga com a mãe. Trabalhada a expressão de sentimentos. Plano: retomar o tema na próxima sessão."
    s.p.fill("#ev-e05", novo_texto)
    s.p.wait_for_timeout(700)   # o revisor espera a pessoa parar de digitar
    conferir("Revisor", "enquanto a estagiária escreve, o revisor sugere 'relata' no lugar de 'alega'", "relata" in s.p.locator("#ev-e05-revisor").inner_text())
    s.clicar('[data-acao="ver-como-paciente"][data-alvo="ev-e05"]')
    conferir("Revisor", "'Ver como o paciente lê' mostra o texto do jeito que sai na cópia",
             "Paciente alega briga com a mãe" in s.p.locator("#ev-e05-previa").inner_text() and s.p.get_attribute('[data-alvo="ev-e05"]', "aria-expanded") == "true")
    s.axe("Evolução com revisor e prévia")
    s.clicar('[data-acao="salvar-evolucao"][data-id="e05"][data-modo="enviar"]')
    conferir("Revisor", "o revisor não bloqueia: a estagiária decide e envia", s.js("PEP.util.porId(PEP.db.evolucoes,'e05').status") == "enviada")
    s.sair()
    s.entrar("helena.supervisora")
    s.ir("#/supervisao")
    conferir("Revisor", "na fila de validação, a supervisora vê os apontamentos para orientar", "relata" in s.p.locator("#app").inner_text() and "Para orientar a supervisão" in s.p.locator("#app").inner_text())
    s.fechar()


def privacidade_na_tela(nav, base):
    s = Sessao(nav, base, "Privacidade na tela")
    s.entrar("ana.tecnica")
    # Motivo do acesso: o conteúdo clínico só abre com ele
    eventos_antes = s.js("PEP.db.auditoria.length")
    s.ir("#/caso/c01")
    conferir("Privacidade", "técnica fora da equipe vê a capa do caso e o pedido de motivo, não o conteúdo clínico",
             s.p.locator("#form-justificativa").count() == 1 and "Avaliação de demanda" not in s.p.locator("#app").inner_text())
    conferir("Privacidade", "só ver a capa do caso não gera o evento 'Abriu o prontuário'",
             not s.js(f"PEP.db.auditoria.slice({eventos_antes}).some(a => a.acao.indexOf('Abriu o prontuário') === 0)"))
    s.axe("Motivo do acesso")
    s.clicar('[data-acao="justificar-acesso"]')
    conferir("Privacidade", "sem escolher o motivo, não abre", s.p.locator("#form-justificativa").count() == 1 and s.p.locator('[id$="-erro"]').count() >= 1)
    s.p.check("#jt-motivo-outro")
    s.clicar('[data-acao="justificar-acesso"]')
    conferir("Privacidade", "motivo 'outro' exige a descrição", s.p.locator("#jt-detalhe-erro").count() == 1)
    s.p.check("#jt-motivo-pedido-paciente")
    s.clicar('[data-acao="justificar-acesso"]')
    s.p.wait_for_timeout(200)
    conferir("Privacidade", "com o motivo, o prontuário abre e a auditoria registra o motivo",
             "Avaliação de demanda" in s.p.locator("#app").inner_text()
             and s.js("PEP.db.auditoria.some(a => a.acao === 'Abriu o prontuário com motivo: Pedido do paciente (cópia do prontuário ou direito LGPD)' && a.alvo === 'c01')"))
    conferir("Privacidade", "a abertura com motivo é registrada uma vez só (sem evento duplicado)",
             s.js(f"PEP.db.auditoria.slice({eventos_antes}).filter(a => a.acao.indexOf('Abriu o prontuário') === 0 && a.alvo === 'c01').length") == 1)
    s.ir("#/caso/c07")
    conferir("Privacidade", "caso recém-triado, ainda sem grupo, abre sem pedir motivo", s.p.locator("#form-justificativa").count() == 0)
    s.ir("#/imprimir/c03")
    conferir("Privacidade", "a cópia em PDF também pede o motivo", s.p.locator("#form-justificativa").count() == 1)
    # Modo discreto
    s.ir("#/casos")
    s.clicar('[data-acao="modo-discreto"]')
    texto = s.p.locator("#app").inner_text()
    conferir("Privacidade", "modo discreto: pacientes aparecem pelas iniciais e pelo código do caso",
             "Paciente Exemplo 01" not in texto and "P. E. · c01" in texto and s.p.get_attribute('[data-acao="modo-discreto"]', "aria-pressed") == "true")
    s.ir("#/fila")
    conferir("Privacidade", "modo discreto continua ao navegar (fila sem nomes por extenso)", "Pessoa Inscrita 01" not in s.p.locator("#app").inner_text())
    s.ir("#/caso/c01")
    conferir("Privacidade", "modo discreto oculta telefone e e-mail na identificação", "oculto no modo discreto" in s.p.locator("#app").inner_text()
             and "paciente01@example.org" not in s.p.locator("#app").inner_text())
    s.clicar('[data-acao="modo-discreto"]')
    # Cobrir tela
    s.clicar('[data-acao="cobrir-tela"]')
    conferir("Privacidade", "'Cobrir tela' esconde tudo na hora e leva o foco para a cortina",
             s.p.is_visible("#cortina") and s.js("document.activeElement.id") == "cortina-voltar" and s.js("document.querySelector('.layout').inert") is True)
    s.axe("Tela coberta")
    s.clicar('[data-acao="descobrir-tela"]')
    conferir("Privacidade", "a tela volta como estava, sem sair do sistema", not s.p.is_visible("#cortina") and s.js("location.hash") == "#/caso/c01")
    # O paciente vê quem acessou o prontuário, com o motivo da técnica
    s.sair()
    s.entrar("paciente01")
    s.ir("#/meus-dados")
    s.axe("Meus dados com acessos")
    acessos = s.p.locator("#app").inner_text()
    conferir("Privacidade", "o paciente vê quem acessou o prontuário e o motivo registrado pela técnica",
             "Quem acessou o seu prontuário" in acessos and "Ana Lúcia" in acessos and "Motivo: Pedido do paciente" in acessos)
    conferir("Privacidade", "a lista mostra a categoria da ação, não o texto interno da auditoria",
             "Registrou informações no prontuário" in acessos and "Assinou e enviou evolução" not in acessos)
    s.fechar()


def faltas_e_urgencia(nav, base):
    s = Sessao(nav, base, "Faltas avisadas e urgência")
    # Visitante: relato com sinal de urgência mostra na hora os contatos de crise
    s.abrir("#/inscricao")
    s.p.fill("#f-resumo", "Não aguento mais, preciso de ajuda")
    conferir("Urgência", "relato com sinal de urgência mostra na hora CVV 188 e SAMU 192 (sem bloquear a inscrição)",
             s.p.is_visible("#f-urgencia") and "188" in s.p.locator("#f-urgencia").inner_text())
    s.p.fill("#f-resumo", "Ansiedade no trabalho")
    conferir("Urgência", "relato sem sinal de urgência não mostra o alerta", not s.p.is_visible("#f-urgencia"))
    s.p.fill("#f-nome", "Pessoa Urgente Teste")
    s.p.fill("#f-nasc", "1990-02-02")
    s.p.fill("#f-cpf", cpf_novo())
    s.p.fill("#f-tel", "11912345678")
    s.p.fill("#f-resumo", "Penso em me machucar, não sei o que fazer")
    s.p.check("#f-ciente")
    s.clicar('#form-inscricao button[type="submit"]')
    nova = s.js("PEP.db.inscricoes[PEP.db.inscricoes.length-1]")
    conferir("Urgência", "a inscrição guarda o sinal de urgência (calculado do relato)", nova.get("sinalUrgencia") is True)
    # Técnica: a inscrição urgente vem primeiro na fila e no painel
    s.entrar("ana.tecnica")
    conferir("Urgência", "o painel da técnica avisa a inscrição urgente", "sinal de urgência no relato" in s.p.locator("#app").inner_text())
    s.ir("#/fila")
    primeira = s.p.locator("tbody tr").first.inner_text()
    conferir("Urgência", "na fila, a inscrição com sinal de urgência aparece primeiro, marcada para contato no mesmo dia",
             "Pessoa Urgente Teste" in primeira and s.p.locator("tbody tr").first.locator(".etiqueta.perigo").count() == 1)
    s.ir("#/indicadores")
    conferir("Faltas", "indicadores mostram por que o paciente avisou que não iria", "Transporte ou distância" in s.p.locator("#app").inner_text())
    s.sair()
    # Paciente: "Não vou poder ir"
    s.entrar("paciente01")
    s.axe("Painel do paciente com aviso de falta")
    s.p.locator(".aviso-falta summary").nth(1).click()
    sid = s.p.locator('[data-acao="avisar-falta"]').nth(1).get_attribute("data-id")
    s.p.select_option(f"#mf-{sid}", "trabalho-estudo")
    s.clicar(f'[data-acao="avisar-falta"][data-id="{sid}"]')
    sessao = s.js(f"PEP.util.porId(PEP.db.sessoes, '{sid}')")
    conferir("Faltas", "o paciente avisa que não vai: vira falta justificada, com o motivo", sessao["presenca"] == "falta-justificada" and sessao["avisoPaciente"] and sessao["motivoFalta"] == "trabalho-estudo")
    conferir("Faltas", "o painel do paciente confirma o aviso", "Você avisou que não vai" in s.p.locator("#app").inner_text())
    s.sair()
    # Estagiária: vê o aviso no painel e na aba de sessões
    s.entrar("bia.estagiaria")
    conferir("Faltas", "o painel da estagiária mostra a falta avisada, para oferecer outro horário", "Falta avisada pelo paciente" in s.p.locator("#app").inner_text())
    s.ir("#/caso/c01/sessoes")
    conferir("Faltas", "na aba de sessões, a equipe vê que a falta foi avisada pelo paciente e o motivo", "avisada pelo paciente" in s.p.locator("#app").inner_text())
    s.sair()
    # Prazo de registro: a evolução atrasada aparece no painel (sessão s40 do caso c03, de propósito)
    s.entrar("duda.estagiaria")
    conferir("Prazo", "o painel da estagiária mostra a evolução atrasada (mais de 48 h)", "Evolução atrasada" in s.p.locator("#app").inner_text())
    s.fechar()


def contas(nav, base):
    s = Sessao(nav, base, "Contas")
    s.entrar("marta.direcao")
    s.ir("#/estudantes")
    s.axe("Estudantes e contas")
    s.clicar('[data-acao="gerar-senha-provisoria"][data-id="u-est8"]')
    s.p.wait_for_selector("#senha-gerada", timeout=20000)
    provisoria = s.p.locator("#senha-gerada").inner_text()
    conferir("Contas", "direção gera senha provisória (aparece uma vez; nos dados fica só o hash)", len(provisoria) == 19 and provisoria not in json.dumps(s.js("PEP.db")))
    s.clicar('[data-acao="alternar-conta"][data-id="u-est2"]')
    conferir("Contas", "direção desativa uma conta (o histórico continua)", s.js("PEP.util.porId(PEP.db.usuarios,'u-est2').ativo") is False)
    conferir("Contas", "a direção não tem botões para a própria conta", s.p.locator('[data-id="u-dir"]').count() == 0)
    s.sair()
    s.entrar("hugo.estagiario", provisoria, aceitar=False)
    conferir("Contas", "com a senha provisória, o primeiro acesso obriga a trocar", s.js("location.hash") == "#/trocar-senha")
    s.sair()
    s.abrir("#/entrar")
    s.p.fill("#lg-usuario", "caio.estagiario")
    s.p.fill("#lg-senha", SENHA)
    s.p.click("#lg-entrar")
    s.p.wait_for_function("() => !document.getElementById('login-erro').hidden", timeout=15000)
    conferir("Contas", "conta desativada não entra (mesma mensagem genérica de senha errada)", s.p.locator("#login-erro").inner_text() == "Usuário ou senha incorretos.")
    # Técnica: acesso do paciente 03 ao portal
    s.entrar("ana.tecnica")
    s.justificar("c03")
    s.ir("#/caso/c03")
    s.clicar('[data-acao="criar-acesso-portal"]')
    s.p.wait_for_selector("#senha-gerada", timeout=20000)
    senha3 = s.p.locator("#senha-gerada").inner_text()
    conta = s.js("PEP.db.usuarios.filter(u => u.pacienteId === 'p03')[0]") or {}
    conferir("Contas", "técnica cria o acesso do paciente ao portal (usuário a partir do e-mail, senha provisória)", conta.get("login") == "paciente03" and conta.get("senhaProvisoria") is True)
    s.sair()
    s.entrar("paciente03", senha3, aceitar=False)
    conferir("Contas", "o paciente entra com a senha provisória e precisa trocá-la", s.js("location.hash") == "#/trocar-senha")
    s.fechar()


def bloqueio_progressivo(nav, base):
    s = Sessao(nav, base, "Bloqueio progressivo")
    s.p.clock.install(time=datetime(2026, 11, 6, 10, 0))
    s.abrir("#/entrar")

    def errar(vezes):
        texto = ""
        for _ in range(vezes):
            s.p.fill("#lg-usuario", "rafael.supervisor")
            s.p.fill("#lg-senha", "senha-errada-123456")
            s.p.click("#lg-entrar")
            s.p.wait_for_function("() => !document.getElementById('login-erro').hidden && document.getElementById('lg-entrar').textContent === 'Entrar'", timeout=15000)
            texto = s.p.locator("#login-erro").inner_text()
            s.p.evaluate("document.getElementById('login-erro').hidden = true")
        return texto
    t1 = errar(5)
    s.p.clock.fast_forward("00:31")
    t2 = errar(5)
    conferir("Senha", "bloqueio progressivo: 30 s no 1º bloqueio e 60 s no 2º (quem tenta adivinhar fica cada vez mais lento)",
             "30 segundos" in t1 and "60 segundos" in t2, f"{t1} | {t2}")
    s.fechar()


def rascunho_automatico(nav, base):
    s = Sessao(nav, base, "Rascunho automático")
    s.p.clock.install(time=datetime(2026, 11, 6, 10, 0))
    s.entrar("bia.estagiaria")
    s.ir("#/caso/c01/evolucoes")
    s.clicar("details.cartao summary")
    texto = "Sessão de hoje. Tema: rotina de sono. Intervenção: psicoeducação. Plano: registro diário."
    s.p.fill("#nova-texto", texto)
    antes = s.js("PEP.db.evolucoes.length")
    s.p.clock.fast_forward("14:05")
    s.p.wait_for_timeout(300)
    nova = s.js("PEP.db.evolucoes[PEP.db.evolucoes.length-1]")
    conferir("Sessão", "o texto que estava sendo escrito vira rascunho antes de a sessão encerrar por inatividade",
             s.js("PEP.db.evolucoes.length") == antes + 1 and nova["status"] == "rascunho" and nova["texto"] == texto
             and "guardado como rascunho" in s.p.locator("#aviso-sessao-texto").inner_text())
    s.fechar()


def adaptador_supabase(nav, base):
    """O adaptador do Supabase contra um servidor simulado que responde como a API documentada
    (Auth e PostgREST). Confere o que o site envia ao banco sem precisar de um projeto criado."""
    s = Sessao(nav, base, "Adaptador Supabase (simulado)")
    url = "https://vinculo-teste.supabase.co"
    enviados, estado, erros_antes = [], {"renovou": False, "storage": ""}, len(erros_console)

    def snake(k):
        return re.sub(r"(?<!^)(?=[A-Z])", "_", k).lower()
    tabelas = {snake(c): [{snake(k): v for k, v in r.items() if k != "senhaHash"} for r in regs] for c, regs in DADOS.items() if not c.startswith("_")}

    def responder(route):
        req = route.request
        partes = urllib.parse.urlparse(req.url)
        if partes.path == "/auth/v1/token":
            if "refresh_token" in partes.query:
                estado["renovou"] = True
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"access_token": "tok-renovado", "refresh_token": "ref-2", "expires_in": 3600}))
            if json.loads(req.post_data or "{}").get("password") == SENHA:
                # token que vence em 30 s: o próximo pedido já precisa renová-lo
                return route.fulfill(status=200, content_type="application/json", body=json.dumps({"access_token": "tok-1", "refresh_token": "ref-1", "expires_in": 30}))
            return route.fulfill(status=400, content_type="application/json", body='{"error":"invalid_grant"}')
        if partes.path.startswith("/storage/v1/object/anexos/"):
            estado["storage"] = partes.path
            return route.fulfill(status=200, content_type="application/json", body='{"Key":"ok"}')
        if partes.path.startswith("/rest/v1/"):
            tabela = partes.path.split("/")[-1]
            if req.method == "GET":
                return route.fulfill(status=200, content_type="application/json", body=json.dumps(tabelas.get(tabela, [])))
            enviados.append({"metodo": req.method, "tabela": tabela, "corpo": json.loads(req.post_data or "null"), "autorizacao": req.headers.get("authorization")})
            if tabela == "evolucoes":  # o banco recusa com um "detalhe" que traz dados da linha
                return route.fulfill(status=400, content_type="application/json",
                                     body=json.dumps({"code": "23514", "message": "new row violates check constraint", "details": "Failing row contains (Paciente Exemplo 01, conteúdo sigiloso)"}))
            return route.fulfill(status=201 if req.method == "POST" else 204, body="")   # Prefer: return=minimal → sem corpo
        return route.fulfill(status=404, body="")
    s.ctx.route(url + "/**", responder)
    # Liga o adaptador só neste teste: troca o js/config-banco.js servido
    s.ctx.route("**/js/config-banco.js", lambda r: r.fulfill(status=200, content_type="application/javascript",
                body="var PEP = window.PEP || {}; window.PEP = PEP; PEP.configBanco = { adaptador: 'supabase', supabaseUrl: '" + url + "', supabaseChaveAnon: 'chave-anon-teste' };"))
    s.abrir("#/entrar")
    s.p.fill("#lg-usuario", "bia.estagiaria")
    s.p.fill("#lg-senha", "senha-errada-123456")
    s.p.click("#lg-entrar")
    s.p.wait_for_function("() => !document.getElementById('login-erro').hidden", timeout=15000)
    conferir("Banco (simulado)", "login errado: nada é gravado no banco 'em nome de visitante' (fica no registro do Supabase Auth)", not enviados)
    s.entrar("bia.estagiaria")
    conferir("Banco (simulado)", "login pelo Supabase Auth e dados carregados da API", s.js("location.hash") == "#/painel" and s.js("PEP.db.casos.length") == len(DADOS["casos"]))
    aceites = [e for e in enviados if e["tabela"] == "aceites"]
    auditoria = [e for e in enviados if e["tabela"] == "auditoria"]
    conferir("Banco (simulado)", "gravação aceita a resposta 201 sem corpo (Prefer: return=minimal)", aceites and s.js("location.hash") == "#/painel")
    conferir("Banco (simulado)", "data e hora vão com fuso (ISO em UTC), não como hora local solta", aceites and aceites[0]["corpo"]["em"].endswith("Z"), aceites[0]["corpo"]["em"] if aceites else "")
    conferir("Banco (simulado)", "evento de auditoria vai sem hora e sem hash (quem carimba e encadeia é o banco)",
             auditoria and all(not ({"em", "hash", "hash_anterior"} & set(e["corpo"])) for e in auditoria))
    conferir("Banco (simulado)", "token de acesso curto é renovado sozinho antes de vencer", estado["renovou"] and enviados[-1]["autorizacao"] == "Bearer tok-renovado")
    # Anexo: o caminho no Storage começa pelo caso (é o que a política confere)
    s.ir("#/caso/c01/documentos")
    s.p.set_input_files("#ax-arquivo", files=[{"name": "encaminhamento.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"}])
    s.clicar('[data-acao="anexar"]')
    s.p.wait_for_timeout(600)
    conferir("Banco (simulado)", "anexo vai para o Storage no caminho <caso>/<arquivo>", estado["storage"].startswith("/storage/v1/object/anexos/c01/arq-"), estado["storage"])
    # "Failed to load resource" é o aviso do navegador para o login errado (resposta 400), provocado acima
    inesperados = [m for _, m in erros_console[erros_antes:] if "Failed to load resource" not in m]
    conferir("Banco (simulado)", "nenhum erro de JavaScript até aqui (respostas 201 e 204 sem corpo são aceitas)", not inesperados, "; ".join(inesperados)[:200])
    # Erro do banco: o console não recebe o "detalhe" com dados da linha
    s.ir("#/caso/c01/evolucoes")
    s.clicar("details.cartao summary")
    s.p.fill("#nova-texto", "Sessão de teste. Tema, intervenção e plano para a próxima.")
    s.clicar('[data-acao="nova-evolucao"][data-modo="rascunho"]')
    s.p.wait_for_timeout(400)
    novos = erros_console[erros_antes:]
    conferir("Banco (simulado)", "erro do servidor não leva para o console o conteúdo da linha recusada",
             any("evolucoes" in m and "23514" in m for _, m in novos) and not any("sigiloso" in m or "Failing row" in m for _, m in novos), "; ".join(m for _, m in novos)[:200])
    del erros_console[erros_antes:]   # erro provocado de propósito: não conta para o teste do console
    s.fechar()


def main():
    srv, base = servidor()
    with sync_playwright() as p:
        chrome = shutil.which("google-chrome") or shutil.which("chrome")
        nav = p.chromium.launch(executable_path=chrome, args=["--no-sandbox"]) if chrome else p.chromium.launch()
        for etapa in (publico, estagiaria, supervisora, tecnica, paciente, direcao, vinculo_encerrado, inatividade, datas_relativas, celular_e_preferencias,
                      risco_e_seguranca, revisor_de_escrita, privacidade_na_tela, faltas_e_urgencia, contas, bloqueio_progressivo, rascunho_automatico,
                      adaptador_supabase):
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
