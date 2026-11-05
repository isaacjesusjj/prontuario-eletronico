"""Validador do arquivo dados/dados-iniciais.json do Vínculo.
Confere sintaxe, ids únicos, referências entre coleções (como chaves estrangeiras)
e regras do prontuário (ex.: evolução validada tem assinatura do estagiário e do supervisor).
Uso, na pasta do projeto:  python ferramentas/validar_json.py  [arquivo.json]  [AAAA-MM-DD]
"""
import json
import re
import sys
from collections import Counter
from datetime import date, datetime, timedelta

caminho = sys.argv[1] if len(sys.argv) > 1 else "dados/dados-iniciais.json"
hoje = date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else date.today()
problemas, avisos = [], []


def p(msg):
    problemas.append(msg)


def a(msg):
    avisos.append(msg)


with open(caminho, encoding="utf-8") as f:
    texto = f.read()
try:
    db = json.loads(texto)
except json.JSONDecodeError as e:
    print("JSON INVÁLIDO:", e)
    sys.exit(2)

if texto.startswith("﻿"):
    p("arquivo começa com BOM (pode quebrar leitores)")

ESPERADAS = ["usuarios", "grupos", "estagiariosSemGrupo", "pacientes", "inscricoes", "casos", "sessoes",
             "evolucoes", "orientacoes", "documentos", "anexos", "avaliacoes", "contatos", "solicitacoes", "auditoria"]
for k in ESPERADAS:
    if k not in db:
        p(f"coleção ausente: {k}")
for k in db:
    if k not in ESPERADAS and not k.startswith("_"):
        a(f"coleção não usada pelo código: {k}")

RE_DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RE_DH = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")
RE_HORA = re.compile(r"^\d{2}:\d{2}$")


def data_ok(v, onde, campo, dh=False):
    if not isinstance(v, str) or not (RE_DH if dh else RE_DATA).match(v):
        p(f"{onde}: {campo} fora do formato ({v!r})")
        return None
    try:
        return datetime.fromisoformat(v) if dh else date.fromisoformat(v)
    except ValueError:
        p(f"{onde}: {campo} é data impossível ({v!r})")
        return None


# ids únicos (globalmente, porque a auditoria aponta "alvo" por id)
todos = Counter()
for k in ESPERADAS:
    for item in db.get(k, []):
        if isinstance(item, dict) and "id" in item:
            todos[item["id"]] += 1
for g in db.get("grupos", []):
    for s in g.get("subgrupos", []):
        todos[s["id"]] += 1
for i, n in todos.items():
    if n > 1:
        p(f"id repetido: {i} ({n}x)")

U = {u["id"]: u for u in db["usuarios"]}
P = {x["id"]: x for x in db["pacientes"]}
C = {x["id"]: x for x in db["casos"]}
S = {x["id"]: x for x in db["sessoes"]}
G = {x["id"]: x for x in db["grupos"]}
SUB = {s["id"]: (g["id"], s) for g in db["grupos"] for s in g["subgrupos"]}

PERFIS = {"tecnico", "supervisor", "estagiario", "paciente", "direcao"}
logins = Counter()
for u in db["usuarios"]:
    if u.get("perfil") not in PERFIS:
        p(f"usuário {u['id']}: perfil inválido {u.get('perfil')!r}")
    for campo in ("nome", "descricao"):
        if not u.get(campo):
            p(f"usuário {u['id']}: {campo} vazio")
    if u.get("perfil") in ("tecnico", "supervisor") and not u.get("crp"):
        a(f"usuário {u['id']}: psicólogo sem CRP")
    if u.get("perfil") == "paciente" and u.get("pacienteId") not in P:
        p(f"usuário {u['id']}: pacienteId inexistente")
    if "login" in u:
        logins[u["login"].lower()] += 1
for l, n in logins.items():
    if n > 1:
        p(f"login repetido: {l}")
if logins and len(logins) != len(db["usuarios"]):
    p("nem todos os usuários têm login")

