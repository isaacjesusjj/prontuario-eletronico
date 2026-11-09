"""Projeção do banco de dados do Vinculum (prontuário da clínica-escola).

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
# Cada "paciente-semestre" é um paciente atendido num semestre (o mesmo paciente pode contar duas vezes no ano)
SESSOES_AGENDADAS_POR_PACIENTE_SEM = 12   # ~18 semanas letivas, nem todo paciente é semanal
TAXA_PRESENCA = 0.80                       # 80% das sessões acontecem -> viram evolução
CASOS_NOVOS = 0.6                          # 60% dos pacientes-semestre são casos novos; o resto continua
VERSOES_ANAMNESE_POR_CASO = 1.5            # a anamnese ganha versão nova quando é atualizada
RESUMOS_TRANSFERENCIA = 0.3                # caso que passa para outra dupla no fim do semestre
ORIENTACOES_POR_CASO_SEM = 4               # registro de supervisão ~ mensal
DOCUMENTOS_POR_CASO_SEM = 0.3              # declarações, atestados, relatórios, laudos
EVENTOS_POR_DOCUMENTO = 1.5                # entrega, devolutiva, anulação
COMUNICACOES_POR_CASO_SEM = 0.3
AVALIACOES_POR_CASO_SEM = 0.3              # instrumentos aplicados (área restrita)
RISCOS_POR_CASO_SEM = 0.10                 # avaliações de risco registradas
NOTIFICACOES_POR_CASO_SEM = 0.02
PLANOS_POR_CASO_SEM = 0.05                 # planos de segurança (com versões)
CONTATOS_POR_CASO_SEM = 0.4                # tentativas de contato (fluxo de abandono)
LEMBRETES_POR_SESSAO = 0.5                 # só para quem autorizou
CONSENTIMENTOS_POR_CASO = 4                # um por finalidade
ENCERRAMENTOS_POR_CASO_NOVO = 0.9
ADENDOS_POR_EVOLUCAO = 0.02
PEDIDOS_COPIA_POR_CASO_SEM = 0.05          # cópia do prontuário (metade por link temporário)
PEDIDOS_LGPD_POR_CASO_SEM = 0.01
ACESSOS_JUSTIFICADOS_POR_CASO_SEM = 0.2    # técnica abrindo caso de fora da equipe
ANEXOS_POR_CASO = 0.8
TAMANHO_ANEXO_KB = 400                     # PDF/imagem média (o máximo aceito é 2 MB)
LOGINS_POR_ESTUDANTE_SEMANA = 3
SEMANAS_LETIVAS_ANO = 36
EVENTOS_AUDITORIA_POR_SESSAO = 12          # abrir prontuário, presença, evolução, validação...
EVENTOS_AUDITORIA_POR_LOGIN = 2            # entrar e sair
ANOS_GUARDA = 20                           # Lei 13.787/2018, art. 6º (mínimo CFP: 5 anos)

# Bytes por linha já com cabeçalho, índices e folga das páginas do PostgreSQL.
# Base: tamanho medido no banco de teste (PGlite) com os dados de demonstração, mais ~30 bytes por índice.
# Nos textos clínicos (evolução, anamnese, documento, plano), o valor é conservador: a demonstração tem
# textos curtos, e na vida real a evolução vai até 5.000 caracteres.
BYTES = dict(usuario=500, paciente=700, inscricao=600, caso=200, alocacao=150, transferencia=400,
             anamnese=3500, consentimento=250, encerramento=800, sessao=180, evolucao=3000, assinatura=220,
             adendo=800, orientacao=1000, documento=4000, evento_documento=250, comunicacao=1000, anexo=300,
             avaliacao=400, risco=1500, notificacao=500, plano_seguranca=2500, contato=250, lembrete=150,
             solicitacao=300, link_acesso=300, pedido_titular=600, aceite=150, acesso_justificado=250,
             auditoria=340)

# Limites dos planos (conferidos em nov/2026 em fontes públicas; confirmar em supabase.com/pricing)
LIMITES = {"Supabase Free": dict(banco_gb=0.5, arquivos_gb=1),
           "Supabase Pro": dict(banco_gb=8, arquivos_gb=100)}


def por_ano(c):
    pac = c["pacientes_sem"] * SEMESTRES_ANO           # pacientes-semestre no ano
    novos = pac * CASOS_NOVOS
    sessoes = pac * SESSOES_AGENDADAS_POR_PACIENTE_SEM
    evolucoes = sessoes * TAXA_PRESENCA + pac * RESUMOS_TRANSFERENCIA
    anamneses = novos * VERSOES_ANAMNESE_POR_CASO
    documentos = pac * DOCUMENTOS_POR_CASO_SEM
    planos = pac * PLANOS_POR_CASO_SEM
    pedidos_copia = pac * PEDIDOS_COPIA_POR_CASO_SEM
    logins = c["contas"] * 0.6 * LOGINS_POR_ESTUDANTE_SEMANA * SEMANAS_LETIVAS_ANO  # 60% usam no ano
    linhas = dict(
        paciente=novos, inscricao=c["inscricoes_ano"], caso=novos,
        alocacao=c["estagiarios"] * SEMESTRES_ANO, transferencia=pac * RESUMOS_TRANSFERENCIA,
        anamnese=anamneses, consentimento=novos * CONSENTIMENTOS_POR_CASO, encerramento=novos * ENCERRAMENTOS_POR_CASO_NOVO,
        sessao=sessoes, evolucao=evolucoes,
        # estagiário + supervisor em cada evolução; supervisor também assina anamnese, documento e plano
        assinatura=evolucoes * 2 + anamneses + documentos + planos,
        adendo=evolucoes * ADENDOS_POR_EVOLUCAO, orientacao=pac * ORIENTACOES_POR_CASO_SEM,
        documento=documentos, evento_documento=documentos * EVENTOS_POR_DOCUMENTO, comunicacao=pac * COMUNICACOES_POR_CASO_SEM,
        anexo=novos * ANEXOS_POR_CASO, avaliacao=pac * AVALIACOES_POR_CASO_SEM,
        risco=pac * RISCOS_POR_CASO_SEM, notificacao=pac * NOTIFICACOES_POR_CASO_SEM, plano_seguranca=planos,
        contato=pac * CONTATOS_POR_CASO_SEM, lembrete=sessoes * LEMBRETES_POR_SESSAO,
        solicitacao=pedidos_copia, link_acesso=pedidos_copia * 0.5, pedido_titular=pac * PEDIDOS_LGPD_POR_CASO_SEM,
        aceite=c["contas"] * 0.6 + novos * 0.5, acesso_justificado=pac * ACESSOS_JUSTIFICADOS_POR_CASO_SEM,
        auditoria=sessoes * EVENTOS_AUDITORIA_POR_SESSAO + logins * EVENTOS_AUDITORIA_POR_LOGIN,
    )
    banco_bytes = sum(linhas[k] * BYTES[k] for k in linhas)
    anexos_bytes = novos * ANEXOS_POR_CASO * TAMANHO_ANEXO_KB * 1024
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
        mb_tabela = {k: round(linhas[k] * BYTES[k] / 1024 ** 2, 2) for k in linhas}
        # Em que ano o banco passa do limite de cada plano (None = não passa nos 20 anos)
        estoura = {plano: next((n for n in range(1, ANOS_GUARDA + 1)
                               if (banco * n + contas_bytes) / 1024 ** 3 > lim["banco_gb"] or anexos * n / 1024 ** 3 > lim["arquivos_gb"]), None)
                   for plano, lim in LIMITES.items()}
        saida[nome] = dict(
            premissas=c,
            registros_por_ano={k: int(v) for k, v in linhas.items()},
            mb_por_ano_por_tabela=mb_tabela,
            ano_que_passa_do_limite=estoura,
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
        print("  mais linhas/ano:", sorted(d["registros_por_ano"].items(), key=lambda x: -x[1])[:3])
        print("  mais espaço (MB/ano):", sorted(d["mb_por_ano_por_tabela"].items(), key=lambda x: -x[1])[:4])
        print("  passa do limite do plano no ano:", d["ano_que_passa_do_limite"])
