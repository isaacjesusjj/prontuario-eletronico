# Burlas dirigidas, parte 2 (contexto novo por cenário).
from base import *
from b2_burlas import caso, ult, aud, trocar

def hoje(s): return s.js("() => PEP.util.hoje()")
def mais(s, n): return s.js("n => PEP.util.somarDias(PEP.util.hoje(), n)", n)

def A_direcao_ve_nome_de_paciente(nav, base):
    s = sessao(nav, base, "A"); msgs = []

    s.entrar("marta.direcao")
    s.js("() => { window.__dlg = []; window.confirm = function (m) { window.__dlg.push(m); return true; }; }")
    print("encerrar Caio:", s.burla("encerrar-estagio", {"id": "u-est2"})["toast"])
    print("encerrar Bia (última da Dupla 1):", s.burla("encerrar-estagio", {"id": "u-est1"})["toast"])
    print(" textos do confirm():", s.js("() => window.__dlg"))
    # pela tela, de verdade
    s.ir("#/alocacao"); print(" tela alocação (direção) tem 'Paciente'?", "Paciente Exemplo" in s.texto())
    s.fechar()

def B_tecnica_sem_motivo_ve_risco(nav, base):
    s = sessao(nav, base, "B"); s.entrar("ana.tecnica")
    for c in ["c03", "c04"]:
        s.ir("#/caso/" + c); t = s.texto().replace("\n", " ")
        print(c, "precisaJustificar:", s.js("c => PEP.regras.precisaJustificar(PEP.estado.usuarioAtual(), PEP.util.porId(PEP.db.casos,c))", c), "| cabeçalho:", t[:230])
    s.ir("#/painel"); print(" painel técnica:", s.texto().replace("\n", " ")[:900])
    s.ir("#/casos"); print(" casos:", s.texto().replace("\n", " ")[:500])
    s.ir("#/agenda/lista"); print(" agenda:", s.texto().replace("\n", " ")[200:600])
    s.fechar()

def C_lembretes(nav, base):
    s = sessao(nav, base, "C"); s.entrar("ana.tecnica")
    campos = {"pc-nome": "Paciente Exemplo 01", "pc-social": "", "pc-nasc": "1997-03-14", "pc-cpf": s.js("() => PEP.db.pacientes[0].cpf"), "pc-tel": s.js("() => PEP.db.pacientes[0].telefone"), "pc-email": "paciente01@example.org",
              "pc-resp": "", "pc-resptel": "", "pc-canal": "nenhum", "pc-emnome": "", "pc-emvinc": "", "pc-emtel": ""}
    print("técnica muda canal p/ 'Não quero lembretes':", s.burla("salvar-paciente", {"id": "p01"}, campos)["toast"], s.js("() => PEP.db.pacientes[0].canalLembrete"))
    trocar(s, "bia.estagiaria")
    s.js("() => { window.__aberto = []; window.open = function (u) { window.__aberto.push(String(u)); return null; }; }")
    s.ir("#/caso/c01/sessoes"); print(" tela ainda oferece botão de lembrete?", s.p.locator('[data-acao="lembrete"]').count(), "| consentiu lembretes:", s.js("() => PEP.regras.consentiu(PEP.db.casos[0],'lembretes')"))
    print(" lembrete whatsapp com canal 'nenhum':", s.burla("lembrete", {"id": "s31", "canal": "whatsapp"})["toast2"])
    print(" lembrete de sessão passada com presença (s01):", s.burla("lembrete", {"id": "s01", "canal": "email"})["toast2"])
    print(" canal inventado:", s.burla("lembrete", {"id": "s31", "canal": "sms"})["toast2"], "|", ult(s, "lembretes")[:150])
    print(" urls:", [u[:90] for u in s.js("() => window.__aberto")])
    print(" texto do lembrete:", s.js("() => decodeURIComponent(window.__aberto[0].split('text=')[1] || '')"))
    trocar(s, "enzo.estagiario")
    s.js("() => { window.__aberto = []; window.open = function (u) { window.__aberto.push(String(u)); return null; }; }")
    print(" menor (c04) whatsapp vai para:", s.burla("lembrete", {"id": "s49", "canal": "whatsapp"})["toast2"], s.js("() => (window.__aberto[0]||'').slice(0,40)"), "| tel paciente/responsável:", s.js("() => { var p = PEP.util.porId(PEP.db.pacientes,'p04'); return p.telefone + ' / ' + p.responsavelTelefone; }"))
    print(" menor (c04) e-mail vai para:", s.burla("lembrete", {"id": "s49", "canal": "email"})["toast2"], s.js("() => (window.__aberto[1]||'').slice(0,50)"))
    s.fechar()