# grupos
vistos = Counter()
for g in db["grupos"]:
    sup = U.get(g.get("supervisorId"))
    if not sup or sup["perfil"] != "supervisor":
        p(f"grupo {g['id']}: supervisorId não é supervisor")
    elif g["nome"] not in sup["descricao"]:
        a(f"grupo {g['id']}: descrição do supervisor não cita {g['nome']}")
    for s in g["subgrupos"]:
        if not 2 <= len(s["estagiarios"]) <= 3:
            a(f"{g['id']}/{s['id']}: {len(s['estagiarios'])} estagiários (esperado dupla ou trio)")
        for e in s["estagiarios"]:
            vistos[e] += 1
            eu = U.get(e)
            if not eu or eu["perfil"] != "estagiario":
                p(f"{g['id']}/{s['id']}: {e} não é estagiário")
            elif g["nome"] not in eu["descricao"] or s["nome"] not in eu["descricao"]:
                p(f"usuário {e}: descrição ({eu['descricao']!r}) não bate com {g['nome']}, {s['nome']}")
    nest = sum(len(s["estagiarios"]) for s in g["subgrupos"]) + len(g.get("semDupla", []))
    if nest > 10:
        p(f"grupo {g['id']}: {nest} estagiários (Res. CFP 05/2025: até 10 por orientação grupal)")
for e, n in vistos.items():
    if n > 1:
        p(f"estagiário {e} em mais de um subgrupo")
for e in db["estagiariosSemGrupo"]:
    if e in vistos:
        p(f"{e} está sem grupo e também num subgrupo")
for u in db["usuarios"]:
    if u["perfil"] == "estagiario" and u["id"] not in vistos and u["id"] not in db["estagiariosSemGrupo"]:
        p(f"estagiário {u['id']} não está em grupo nem na lista sem grupo")


def estagiarios_do_caso(c):
    if not c.get("subgrupoId") or c["subgrupoId"] not in SUB:
        return []
    return SUB[c["subgrupoId"]][1]["estagiarios"]


def supervisor_do_caso(c):
    return G[c["grupoId"]]["supervisorId"] if c.get("grupoId") in G else None


# pacientes e inscrições
for x in db["pacientes"]:
    if not isinstance(x.get("idade"), int):
        p(f"paciente {x['id']}: idade não numérica")
    elif x["idade"] < 18 and not x.get("responsavel"):
        p(f"paciente {x['id']}: menor de idade sem responsável")
    if "fictício" not in x.get("contato", ""):
        a(f"paciente {x['id']}: contato sem marca de fictício")
CAMPOS_INSC = {"id", "nome", "idade", "contato", "responsavel", "resumo", "periodo", "data", "status"}
for i in db["inscricoes"]:
    falta = CAMPOS_INSC - set(i)
    if falta:
        a(f"inscrição {i['id']}: campos ausentes {sorted(falta)} (o formulário grava todos)")
    if i.get("idade", 99) < 18 and not i.get("responsavel"):
        p(f"inscrição {i['id']}: menor de idade sem nome do responsável")
    if i.get("status") not in ("aguardando", "triada", "encaminhado-externo"):
        p(f"inscrição {i['id']}: status inválido")
    d = data_ok(i.get("data"), f"inscrição {i['id']}", "data")
    if d and d > hoje:
        p(f"inscrição {i['id']}: data no futuro")

# casos
STATUS_CASO = {"ativo", "encerrado", "aguardando-alocacao"}
for c in db["casos"]:
    onde = f"caso {c['id']}"
    if c["pacienteId"] not in P:
        p(f"{onde}: pacienteId inexistente")
    if c["status"] not in STATUS_CASO:
        p(f"{onde}: status inválido")
    if c["status"] == "aguardando-alocacao":
        if c.get("grupoId") or c.get("subgrupoId"):
            p(f"{onde}: aguardando alocação mas tem grupo")
    else:
        if c.get("grupoId") not in G:
            p(f"{onde}: grupoId inválido")
        if c.get("subgrupoId") and SUB.get(c["subgrupoId"], (None,))[0] != c.get("grupoId"):
            p(f"{onde}: subgrupo não pertence ao grupo")
    ini = data_ok(c.get("inicio"), onde, "inicio")
    if c["status"] == "encerrado":
        enc = c.get("encerramento")
        if not enc:
            p(f"{onde}: encerrado sem dados de encerramento")
        else:
            de = data_ok(enc.get("data"), onde, "encerramento.data")
            if enc.get("tipo") not in ("alta", "abandono", "encaminhamento"):
                p(f"{onde}: tipo de encerramento inválido")
            ses = sorted(s["data"] for s in db["sessoes"] if s["casoId"] == c["id"])
            if de and ses and (de - date.fromisoformat(ses[-1])).days > 35:
                a(f"{onde}: encerrado em {de} mas a última sessão foi {ses[-1]} ({(de - date.fromisoformat(ses[-1])).days} dias)")
            if enc.get("tipo") == "abandono" and not [x for x in db["contatos"] if x["casoId"] == c["id"]]:
                p(f"{onde}: abandono sem tentativa de contato registrada")
    elif c.get("encerramento"):
        p(f"{onde}: tem encerramento mas não está encerrado")
    if ini and c["status"] != "aguardando-alocacao":
        primeiras = sorted(s["data"] for s in db["sessoes"] if s["casoId"] == c["id"])
        if primeiras and primeiras[0] != c["inicio"]:
            a(f"{onde}: início {c['inicio']} difere da 1ª sessão {primeiras[0]}")
    for k in ("contrato", "supervisaoGrupo", "gravacao", "ensinoAnonimo"):
        if not isinstance(c.get("consentimentos", {}).get(k), bool):
            p(f"{onde}: consentimento {k} ausente ou não booleano")
    if c["status"] == "ativo" and not c["consentimentos"]["contrato"]:
        p(f"{onde}: ativo sem contrato terapêutico")

