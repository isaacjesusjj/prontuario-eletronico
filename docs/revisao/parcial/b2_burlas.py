# Burlas dirigidas: cada cenário roda num contexto novo (dados originais) e imprime o resultado.
from base import *

def caso(s, id): return s.js("id => JSON.stringify(PEP.util.porId(PEP.db.casos, id))", id)
def ult(s, col, n=1): return s.js("([c,n]) => JSON.stringify(PEP.db[c].slice(-n))", [col, n])
def aud(s, n=4): return s.js("n => PEP.db.auditoria.slice(-n).map(a => a.usuarioId + '|' + a.acao + '|' + a.alvo)", n)
def trocar(s, login):
    s.sair(); s.entrar(login)

def A_abandono_sem_faltas(nav, base):
    s = sessao(nav, base, "A"); s.entrar("bia.estagiaria")
    print("faltasSeguidas c01:", s.js("() => PEP.regras.faltasSeguidas(PEP.db.casos[0])"), "emRisco:", s.js("() => PEP.regras.emRiscoDeAbandono(PEP.db.casos[0])"))
    # c01 tem e18 'enviada' (bloqueia encerrar); usa c02? c02 tem 2 faltas (fluxo legítimo). Então valida a e18 antes como supervisora.
    trocar(s, "helena.supervisora"); print(" validar e18:", s.burla("validar-evolucao", {"id": "e18"})["toast"])
    trocar(s, "bia.estagiaria")
    print(" contato:", s.burla("registrar-contato", {"caso": "c01"}, {"ct-canal": "canal inventado", "ct-resultado": "resultado inventado", "ct-motivo": "MOTIVO LIVRE DIGITADO"}))
    print(" encerrar-abandono:", s.burla("encerrar-abandono", {"caso": "c01"}))
    print(" caso:", caso(s, "c01")); print(" encerramento:", ult(s, "encerramentos")); print(" indicadores.motivosAbandono:", s.js("() => JSON.stringify(PEP.regras.indicadores(PEP.db.usuarios[0]).motivosAbandono)"))
    s.fechar()

def B_atribuir_caso_com_dupla(nav, base):
    s = sessao(nav, base, "B"); s.entrar("helena.supervisora")
    print("antes:", caso(s, "c01"), "| checklist bloqueia:", s.js("() => PEP.regras.checklistPassagem(PEP.db.casos[0]).filter(i => i.bloqueia && !i.ok).map(i => i.texto)"))
    print(" atribuir-caso:", s.burla("atribuir-caso", {"id": "c01"}, {"cs-c01": "d-a2"}))
    print(" depois:", caso(s, "c01"), "| transferencias:", s.js("() => PEP.db.transferencias.length"), "| aud:", aud(s, 1))
    # caso encerrado de outro... helena não tem encerrado; testa trocar de novo para dupla sem estagiário ativo (cria dupla vazia)
    print(" nova-dupla:", s.burla("nova-dupla", {"grupo": "g-a"})["toast"])
    nova = s.js("() => PEP.db.subgrupos[PEP.db.subgrupos.length-1].id")
    print(" atribuir a dupla vazia:", s.burla("atribuir-caso", {"id": "c01"}, {"cs-c01": nova})["toast"], caso(s, "c01"))
    s.fechar()

def C_alocar_caso_ativo_e_encerrado(nav, base):
    s = sessao(nav, base, "C"); s.entrar("ana.tecnica")
    print("c01 antes:", caso(s, "c01"))
    print(" alocar c01->g-b:", s.burla("alocar-caso", {"id": "c01"}, {"ag-c01": "g-b"}))
    print(" c01 depois:", caso(s, "c01"), "| transferencias:", s.js("() => PEP.db.transferencias.length"))
    print("c05 antes:", caso(s, "c05"))
    print(" alocar c05 (encerrado):", s.burla("alocar-caso", {"id": "c05"}, {"ag-c05": "g-a"}))
    print(" c05 depois:", caso(s, "c05"), "| encerramento continua:", s.js("() => !!PEP.regras.encerramentoDoCaso(PEP.util.porId(PEP.db.casos,'c05'))"))
    print(" alocar c07 com grupo vazio:", s.burla("alocar-caso", {"id": "c07"}, {"ag-c07": ""}), caso(s, "c07"))
    print(" alocar c07 com grupo inexistente:", s.burla("alocar-caso", {"id": "c07"}, {"ag-c07": "g-zzz"}), caso(s, "c07"))
    s.fechar()

