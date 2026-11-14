# Indicadores recontados por fora, datas/limites, bloqueio do link e reuso de código MFA.
from base import *
import datetime as dt

def recontar(db, perfil, uid, hoje):
    casos = db["casos"]
    if perfil == "supervisor":
        grupos = {g["id"] for g in db["grupos"] if g["supervisorId"] == uid}
        casos = [c for c in casos if c.get("grupoId") in grupos]
    ids = {c["id"] for c in casos}
    ses = [s for s in db["sessoes"] if s["casoId"] in ids]
    por = {}
    for s in ses:
        if s["presenca"] == "presente": por[s["casoId"]] = por.get(s["casoId"], 0) + 1
    at = len(por); voltaram = sum(1 for v in por.values() if v >= 2); tot = sum(por.values())
    mot, enc = {}, {}
    for e in db["encerramentos"]:
        if e["casoId"] in ids:
            if e["tipo"] == "abandono": mot[e.get("motivo") or "Não informado"] = mot.get(e.get("motivo") or "Não informado", 0) + 1
            enc[e["tipo"]] = enc.get(e["tipo"], 0) + 1
    y, m, _ = map(int, hoje.split("-")); meses = []
    for i in range(5, -1, -1):
        mm, yy = m - i, y
        while mm < 1: mm += 12; yy -= 1
        ch = f"{yy}-{mm:02d}"; dm = [s for s in ses if s["data"][:7] == ch]
        meses.append({"mes": ch, "presente": sum(s["presenca"] == "presente" for s in dm), "faltaJustificada": sum(s["presenca"] == "falta-justificada" for s in dm), "falta": sum(s["presenca"] == "falta" for s in dm)})
    fila = [i for i in db["inscricoes"] if i["status"] == "aguardando"]
    d = lambda x: dt.date.fromisoformat(x[:10])
    def js_round(x): import math; return math.floor(x + 0.5)
    av = {}
    for s in ses:
        if s.get("avisoPaciente"): av[s["motivoFalta"]] = av.get(s["motivoFalta"], 0) + 1
    # faltas seguidas por caso (recontagem própria)
    def seguidas(c):
        l = sorted([s for s in db["sessoes"] if s["casoId"] == c["id"] and s["presenca"] not in ("agendada", "cancelada")], key=lambda s: s["data"] + s["hora"]); n = 0
        for s in reversed(l):
            if s["presenca"] == "falta": n += 1
            elif s["presenca"] == "falta-justificada": continue
            else: break
        return n
    lim = db["_config"]["regras"]["faltasSeguidasLimite"]
    return {"atendidos": at, "taxaRetorno": js_round(voltaram / at * 100) if at else 0, "mediaSessoes": js_round(tot / at * 10) / 10 if at else 0,
            "emRisco": sum(1 for c in casos if c["status"] == "ativo" and seguidas(c) >= lim), "motivosAbandono": mot, "encerramentos": enc,
            "presencas": {"presente": sum(s["presenca"] == "presente" for s in ses), "falta": sum(s["presenca"] == "falta" for s in ses), "faltaJustificada": sum(s["presenca"] == "falta-justificada" for s in ses)},
            "motivosFaltaAvisada": av, "casosAtivos": sum(c["status"] == "ativo" for c in casos), "naFila": len(fila), "porMes": meses,
            "esperaMediaDias": js_round(sum((d(hoje) - d(i["data"])).days for i in fila) / len(fila)) if fila else 0}

def A_indicadores(nav, base):
    s = sessao(nav, base, "A"); s.entrar("marta.direcao")
    db = json.loads(s.js("() => JSON.stringify(PEP.db)")); hoje = s.js("() => PEP.util.hoje()")
    for uid in ["u-dir", "u-tec", "u-sup1", "u-sup2"]:
        site_ = s.js("id => PEP.regras.indicadores(PEP.util.porId(PEP.db.usuarios, id))", uid)
        meu = recontar(db, next(u["perfil"] for u in db["usuarios"] if u["id"] == uid), uid, hoje)
        dif = {k: (site_.get(k), meu[k]) for k in meu if site_.get(k) != meu[k]}
        print(uid, "IGUAL" if not dif else "DIFERENTE " + json.dumps(dif, ensure_ascii=False), "|", {k: site_[k] for k in ["atendidos", "taxaRetorno", "mediaSessoes", "emRisco", "casosAtivos", "naFila", "esperaMediaDias"]})
    print(" supervisor vê fila/espera da clínica inteira no objeto?", s.js("() => { var i = PEP.regras.indicadores(PEP.util.porId(PEP.db.usuarios,'u-sup1')); return i.naFila + ' na fila, ' + i.esperaMediaDias + ' dias'; }"))
    print(" porMes:", s.js("() => JSON.stringify(PEP.regras.indicadores(PEP.util.porId(PEP.db.usuarios,'u-dir')).porMes)"))
    print(" 'atendidos' conta casos, não pacientes: casos com presença =", len({x['casoId'] for x in db['sessoes'] if x['presenca']=='presente'}), "| pacientes distintos =", len({next(c['pacienteId'] for c in db['casos'] if c['id']==x['casoId']) for x in db['sessoes'] if x['presenca']=='presente'}))
    s.fechar()

