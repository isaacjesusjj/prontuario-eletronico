"""Validador do arquivo dados/dados-iniciais.json do Vínculo.

Confere o que o banco também vai conferir (banco/schema.sql), antes de migrar:
sintaxe, ids únicos, chaves estrangeiras entre coleções, valores das listas fechadas,
CPF (dígitos verificadores e repetição), telefones, datas, senhas só como hash e
regras do prontuário (assinaturas, consentimentos, abandono, vínculo de estágio).

Uso, na pasta do projeto:  python ferramentas/validar_json.py  [arquivo.json]
"""
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date

caminho = sys.argv[1] if len(sys.argv) > 1 else "dados/dados-iniciais.json"
problemas, avisos = [], []
p, a = problemas.append, avisos.append

with open(caminho, encoding="utf-8") as f:
    texto = f.read()
try:
    db = json.loads(texto)
except json.JSONDecodeError as e:
    sys.exit(f"JSON INVÁLIDO: {e}")

COLECOES = ["usuarios", "grupos", "subgrupos", "alocacoes", "pacientes", "inscricoes", "casos", "anamneses", "consentimentos",
            "encerramentos", "sessoes", "evolucoes", "assinaturas", "adendos", "orientacoes", "documentos", "anexos", "avaliacoes",
            "riscos", "notificacoes", "planosSeguranca", "contatos", "lembretes", "solicitacoes", "linksAcesso", "pedidosTitular", "aceites", "acessosJustificados", "transferencias", "auditoria"]
for c in COLECOES:
    if c not in db:
        p(f"coleção ausente: {c}")
for c in db:
    if not c.startswith("_") and c not in COLECOES:
        p(f"coleção sem tabela no banco: {c}")
for k in ("_meta", "_config"):
    if k not in db:
        p(f"seção ausente: {k}")
cfg = db.get("_config", {})
for k in ("regras", "listas", "termos", "instituicao", "demo"):
    if k not in cfg:
        p(f"_config sem {k}")

RE_DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RE_DH = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")


def data_ok(v, onde, dh=False, vazio=False):
    if vazio and v in (None, ""):
        return True
    if not isinstance(v, str) or not (RE_DH if dh else RE_DATA).match(v):
        p(f"{onde}: data fora do formato ({v!r})")
        return False
    try:
        date.fromisoformat(v[:10])
    except ValueError:
        p(f"{onde}: data impossível ({v!r})")
        return False
    return True


def cpf_valido(c):
    if not re.fullmatch(r"\d{11}", c or "") or len(set(c)) == 1:
        return False
    for t in (9, 10):
        d = (sum(int(c[i]) * (t + 1 - i) for i in range(t)) * 10) % 11
        if (0 if d == 10 else d) != int(c[t]):
            return False
    return True


# ---------- ids únicos e índices ----------
todos = Counter(x["id"] for c in COLECOES for x in db.get(c, []) if isinstance(x, dict) and "id" in x)
for i, n in todos.items():
    if n > 1:
        p(f"id repetido: {i} ({n}x)")
IDX = {c: {x["id"]: x for x in db.get(c, [])} for c in COLECOES}
U, P, C, S, G, SUB, E = (IDX[k] for k in ("usuarios", "pacientes", "casos", "sessoes", "grupos", "subgrupos", "evolucoes"))


def fk(colecao, campo, destino, nulo=False):
    for x in db.get(colecao, []):
        v = x.get(campo)
        if v is None and nulo:
            continue
        if v not in IDX[destino]:
            p(f"{colecao} {x.get('id')}: {campo}={v!r} não existe em {destino}")