def D_laudo_sem_avaliacao(nav, base):
    s = sessao(nav, base, "D"); s.entrar("bia.estagiaria")
    print("avaliacoes em c01:", s.js("() => PEP.db.avaliacoes.filter(a => a.casoId === 'c01').length"))
    s.js("() => { PEP.telas._modalidadeDoc = 'laudo'; }")
    campos = [{"id": "dp-titulo", "value": "Laudo psicológico"}, {"id": "dp-solicitante", "value": "Juízo X"}, {"id": "dp-finalidade", "value": "Perícia"},
              {"id": "dp-destinatario", "value": "Juízo X"}, {"id": "dp-validade", "value": "6 meses"}, {"id": "dp-local", "value": "São Paulo"}]
    for sec in ["demanda", "procedimento", "analise", "conclusao", "referencias"]:
        campos.append({"id": "dp-s-" + sec, "tag": "textarea", "value": "Texto da seção " + sec + " com mais de dez letras."})
    print(" emitir laudo:", s.form("emitir-documento", {"data-caso": "c01"}, campos))
    print(" doc:", ult(s, "documentos")[:200])
    # seção acima do limite e modalidade inexistente
    s.js("() => { PEP.telas._modalidadeDoc = 'declaracao'; }")
    grande = "A" * 9000
    r = s.form("emitir-documento", {"data-caso": "c01"}, [{"id": "dp-titulo", "value": "Decl"}, {"id": "dp-solicitante", "value": "abc"}, {"id": "dp-finalidade", "value": "abc"},
               {"id": "dp-destinatario", "value": "abc"}, {"id": "dp-s-informacao", "tag": "textarea", "value": grande}])
    print(" declaracao com 9000 caracteres (limite 3000):", r["toast"], "| tamanho gravado:", s.js("() => (PEP.db.documentos[PEP.db.documentos.length-1].conteudo.informacao||'').length"))
    # termo clínico fora da seção 'informacao' (título/finalidade)
    s.js("() => { PEP.telas._modalidadeDoc = 'declaracao'; }")
    r = s.form("emitir-documento", {"data-caso": "c01"}, [{"id": "dp-titulo", "value": "Declaração: transtorno de ansiedade (CID F41)"}, {"id": "dp-solicitante", "value": "abc"},
               {"id": "dp-finalidade", "value": "comprovar tratamento de depressão"}, {"id": "dp-destinatario", "value": "abc"}, {"id": "dp-s-informacao", "tag": "textarea", "value": "Compareceu ao serviço nesta data."}])
    print(" declaracao com termo clínico no título/finalidade:", r["toast"])
    r = s.form("emitir-documento", {"data-caso": "c01"}, [{"id": "dp-titulo", "value": "Decl"}, {"id": "dp-solicitante", "value": "abc"}, {"id": "dp-finalidade", "value": "abc"},
               {"id": "dp-destinatario", "value": "abc"}, {"id": "dp-s-informacao", "tag": "textarea", "value": "Paciente em tratamento por quadro ansioso e depressivo."}])
    s.js("() => { PEP.telas._modalidadeDoc = 'declaracao'; }")
    r = s.form("emitir-documento", {"data-caso": "c01"}, [{"id": "dp-titulo", "value": "Decl"}, {"id": "dp-solicitante", "value": "abc"}, {"id": "dp-finalidade", "value": "abc"},
               {"id": "dp-destinatario", "value": "abc"}, {"id": "dp-s-informacao", "tag": "textarea", "value": "Paciente em tratamento por quadro ansioso e depressivo, com TAG e TDAH."}])
    print(" declaracao 'quadro ansioso e depressivo, TAG, TDAH':", r["toast"], r["r"])
    s.fechar()

