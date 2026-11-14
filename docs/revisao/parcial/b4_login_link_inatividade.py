# Login, MFA, link temporário, inatividade, busca e primeiro acesso.
from base import *
from b2_burlas import caso, ult, aud, trocar

def tentar(s, login, senha):
    s.p.fill("#lg-usuario", login); s.p.fill("#lg-senha", senha); s.p.click("#lg-entrar")
    s.p.wait_for_function("() => location.hash !== '#/entrar' || !document.getElementById('login-erro').hidden || document.getElementById('lg-codigo')", timeout=20000)
    s.p.wait_for_timeout(200)
    if s.js("location.hash") != "#/entrar": return "ENTROU " + s.js("location.hash")
    return s.p.locator("#login-erro").inner_text() if s.p.locator("#login-erro").count() else "(tela do código)"

def A_login(nav, base):
    s = sessao(nav, base, "A"); s.abrir("#/entrar"); s.inj()
    print("senha errada:", tentar(s, "bia.estagiaria", "errada-1"))
    print("usuário inexistente:", tentar(s, "nao.existe", "errada-1"))
    # conta desativada com a senha certa
    s.entrar("marta.direcao"); s.burla("alternar-conta", {"id": "u-est4"}); s.sair()
    print("conta desativada + senha certa:", tentar(s, "lia.estagiaria", t.SENHA))
    for i in range(4): r = tentar(s, "caio.estagiario", "errada-%d" % i)
    print("4 erros:", r); print("5º erro:", tentar(s, "caio.estagiario", "errada-5")); print("senha certa durante o bloqueio:", tentar(s, "caio.estagiario", t.SENHA))
    print("mesma conta pelo E-MAIL durante o bloqueio do login:", tentar(s, s.js("() => PEP.util.porId(PEP.db.usuarios,'u-est2').email"), t.SENHA))
    s.fechar()
    s = sessao(nav, base, "A2"); s.abrir("#/entrar"); s.inj()
    for i in range(5): tentar(s, "Caio.Estagiario ", "x%d" % i)
    print("variação de maiúscula/espaço conta junto?", s.js("() => localStorage.getItem('vinculo-tentativas-v2')"))
    print("auditoria das tentativas:", s.js("() => PEP.db.auditoria.slice(5).map(a => a.usuarioId + '|' + a.acao + '|' + a.alvo)"))
    print("senha digitada no campo usuário vai para a auditoria?", tentar(s, "minha-senha-secreta-123", "x"), s.js("() => PEP.db.auditoria[PEP.db.auditoria.length-1].alvo"))
    s.fechar()

def B_mfa(nav, base):
    s = sessao(nav, base, "B"); s.entrar("caio.estagiario")
    s.ir("#/conta"); s.clicar('[data-acao="mfa-iniciar"]')
    seg = s.js("() => PEP.telas._mfaNovo.segredo")
    cod = lambda d=0: s.js("([g,d]) => PEP.seguranca.codigoTotp(g, Date.now() + d*1000)", [seg, d])
    c0 = cod()
    s.p.fill("#mfa-codigo-novo", c0); s.p.click('#form-mfa button[type=submit]'); s.p.wait_for_timeout(600)
    rec = s.js("() => PEP.telas._mfaCodigos"); print("ativou:", s.toast(), "| códigos de recuperação:", len(rec or []))
    s.clicar('[data-acao="mfa-fechar-codigos"]'); s.sair()
    def passo2(c):
        r = tentar(s, "caio.estagiario", t.SENHA)
        if "tela do código" not in r: return "sem 2º passo: " + r
        s.p.fill("#lg-codigo", c); s.p.click("#lg-confirmar"); s.p.wait_for_timeout(700)
        return "ENTROU" if s.js("location.hash") != "#/entrar" else s.p.locator("#mfa-erro").inner_text()
    print("código usado na ativação serve para entrar?", passo2(c0)); s.clicar('[data-acao="cancelar-mfa"]') if s.p.locator('[data-acao="cancelar-mfa"]').count() else None
    c1 = cod(30)
    print("código do passo seguinte:", passo2(c1)); s.inj(); s.sair()
    print("mesmo código de novo:", passo2(c1)); s.clicar('[data-acao="cancelar-mfa"]') if s.p.locator('[data-acao="cancelar-mfa"]').count() else None
    print("código de recuperação:", passo2(rec[0])); s.inj(); s.sair()
    print("mesmo código de recuperação de novo:", passo2(rec[0])); s.clicar('[data-acao="cancelar-mfa"]') if s.p.locator('[data-acao="cancelar-mfa"]').count() else None
    print("guardados só como hash?", s.js("() => { var u = PEP.util.porId(PEP.db.usuarios,'u-est2'); return u.mfaRecuperacao.length + ' hashes de ' + u.mfaRecuperacao[0].length + ' caracteres; segredo em claro no localStorage: ' + (localStorage.getItem('vinculo-dados-v2').indexOf(u.mfaSegredo) !== -1); }"))
    # com a senha certa e SEM o código, alguma ação funciona?
    tentar(s, "caio.estagiario", t.SENHA); s.inj()
    print("sem o código: usuarioAtual =", s.js("() => PEP.estado.usuarioAtual()"), "| ação:", s.burla("nova-evolucao", {"caso": "c01", "modo": "rascunho"}, {"nova-texto": "texto sem segundo fator", "nova-sessao": ""})["r"][:60])
    s.fechar()