for col, campo, dest, nulo in [
    ("usuarios", "pacienteId", "pacientes", True), ("grupos", "supervisorId", "usuarios", False), ("subgrupos", "grupoId", "grupos", False),
    ("alocacoes", "estagiarioId", "usuarios", False), ("alocacoes", "grupoId", "grupos", False), ("alocacoes", "subgrupoId", "subgrupos", True),
    ("casos", "pacienteId", "pacientes", False), ("casos", "grupoId", "grupos", True), ("casos", "subgrupoId", "subgrupos", True),
    ("inscricoes", "casoId", "casos", True), ("anamneses", "casoId", "casos", False), ("anamneses", "autorId", "usuarios", False),
    ("consentimentos", "casoId", "casos", False), ("consentimentos", "registradoPor", "usuarios", False), ("encerramentos", "casoId", "casos", False),
    ("sessoes", "casoId", "casos", False), ("evolucoes", "casoId", "casos", False), ("evolucoes", "sessaoId", "sessoes", True),
    ("evolucoes", "autorId", "usuarios", False), ("assinaturas", "usuarioId", "usuarios", False), ("adendos", "evolucaoId", "evolucoes", False),
    ("orientacoes", "casoId", "casos", False), ("documentos", "casoId", "casos", False), ("anexos", "casoId", "casos", False),
    ("avaliacoes", "casoId", "casos", False), ("contatos", "casoId", "casos", False), ("lembretes", "sessaoId", "sessoes", False),
    ("solicitacoes", "pacienteId", "pacientes", False), ("solicitacoes", "casoId", "casos", False), ("linksAcesso", "casoId", "casos", False),
    ("aceites", "usuarioId", "usuarios", False), ("riscos", "casoId", "casos", False), ("riscos", "registradoPor", "usuarios", False),
    ("riscos", "cienciaPor", "usuarios", True), ("riscos", "encerradoPor", "usuarios", True), ("notificacoes", "riscoId", "riscos", False),
    ("notificacoes", "casoId", "casos", False), ("notificacoes", "registradoPor", "usuarios", False),
    ("planosSeguranca", "casoId", "casos", False), ("planosSeguranca", "autorId", "usuarios", False),
    ("acessosJustificados", "usuarioId", "usuarios", False), ("acessosJustificados", "casoId", "casos", False),
    ("transferencias", "casoId", "casos", False), ("transferencias", "deGrupoId", "grupos", True), ("transferencias", "deSubgrupoId", "subgrupos", True),
    ("transferencias", "paraGrupoId", "grupos", False), ("transferencias", "paraSubgrupoId", "subgrupos", False),
    ("transferencias", "resumoId", "evolucoes", True), ("transferencias", "registradoPor", "usuarios", False)]:
    fk(col, campo, dest, nulo)

# ---------- usuários e senhas ----------
PERFIS = set(cfg.get("listas", {}).get("perfis", {}))
logins, emails = Counter(), Counter()
for u in db["usuarios"]:
    onde = f"usuário {u['id']}"
    if u["perfil"] not in PERFIS:
        p(f"{onde}: perfil inválido")
    if "senha" in u:
        p(f"{onde}: senha em texto (só pode existir senhaHash)")
    if not str(u.get("senhaHash", "")).startswith("pbkdf2-sha256$"):
        p(f"{onde}: senhaHash fora do formato pbkdf2-sha256$iterações$sal$hash")
    if u.get("mfaAtivo") and not u.get("mfaSegredo"):
        p(f"{onde}: verificação em duas etapas ativa sem segredo")
    if (u["perfil"] == "paciente") != bool(u.get("pacienteId")):
        p(f"{onde}: só paciente tem pacienteId")
    if u["perfil"] in ("tecnico", "supervisor") and not u.get("crp"):
        p(f"{onde}: psicólogo sem CRP")
    if u["perfil"] != "paciente" and not u.get("nome"):
        p(f"{onde}: sem nome")
    if u["perfil"] == "paciente" and u.get("nome"):
        a(f"{onde}: nome do paciente repetido em usuarios (fica só em pacientes)")
    logins[u["login"].lower()] += 1
    emails[u["email"].lower()] += 1
for l, n in list(logins.items()) + list(emails.items()):
    if n > 1:
        p(f"login ou e-mail repetido: {l}")