def E_anexo_sem_motivo(nav, base):
    import struct, zlib
    png = PASTA + "/um.png"
    raw = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    open(png, "wb").write(raw)
    s = sessao(nav, base, "E"); s.entrar("bia.estagiaria")
    s.ir("#/caso/c01/documentos"); s.p.set_input_files("#ax-arquivo", png); s.p.fill("#ax-desc", "exame clínico trazido pelo paciente")
    s.clicar('[data-acao="anexar"]'); s.p.wait_for_timeout(600); print("anexar (bia):", s.toast(), ult(s, "anexos")[:160])
    aid = s.js("() => PEP.db.anexos[PEP.db.anexos.length-1].id")
    trocar(s, "ana.tecnica")
    s.js("() => { window.__aberto = []; window.open = function (u) { window.__aberto.push(String(u).slice(0, 20)); return null; }; }")
    print(" precisaJustificar(ana, c01):", s.js("() => PEP.regras.precisaJustificar(PEP.estado.usuarioAtual(), PEP.db.casos[0])"))
    r = s.burla("abrir-anexo", {"id": aid}, espera=800)
    print(" abrir-anexo sem motivo:", r, "| window.open chamado com:", s.js("() => window.__aberto"), "| aud:", aud(s, 2))
    # anexar sem motivo (precisa de input file real): usa a tela? a tela pede motivo. Monta input e chama.
    s.ir("#/painel")
    s.js("() => { var i = document.createElement('input'); i.type='file'; i.id='ax-arquivo'; document.body.insertBefore(i, document.body.firstChild); }")
    s.p.set_input_files("#ax-arquivo", png)
    n0 = s.js("() => PEP.db.anexos.length")
    s.js("() => { var b = document.createElement('button'); b.setAttribute('data-caso','c01'); PEP.acoes.anexar(b); }"); s.p.wait_for_timeout(800)
    print(" anexar sem motivo (ana):", s.toast(), "| anexos", n0, "->", s.js("() => PEP.db.anexos.length"))
    # outras ações clínicas sem motivo
    print(" registrar-comunicacao sem motivo:", s.form("registrar-comunicacao", {"data-caso": "c01"}, [{"name": "tipo", "value": "encaminhamento"}, {"name": "data", "value": "2026-01-01"}, {"name": "destinatario", "value": "UBS X"},
        {"name": "finalidade", "value": "abc"}, {"name": "fundamento", "value": "fundamento"}, {"name": "conteudo", "value": "conteudo com dez"}, {"name": "visivel", "type": "checkbox", "checked": True}, {"name": "motivo", "value": ""}])["toast"])
    print(" entrega doc01 sem motivo:", s.burla("registrar-evento-documento", {"id": "doc01", "tipo": "entrega"}, {"ev-para": "alguém"})["toast"])
    print(" registrar-risco sem motivo (c01 ativo):", s.burla("registrar-risco", {"caso": "c01"}, {"rk-desc": "descrição de risco pela técnica", "rk-n": {"radio": "rk-nivel", "value": "baixo"}, "rk-tipo": "autolesao"})["toast"])
    print(" registrar-consentimento sem motivo:", s.burla("registrar-consentimento", {"caso": "c01", "fin": "gravacao", "valor": "sim"})["toast"])
    print(" imprimir-documento doc01 sem motivo:", s.burla("imprimir-documento", {"id": "doc01"}), aud(s, 1))
    for rota in ["#/caso/c01", "#/caso/c01/evolucoes", "#/caso/c01/sessoes", "#/caso/c01/documentos", "#/caso/c01/risco", "#/caso/c01/restrita", "#/caso/c01/supervisao", "#/documento/doc01", "#/imprimir/c01", "#/paciente/p01/editar"]:
        s.ir(rota); print("  rota", rota, "->", s.texto().replace("\n", " ")[:170])
    s.fechar()

def F_pedido_copia(nav, base):
    s = sessao(nav, base, "F"); s.entrar("paciente01")
    print("solicitar 1:", s.burla("solicitar-copia")["toast"]); print("solicitar 2 (repetida):", s.burla("solicitar-copia")["toast"], "| total:", s.js("() => PEP.db.solicitacoes.length"))
    sid = s.js("() => PEP.db.solicitacoes[0].id")
    print(" paciente tenta conferir/gerar link:", s.burla("conferir-identidade", {"id": sid})["toast"], s.burla("gerar-link", {"id": sid})["toast"], s.burla("marcar-entregue", {"id": sid})["toast"])
    trocar(s, "ana.tecnica")
    print(" gerar-link sem conferir:", s.burla("gerar-link", {"id": sid})["toast"])
    print(" marcar-entregue SEM conferir identidade:", s.burla("marcar-entregue", {"id": sid}, {"forma-" + sid: "forma inventada"}), ult(s, "solicitacoes", 2)[:330])
    print(" conferir-identidade depois de entregue (regride):", s.burla("conferir-identidade", {"id": sid})["toast"], s.js("id => PEP.util.porId(PEP.db.solicitacoes,id).status", sid))
    print(" gerar-link 2x:", s.burla("gerar-link", {"id": sid})["toast"], s.burla("gerar-link", {"id": sid})["toast"], "| links:", s.js("() => PEP.db.linksAcesso.length"))
    lid = s.js("() => PEP.db.linksAcesso[0].id")
    print(" revogar 2x:", s.burla("revogar-link", {"id": lid})["toast"], s.js("() => PEP.db.linksAcesso[0].revogadoEm"))
    print(" id inexistente:", s.burla("marcar-entregue", {"id": "nao-existe"})["r"], "|", s.burla("conferir-identidade", {"id": "nao-existe"})["r"])
    s.fechar()