def D_agenda(nav, base):
    s = sessao(nav, base, "D"); s.entrar("bia.estagiaria")
    h, am = hoje(s), mais(s, 1)
    def ag(c, d, hr, sala): return s.burla("agendar-sessao", {"caso": c}, {"ag-data": d, "ag-hora": hr, "ag-sala": sala})["toast2"]
    print("ontem:", ag("c01", mais(s, -1), "10:00", "Sala 4"))
    print("hoje 07:00 (já passou):", ag("c01", h, "07:00", "Sala 4"))
    print("sem sala:", ag("c01", am, "10:00", ""), "| sala inventada:", ag("c01", am, "10:00", "Sala 99"))
    print("data impossível 2027-02-31:", ag("c01", "2027-02-31", "10:00", "Sala 4"), "| 2027-13-45:", ag("c01", "2027-13-45", "11:30", "Sala 4"), "| hora 25:99?:", ag("c01", am, "20:99", "Sala 4"))
    print("06:59:", ag("c01", am, "06:59", "Sala 4"), "| 21:00:", ag("c01", am, "21:00", "Sala 3"), "| 21:01:", ag("c01", am, "21:01", "Sala 4"))
    d = mais(s, 30)
    print("base 14:00 Sala 2:", ag("c01", d, "14:00", "Sala 2"))
    print(" mesma dupla 14:49 outra sala:", ag("c02", d, "14:49", "Sala 3"), "| 14:50 outra sala:", ag("c02", d, "14:50", "Sala 3"), "| 13:10 mesma sala:", ag("c02", d, "13:10", "Sala 2"), "| 13:11 mesma sala:", ag("c02", d, "13:11", "Sala 2"))
    trocar(s, "duda.estagiaria")
    print(" outra dupla, mesma sala 14:30:", ag("c03", d, "14:30", "Sala 2"), "| outra sala 14:30:", ag("c03", d, "14:30", "Sala 4"))
    # sala ocupada por sessão de hoje já com presença? e paciente em dois casos
    print(" domingo?", s.js("d => PEP.util.diaDaSemana(d)", mais(s, (6 - s.js("() => PEP.util.diaDaSemana(PEP.util.hoje())")) % 7 + 1)), ag("c03", mais(s, (6 - s.js("() => PEP.util.diaDaSemana(PEP.util.hoje())")) % 7 + 1), "09:00", "Sala 4"))
    # presença
    print("presença em sessão futura:", s.burla("registrar-presenca", {"id": "s43", "valor": "presente"})["toast2"], "| falta futura:", s.burla("registrar-presenca", {"id": "s43", "valor": "falta"})["toast2"],
          "| justificada futura:", s.burla("registrar-presenca", {"id": "s43", "valor": "falta-justificada"})["toast2"], "| mudar depois:", s.burla("registrar-presenca", {"id": "s43", "valor": "presente"})["toast2"],
          "| valor inventado:", s.burla("registrar-presenca", {"id": "s44", "valor": "cancelada"})["toast2"])
    print("sessão de hoje (s12 é dia +5?):", s.js("() => PEP.db.sessoes.filter(x => x.data === PEP.util.hoje()).map(x => x.id + ':' + x.casoId + ':' + x.hora + ':' + x.presenca)"))
    s.fechar()