# ---------- alocações (vínculo de estágio) ----------
hoje = date.today().isoformat()
ativas = defaultdict(list)
for al in db["alocacoes"]:
    if U.get(al["estagiarioId"], {}).get("perfil") != "estagiario":
        p(f"alocação {al['id']}: não é estagiário")
    if al.get("subgrupoId") and SUB[al["subgrupoId"]]["grupoId"] != al["grupoId"]:
        p(f"alocação {al['id']}: dupla de outro grupo")
    if not al.get("fim"):
        ativas[al["estagiarioId"]].append(al)
for e, l in ativas.items():
    if len(l) > 1:
        p(f"estagiário {e} com mais de um vínculo ativo")
por_grupo = Counter(al["grupoId"] for l in ativas.values() for al in l)
for g, n in por_grupo.items():
    if n > cfg["regras"]["maxEstagiariosPorGrupo"]:
        a(f"grupo {g}: {n} estagiários (alerta configurável; Res. CFP 05/2025, art. 5º, suspenso pelo STF na ADI 7911)")


def estagiarios_do_caso(c):
    return [al["estagiarioId"] for l in ativas.values() for al in l if al.get("subgrupoId") == c.get("subgrupoId")]


def supervisor_do_caso(c):
    return G[c["grupoId"]]["supervisorId"] if c.get("grupoId") in G else None


# Quem já atendeu o caso: a dupla e o supervisor de agora e os de antes de cada passagem (transferências)
def autores_possiveis(c):
    passagens = [t for t in db.get("transferencias", []) if t["casoId"] == c["id"]]
    subs = {t.get("deSubgrupoId") for t in passagens} - {None}
    antes = [al["estagiarioId"] for al in db["alocacoes"] if al.get("subgrupoId") in subs]
    return set(estagiarios_do_caso(c)) | set(antes)


def supervisores_possiveis(c):
    passagens = [t for t in db.get("transferencias", []) if t["casoId"] == c["id"]]
    return {supervisor_do_caso(c)} | {G[t["deGrupoId"]]["supervisorId"] for t in passagens if t.get("deGrupoId") in G}


# ---------- pacientes e inscrições (CPF) ----------
cpfs = Counter(x["cpf"] for x in db["pacientes"] if x.get("cpf"))
for x in db["pacientes"]:
    onde = f"paciente {x['id']}"
    if x.get("cpf") and not cpf_valido(x["cpf"]):
        p(f"{onde}: CPF inválido")
    if cpfs.get(x.get("cpf"), 0) > 1:
        p(f"{onde}: CPF repetido")
    if not re.fullmatch(r"\d{10,11}", x["telefone"]):
        p(f"{onde}: telefone inválido")
    if data_ok(x["dataNascimento"], onde):
        idade = (date.today() - date.fromisoformat(x["dataNascimento"])).days // 365
        if idade < 18 and not x.get("responsavelNome"):
            p(f"{onde}: menor de idade sem responsável")
    if x["canalLembrete"] not in ("whatsapp", "email", "nenhum"):
        p(f"{onde}: canal de lembrete inválido")
for i in db["inscricoes"]:
    onde = f"inscrição {i['id']}"
    if i.get("cpf") and not cpf_valido(i["cpf"]):
        p(f"{onde}: CPF inválido")
    if not i.get("cpf") and not i.get("semCpf"):
        p(f"{onde}: sem CPF e sem marcar 'não tenho CPF'")
    dup = i.get("duplicidade")
    esperado = next((x["id"] for x in db["pacientes"] if i.get("cpf") and x["cpf"] == i["cpf"]), None)
    if esperado and (not dup or dup.get("id") != esperado):
        p(f"{onde}: CPF de paciente cadastrado sem a marca de duplicidade")
    if i["status"] not in ("aguardando", "triada", "encaminhado-externo", "duplicada", "cancelada"):
        p(f"{onde}: status inválido")
    if len(i["resumo"]) > 140:
        p(f"{onde}: resumo com mais de 140 caracteres")
    if i.get("riscoTriagem", "") not in ("", "baixo", "moderado", "alto"):
        p(f"{onde}: risco da triagem fora da lista")
    if i["status"] == "encaminhado-externo" and len(i.get("encaminhadoPara", "")) < 3:
        p(f"{onde}: encaminhada para fora sem o serviço de destino")

