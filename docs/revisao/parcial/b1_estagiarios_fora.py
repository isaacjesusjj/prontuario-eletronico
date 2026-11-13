# Burla 1: estagiária de fora do caso (duda → c01), vínculo encerrado (iara), sem grupo (hugo):
# todas as ações de caso chamadas direto + rotas de caso alheio.
from base import *

ACOES_CASO = [
    ("salvar-anamnese", {"caso": "c01"}, {"an-demanda": "demanda burla", "an-objetivos": "objetivos burla"}),
    ("assinar-anamnese", {"id": "ID_ANAMNESE"}, {}),
    ("registrar-consentimento", {"caso": "c01", "fin": "gravacao", "valor": "sim"}, {}),
    ("nova-evolucao", {"caso": "c01", "modo": "enviar"}, {"nova-texto": "Texto de evolução burlada de fora do caso.", "nova-sessao": ""}),
    ("salvar-evolucao", {"id": "e04", "modo": "enviar"}, {"ev-e04": "Texto trocado por quem não é autor."}),
    ("validar-evolucao", {"id": "e18"}, {}),
    ("devolver-evolucao", {"id": "e18"}, {"com-e18": "comentário burla"}),
    ("adicionar-adendo", {"id": "e01"}, {"adtxt-e01": "adendo burla", "admot-e01": "Complemento"}),
    ("registrar-presenca", {"id": "s30", "valor": "presente"}, {}),
    ("agendar-sessao", {"caso": "c01"}, {"ag-data": "2030-01-10", "ag-hora": "10:00", "ag-sala": "Sala 4"}),
    ("lembrete", {"id": "s31", "canal": "whatsapp"}, {}),
    ("registrar-contato", {"caso": "c01"}, {"ct-canal": "Telefone", "ct-resultado": "Desistiu", "ct-motivo": "Outro"}),
    ("encerrar-abandono", {"caso": "c01"}, {}),
    ("encerrar-caso", {"caso": "c01"}, {"enc-tipo": "alta", "enc-motivo": "motivo", "enc-registro": "registro com dez letras"}),
    ("assinar-documento", {"id": "doc01"}, {}),
    ("registrar-evento-documento", {"id": "doc01", "tipo": "entrega"}, {"ev-para": "alguém"}),
    ("registrar-evento-documento", {"id": "doc01", "tipo": "anulacao"}, {"ev-motivo-anul": "motivo de anulação burla"}),
    ("imprimir-documento", {"id": "doc01"}, {}),
    ("imprimir", {"caso": "c01"}, {}),
    ("abrir-anexo", {"id": "a01"}, {}),
    ("registrar-avaliacao", {"caso": "c01"}, {"av-inst": "instrumento burla"}),
    ("registrar-orientacao", {"caso": "c01"}, {"or-texto": "orientação burla"}),
    ("justificar-acesso", {"caso": "c01", "destino": "#/caso/c01"}, {"jt-m": {"radio": "jt-motivo", "value": "auditoria"}}),
    ("registrar-risco", {"caso": "c01"}, {"rk-desc": "descrição de risco burla", "rk-n": {"radio": "rk-nivel", "value": "alto"}, "rk-tipo": "autolesao"}),
    ("dar-ciencia-risco", {"id": "r01"}, {}),
    ("registrar-notificacao", {"id": "r01"}, {"nt-orgao-r01": "vigilancia"}),
    ("encerrar-risco", {"id": "r01"}, {"rk-nota-r01": "nota burla"}),
    ("salvar-plano", {"caso": "c01"}, {"pl-sinaisAlerta": "abc", "pl-estrategiasProprias": "abc", "pl-pessoasAjuda": "abc", "pl-servicos": "abc", "pl-revisado": {"check": True}}),
    ("assinar-plano", {"id": "ID_PLANO"}, {}),
    ("concluir-triagem", {"id": "i01"}, {}),
    ("marcar-duplicada", {"id": "i01"}, {}),
    ("salvar-paciente", {"id": "p01"}, {}),
    ("alocar-caso", {"id": "c07"}, {"ag-c07": "g-a"}),
    ("alocar-estagiario", {"id": "u-est8"}, {"gr-u-est8": "g-a"}),
    ("encerrar-estagio", {"id": "u-est1"}, {}),
    ("definir-dupla", {"grupo": "g-a", "id": "u-est3"}, {"dup-u-est3": "d-a1"}),
    ("nova-dupla", {"grupo": "g-a"}, {}),
    ("atribuir-caso", {"id": "c01"}, {"cs-c01": "d-a2"}),
    ("importar-estudantes", {}, {}),
    ("gerar-senha-provisoria", {"id": "u-tec"}, {}),
    ("alternar-conta", {"id": "u-tec"}, {}),
    ("criar-acesso-portal", {"id": "p02"}, {}),
    ("desligar-mfa-conta", {"id": "u-tec"}, {}),
    ("conferir-identidade", {"id": "x"}, {}),
    ("gerar-link", {"id": "x"}, {}),
    ("revogar-link", {"id": "x"}, {}),
    ("marcar-entregue", {"id": "x"}, {}),
    ("responder-titular", {"id": "pt02"}, {"resp-pt02": "resposta burla"}),
    ("verificar-auditoria", {}, {}),
    ("exportar-auditoria", {}, {}),
    ("confirmar-sessao", {"id": "s31"}, {}),
    ("avisar-falta", {"id": "s31"}, {"mf-s31": "saude"}),
    ("solicitar-copia", {}, {}),
    ("paciente-consentimento", {"caso": "c01", "fin": "gravacao", "valor": "sim"}, {}),
    ("pedido-titular", {}, {"pt-desc": "pedido burla", "pt-tipo": "acesso"}),
]
COLECOES = ["anamneses", "assinaturas", "consentimentos", "evolucoes", "adendos", "sessoes", "lembretes", "contatos", "encerramentos", "eventosDocumento",
            "avaliacoes", "orientacoes", "acessosJustificados", "riscos", "notificacoes", "planosSeguranca", "pacientes", "casos", "alocacoes", "subgrupos",
            "usuarios", "solicitacoes", "linksAcesso", "pedidosTitular", "inscricoes", "documentos", "comunicacoes", "transferencias", "auditoria"]