def E_caso_encerrado(nav, base):
    s = sessao(nav, base, "E"); s.entrar("enzo.estagiario")
    print("c05 encerrado. avaliação:", s.burla("registrar-avaliacao", {"caso": "c05"}, {"av-inst": "instrumento em caso encerrado"})["toast2"],
          "| adendo e09:", s.burla("adicionar-adendo", {"id": "e09"}, {"adtxt-e09": "adendo em caso encerrado", "admot-e09": "Complemento"})["toast2"],
          "| nova evolução:", s.burla("nova-evolucao", {"caso": "c05", "modo": "enviar"}, {"nova-texto": "Evolução em caso encerrado.", "nova-sessao": ""})["toast2"],
          "| anamnese:", s.burla("salvar-anamnese", {"caso": "c05"}, {"an-demanda": "demanda", "an-objetivos": "objetivos"})["toast2"],
          "| agendar:", s.burla("agendar-sessao", {"caso": "c05"}, {"ag-data": mais(s, 3), "ag-hora": "10:00", "ag-sala": "Sala 4"})["toast2"],
          "| risco:", s.burla("registrar-risco", {"caso": "c05"}, {"rk-desc": "risco em caso encerrado", "rk-n": {"radio": "rk-nivel", "value": "baixo"}, "rk-tipo": "autolesao"})["toast2"],
          "| plano:", s.burla("salvar-plano", {"caso": "c05"}, {"pl-sinaisAlerta": "abc", "pl-estrategiasProprias": "abc", "pl-pessoasAjuda": "abc", "pl-servicos": "abc", "pl-revisado": {"check": True}})["toast2"],
          "| encerrar de novo:", s.burla("encerrar-caso", {"caso": "c05"}, {"enc-tipo": "alta", "enc-motivo": "motivo", "enc-registro": "registro com dez letras"})["toast2"],
          "| abandono de novo:", s.burla("encerrar-abandono", {"caso": "c05"})["toast2"], "| contato:", s.burla("registrar-contato", {"caso": "c05"}, {"ct-canal": "Telefone", "ct-resultado": "Desistiu", "ct-motivo": ""})["toast2"])
    s.js("() => { PEP.telas._modalidadeDoc = 'declaracao'; }")
    print(" doc em encerrado:", s.form("emitir-documento", {"data-caso": "c05"}, [{"id": "dp-titulo", "value": "Decl"}, {"id": "dp-solicitante", "value": "abc"}, {"id": "dp-finalidade", "value": "abc"}, {"id": "dp-destinatario", "value": "abc"}, {"id": "dp-s-informacao", "tag": "textarea", "value": "Compareceu ao serviço nesta data."}])["toast2"])
    com = [{"name": "tipo", "value": "encaminhamento"}, {"name": "data", "value": hoje(s)}, {"name": "destinatario", "value": "UBS X"}, {"name": "finalidade", "value": "abc"}, {"name": "fundamento", "value": ""},
           {"name": "conteudo", "value": "conteudo com dez"}, {"name": "visivel", "type": "checkbox", "checked": True}, {"name": "motivo", "value": ""}]
    print(" comunicação em encerrado (tela não oferece):", s.form("registrar-comunicacao", {"data-caso": "c05"}, com)["toast2"])
    def comu(c, **k):
        x = [dict(i) for i in com]
        for i in x:
            if i["name"] in k: i.update({"checked": k[i["name"]]} if i.get("type") == "checkbox" else {"value": k[i["name"]]})
        return s.form("registrar-comunicacao", {"data-caso": c}, x)["toast2"]
    print(" c04: quebra de sigilo por estagiário:", comu("c04", tipo="quebra-sigilo", fundamento="fundamento xx"), "| autorizada sem fundamento:", comu("c04", tipo="autorizada"), "| requisicao sem fundamento:", comu("c04", tipo="requisicao"),
          "| esconder sem motivo:", comu("c04", visivel=False), "| data futura:", comu("c04", data=mais(s, 1)), "| tipo inventado:", comu("c04", tipo="xyz"), "| conteúdo 5000:", comu("c04", conteudo="z" * 5000))
    print(" tipos:", s.js("() => PEP.lista('tiposComunicacao').map(t => t.id + (t.somenteResponsavel ? '*' : '') + (t.exigeFundamento ? '!' : ''))"))
    trocar(s, "rafael.supervisor")
    print(" rafael: orientação em encerrado:", s.burla("registrar-orientacao", {"caso": "c05"}, {"or-texto": "orientação em caso encerrado"})["toast2"], "| atribuir encerrado a outra dupla:", s.burla("nova-dupla", {"grupo": "g-b"})["toast2"],
          s.burla("atribuir-caso", {"id": "c05"}, {"cs-c05": s.js("() => PEP.db.subgrupos[PEP.db.subgrupos.length-1].id")})["toast2"], caso(s, "c05"))
    print(" rafael: ciência r02 2x:", s.burla("dar-ciencia-risco", {"id": "r02"})["toast2"], s.burla("dar-ciencia-risco", {"id": "r02"})["toast2"], "| notificação órgão inventado:", s.burla("registrar-notificacao", {"id": "r02"}, {"nt-orgao-r02": "xyz"})["toast2"],
          "| notificação de risco de outro grupo (r01):", s.burla("registrar-notificacao", {"id": "r01"}, {"nt-orgao-r01": "vigilancia"})["toast2"])
    trocar(s, "ana.tecnica"); print(" técnica notifica:", s.burla("registrar-notificacao", {"id": "r02"}, {"nt-orgao-r02": "vigilancia"})["toast2"], "| técnica dá ciência:", s.burla("dar-ciencia-risco", {"id": "r01"})["toast2"])
    trocar(s, "fabio.estagiario"); print(" estagiário notifica:", s.burla("registrar-notificacao", {"id": "r02"}, {"nt-orgao-r02": "vigilancia"})["toast2"], "| estagiário dá ciência:", s.burla("dar-ciencia-risco", {"id": "r02"})["toast2"],
          "| estagiário assina plano:", s.burla("assinar-plano", {"id": s.js("() => PEP.db.planosSeguranca[0].id")})["toast2"], "| encerra risco sem nota:", s.burla("encerrar-risco", {"id": "r02"}, {"rk-nota-r02": ""})["toast2"])
    s.fechar()