# ---------- casos, consentimentos, anamnese, encerramento ----------
FINS = [f["id"] for f in cfg["listas"]["finalidadesConsentimento"]]
cons = defaultdict(list)
for c in db["consentimentos"]:
    if c["finalidade"] not in FINS:
        p(f"consentimento {c['id']}: finalidade inválida")
    data_ok(c["em"], f"consentimento {c['id']}", dh=True)
    cons[(c["casoId"], c["finalidade"])].append(c)
enc = {e["casoId"]: e for e in db["encerramentos"]}
for c in db["casos"]:
    onde = f"caso {c['id']}"
    if c["status"] not in ("ativo", "encerrado", "aguardando-alocacao"):
        p(f"{onde}: status inválido")
    for f in FINS:
        if not cons.get((c["id"], f)):
            p(f"{onde}: sem registro de consentimento para {f}")
    atual = {f: sorted(cons.get((c["id"], f), []), key=lambda x: x["em"])[-1:] for f in FINS}
    if c["status"] == "ativo" and not (atual["contrato"] and atual["contrato"][0]["concedido"]):
        p(f"{onde}: ativo sem contrato terapêutico")
    if not [x for x in db["anamneses"] if x["casoId"] == c["id"]]:
        p(f"{onde}: sem anamnese (versão 1)")
    if (c["status"] == "encerrado") != (c["id"] in enc):
        p(f"{onde}: status e encerramento não batem")
    if c["id"] in enc and enc[c["id"]]["tipo"] == "abandono" and not [x for x in db["contatos"] if x["casoId"] == c["id"]]:
        p(f"{onde}: abandono sem tentativa de contato")
    if c["id"] in enc and enc[c["id"]]["tipo"] == "encaminhamento" and len(enc[c["id"]].get("destino", "")) < 3:
        p(f"{onde}: encaminhamento sem o serviço de destino")
versoes = Counter((x["casoId"], x["versao"]) for x in db["anamneses"])
for k, n in versoes.items():
    if n > 1:
        p(f"anamnese repetida: caso {k[0]} versão {k[1]}")

# ---------- sessões ----------
PRES = set(cfg["listas"]["presencas"]) | {"cancelada"}
for s in db["sessoes"]:
    onde = f"sessão {s['id']}"
    if s["presenca"] not in PRES:
        p(f"{onde}: presença inválida")
    data_ok(s["data"], onde)
    if not ("07:00" <= s["hora"] <= "21:00"):
        p(f"{onde}: hora fora do funcionamento")
    if s["presenca"] in ("presente", "falta") and s["data"] > db["_meta"]["dataBase"]:
        p(f"{onde}: presença registrada depois da dataBase")
    if s.get("avisoPaciente") and (s["presenca"] != "falta-justificada" or s.get("motivoFalta") not in [m["id"] for m in cfg["listas"]["motivosFaltaPaciente"]]):
        p(f"{onde}: aviso de falta do paciente precisa ser falta justificada com motivo da lista")

# ---------- evoluções e assinaturas ----------
assin = defaultdict(list)
for x in db["assinaturas"]:
    assin[(x["alvoTipo"], x["alvoId"])].append(x)
    if x["papel"] not in ("estagiario", "supervisor"):
        p(f"assinatura {x['id']}: papel inválido")