def G_responder_titular_de_novo(nav, base):
    s = sessao(nav, base, "G"); s.entrar("ana.tecnica")
    print("pt01 antes:", s.js("() => JSON.stringify(PEP.db.pedidosTitular[0])"))
    print(" responder de novo:", s.burla("responder-titular", {"id": "pt01"}, {"resp-pt01": "RESPOSTA SOBRESCRITA"})["toast"])
    print(" pt01 depois:", s.js("() => JSON.stringify(PEP.db.pedidosTitular[0])"))
    s.fechar()

def H_triagem_duas_vezes(nav, base):
    s = sessao(nav, base, "H"); s.entrar("ana.tecnica")
    campos = {"tr-nome": "Pessoa Inscrita 03", "tr-social": "", "tr-nasc": "2014-03-02", "tr-cpf": "", "tr-tel": "11900001003", "tr-email": "", "tr-resp": "Responsavel Exemplo", "tr-resptel": "",
              "tr-canal": "whatsapp", "tr-emnome": "", "tr-emvinc": "", "tr-emtel": "", "tr-demanda": "Demanda da triagem", "tr-risco": "sem", "tr-destino": "clinica", "tr-grupo": "",
              "tr-c-contrato": {"check": False}}
    n = lambda: s.js("() => [PEP.db.pacientes.length, PEP.db.casos.length, PEP.db.inscricoes.filter(i => i.id==='i03')[0].status, PEP.db.inscricoes.filter(i => i.id==='i03')[0].casoId]")
    print("antes:", n())
    print(" triagem 1:", s.burla("concluir-triagem", {"id": "i03"}, campos)["toast"], n())
    print(" triagem 2 (mesma inscrição):", s.burla("concluir-triagem", {"id": "i03"}, campos)["toast"], n())
    print(" consentimento 'contrato' do caso criado sem marcar:", s.js("() => { var c = PEP.db.casos[PEP.db.casos.length-1]; return PEP.regras.consentiu(c,'contrato') + ' status=' + c.status; }"))
    print(" marcar-duplicada em inscrição já triada:", s.burla("marcar-duplicada", {"id": "i03"})["toast"], n())
    # grupo inexistente / risco com tipo e nível inventados
    c2 = dict(campos); c2.update({"tr-nome": "Pessoa Inscrita 01", "tr-nasc": "1999-05-21", "tr-cpf": "97880932054", "tr-tel": "11900001001", "tr-resp": "", "tr-grupo": "g-nao-existe", "tr-c-contrato": {"check": True},
                                  "tr-risco": "risco", "tr-rk-desc": "descrição do risco na triagem", "tr-rk-tipo": "tipo-inventado", "tr-rk-nivel": "nivel-inventado"})
    print(" triagem com grupo inexistente e risco inventado:", s.burla("concluir-triagem", {"id": "i01"}, c2)["toast"], ult(s, "casos")[:200], ult(s, "riscos")[:200])
    print(" id inexistente:", s.burla("concluir-triagem", {"id": "zzz"}, campos)["r"])
    s.fechar()