def F_passagem(nav, base):
    s = sessao(nav, base, "F"); s.entrar("helena.supervisora")
    def passar(c, destino, just="", avisado=True):
        return s.form("passar-caso", {"data-caso": c}, [{"name": "destino", "value": destino}, {"name": "justificativa", "value": just, "id": "pc-justificativa"}, {"name": "avisado", "type": "checkbox", "checked": avisado, "id": "pc-avisado"}])["toast2"]
    print("c01 com evolução enviada:", passar("c01", "d-a2", "justificativa longa o bastante"))
    print(" valida e18:", s.burla("validar-evolucao", {"id": "e18"})["toast2"])
    print(" sem aviso:", passar("c01", "d-a2", "justificativa longa o bastante", False), "| sem justificativa nem resumo:", passar("c01", "d-a2", "curta"), "| para outro grupo (t-b1):", passar("c01", "t-b1", "justificativa longa o bastante"),
          "| mesma dupla:", passar("c01", "d-a1", "justificativa longa o bastante"), "| dupla inexistente:", passar("c01", "zzz", "justificativa longa o bastante"), "| caso de outro grupo (c04):", passar("c04", "d-a1", "justificativa longa o bastante"))
    # Bia salva rascunho do resumo HOJE; supervisora passa com justificativa no mesmo dia
    trocar(s, "bia.estagiaria")
    print(" bia: rascunho do resumo:", s.burla("nova-evolucao", {"caso": "c01", "modo": "rascunho", "tipo": "transferencia"}, {"nova-transf": "Rascunho do resumo de transferência, incompleto."})["toast2"])
    trocar(s, "helena.supervisora")
    print(" passar com justificativa:", passar("c01", "d-a2", "A dupla saiu antes de terminar o resumo."), caso(s, "c01"), ult(s, "transferencias")[:260])
    trocar(s, "duda.estagiaria")
    print(" nova dupla (duda) pode escrever resumo da PRÓXIMA passagem?", s.js("() => PEP.regras.resumosDaPassagem(PEP.db.casos[0]).map(e => e.id + ':' + e.status + ':' + e.autorId)"))
    print("  duda tenta:", s.burla("nova-evolucao", {"caso": "c01", "modo": "rascunho", "tipo": "transferencia"}, {"nova-transf": "Resumo de transferência da nova dupla, incompleto."})["toast2"])
    s.ir("#/caso/c01/evolucoes"); print("  tela mostra o cartão de novo resumo?", s.p.locator("#resumo-transferencia").count(), "| aviso:", "já foi escrito" in s.texto(), "| duda vê o rascunho da Bia na lista?", "Rascunho do resumo" in s.texto())
    trocar(s, "bia.estagiaria"); s.ir("#/caso/c01"); print("  bia ainda abre c01?", s.h1())
    s.fechar()