for e in db["evolucoes"]:
    onde = f"evolução {e['id']}"
    c = C[e["casoId"]]
    if e["status"] not in cfg["listas"]["statusEvolucao"]:
        p(f"{onde}: status inválido")
    if e["autorId"] not in autores_possiveis(c):
        p(f"{onde}: autor não é estagiário do caso (da dupla atual, com vínculo ativo, ou de uma dupla anterior)")
    h = hashlib.sha256(e["texto"].encode("utf-8")).hexdigest()
    vig = [x for x in assin.get(("evolucao", e["id"]), []) if not x.get("hash") or x["hash"] == h]
    papeis = {x["papel"]: x for x in vig}
    if e["status"] == "validada" and not ("estagiario" in papeis and papeis.get("supervisor", {}).get("usuarioId") in supervisores_possiveis(c)):
        p(f"{onde}: validada sem as assinaturas do estagiário e do supervisor do caso")
    if e["status"] == "enviada" and "estagiario" not in papeis:
        p(f"{onde}: enviada sem a assinatura do estagiário")
    if e["status"] == "devolvida" and len(e.get("comentarioSupervisor", "")) < 5:
        p(f"{onde}: devolvida sem comentário")
    if e.get("sessaoId") and S[e["sessaoId"]]["presenca"] != "presente":
        p(f"{onde}: sessão sem presença")
    if e.get("tipo") not in ("sessao", "transferencia"):
        p(f"{onde}: tipo deve ser 'sessao' ou 'transferencia'")
    if e.get("tipo") == "transferencia" and e.get("sessaoId"):
        p(f"{onde}: resumo de transferência não é de uma sessão")
for ad in db["adendos"]:
    if E[ad["evolucaoId"]]["status"] != "validada":
        p(f"adendo {ad['id']}: em evolução não validada")
com_evo = {e.get("sessaoId") for e in db["evolucoes"]}
for s in db["sessoes"]:
    if s["presenca"] == "presente" and s["id"] not in com_evo:
        (a if C[s["casoId"]]["status"] == "ativo" else p)(f"sessão {s['id']} ({s['casoId']}) com presença e sem evolução")
for o in db["orientacoes"]:
    if o["supervisorId"] not in supervisores_possiveis(C[o["casoId"]]):
        p(f"orientação {o['id']}: supervisor não é o do caso")
for d in db["documentos"]:
    if not d.get("finalidade") or not d.get("destinatario"):
        p(f"documento {d['id']}: sem finalidade ou destinatário (Res. CFP 05/2025, art. 12)")
for x in db["anexos"]:
    if x["tipo"] not in [t["mime"] for t in cfg["listas"]["tiposArquivo"]] or x["tamanho"] > cfg["regras"]["uploadMaxMB"] * 1048576:
        p(f"anexo {x['id']}: tipo ou tamanho fora da regra")

# ---------- motivo de acesso da técnica ----------
MOTIVOS = {x["id"] for x in cfg["listas"]["motivosAcessoTecnico"]}
for j in db["acessosJustificados"]:
    if j["motivo"] not in MOTIVOS:
        p(f"acesso {j['id']}: motivo fora da lista")
    if U.get(j["usuarioId"], {}).get("perfil") != "tecnico":
        p(f"acesso {j['id']}: só a psicóloga técnica registra motivo de acesso")
    if j["motivo"] == "outro" and len(j.get("detalhe", "")) < 5:
        p(f"acesso {j['id']}: motivo 'outro' sem descrição")

# ---------- passagem do caso (transição de semestre) ----------
for t in sorted(db["transferencias"], key=lambda x: x["em"]):
    onde = f"transferência {t['id']}"
    if SUB[t["paraSubgrupoId"]]["grupoId"] != t["paraGrupoId"]:
        p(f"{onde}: a dupla de destino não é do grupo de destino")
    if not t.get("pacienteAvisado"):
        p(f"{onde}: o paciente precisa ser avisado da troca")
    if U[t["registradoPor"]]["perfil"] not in ("tecnico", "supervisor"):
        p(f"{onde}: só a técnica ou o supervisor passa o caso")
    if t.get("resumoId"):
        r = E[t["resumoId"]]
        if r["casoId"] != t["casoId"] or r.get("tipo") != "transferencia" or r["status"] != "validada":
            p(f"{onde}: o resumo precisa ser um resumo de transferência validado do mesmo caso")
    elif len(t.get("justificativa", "")) < 10:
        p(f"{onde}: sem resumo validado, a justificativa é obrigatória")