def I_adendo_e_evolucao(nav, base):
    s = sessao(nav, base, "I"); s.entrar("bia.estagiaria")
    print("adendo sem motivo:", s.burla("adicionar-adendo", {"id": "e01"}, {"adtxt-e01": "adendo sem motivo"})["toast"], ult(s, "adendos")[:200])
    print("adendo motivo fora da lista:", s.burla("adicionar-adendo", {"id": "e01"}, {"adtxt-e01": "adendo dois", "admot-e01": "<b>qualquer</b>"})["toast"])
    print("adendo em evolução não validada (e18):", s.burla("adicionar-adendo", {"id": "e18"}, {"adtxt-e18": "adendo"})["toast"])
    # sessão de outro caso / sessão sem presença / sessão que já tem evolução
    for sid, rot in [("s13", "sessão de OUTRO caso (c04)"), ("s31", "sessão futura agendada"), ("s01", "sessão que já tem evolução"), ("nao-existe", "sessão inexistente"), ("s03", "sessão com falta justificada")]:
        r = s.burla("nova-evolucao", {"caso": "c01", "modo": "enviar"}, {"nova-texto": "Evolução de teste ligada a " + rot, "nova-sessao": sid})
        print(" nova-evolucao com", rot, "->", r["toast"], "| sessaoId gravado:", s.js("() => PEP.db.evolucoes[PEP.db.evolucoes.length-1].sessaoId"))
    # ciclo: editar enviada/validada; salvar evolução de colega; validar como estagiária
    print(" editar e18 (enviada, do Caio):", s.burla("salvar-evolucao", {"id": "e18", "modo": "rascunho"}, {"ev-e18": "texto trocado pela colega"})["toast"])
    print(" editar e01 (validada, dela):", s.burla("salvar-evolucao", {"id": "e01", "modo": "rascunho"}, {"ev-e01": "texto trocado depois de validada"})["toast"])
    print(" validar como estagiária:", s.burla("validar-evolucao", {"id": "e18"})["toast"])
    print(" texto >5000:", s.burla("nova-evolucao", {"caso": "c01", "modo": "rascunho"}, {"nova-texto": "x" * 5001, "nova-sessao": ""})["toast"])
    # reenviar: e04 é rascunho dela
    print(" enviar e04:", s.burla("salvar-evolucao", {"id": "e04", "modo": "enviar"}, {"ev-e04": "Texto final da evolução enviada."})["toast"])
    print(" enviar e04 de novo (já enviada):", s.burla("salvar-evolucao", {"id": "e04", "modo": "enviar"}, {"ev-e04": "Texto trocado depois de enviada."})["toast"])
    trocar(s, "helena.supervisora")
    print(" devolver sem comentário:", s.burla("devolver-evolucao", {"id": "e04"}, {"com-e04": ""})["toast"])
    print(" validar e04:", s.burla("validar-evolucao", {"id": "e04"})["toast"], "| validar de novo:", s.burla("validar-evolucao", {"id": "e04"})["toast"])
    print(" devolver validada:", s.burla("devolver-evolucao", {"id": "e04"}, {"com-e04": "comentário"})["toast"])
    print(" assinaturas vigentes e04:", s.js("() => PEP.regras.assinaturasVigentes(PEP.util.porId(PEP.db.evolucoes,'e04')).map(a => a.papel + ':' + a.usuarioId)"))
    print(" supervisora valida rascunho alheio / de outro grupo (e07, c04):", s.burla("validar-evolucao", {"id": "e07"})["toast"])
    print(" assinar-anamnese 2x:", s.burla("assinar-anamnese", {"id": s.js("() => PEP.regras.anamneseAtual(PEP.db.casos[0]).id")})["toast"],
          s.burla("assinar-anamnese", {"id": s.js("() => PEP.regras.anamneseAtual(PEP.db.casos[0]).id")})["toast"],
          "| assinaturas de supervisor na anamnese:", s.js("() => PEP.regras.assinaturasDe('anamnese', PEP.regras.anamneseAtual(PEP.db.casos[0]).id).filter(a => a.papel==='supervisor').length"))
    s.fechar()