def G_resumo_uma_passagem(nav, base):
    s = sessao(nav, base, "G"); s.entrar("bia.estagiaria")
    txt = "Período: x.\nDemanda: y\nObjetivos: z\nO que foi trabalhado: bastante coisa trabalhada.\nComo o paciente está agora: está bem melhor agora.\nSugestões para a continuidade: continuar o trabalho."
    print("resumo incompleto:", s.burla("nova-evolucao", {"caso": "c02", "modo": "enviar", "tipo": "transferencia"}, {"nova-transf": "O que foi trabalhado: abc"})["toast2"])
    print("resumo completo:", s.burla("nova-evolucao", {"caso": "c02", "modo": "enviar", "tipo": "transferencia"}, {"nova-transf": txt})["toast2"], "| segundo resumo:", s.burla("nova-evolucao", {"caso": "c02", "modo": "enviar", "tipo": "transferencia"}, {"nova-transf": txt})["toast2"])
    rid = s.js("() => PEP.db.evolucoes[PEP.db.evolucoes.length-1].id")
    trocar(s, "helena.supervisora"); print(" valida:", s.burla("validar-evolucao", {"id": rid})["toast2"])
    def passar(c, destino, just=""):
        return s.form("passar-caso", {"data-caso": c}, [{"name": "destino", "value": destino}, {"name": "justificativa", "value": just, "id": "pc-justificativa"}, {"name": "avisado", "type": "checkbox", "checked": True, "id": "pc-avisado"}])["toast2"]
    print(" passa c02 -> d-a2 com resumo:", passar("c02", "d-a2"), ult(s, "transferencias")[:200])
    print(" passa de volta d-a1 reaproveitando o resumo (sem justificativa):", passar("c02", "d-a1"), "| transferências:", s.js("() => PEP.db.transferencias.map(t => t.resumoId + '/' + t.justificativa)"))
    print(" sessões futuras do caso seguem agendadas após a passagem:", s.js("() => PEP.db.sessoes.filter(x => x.casoId==='c02' && x.presenca==='agendada').length"))
    trocar(s, "ana.tecnica")
    print(" técnica passa c02 p/ outro grupo sem motivo de acesso:", passar("c02", "t-b1", "Mudança de grupo combinada com a supervisão."), caso(s, "c02"))
    s.fechar()