def C_link(nav, base):
    s = sessao(nav, base, "C"); s.entrar("paciente04x") if False else None
    s.entrar("ana.tecnica")
    # pedido de cópia do caso c04 (menor): cria pela conta do paciente? não há conta; cria portal p04 e pede
    print("portal p04:", s.burla("criar-acesso-portal", {"id": "p04"}, espera=2500)["toast2"]); senha = s.js("() => PEP.telas._senhaGerada && PEP.telas._senhaGerada.senha"); login = s.js("() => PEP.telas._senhaGerada.login")
    s.sair(); s.abrir("#/entrar"); print(" entra paciente04:", tentar(s, login, senha))
    nova = "uma frase bem comprida 2026"
    s.p.fill("#ts-atual", senha); s.p.fill("#ts-nova", nova); s.p.fill("#ts-confirma", nova); s.p.click('#form-senha button[type=submit]'); s.p.wait_for_timeout(2500)
    if s.js("location.hash") == "#/termo": s.p.check("#tm-ok"); s.clicar('[data-acao="aceitar-termo"]')
    s.inj(); print(" pedir cópia:", s.burla("solicitar-copia")["toast2"])
    s.ir("#/meus-dados"); txt = s.texto(); print(" menor vê motivo da técnica em 'quem acessou'?", "Motivo:" in txt)
    s.ir("#/meu-plano"); print(" meu plano (p04):", s.texto().replace("\n", " ")[:120])
    trocar(s, "ana.tecnica")
    sid = s.js("() => PEP.db.solicitacoes[0].id"); s.burla("conferir-identidade", {"id": sid}); print(" gerar-link:", s.burla("gerar-link", {"id": sid})["toast2"])
    url = s.js("() => PEP.telas._ultimoLink.url"); token = url.split("#/acesso/")[1]
    print(" link guarda só hash:", s.js("() => Object.keys(PEP.db.linksAcesso[0]).join(',')"), "| expira:", s.js("() => PEP.db.linksAcesso[0].criadoEm + ' -> ' + PEP.db.linksAcesso[0].expiraEm"))
    s.sair()
    def abrir(tk, nasc):
        s.ir("#/acesso/" + tk); s.p.wait_for_timeout(200)
        if not s.p.locator("#lk-nasc").count(): return s.h1()
        s.p.fill("#lk-nasc", nasc); s.p.click('#form-link button[type=submit]'); s.p.wait_for_timeout(300)
        e = s.p.locator("#lk-nasc-erro"); return e.inner_text() if e.count() else s.h1()
    print(" token errado:", abrir("abc", "2011-05-09"))
    print(" data errada:", abrir(token, "2011-05-10"))
    print(" data certa:", abrir(token, "2011-05-09"))
    copia = s.texto()
    print(" cópia do menor: tem 'agressão'?", "agress" in copia.lower(), "| tem 'Conselho'?", "conselho" in copia.lower(), "| tem 'Notificação'?", "Notificação" in copia, "| tem orientação de supervisão?", "Registro de supervisão." in copia, "| avaliação?", "Instrumento" in copia)
    print("   trecho risco:", copia[copia.find("Avaliações de risco"):][:200].replace("\n", " ") if "Avaliações de risco" in copia else "(sem seção de risco)")
    print("   evoluções na cópia citam violência?", [l[:140] for l in copia.split("\n") if "agress" in l.lower() or "violên" in l.lower()])
    # outro token na mesma aba mantém liberado? e recarregar
    s.ir("#/acesso/outro"); print(" outro token depois de liberar:", s.h1()); s.ir("#/acesso/" + token); print(" volta ao token: pede a data de novo?", s.p.locator("#lk-nasc").count() == 1)
    for i in range(5): r = abrir(token, "2000-01-0%d" % (i + 1))
    print(" 5 datas erradas:", r, "| link:", s.js("() => JSON.stringify(PEP.db.linksAcesso[0])")[150:330]); print(" depois do bloqueio, data certa:", abrir(token, "2011-05-09"))
    print(" auditoria:", s.js("() => PEP.db.auditoria.slice(-8).map(a => a.usuarioId + '|' + a.acao + '|' + a.alvo)"))
    # validade: fronteira da comparação (texto AAAA-MM-DDTHH:MM)
    print(" expiraEm == agora ainda vale?", s.js("() => { var l = PEP.db.linksAcesso[0]; var a = PEP.util.agora(); return (a >= a) + ' (tela usa >=; formulário recusa só se expiraEm < agora)'; }"))
    s.fechar()