# sessões
PRES = {"presente", "falta", "falta-justificada", "agendada"}
horarios = Counter()
for s in db["sessoes"]:
    onde = f"sessão {s['id']}"
    c = C.get(s["casoId"])
    if not c:
        p(f"{onde}: casoId inexistente")
        continue
    if s["presenca"] not in PRES:
        p(f"{onde}: presença inválida")
    d = data_ok(s.get("data"), onde, "data")
    if not RE_HORA.match(s.get("hora", "")):
        p(f"{onde}: hora inválida")
    if d:
        if s["presenca"] == "agendada":
            if "confirmada" not in s:
                a(f"{onde}: agendada sem campo confirmada")
            if d < hoje:
                a(f"{onde}: agendada para {d}, já passou em {hoje} (some das 'Próximas sessões')")
        elif d > hoje:
            p(f"{onde}: presença registrada numa data futura ({d})")
        if c.get("inicio") and d < date.fromisoformat(c["inicio"]):
            p(f"{onde}: antes do início do caso")
        if c["status"] == "encerrado" and c.get("encerramento") and d > date.fromisoformat(c["encerramento"]["data"]):
            p(f"{onde}: depois do encerramento do caso")
    # conflito de agenda da mesma dupla/trio
    if c.get("subgrupoId"):
        horarios[(c["subgrupoId"], s["data"], s["hora"])] += 1
for k, n in horarios.items():
    if n > 1:
        p(f"conflito de agenda: {k[0]} tem {n} sessões em {k[1]} {k[2]}")

# evoluções
STATUS_EV = {"rascunho", "enviada", "devolvida", "validada"}
for e in db["evolucoes"]:
    onde = f"evolução {e['id']}"
    c = C.get(e["casoId"])
    if not c:
        p(f"{onde}: casoId inexistente")
        continue
    if e["status"] not in STATUS_EV:
        p(f"{onde}: status inválido")
    if e["autorId"] not in estagiarios_do_caso(c):
        p(f"{onde}: autor {e['autorId']} não é estagiário do caso")
    data_ok(e.get("data"), onde, "data")
    if e.get("sessaoId"):
        s = S.get(e["sessaoId"])
        if not s:
            p(f"{onde}: sessaoId inexistente")
        elif s["casoId"] != e["casoId"]:
            p(f"{onde}: sessão de outro caso")
        elif s["presenca"] != "presente":
            p(f"{onde}: sessão sem presença ({s['presenca']})")
        elif s["data"] != e["data"]:
            a(f"{onde}: data {e['data']} difere da sessão {s['data']}")
    assin = [x["usuarioId"] for x in e.get("assinaturas", [])]
    for x in e.get("assinaturas", []):
        data_ok(x.get("em"), onde, "assinatura.em", dh=True)
    sup = supervisor_do_caso(c)
    if e["status"] == "rascunho" and assin:
        p(f"{onde}: rascunho com assinatura")
    if e["status"] == "enviada" and assin != [e["autorId"]]:
        p(f"{onde}: enviada deveria ter só a assinatura do autor")
    if e["status"] == "devolvida":
        if assin:
            p(f"{onde}: devolvida com assinatura (o código apaga as assinaturas ao devolver)")
        if not e.get("comentarioSupervisor"):
            p(f"{onde}: devolvida sem comentário do supervisor")
    if e["status"] == "validada" and (len(assin) != 2 or assin[0] != e["autorId"] or assin[1] != sup):
        p(f"{onde}: validada deveria ter assinatura do autor e do supervisor do caso ({sup})")
    if e["status"] != "validada" and e.get("adendos"):
        p(f"{onde}: adendo em evolução não validada")
    for ad in e.get("adendos", []):
        if ad["autorId"] not in estagiarios_do_caso(c) + [sup]:
            p(f"{onde}: adendo de quem não é da equipe")
        data_ok(ad.get("em"), onde, "adendo.em", dh=True)