def H_definir_dupla(nav, base):
    s = sessao(nav, base, "H"); s.entrar("helena.supervisora")
    print("Bia antes:", s.js("() => JSON.stringify(PEP.regras.alocacaoDoEstagiario('u-est1'))"))
    print(" mover Bia (já em dupla) para d-a2:", s.burla("definir-dupla", {"grupo": "g-a", "id": "u-est1"}, {"dup-u-est1": "d-a2"})["toast2"], s.js("() => JSON.stringify(PEP.db.alocacoes.filter(a => a.estagiarioId==='u-est1'))"))
    print(" estagiário de outro grupo:", s.burla("definir-dupla", {"grupo": "g-a", "id": "u-est5"}, {"dup-u-est5": "d-a2"})["toast2"], "| dupla de outro grupo:", s.burla("definir-dupla", {"grupo": "g-a", "id": "u-est1"}, {"dup-u-est1": "t-b1"})["toast2"],
          "| grupo alheio:", s.burla("definir-dupla", {"grupo": "g-b", "id": "u-est5"}, {"dup-u-est5": "t-b1"})["toast2"], "| nova dupla em grupo alheio:", s.burla("nova-dupla", {"grupo": "g-b"})["toast2"], "| grupo inexistente:", s.burla("nova-dupla", {"grupo": "zz"})["r"])
    trocar(s, "marta.direcao")
    print(" direção aloca quem já tem grupo:", s.burla("alocar-estagiario", {"id": "u-est1"}, {"gr-u-est1": "g-b"})["toast2"], "| aloca supervisor como estagiário:", s.burla("alocar-estagiario", {"id": "u-sup1"}, {"gr-u-sup1": "g-b"})["toast2"],
          "| id inexistente:", s.burla("alocar-estagiario", {"id": "fantasma"}, {"gr-fantasma": "g-b"})["toast2"], "| realoca Iara (encerrada):", s.burla("alocar-estagiario", {"id": "u-est9"}, {"gr-u-est9": "g-b"})["toast2"])
    print(" alocações estranhas:", s.js("() => PEP.db.alocacoes.slice(8).map(a => a.estagiarioId + '>' + a.grupoId)"))
    print(" direção: senha da própria conta:", s.burla("gerar-senha-provisoria", {"id": "u-dir"})["toast2"], "| de paciente:", s.burla("gerar-senha-provisoria", {"id": "u-pac1"})["toast2"], "| desativa a si:", s.burla("alternar-conta", {"id": "u-dir"})["toast2"],
          "| desativa paciente:", s.burla("alternar-conta", {"id": "u-pac1"})["toast2"], "| id inexistente:", s.burla("alternar-conta", {"id": "zz"})["toast2"])
    trocar(s, "ana.tecnica")
    print(" técnica: senha de supervisor:", s.burla("gerar-senha-provisoria", {"id": "u-sup1"})["toast2"], "| desativa direção:", s.burla("alternar-conta", {"id": "u-dir"})["toast2"], "| senha paciente:", s.burla("gerar-senha-provisoria", {"id": "u-pac1"}, espera=2500)["toast2"],
          "| portal p/ quem já tem:", s.burla("criar-acesso-portal", {"id": "p01"})["toast2"], "| portal p02:", s.burla("criar-acesso-portal", {"id": "p02"}, espera=2500)["toast2"], "| de novo:", s.burla("criar-acesso-portal", {"id": "p02"})["toast2"])
    s.fechar()

if __name__ == "__main__":
    todos = {k: v for k, v in globals().items() if callable(v) and len(k) > 2 and k[1] == "_" and k[0].isupper()}
    quais = ARGS or sorted(todos)
    with site() as (nav, base):
        for k in sorted(todos):
            if k[0] in quais or k in quais:
                print(f"\n########## {k} ##########")
                try: todos[k](nav, base)
                except Exception as e: print("  EXCEÇÃO DO SCRIPT:", repr(e)[:500])