def K_eventos_documento(nav, base):
    s = sessao(nav, base, "K"); s.entrar("bia.estagiaria")
    print("doc01 válido:", s.js("() => PEP.regras.documentoValido(PEP.db.documentos[0])"), "assinaturas:", s.js("() => PEP.regras.assinaturasDe('documento','doc01').map(a => a.papel)"))
    print(" entrega 1:", s.burla("registrar-evento-documento", {"id": "doc01", "tipo": "entrega"}, {"ev-para": "a paciente"})["toast"])
    print(" entrega 2 (repetida):", s.burla("registrar-evento-documento", {"id": "doc01", "tipo": "entrega"}, {"ev-para": "outra pessoa"})["toast"], "| eventos:", s.js("() => PEP.db.eventosDocumento.map(e => e.tipo + ':' + e.para)"))
    print(" anular depois de entregue:", s.burla("registrar-evento-documento", {"id": "doc01", "tipo": "anulacao"}, {"ev-motivo-anul": "motivo de anulação"})["toast"])
    print(" tipo inventado em declaração (sem devolutiva):", s.burla("registrar-evento-documento", {"id": "doc01", "tipo": "xyz"}))
    print(" devolutiva em declaração:", s.burla("registrar-evento-documento", {"id": "doc01", "tipo": "devolutiva"})["toast"])
    # relatório emitido pela bia, assinado pela helena, depois tipo inventado com devolutiva pendente
    s.js("() => { PEP.telas._modalidadeDoc = 'relatorio'; }")
    campos = [{"id": "dp-titulo", "value": "Relatório"}, {"id": "dp-solicitante", "value": "Escola"}, {"id": "dp-finalidade", "value": "Acompanhamento"}, {"id": "dp-destinatario", "value": "Escola"}, {"id": "dp-validade", "value": "6 meses"}]
    for sec in ["demanda", "procedimento", "analise", "conclusao"]: campos.append({"id": "dp-s-" + sec, "tag": "textarea", "value": "Texto da seção " + sec + " com mais de dez."})
    print(" emitir relatório:", s.form("emitir-documento", {"data-caso": "c01"}, campos)["toast"])
    did = s.js("() => PEP.db.documentos[PEP.db.documentos.length-1].id")
    print(" estagiária assina como supervisor:", s.burla("assinar-documento", {"id": did})["toast"], "| entrega sem assinatura:", s.burla("registrar-evento-documento", {"id": did, "tipo": "entrega"}, {"ev-para": "escola"})["toast"],
          "| imprimir sem assinatura:", s.burla("imprimir-documento", {"id": did})["toast"])
    trocar(s, "helena.supervisora"); print(" helena assina:", s.burla("assinar-documento", {"id": did})["toast"], "| 2x:", s.burla("assinar-documento", {"id": did})["toast"], "| assin.:", s.js("id => PEP.regras.assinaturasDe('documento', id).map(a => a.papel)", did))
    r = s.burla("registrar-evento-documento", {"id": did, "tipo": "tipo-inventado"})
    print(" tipo inventado com devolutiva pendente:", r, "| eventos do doc:", s.js("id => PEP.db.eventosDocumento.filter(e => e.documentoId === id).map(e => e.tipo)", did))
    s.fechar()

def L_anular_depois_de_sair(nav, base):
    s = sessao(nav, base, "L"); s.entrar("marta.direcao")
    print("encerrar estágio da Bia:", s.burla("encerrar-estagio", {"id": "u-est1"})["toast"])
    trocar(s, "bia.estagiaria")
    print(" bia vê c01?", s.js("() => PEP.regras.podeVerCaso(PEP.estado.usuarioAtual(), PEP.db.casos[0])"))
    print(" bia anula doc01 (dela) sem vínculo:", s.burla("registrar-evento-documento", {"id": "doc01", "tipo": "anulacao"}, {"ev-motivo-anul": "anulado por quem já saiu do caso"}),
          "| eventos:", s.js("() => PEP.db.eventosDocumento.map(e => e.tipo + ' por ' + e.registradoPor)"), "| válido:", s.js("() => PEP.regras.documentoValido(PEP.db.documentos[0])"))
    print(" bia salva rascunho e04 sem vínculo:", s.burla("salvar-evolucao", {"id": "e04", "modo": "enviar"}, {"ev-e04": "Texto enviado sem vínculo ativo."})["toast"])
    print(" bia imprime doc01:", s.burla("imprimir-documento", {"id": "doc01"})["toast"], aud(s, 2))
    s.fechar()

def M_consentimentos(nav, base):
    s = sessao(nav, base, "M"); s.entrar("ana.tecnica")
    print("finalidade inventada:", s.burla("registrar-consentimento", {"caso": "c01", "fin": "finalidade-inventada", "valor": "sim"})["toast"], ult(s, "consentimentos")[:160])
    print("revogar contrato obrigatório (tela não oferece):", s.burla("registrar-consentimento", {"caso": "c01", "fin": "contrato", "valor": "nao"})["toast"], "| consentiu contrato:", s.js("() => PEP.regras.consentiu(PEP.db.casos[0],'contrato')"), "| caso:", caso(s, "c01"))
    print("consentimento em caso encerrado c05:", s.burla("registrar-consentimento", {"caso": "c05", "fin": "gravacao", "valor": "sim"})["toast"])
    print("caso inexistente:", s.burla("registrar-consentimento", {"caso": "zzz", "fin": "gravacao", "valor": "sim"})["r"])
    trocar(s, "paciente01")
    print(" paciente revoga contrato (obrigatória):", s.burla("paciente-consentimento", {"caso": "c01", "fin": "contrato", "valor": "nao"})["toast"])
    print(" paciente em caso alheio c02:", s.burla("paciente-consentimento", {"caso": "c02", "fin": "gravacao", "valor": "sim"})["toast"])
    n0 = s.js("() => PEP.db.consentimentos.length")
    print(" paciente revoga lembretes:", s.burla("paciente-consentimento", {"caso": "c01", "fin": "lembretes", "valor": "nao"})["toast"], "| novo registro:", s.js("() => PEP.db.consentimentos.length") - n0,
          "| histórico:", s.js("() => PEP.regras.historicoConsentimento(PEP.db.casos[0],'lembretes').map(c => c.concedido + '@' + c.em)"))
    s.fechar()

