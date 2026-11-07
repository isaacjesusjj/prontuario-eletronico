"""Migração JSON → banco: lê dados/dados-iniciais.json e gera banco/dados-demo.sql.

Cada coleção vira uma tabela e cada campo vira uma coluna (casoId → caso_id).
Ficam de fora só o que o banco faz sozinho: senhas (Supabase Auth guarda o hash)
e os hashes da auditoria (o trigger recalcula a cadeia).

Uso, na pasta do projeto:  python banco/migrar_json.py
Depois, no SQL Editor do Supabase: rodar banco/schema.sql e em seguida banco/dados-demo.sql.
"""
import json
import re
import sys
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "dados" / "dados-iniciais.json"
DESTINO = RAIZ / "banco" / "dados-demo.sql"

# Ordem respeita as chaves estrangeiras
ORDEM = ["pacientes", "usuarios", "grupos", "subgrupos", "alocacoes", "casos", "inscricoes", "anamneses", "consentimentos",
         "encerramentos", "sessoes", "evolucoes", "assinaturas", "adendos", "orientacoes", "documentos", "anexos", "avaliacoes",
         "riscos", "notificacoes", "planosSeguranca", "contatos", "lembretes", "solicitacoes", "linksAcesso", "pedidosTitular", "aceites", "acessosJustificados", "auditoria"]
FORA = {"usuarios": {"senhaHash"}, "auditoria": {"hash", "hashAnterior"}}
NAMESPACE = uuid.UUID("6f1c2b1e-0d3a-4b5c-9e7f-2a1b3c4d5e6f")


def snake(nome):
    return re.sub(r"(?<!^)(?=[A-Z])", "_", nome).lower()


def literal(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def main():
    db = json.loads(ORIGEM.read_text(encoding="utf-8"))
    faltando = [c for c in db if not c.startswith("_") and c not in ORDEM]
    if faltando:
        sys.exit(f"Coleções sem tabela no banco: {faltando}")
    linhas = ["-- Gerado por banco/migrar_json.py a partir de " + ORIGEM.name + " (versão " + db["_meta"]["versao"] + ")",
              "-- Dados 100% fictícios. Rodar depois de banco/schema.sql.",
              "set timezone to 'America/Sao_Paulo';",
              "set app.migracao = 'on';",
              "begin;"]
    total = 0
    for colecao in ORDEM:
        registros = db[colecao]
        if not registros:
            continue
        tabela = snake(colecao)
        for r in registros:
            campos = {k: v for k, v in r.items() if k not in FORA.get(colecao, set())}
            if colecao == "usuarios":
                # id previsível para a conta do Supabase Auth (troca no convite por e-mail)
                campos["authId"] = str(uuid.uuid5(NAMESPACE, r["id"]))
            colunas = ", ".join(snake(k) for k in campos)
            valores = ", ".join(literal(v) for v in campos.values())
            linhas.append(f"insert into {tabela} ({colunas}) values ({valores});")
            total += 1
        linhas.append("")
    linhas += ["commit;", "reset app.migracao;"]
    DESTINO.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(f"{total} registros de {len([c for c in ORDEM if db[c]])} tabelas → {DESTINO.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