def B_datas(nav, base):
    s = sessao(nav, base, "B"); s.abrir("#/entrar"); s.inj()
    print("hoje/agora:", s.js("() => PEP.util.hoje() + ' ' + PEP.util.agora()"), "| deslocamento:", s.js("() => PEP.db._meta.deslocamentoDias"), "| s30 (escrita como dataBase):", s.js("() => PEP.util.porId(PEP.db.sessoes,'s30').data"),
          "| nascimento p01 (não desloca):", s.js("() => PEP.db.pacientes[0].dataNascimento"))
    print("idade: faz 18 hoje / amanhã / ontem:", s.js("() => { var h = PEP.util.hoje().split('-'); var a = (Number(h[0])-18); var f = d => PEP.util.idade(PEP.util.somarDias(a + '-' + h[1] + '-' + h[2], d)); return [f(0), f(1), f(-1)]; }"),
          "| nascido 29/02/2008 hoje:", s.js("() => PEP.util.idade('2008-02-29')"))
    print("diaRelativo: hoje, amanhã, ontem, +2, ano que vem:", s.js("() => [0,1,-1,2,400].map(n => PEP.util.diaRelativo(PEP.util.somarDias(PEP.util.hoje(), n)))"), "| vazio/ruim:", s.js("() => [PEP.util.diaRelativo(''), PEP.util.diaRelativo('abc')]"))
    print("diasEntre/somarDias na virada de ano e bissexto:", s.js("() => [PEP.util.diasEntre('2027-12-31','2028-01-01'), PEP.util.somarDias('2028-02-28', 1), PEP.util.somarDias('2027-02-28', 1), PEP.util.diaDaSemana('2026-11-14')]"))
    print("guardaAte: c04 (menor, nasc. 2011-05-09):", s.js("() => PEP.regras.guardaAte(PEP.util.porId(PEP.db.casos,'c04'))"), "| c01:", s.js("() => PEP.regras.guardaAte(PEP.db.casos[0])"))
    print("guardaAte com nascimento em 29/02/2012 (menor):", s.js("() => { var p = PEP.util.porId(PEP.db.pacientes,'p04'); var o = p.dataNascimento; p.dataNascimento = '2012-02-29'; var r = PEP.regras.guardaAte(PEP.util.porId(PEP.db.casos,'c04')); p.dataNascimento = o; return r + ' -> ' + PEP.util.formatarData(r); }"))
    print("prazo 48 h (c03):", s.js("() => PEP.regras.sessoesSemEvolucao(PEP.util.porId(PEP.db.casos,'c03')).map(x => x.id + ' ' + x.data + ' ' + x.hora)"))
    print("validade do motivo (12 h): 11h59 atrás / 12h01 atrás:", s.js("() => { var u = PEP.util.porId(PEP.db.usuarios,'u-tec'), c = PEP.db.casos[0]; var f = function (min) { var d = new Date(Date.now() - min*60000), dd = n => n < 10 ? '0'+n : ''+n; PEP.db.acessosJustificados = [{usuarioId:'u-tec', casoId:'c01', em: d.getFullYear()+'-'+dd(d.getMonth()+1)+'-'+dd(d.getDate())+'T'+dd(d.getHours())+':'+dd(d.getMinutes())}]; return PEP.regras.justificativaValida(u, c); }; var r = [f(11*60+58), f(12*60+2)]; PEP.db.acessosJustificados = []; return r; }"))
    s.fechar()
    # relógio às 23h40 em São Paulo (já é o dia seguinte em UTC) e 3 dias depois com a cópia guardada
    ctx = nav.new_context(locale="pt-BR", timezone_id="America/Sao_Paulo"); p = ctx.new_page()
    p.clock.install(time=dt.datetime(2026, 11, 20, 23, 40, tzinfo=dt.timezone(dt.timedelta(hours=-3))))
    p.goto(base + "#/entrar"); p.wait_for_selector("#app h1")
    print("23h40 em SP:", p.evaluate("() => PEP.util.hoje() + ' ' + PEP.util.agora() + ' | s30=' + PEP.util.porId(PEP.db.sessoes,'s30').data + ' | idade(2008-11-20)=' + PEP.util.idade('2008-11-20') + ' | idade(2008-11-21)=' + PEP.util.idade('2008-11-21')"))
    p.clock.set_fixed_time(dt.datetime(2026, 11, 23, 10, 0, tzinfo=dt.timezone(dt.timedelta(hours=-3)))); p.reload(); p.wait_for_selector("#app h1")
    print("3 dias depois, mesma cópia no navegador:", p.evaluate("() => 'hoje=' + PEP.util.hoje() + ' | s30=' + PEP.util.porId(PEP.db.sessoes,'s30').data + ' | deslocamento guardado=' + PEP.db._meta.deslocamentoDias"))
    ctx.close()