def D_inatividade(nav, base):
    s = sessao(nav, base, "D"); s.entrar("bia.estagiaria")
    s.ir("#/caso/c01/evolucoes")
    s.p.locator("details.cartao summary").first.click(); s.p.fill("#nova-texto", "Texto novo de evolução que estava sendo digitado.")
    s.p.locator("#resumo-transferencia summary").click(); s.p.fill("#nova-transf", "RESUMO DE TRANSFERÊNCIA NOVO que estava sendo digitado, ainda não salvo.")
    s.p.fill("#ev-e04", "Rascunho e04 alterado e ainda não salvo.")
    n0 = s.js("() => PEP.db.evolucoes.length")
    s.js("() => { var x = JSON.parse(sessionStorage.getItem('vinculo-sessao-v2')); x.ultimoUso = Date.now() - (14*60+15)*1000; sessionStorage.setItem('vinculo-sessao-v2', JSON.stringify(x)); }")
    s.p.wait_for_timeout(6500)
    print("aviso visível:", s.js("() => !document.getElementById('aviso-sessao').hidden"), s.js("() => document.getElementById('aviso-sessao-texto').textContent"))
    print(" evoluções:", n0, "->", s.js("() => PEP.db.evolucoes.length"), "| novos:", s.js("n => PEP.db.evolucoes.slice(n).map(e => e.status + ':' + (e.tipo||'SEM TIPO') + ':' + e.texto.slice(0,40))", n0), "| e04:", s.js("() => PEP.util.porId(PEP.db.evolucoes,'e04').texto"))
    print(" texto do resumo ainda no campo depois do redesenho?", s.js("() => (document.getElementById('nova-transf')||{}).value || '(campo sumiu ou vazio)'")[:60])
    s.js("() => { var x = JSON.parse(sessionStorage.getItem('vinculo-sessao-v2')); x.ultimoUso = Date.now() - (15*60+5)*1000; sessionStorage.setItem('vinculo-sessao-v2', JSON.stringify(x)); }")
    s.p.wait_for_timeout(6500)
    print(" depois de 15 min:", s.js("location.hash"), "|", s.texto().replace("\n", " ")[130:260], "| aud:", s.js("() => PEP.db.auditoria.slice(-3).map(a => a.usuarioId + '|' + a.acao + '|' + a.alvo)"))
    # outros textos em edição (anamnese, risco, plano, documento) não viram rascunho: registrar o que acontece
    s.fechar()