# sessões com presença sem evolução
com_evo = {e.get("sessaoId") for e in db["evolucoes"]}
for s in db["sessoes"]:
    if s["presenca"] == "presente" and s["id"] not in com_evo:
        c = C[s["casoId"]]
        (a if c["status"] == "ativo" else p)(f"sessão {s['id']} ({c['id']}, {c['status']}) com presença e sem evolução")

# demais coleções
for o in db["orientacoes"]:
    c = C.get(o["casoId"])
    if not c or supervisor_do_caso(c) != o["supervisorId"]:
        p(f"orientação {o['id']}: supervisor não é o do caso")
for d in db["documentos"]:
    c = C.get(d["casoId"])
    if not c:
        p(f"documento {d['id']}: casoId inexistente")
        continue
    if d["autorId"] not in estagiarios_do_caso(c) or d["autorId"] not in d["assinadoPor"]:
        p(f"documento {d['id']}: autor não é estagiário do caso ou não assinou")
    for k in ("finalidade", "destinatario", "emitidoEm"):
        if not d.get(k):
            p(f"documento {d['id']}: {k} vazio (Res. CFP 05/2025, art. 12, VI)")
for x in db["anexos"]:
    if x["casoId"] not in C or x["enviadoPor"] not in U:
        p(f"anexo {x['id']}: referência inválida")
for x in db["avaliacoes"]:
    c = C.get(x["casoId"])
    if not c or x["aplicadoPor"] not in estagiarios_do_caso(c) + [supervisor_do_caso(c)]:
        p(f"avaliação {x['id']}: aplicador não é da equipe do caso")
MOTIVOS = {"", "Horário incompatível", "Transporte ou distância", "Melhora percebida",
           "Não se adaptou ao atendimento", "Trabalho ou questão financeira", "Outro"}
for x in db["contatos"]:
    c = C.get(x["casoId"])
    if not c or x["registradoPor"] not in estagiarios_do_caso(c) + [supervisor_do_caso(c), "u-tec"]:
        p(f"contato {x['id']}: quem registrou não é da equipe")
    if x.get("motivo") not in MOTIVOS:
        p(f"contato {x['id']}: motivo {x['motivo']!r} fora da lista da tela (separa o indicador em duas barras)")
for c in db["casos"]:
    enc = c.get("encerramento")
    if enc and enc["tipo"] == "abandono" and enc["motivo"] not in MOTIVOS:
        p(f"caso {c['id']}: motivo de abandono {enc['motivo']!r} fora da lista da tela (indicador duplicado)")
for x in db["solicitacoes"]:
    if x["pacienteId"] not in P or x["casoId"] not in C:
        p(f"solicitação {x['id']}: referência inválida")
for x in db["auditoria"]:
    if x["usuarioId"] not in U and x["usuarioId"] != "visitante":
        p(f"auditoria {x['id']}: usuário inexistente")
    data_ok(x.get("em"), f"auditoria {x['id']}", "em", dh=True)

# pacientes sem caso / casos sem paciente
for pid in P:
    if not any(c["pacienteId"] == pid for c in db["casos"]):
        a(f"paciente {pid} sem caso")
for u in db["usuarios"]:
    if u["perfil"] == "paciente":
        if not any(c["pacienteId"] == u["pacienteId"] and c["status"] == "ativo" for c in db["casos"]):
            a(f"usuário paciente {u['id']} sem caso ativo")

# próximos atendimentos por caso ativo
for c in db["casos"]:
    if c["status"] == "ativo":
        fut = [s for s in db["sessoes"] if s["casoId"] == c["id"] and s["presenca"] == "agendada" and date.fromisoformat(s["data"]) >= hoje]
        if not fut:
            a(f"caso ativo {c['id']} sem sessão futura em {hoje}")

print(f"Data de referência: {hoje}")
print(f"\nPROBLEMAS ({len(problemas)}):")
for x in problemas:
    print("  -", x)
print(f"\nAVISOS ({len(avisos)}):")
for x in avisos:
    print("  -", x)
sys.exit(1 if problemas else 0)