def C_link_bloqueio(nav, base):
    s = sessao(nav, base, "C"); s.entrar("paciente01"); s.burla("solicitar-copia"); s.sair(); s.entrar("ana.tecnica")
    sid = s.js("() => PEP.db.solicitacoes[0].id"); s.burla("conferir-identidade", {"id": sid}); s.burla("gerar-link", {"id": sid}); token = s.js("() => PEP.telas._ultimoLink.url").split("#/acesso/")[1]; s.sair()
    def abrir(nasc):
        s.ir("#/acesso/" + token); s.p.wait_for_timeout(150)
        if not s.p.locator("#lk-nasc").count(): return s.h1()
        s.p.fill("#lk-nasc", nasc); s.p.click('#form-link button[type=submit]'); s.p.wait_for_timeout(250)
        e = s.p.locator("#lk-nasc-erro"); return e.inner_text() if e.count() else s.h1()
    print([abrir("2000-01-0%d" % i) for i in range(1, 6)]); print("data certa depois do bloqueio:", abrir("1997-03-14"), "| link:", s.js("() => PEP.db.linksAcesso[0].falhas + ' falhas, revogado=' + !!PEP.db.linksAcesso[0].revogadoEm"))
    # validade: 72 h e 1 minuto depois
    s.fechar()
    ctx = nav.new_context(locale="pt-BR", timezone_id="America/Sao_Paulo"); p = ctx.new_page(); p.on("dialog", lambda d: d.accept())
    t0 = dt.datetime(2026, 11, 14, 10, 0, tzinfo=dt.timezone(dt.timedelta(hours=-3))); p.clock.install(time=t0)
    p.goto(base + "#/entrar"); p.wait_for_selector("#app h1")
    tk = p.evaluate("() => { var tk = PEP.seguranca.tokenAleatorio(24); PEP.db.linksAcesso.push({id:'lk-x', solicitacaoId:'x', casoId:'c01', tokenHash: PEP.seguranca.sha256(tk), criadoEm: PEP.util.agora(), expiraEm: '2026-11-17T10:00', revogadoEm:null, acessos:0, falhas:0}); PEP.estado.salvar(); return tk; }")
    for quando, rot in [(dt.timedelta(hours=71, minutes=59), "71h59"), (dt.timedelta(hours=72), "72h00"), (dt.timedelta(hours=72, minutes=1), "72h01")]:
        p.clock.set_fixed_time(t0 + quando); p.evaluate("tk => { location.hash = '#/acesso/' + tk; PEP.app.renderizar(); }", tk); p.wait_for_timeout(150)
        print(" ", rot, "->", p.locator("#app h1").first.inner_text())
    ctx.close()

def D_mfa_reuso(nav, base):
    s = sessao(nav, base, "D"); s.entrar("caio.estagiario")
    r = s.js("""async () => {
      var u = PEP.estado.usuarioAtual(), seg = PEP.seguranca.novoSegredoMfa(), rec = PEP.seguranca.codigosRecuperacao();
      PEP.repo.atualizar('usuarios', u.id, { mfaAtivo: true, mfaSegredo: seg, mfaUltimoPasso: 0, mfaRecuperacao: rec.map(c => PEP.seguranca.sha256(c)) }); PEP.repo.salvar(); PEP.estado.sair();
      var out = [], senha = PEP.db._meta.senhaDemonstracao, cod = await PEP.seguranca.codigoTotp(seg);
      var passo = async c => { var a = await PEP.estado.autenticar('caio.estagiario', senha); if (a.motivo !== 'mfa') return 'sem 2º passo: ' + JSON.stringify(a); var meio = PEP.estado.usuarioAtual(); var b = await PEP.estado.confirmarMfa(c); var x = (b.ok ? 'ENTROU' : b.motivo) + (meio ? ' (JÁ LOGADO ANTES DO CÓDIGO!)' : ''); if (b.ok) PEP.estado.sair(); else PEP.estado.cancelarMfa(); return x; };
      out.push('código certo: ' + await passo(cod)); out.push('mesmo código de novo: ' + await passo(cod));
      out.push('recuperação: ' + await passo(rec[0])); out.push('mesma recuperação de novo: ' + await passo(rec[0])); out.push('código errado: ' + await passo('000000'));
      out.push('recuperação restantes: ' + PEP.util.porId(PEP.db.usuarios, u.id).mfaRecuperacao.length + ' (hash de ' + PEP.util.porId(PEP.db.usuarios, u.id).mfaRecuperacao[0].length + ')');
      return out; }""")
    print(r); s.fechar()

if __name__ == "__main__":
    todos = {k: v for k, v in globals().items() if callable(v) and len(k) > 2 and k[1] == "_" and k[0].isupper()}
    with site() as (nav, base):
        for k in sorted(todos):
            if not ARGS or k[0] in ARGS:
                print(f"\n########## {k} ##########")
                try: todos[k](nav, base)
                except Exception as e: print("  EXCEÇÃO DO SCRIPT:", repr(e)[:700])