def E_busca(nav, base):
    s = sessao(nav, base, "E"); s.entrar("bia.estagiaria")
    s.ir("#/busca"); s.p.fill("#busca-paciente", "Paciente Exemplo 01"); s.p.click('.busca-pagina button'); s.p.wait_for_timeout(300)
    print("bia busca o próprio:", s.js("location.href").split("#")[1], "|", s.p.locator('[role=status]').first.inner_text())
    s.p.fill("#busca-paciente", "Exemplo"); s.p.click('.busca-pagina button'); s.p.wait_for_timeout(300); print(" 'Exemplo':", [x for x in s.p.locator(".lista-busca li").all_inner_texts()])
    s.p.fill("#busca-paciente", "c04"); s.p.click('.busca-pagina button'); s.p.wait_for_timeout(300); print(" 'c04' (caso alheio):", s.p.locator('[role=status]').first.inner_text())
    s.p.fill("#busca-paciente", "Pessoa Inscrita"); s.p.click('.busca-pagina button'); s.p.wait_for_timeout(300); print(" fila pela estagiária:", s.p.locator('[role=status]').first.inner_text())
    s.p.fill("#busca-paciente", "Paciente Exemplo 01"); s.p.click('.busca-pagina button'); s.p.wait_for_timeout(300)
    print(" histórico do navegador tem o termo?", "Exemplo" in s.js("location.href"))
    s.sair(); s.entrar("duda.estagiaria"); s.ir("#/busca")
    print(" OUTRA pessoa entra na mesma aba e abre Buscar: campo vem com:", repr(s.p.input_value("#busca-paciente")), "|", s.texto().replace("\n", " ")[40:170])
    s.sair(); s.entrar("ana.tecnica"); s.ir("#/busca"); s.p.fill("#busca-paciente", "Pessoa"); s.p.click('.busca-pagina button'); s.p.wait_for_timeout(300); print(" técnica 'Pessoa':", s.p.locator('[role=status]').first.inner_text())
    s.fechar()

def F_primeiro_acesso(nav, base):
    s = sessao(nav, base, "F"); s.entrar("bia.estagiaria", aceitar=False); s.inj()
    print("bia sem aceitar o termo:", s.js("location.hash"), "| pendência:", s.js("() => PEP.estado.pendenciaDeAcesso(PEP.estado.usuarioAtual())"))
    for rota in ["#/caso/c01/evolucoes", "#/casos", "#/conta", "#/busca"]:
        s.ir(rota); print("  rota", rota, "->", s.js("location.hash"))
    r = s.burla("nova-evolucao", {"caso": "c01", "modo": "enviar"}, {"nova-texto": "Evolução gravada sem aceitar o termo de sigilo.", "nova-sessao": ""})
    print(" ação direta sem o termo:", r["toast"] or r["toast2"], "| gravou:", s.js("() => PEP.db.evolucoes[PEP.db.evolucoes.length-1].texto.slice(0,40)"))
    print(" aceitar termo inventado:", s.burla("aceitar-termo", {"termo": "qualquer"}, {"tm-ok": {"check": True}})["toast2"], ult(s, "aceites")[:150], "| pendência continua:", s.js("() => PEP.estado.pendenciaDeAcesso(PEP.estado.usuarioAtual())"))
    s.sair()
    # senha provisória: ações antes de trocar
    s.entrar("marta.direcao"); s.burla("gerar-senha-provisoria", {"id": "u-est3"}, espera=2500); senha = s.js("() => PEP.telas._senhaGerada.senha"); s.sair()
    s.abrir("#/entrar"); print(" duda com provisória:", tentar(s, "duda.estagiaria", senha), "| senha antiga ainda entra?", end=" ")
    s.inj(); r = s.burla("registrar-presenca", {"id": "s12", "valor": "falta-justificada"}); print("(ação direta com senha provisória:", r["toast"] or r["toast2"], ")")
    s.sair() if s.p.locator('[data-acao="sair"]').count() else None
    s.abrir("#/entrar"); print(tentar(s, "duda.estagiaria", t.SENHA))
    s.fechar()

if __name__ == "__main__":
    todos = {k: v for k, v in globals().items() if callable(v) and len(k) > 2 and k[1] == "_" and k[0].isupper()}
    quais = ARGS or sorted(todos)
    with site() as (nav, base):
        for k in sorted(todos):
            if k[0] in quais or k in quais:
                print(f"\n########## {k} ##########")
                try: todos[k](nav, base)
                except Exception as e: print("  EXCEÇÃO DO SCRIPT:", repr(e)[:600])