for c in db["casos"]:   # o caso fica na dupla da última passagem
    ultimas = sorted([t for t in db["transferencias"] if t["casoId"] == c["id"]], key=lambda x: x["em"])
    if ultimas and (c.get("grupoId"), c.get("subgrupoId")) != (ultimas[-1]["paraGrupoId"], ultimas[-1]["paraSubgrupoId"]):
        p(f"caso {c['id']}: a dupla não é a da última passagem")

# ---------- revisor de escrita ----------
rev = cfg.get("revisorEscrita", {})
for i, r in enumerate(rev.get("regras", [])):
    if r.get("tipo") not in rev.get("tipos", {}) or not r.get("termos") or not r.get("sugestao") or not r.get("motivo"):
        p(f"revisorEscrita, regra {i + 1}: precisa de tipo conhecido, termos, sugestão e motivo")

# ---------- risco e segurança ----------
TIPOS_RISCO = {x["id"] for x in cfg["listas"]["tiposRisco"]}
NIVEIS_RISCO = {x["id"] for x in cfg["listas"]["niveisRisco"]}
CONDUTAS = {x["id"] for x in cfg["listas"]["condutasRisco"]}
ORGAOS = {x["id"] for x in cfg["listas"]["notificacoes"]}
for r in db["riscos"]:
    onde = f"risco {r['id']}"
    if r["tipo"] not in TIPOS_RISCO:
        p(f"{onde}: tipo fora da lista")
    if r["nivel"] not in NIVEIS_RISCO:
        p(f"{onde}: nível fora da lista")
    if not set(r.get("condutas", [])) <= CONDUTAS:
        p(f"{onde}: conduta fora da lista")
    if not 10 <= len(r["descricao"]) <= cfg["regras"]["riscoDescricaoMaxCaracteres"]:
        p(f"{onde}: descrição fora do tamanho")
    data_ok(r["em"], onde, dh=True)
    if r.get("cienciaPor") and r["cienciaPor"] != supervisor_do_caso(C[r["casoId"]]):
        p(f"{onde}: ciência dada por quem não é o supervisor do caso")
    if r.get("encerradoEm") and not r.get("cienciaEm"):
        p(f"{onde}: acompanhamento encerrado sem a ciência da supervisão")
for n in db["notificacoes"]:
    onde = f"notificação {n['id']}"
    if n["orgao"] not in ORGAOS:
        p(f"{onde}: órgão fora da lista")
    if IDX["riscos"].get(n["riscoId"], {}).get("casoId") != n["casoId"]:
        p(f"{onde}: ligada a risco de outro caso")
    if n["registradoPor"] != supervisor_do_caso(C[n["casoId"]]):
        p(f"{onde}: só o supervisor do caso registra notificação (Res. CFP 05/2025, art. 7º, III)")
for k, n in Counter((x["casoId"], x["versao"]) for x in db["planosSeguranca"]).items():
    if n > 1:
        p(f"plano de segurança repetido: caso {k[0]} versão {k[1]}")
for x in db["planosSeguranca"]:
    if not x.get("revisadoComPaciente"):
        p(f"plano {x['id']}: o plano de segurança é construído com o paciente")
for x in db["auditoria"]:
    data_ok(x["em"], f"auditoria {x['id']}", dh=True)
    if x["usuarioId"] != "visitante" and x["usuarioId"] not in U:
        p(f"auditoria {x['id']}: usuário inexistente")

print(f"Arquivo: {caminho}  (versão {db['_meta']['versao']}, dataBase {db['_meta'].get('dataBase')})")
print("Registros: " + ", ".join(f"{c} {len(db[c])}" for c in COLECOES if db.get(c)))
for titulo, lista in (("PROBLEMAS", problemas), ("AVISOS", avisos)):
    print(f"\n{titulo} ({len(lista)})")
    for m in lista:
        print("  - " + m)
if avisos:
    print("\nAvisos de cenário de propósito: sessão do caso c03 sem evolução (mostra o alerta de 48 h).")
sys.exit(1 if problemas else 0)