def N_paciente(nav, base):
    s = sessao(nav, base, "N"); s.entrar("paciente01")
    print("confirmar sessão passada com presença (s01):", s.burla("confirmar-sessao", {"id": "s01"})["toast"], s.js("() => PEP.util.porId(PEP.db.sessoes,'s01').confirmada"))
    print("confirmar sessão de outro paciente (s12/c03):", s.burla("confirmar-sessao", {"id": "s12"})["toast"])
    print("confirmar inexistente:", s.burla("confirmar-sessao", {"id": "zzz"})["r"])
    print("avisar falta sessão de outro (s12):", s.burla("avisar-falta", {"id": "s12"}, {"mf-s12": "saude"})["toast"])
    print("avisar falta sessão passada (s29):", s.burla("avisar-falta", {"id": "s29"}, {"mf-s29": "saude"})["toast"])
    print("avisar falta motivo livre:", s.burla("avisar-falta", {"id": "s31"}, {"mf-s31": "estou em crise, preciso de ajuda"})["toast"])
    print("avisar falta HOJE (s30, hora 14:00):", s.burla("avisar-falta", {"id": "s30"}, {"mf-s30": "saude"})["toast"], s.js("() => JSON.stringify(PEP.util.porId(PEP.db.sessoes,'s30'))")[:200])
    print("avisar de novo a mesma:", s.burla("avisar-falta", {"id": "s30"}, {"mf-s30": "trabalho-estudo"})["toast"])
    print("confirmar sessão já avisada como falta (s30):", s.burla("confirmar-sessao", {"id": "s30"})["toast"], s.js("() => { var x = PEP.util.porId(PEP.db.sessoes,'s30'); return x.presenca + ' confirmada=' + x.confirmada; }"))
    print("pedido titular tipo inventado:", s.burla("pedido-titular", {}, {"pt-desc": "pedido qualquer", "pt-tipo": "tipo-inventado"})["toast"], ult(s, "pedidosTitular")[:140])
    print("paciente troca sala/presença:", s.burla("registrar-presenca", {"id": "s31", "valor": "presente"})["toast"], s.burla("agendar-sessao", {"caso": "c01"}, {"ag-data": "2030-01-10", "ag-hora": "10:00", "ag-sala": "Sala 4"})["toast"])
    for rota in ["#/caso/c01", "#/caso/c02/evolucoes", "#/documento/doc01", "#/imprimir/c01", "#/casos", "#/busca", "#/indicadores", "#/auditoria", "#/solicitacoes", "#/pedidos-lgpd", "#/fila", "#/alocacao", "#/estudantes", "#/supervisao", "#/triagem/i01", "#/paciente/p01/editar", "#/agenda/dia/" + s.js("() => PEP.util.hoje()")]:
        s.ir(rota); print("  rota", rota, "->", s.texto().replace("\n", " ")[:120])
    s.ir("#/meus-dados"); print("  meus-dados acessos:", s.p.locator("#app table").last.inner_text().replace("\n", " | ")[:600])
    s.fechar()

if __name__ == "__main__":
    todos = {k: v for k, v in globals().items() if callable(v) and len(k) > 2 and k[1] == "_" and k[0].isupper()}
    quais = ARGS or sorted(todos)
    with site() as (nav, base):
        for k in sorted(todos):
            if k[0] in quais or k in quais:
                print(f"\n########## {k} ##########")
                try: todos[k](nav, base)
                except Exception as e: print("  EXCEÇÃO DO SCRIPT:", repr(e)[:400])