FOTO = "() => JSON.stringify(%s.map(c => [c, JSON.stringify(PEP.db[c].filter(x => c !== 'auditoria'))]))" % json.dumps(COLECOES[:-1])
ROTAS = ["#/caso/c01", "#/caso/c01/evolucoes", "#/caso/c01/risco", "#/caso/c01/sessoes", "#/caso/c01/documentos", "#/caso/c01/supervisao", "#/caso/c01/restrita",
         "#/caso/c01/encerramento", "#/documento/doc01", "#/imprimir/c01", "#/triagem/i01", "#/paciente/p01/editar", "#/auditoria", "#/estudantes", "#/indicadores",
         "#/solicitacoes", "#/pedidos-lgpd", "#/meu-prontuario", "#/meus-dados", "#/meu-plano", "#/fila", "#/alocacao", "#/supervisao", "#/casos", "#/agenda", "#/busca"]


def rodar(nav, base, login, extra_formularios=True):
    print(f"\n===== {login} =====")
    s = sessao(nav, base, login)
    s.entrar(login)
    ids = s.js("() => ({an: PEP.regras.anamneseAtual(PEP.db.casos[0]).id, pl: (PEP.db.planosSeguranca[0]||{}).id, plc: (PEP.db.planosSeguranca[0]||{}).casoId})")
    antes = s.js(FOTO)
    furos = []
    for nome, dados, campos in ACOES_CASO:
        dados = {k: (ids["an"] if v == "ID_ANAMNESE" else ids["pl"] if v == "ID_PLANO" else v) for k, v in dados.items()}
        s.ir("#/painel")
        r = s.burla(nome, dados, campos)
        depois = s.js(FOTO)
        mudou = depois != antes
        if mudou:
            a, d = dict(json.loads(antes)), dict(json.loads(depois))
            cols = [c for c in a if a[c] != d[c]]
            furos.append((nome, dados, cols, r))
            print(f"  !!! {nome} {dados} MUDOU {cols} -> {r}")
        else:
            print(f"  ok  {nome}: {r['r'][:60]} | toast={r['toast'] or r['toast2']}")
        antes = depois
    # formulários
    forms = [
        ("emitir-documento", {"data-caso": "c01"}, [{"id": "dp-titulo", "value": "Declaração burla"}, {"id": "dp-solicitante", "value": "abc"}, {"id": "dp-finalidade", "value": "abc"},
                                                    {"id": "dp-destinatario", "value": "abc"}, {"id": "dp-s-informacao", "value": "Compareceu ao serviço nesta data."}]),
        ("registrar-comunicacao", {"data-caso": "c01"}, [{"name": "tipo", "value": "encaminhamento"}, {"name": "data", "value": "2026-01-01"}, {"name": "destinatario", "value": "UBS X"},
                                                         {"name": "finalidade", "value": "abc"}, {"name": "fundamento", "value": "fundamento"}, {"name": "conteudo", "value": "conteudo com dez"},
                                                         {"name": "visivel", "type": "checkbox", "checked": True}, {"name": "motivo", "value": ""}]),
        ("passar-caso", {"data-caso": "c01"}, [{"name": "destino", "value": "d-a2"}, {"name": "justificativa", "value": "justificativa de burla"}, {"name": "avisado", "type": "checkbox", "checked": True}]),
    ]
    for nome, attrs, campos in forms:
        s.ir("#/painel")
        s.js("() => { PEP.telas._modalidadeDoc = 'declaracao'; }")
        r = s.form(nome, attrs, campos)
        depois = s.js(FOTO)
        if depois != antes:
            a, d = dict(json.loads(antes)), dict(json.loads(depois))
            cols = [c for c in a if a[c] != d[c]]
            furos.append((nome, attrs, cols, r))
            print(f"  !!! FORM {nome} MUDOU {cols} -> {r}")
        else:
            print(f"  ok  FORM {nome}: {r['r'][:60]} | toast={r['toast'] or r['toast2']}")
        antes = depois
    # rotas
    for rota in ROTAS:
        s.ir(rota)
        s.p.wait_for_timeout(100)
        txt = s.texto().replace("\n", " ")
        print(f"  rota {rota} -> hash={s.js('location.hash')} h1={s.h1()!r} | {txt[:110]}")
    print("  auditoria nova:", s.js("() => PEP.db.auditoria.slice(5).map(a => a.usuarioId + '|' + a.acao + '|' + a.alvo)"))
    s.fechar()
    return furos


if __name__ == "__main__":
    logins = ARGS or ["duda.estagiaria", "iara.estagiaria", "hugo.estagiario"]
    with site() as (nav, base):
        tot = {}
        for l in logins:
            tot[l] = rodar(nav, base, l)
        print("\n===== RESUMO DOS FUROS =====")
        for l, f in tot.items():
            print(l, len(f))
            for x in f:
                print("   ", x[0], x[1], x[2], x[3]["toast"] or x[3]["toast2"], x[3]["r"])
