"""Projeção do banco de dados do Vínculo (prontuário da clínica-escola).

Estima quantos registros e quanto espaço o banco ocupa por ano e em 20 anos
(prazo de guarda da Lei 13.787/2018), em três cenários. Todas as premissas
estão no topo do arquivo: mudou um número, rode de novo.

Uso:  python banco/projecao.py            (imprime a tabela)
      python banco/projecao.py --json     (saída em JSON, usada nos slides)
"""
import json
import sys

# ---------------- Premissas (ajuste aqui) ----------------
CENARIOS = {
    # contas de estudantes | estagiários em atendimento por semestre | supervisores
    # pacientes atendidos por semestre | inscrições na fila por ano
    "Atual (Etapa 1)": dict(contas=800, estagiarios=120, supervisores=15, pacientes_sem=400, inscricoes_ano=1200),
    "Crescimento x3": dict(contas=2400, estagiarios=360, supervisores=40, pacientes_sem=1200, inscricoes_ano=3600),
    "Estresse x10": dict(contas=8000, estagiarios=1200, supervisores=120, pacientes_sem=4000, inscricoes_ano=12000),
}
SEMESTRES_ANO = 2
SESSOES_AGENDADAS_POR_PACIENTE_SEM = 12   # ~18 semanas letivas, nem todo paciente é semanal
TAXA_PRESENCA = 0.80                       # 80% das sessões acontecem -> viram evolução
ORIENTACOES_POR_CASO_SEM = 4               # registro de supervisão ~ mensal
DOCUMENTOS_POR_CASO_SEM = 0.3
CONTATOS_POR_CASO_SEM = 0.4                # tentativas de contato (fluxo de abandono)
CONSENTIMENTOS_POR_CASO = 4                # um por finalidade
ANEXOS_POR_CASO = 0.8
TAMANHO_ANEXO_KB = 400                     # PDF/imagem média
LOGINS_POR_ESTUDANTE_SEMANA = 3
SEMANAS_LETIVAS_ANO = 36
EVENTOS_AUDITORIA_POR_SESSAO = 12          # abrir prontuário, presença, evolução, validação...
EVENTOS_AUDITORIA_POR_LOGIN = 2            # entrar e sair
ANOS_GUARDA = 20                           # Lei 13.787/2018, art. 6º (mínimo CFP: 5 anos)

# Bytes por linha já com índices e overhead do PostgreSQL (estimativa conservadora)
BYTES = dict(usuario=500, paciente=700, inscricao=600, caso=3000, sessao=160, evolucao=3000,
             orientacao=1000, documento=800, consentimento=250, contato=250, auditoria=260)

# Limites dos planos (verificados em nov/2026; conferir em supabase.com/pricing)
LIMITES = {"Supabase Free": dict(banco_gb=0.5, arquivos_gb=1),
           "Supabase Pro": dict(banco_gb=8, arquivos_gb=100)}


def por_ano(c):
    pacientes_ano = c["pacientes_sem"] * SEMESTRES_ANO
    sessoes = pacientes_ano * SESSOES_AGENDADAS_POR_PACIENTE_SEM
    evolucoes = sessoes * TAXA_PRESENCA
    logins = c["contas"] * 0.6 * LOGINS_POR_ESTUDANTE_SEMANA * SEMANAS_LETIVAS_ANO  # 60% usam no ano
    linhas = dict(
        paciente=pacientes_ano * 0.6,  # parte dos pacientes continua de um semestre para o outro
        inscricao=c["inscricoes_ano"],
        caso=pacientes_ano * 0.6,
        sessao=sessoes,
        evolucao=evolucoes,
        orientacao=pacientes_ano * ORIENTACOES_POR_CASO_SEM,
        documento=pacientes_ano * DOCUMENTOS_POR_CASO_SEM,
        contato=pacientes_ano * CONTATOS_POR_CASO_SEM,
        consentimento=pacientes_ano * 0.6 * CONSENTIMENTOS_POR_CASO,
        auditoria=sessoes * EVENTOS_AUDITORIA_POR_SESSAO + logins * EVENTOS_AUDITORIA_POR_LOGIN,
    )
    banco_bytes = sum(linhas[k] * BYTES[k] for k in linhas)
    anexos_bytes = pacientes_ano * 0.6 * ANEXOS_POR_CASO * TAMANHO_ANEXO_KB * 1024
    return linhas, banco_bytes, anexos_bytes


def projetar():
    saida = {}
    for nome, c in CENARIOS.items():
        linhas, banco, anexos = por_ano(c)
        contas_bytes = (c["contas"] + c["supervisores"] + 10) * BYTES["usuario"]
        anos = {}
        for n in (1, 5, 10, ANOS_GUARDA):
            anos[n] = dict(banco_gb=round((banco * n + contas_bytes) / 1024 ** 3, 3),
                           arquivos_gb=round(anexos * n / 1024 ** 3, 2))
        # Pico de uso simultâneo: 25% dos estagiários e supervisores + técnicos + 2% dos pacientes
        simultaneos = round(0.25 * (c["estagiarios"] + c["supervisores"]) + 5 + 0.02 * c["pacientes_sem"])
        saida[nome] = dict(
            premissas=c,
            registros_por_ano={k: int(v) for k, v in linhas.items()},
            total_registros_ano=int(sum(linhas.values())),
            banco_mb_por_ano=round(banco / 1024 ** 2, 1),
            arquivos_gb_por_ano=round(anexos / 1024 ** 3, 2),
            acumulado=anos,
            pico_usuarios_simultaneos=simultaneos,
            pico_requisicoes_por_segundo=round(simultaneos / 10, 1),  # 1 requisição a cada 10 s por pessoa
            usuarios_ativos_mes=int(c["contas"] * 0.6 + c["supervisores"] + c["pacientes_sem"]),
        )
    return saida


if __name__ == "__main__":
    dados = projetar()
    if "--json" in sys.argv:
        print(json.dumps(dados, ensure_ascii=False, indent=2))
        sys.exit(0)
    for nome, d in dados.items():
        print(f"\n== {nome} ==")
        print(f"  registros novos por ano: {d['total_registros_ano']:,}".replace(",", "."))
        print(f"  banco: {d['banco_mb_por_ano']} MB/ano · anexos: {d['arquivos_gb_por_ano']} GB/ano")
        for n, v in d["acumulado"].items():
            print(f"  em {n:>2} ano(s): banco {v['banco_gb']} GB · anexos {v['arquivos_gb']} GB")
        print(f"  pico: ~{d['pico_usuarios_simultaneos']} pessoas ao mesmo tempo, ~{d['pico_requisicoes_por_segundo']} req/s")
        print(f"  usuários ativos por mês: ~{d['usuarios_ativos_mes']}")
        print("  maiores tabelas/ano:", sorted(d["registros_por_ano"].items(), key=lambda x: -x[1])[:3])
