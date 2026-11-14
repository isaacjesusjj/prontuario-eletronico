# Revisão `regras-site` (RS) — as regras de negócio valem nas AÇÕES do site?

Scripts e saídas: `docs/revisao/parcial/` (`base.py` + `b1…b5`). Cada cenário roda num contexto novo do navegador (dados originais), logado com a conta indicada, e chama `PEP.acoes[...]`/`PEP.formularios[...]` com botão/formulário falso e campos montados no DOM.

## Resumo

- O que **impede leitura** está sólido: nenhuma rota rende prontuário para quem não pode (estagiária de fora, vínculo encerrado, sem grupo, supervisor de outro grupo, direção, paciente, visitante), e as 55 ações + 3 formulários chamados direto por esses perfis respondem "Sem permissão" sem gravar nada (fora o registro de impressão, RS-13).
- O que falha é a **escrita por quem já tem algum papel**: várias ações conferem "quem é" mas não conferem "em que estado está" (caso encerrado, caso que já tem dupla, inscrição já triada, pedido já entregue, fluxo de abandono aberto). São essas que quebram regras centrais: abandono sem faltas, troca de dupla sem a passagem, reabertura de caso encerrado.
- Há três vazamentos alcançáveis **pela tela, sem console**: a direção lê nomes de pacientes no `confirm()` de "Encerrar estágio" (RS-05), o termo da busca fica para a próxima pessoa que entrar na mesma aba (RS-10) e o paciente transforma em "falta justificada" uma sessão que já passou (RS-08).
- Regras numéricas e datas: sem erro de fuso nem de virada do dia nas contas principais; os indicadores batem com a recontagem independente (ver "O que conferi").
- Padrão de correção: toda ação deveria repetir a mesma condição que a tela usa para mostrar o botão. Hoje a condição mora só na tela em pelo menos 14 ações.

**Contagem:** crítico 0 · alto 5 · médio 14 · baixo 17.

---

## Achados altos

### [RS-01] Encerramento por abandono sem nenhuma falta (o fluxo de faltas não é conferido)
- Gravidade: alto · Status: CONFIRMADO
- Onde: `js/acoes.js:393-399` (`registrar-contato`) e `:400-414` (`encerrar-abandono`)
- Problema: as duas ações conferem só `podeRegistrarPresenca`/`podeEncerrar`. Nenhuma confere `R().emRiscoDeAbandono(c)`. Um estagiário do caso encerra por abandono um caso com **0 faltas**, cancela as sessões futuras e grava no indicador de abandono (o dado que o cliente mais quer) um motivo de texto livre. `canal`, `resultado` e `motivo` também não são conferidos contra as listas de `_config`. Além disso, um contato antigo (de um fluxo anterior em que o paciente voltou) já satisfaz "tem tentativa de contato".
- Evidência: `b2_burlas.py A` (bia, caso c01): `faltasSeguidas: 0` → `registrar-contato` "Tentativa de contato registrada." → `encerrar-abandono` "Caso encerrado e vaga liberada."; encerramento gravado: `"tipo":"abandono","motivo":"MOTIVO LIVRE DIGITADO","registro":"Encerrado por abandono após 0 faltas seguidas e 1 tentativa(s)…"`; `indicadores().motivosAbandono = {"Horário incompatível":1,"MOTIVO LIVRE DIGITADO":1}`.
- Correção sugerida: nas duas ações, `if (!R().emRiscoDeAbandono(c)) return negar();`; validar `ct-canal`, `ct-resultado` e `ct-motivo` contra `PEP.lista(...)`; em `encerrar-abandono`, contar só contatos feitos depois da primeira falta da sequência atual. Teste: chamar as duas ações em c01 (sem faltas) e exigir caso `ativo` e `encerramentos` sem mudança.

### [RS-02] Supervisor troca a dupla de um caso sem a passagem (`atribuir-caso`)
- Gravidade: alto · Status: CONFIRMADO
- Onde: `js/acoes.js:714-721`
- Problema: a ação só confere `ehSupervisorDoCaso` e que a dupla é do grupo. Não confere `!c.subgrupoId` nem `c.status === 'ativo'` (a tela só oferece para caso ativo sem dupla, `telas-gestao.js:167`). Resultado: a regra "caso que já tem dupla só muda de dupla pela passagem" é contornada: sem registro em `transferencias`, sem "paciente avisado", sem resumo/justificativa e **mesmo com evolução esperando a supervisão**. Aceita também dupla vazia (o caso fica sem ninguém) e caso **encerrado** (a nova dupla ganha acesso a um prontuário fechado).
- Evidência: `b2_burlas.py B` (helena, c01 com a e18 "enviada"): checklist diz "1 evolução(ões) esperando a supervisão", e `atribuir-caso` responde "Caso atribuído à dupla." → `subgrupoId: d-a1 → d-a2`, `transferencias: 0`. Dupla recém-criada e vazia: aceita. `b3_burlas.py E` (rafael): c05 encerrado atribuído a outra dupla.
- Correção sugerida: `if (c.status !== 'ativo' || c.subgrupoId) return PEP.ui.toast('Este caso já tem dupla: use a "Passagem do caso".');` e exigir `R().subgrupoTemEstagiarioAtivo(sub.id)` (exportar a função). Teste: `atribuir-caso` em c01 não muda `subgrupoId`.

### [RS-03] Técnica realoca caso em andamento e reabre caso encerrado (`alocar-caso`)
- Gravidade: alto · Status: CONFIRMADO
- Onde: `js/acoes.js:671-677`
- Problema: a ação não confere `c.status === 'aguardando-alocacao'` nem se o grupo existe. Chamada para um caso ativo, tira a dupla (`subgrupoId: null`) e muda o grupo sem passagem. Chamada para um caso **encerrado**, grava `status: 'ativo'`: o caso volta a ser atendido com o registro de encerramento ainda lá ("nada é apagado" e o encerramento deixam de valer).
- Evidência: `b2_burlas.py C` (ana): c01 `g-a/d-a1` → `g-b/null`, `transferencias: 0`; c05 `"status":"encerrado"` → `"status":"ativo","grupoId":"g-a"`, com `encerramentoDoCaso(c05)` ainda presente.
- Correção sugerida: `if (c.status !== 'aguardando-alocacao') return negar();` e `if (!repo().porId('grupos', val('ag-' + c.id))) return PEP.ui.toast('Escolha o grupo.');`. Teste: `alocar-caso` em c05 mantém `encerrado`.

### [RS-04] Autor sem vínculo anula documento válido (o acesso não morre com o vínculo)
- Gravidade: alto · Status: CONFIRMADO
- Onde: `js/permissoes.js:373-376` (`podeAnularDocumento`: `d.autorId === u.id || ehSupervisorDoCaso`) usado em `js/acoes.js:453`
- Problema: quem emitiu o documento continua podendo anulá-lo depois de perder o caso (estágio encerrado ou caso passado para outra dupla). A estagiária já não abre o caso, mas tira a validade de um documento assinado pelo supervisor.
- Evidência: `b2_burlas.py L`: direção encerra o estágio da Bia; `podeVerCaso(bia, c01) = false`; `registrar-evento-documento` (tipo `anulacao`, doc01) → "Documento anulado: continua no prontuário, sem validade."; `documentoValido(doc01) = false`; auditoria `u-est1|Anulou documento psicológico|c01`.
- Correção sugerida: `(d.autorId === u.id && ehEstagiarioDoCaso(u, c)) || ehSupervisorDoCaso(u, c)`; conferir a mesma condição na política RLS de `eventos_documento`. Teste: repetir o cenário e exigir "Sem permissão".

### [RS-05] Direção vê nomes de pacientes ao encerrar um estágio (pela tela)
- Gravidade: alto · Status: CONFIRMADO
- Onde: `js/acoes.js:690-693` (`encerrar-estagio`)
- Problema: o `confirm()` lista `PEP.ui.nomePacienteDoCaso(c)` dos casos que ficam sem dupla. A direção "vê só indicadores agregados, nunca prontuário", e o próprio painel dela afirma que nomes de pacientes ficam restritos à equipe. Aqui ela lê o nome e fica sabendo qual dupla atende quem. É uso normal do botão "Encerrar estágio" em `#/alocacao`, não precisa de console. Com o banco ligado a direção nem receberia `pacientes`, e a mensagem sairia com "—".
- Evidência: `b3_burlas.py A` (marta): texto do diálogo: `Encerrar o vínculo de estágio de Bia? … Fica sem dupla ativa: Paciente Exemplo 01, Paciente Exemplo 02. Combine com a supervisão…`.
- Correção sugerida: mostrar só a quantidade ("2 caso(s) ficam sem dupla ativa") — o toast de depois já faz assim. Teste: capturar o `confirm` e exigir que não contenha nenhum `pacientes[].nome`.

---

## Achados médios

### [RS-06] Técnica abre e inclui anexo sem registrar o motivo do acesso
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:486-494` (`abrir-anexo`) e `:471-485` (`anexar`): usam `podeVerCaso`, não `podeVerConteudoClinico`
- Problema: anexo é conteúdo clínico (encaminhamento, exames). A tela pede o motivo antes de mostrar a aba Documentos, mas a ação abre o arquivo sem ele. Fica só "Abriu anexo" na auditoria, sem motivo, e o paciente não vê o porquê em "quem acessou".
- Evidência: `b2_burlas.py E`: `precisaJustificar(ana, c01) = true`; `abrir-anexo` → `window.open('blob:…')` chamado; `anexar` → "Anexo guardado" (anexos 2 → 3).
- Correção sugerida: trocar para `R().podeVerConteudoClinico(u, c)` nas duas. Teste: técnica sem motivo → "Sem permissão" e `window.open` não chamado.

### [RS-07] Laudo emitido sem avaliação psicológica; limites de tamanho só no HTML
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:1029-1055` (`emitir-documento`); a conferência existe só na tela (`telas-caso-extra.js:105-107`)
- Problema: a ação não confere `m.exigeAvaliacao`. Também não confere `documentoSecaoMaxCaracteres` (só o `maxlength` do campo), e o mesmo vale para `comunicacaoMaxCaracteres` em `registrar-comunicacao` (`:1057-1073`).
- Evidência: `b2_burlas.py D` (bia, c01, 0 avaliações, `_modalidadeDoc = 'laudo'`): "Laudo psicológico emitido. Falta a assinatura do supervisor."; declaração com 9000 caracteres gravada (limite 3000); `b3_burlas.py E`: comunicação com 5000 caracteres (limite 1000).
- Correção sugerida: `if (m.exigeAvaliacao && !PEP.db.avaliacoes.some(a => a.casoId === c.id)) return PEP.ui.toast(...)`; validar os dois limites na ação. Teste: emitir laudo em c01 → nenhum documento novo.

### [RS-08] Paciente "avisa" falta de sessão que já passou (comparação só pela data)
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/permissoes.js:268-271` (`podeAvisarFalta`: `s.data >= PEP.util.hoje()`); mesma conta em `telas-painel.js:16` e `telas-agenda.js:43`
- Problema: a regra é "só avisa falta de sessão **futura**". No dia da sessão, depois do horário, o portal continua oferecendo "Não vou poder ir". Quem faltou às 14h marca às 18h (ou 23h59) e a falta vira `falta-justificada`, que não conta para o fluxo de abandono. É pela tela, sem console.
- Evidência: `b2_burlas.py N` (paciente01, 18h06, sessão s30 de hoje às 14h00): "Aviso enviado. A falta avisada não conta como abandono"; sessão gravada com `presenca: "falta-justificada", avisadoEm: "…T18:06"`.
- Correção sugerida: comparar data e hora: `(s.data + 'T' + s.hora) > PEP.util.agora()` (e o mesmo no banco). Teste: sessão de hoje com hora anterior → "Sem permissão".

### [RS-09] Lembrete ignora "Não quero lembretes" e o canal escolhido
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:374-392` (`lembrete`); `js/telas-caso-extra.js:24, 59`
- Problema: tela e ação olham só o consentimento `lembretes`. O campo do cadastro `canalLembrete` (`whatsapp`/`email`/`nenhum` = "Não quero lembretes") não é lido em lugar nenhum fora do Resumo. A própria tela diz "Lembretes desligados: o paciente… escolheu não recebê-los", mas isso não acontece. A ação também aceita sessão passada/já com presença e canal inventado (grava `canal: "sms"` e manda por e-mail).
- Evidência: `b3_burlas.py C`: técnica grava `canalLembrete: "nenhum"` em p01; a aba Sessões ainda mostra 12 botões de lembrete; `lembrete` → "Lembrete aberto no WhatsApp" (`https://wa.me/5511900000001?...`); lembrete da s01 (já "presente") aceito.
- Correção sugerida: tela e ação: sem lembrete se `p.canalLembrete === 'nenhum'`; oferecer só o canal escolhido; exigir `s.presenca === 'agendada' && s.data >= hoje` e `canal` em `['whatsapp','email']`. Teste: com `nenhum`, zero botões e ação negada.

### [RS-10] O termo da busca (nome de paciente) fica para a próxima pessoa na mesma aba
- Gravidade: médio · Status: CONFIRMADO
- Onde: `PEP.telas._busca` (`js/acoes.js:1090-1095`, `js/telas-painel.js:247-251`); `sair` (`js/acoes.js:146-150`) e a saída por inatividade não limpam
- Problema: a decisão é manter o termo fora do endereço, mas ele fica na memória da página e sobrevive ao "Sair". Em computador compartilhado da clínica, a próxima pessoa abre "Buscar" e vê o nome digitado pela anterior.
- Evidência: `b4_login_link_inatividade.py E`: Bia busca "Paciente Exemplo 01" e sai; Duda entra e abre `#/busca`: campo preenchido com `'Paciente Exemplo 01'` e `0 resultado(s) para "Paciente Exemplo 01"`.
- Correção sugerida: zerar `PEP.telas._busca`, `_salaAgenda`, `_filtroAuditoria` e `_modalidadeDoc` em `PEP.estado.sair()` e quando `usuarioAtual()` encerra a sessão. Teste: o cenário acima com o campo vazio.

### [RS-11] Rascunho automático por inatividade apaga o resumo de transferência em edição
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:912-939` (`_guardarRascunhosAbertos`)
- Problema: a função guarda `#nova-texto` e os `textarea[id^="ev-"]`, mas não `#nova-transf` (resumo de transferência novo, que também é evolução). Pior: ao gravar o outro rascunho ela chama `PEP.app.renderizar()`, que redesenha a tela e **repõe o modelo** no campo do resumo: o texto se perde 1 minuto antes do fim, mesmo que a pessoa clique em "Continuar". O rascunho criado também sai sem o campo `tipo`.
- Evidência: `b4_login_link_inatividade.py D`: com os três campos preenchidos, novos registros: `['rascunho:SEM TIPO:Texto novo de evolução…']`; o campo do resumo depois do aviso: `Período: de 26/08/2026 a …` (modelo), não o texto digitado.
- Correção sugerida: incluir `#nova-transf` (com `tipo: 'transferencia'`, respeitando "um resumo por passagem"), gravar `tipo: 'sessao'` no rascunho comum e, antes de redesenhar, guardar/repor o valor dos campos de texto abertos. Teste: estender `rascunho_automatico` com o resumo.

### [RS-12] Ações funcionam antes do termo de sigilo e com senha provisória
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js` (todas): nenhuma chama `PEP.estado.pendenciaDeAcesso(u)`; só `renderizar()` barra as telas
- Problema: "antes do primeiro acesso, todo usuário aceita o termo" (Res. CFP 05/2025, art. 10, III) e "a senha provisória é trocada antes de tudo" valem só para a navegação. O mesmo valerá para o MFA obrigatório quando `mfaObrigatoria` for `true`.
- Evidência: `b4_login_link_inatividade.py F`: Bia sem aceitar o termo (toda rota volta para `#/termo`) chama `nova-evolucao` → "Evolução assinada e enviada à supervisão."; Duda com senha provisória chama `registrar-presenca` → "Presença registrada.".
- Correção sugerida: no ouvinte único de `click`/`submit` (`acoes.js:1179-1188`), se `pendenciaDeAcesso(usuario())` e a ação não estiver numa lista curta (`aceitar-termo`, `sair`, `mfa-*`, `trocar-senha`, acessibilidade), negar; e expor um `PEP.acoes` embrulhado com a mesma conferência. Teste: os dois cenários → nada gravado.

### [RS-13] "Gerou cópia do prontuário" entra na auditoria de qualquer caso, por qualquer um (até visitante)
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:157-160` (`imprimir`), `:465-470` (`imprimir-documento`), `:604-607` (`imprimir-plano`)
- Problema: `imprimir` não confere nada e grava o evento com o `data-caso` recebido; `imprimir-documento` confere só se o documento é válido. O evento falso aparece no "Quem acessou o seu prontuário" do paciente como "Cópia ou leitura do prontuário" por alguém que nunca abriu o caso, e polui a trilha que serve de prova.
- Evidência: `b1_estagiarios_fora.py` (todos os perfis de fora e `visitante`): auditoria nova `u-est9|Gerou cópia do prontuário (PDF)|c01`, `visitante|Gerou cópia de documento psicológico…|c01`.
- Correção sugerida: `imprimir`: exigir técnica com motivo válido, supervisor do caso, ou link liberado (`PEP.telas._linkLiberado` do mesmo caso); `imprimir-documento`: `podeVerConteudoClinico`; `imprimir-plano`: `u.perfil === 'paciente'`. Teste: estagiária de fora chama `imprimir` → auditoria sem evento novo.

### [RS-14] Pedido de cópia: entrega sem conferir identidade, pedido duplicado e estado que volta atrás
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:879-886` (`marcar-entregue`), `:849-855` (`conferir-identidade`), `:187-194` (`solicitar-copia`), `:873-878` (`revogar-link`)
- Problema: `marcar-entregue` não confere `s.status === 'identidade-conferida'` nem a forma de entrega; `conferir-identidade` não confere `status === 'recebida'` (um pedido entregue volta a "identidade conferida" e libera novo link); `solicitar-copia` não confere pedido em aberto; `revogar-link` regrava a data de um link já revogado.
- Evidência: `b2_burlas.py F`: pedido `recebida` → "Cópia entregue ao paciente." com `conferidoPor: null, forma: "forma inventada"`; depois `conferir-identidade` → status `identidade-conferida`; dois pedidos seguidos do mesmo paciente (total 2).
- Correção sugerida: conferir o estado de origem em cada passo e `forma` contra `formasEntrega`; `solicitar-copia` nega se houver pedido não entregue. Teste: sequência fora de ordem → estado intacto.

### [RS-15] Resposta a pedido LGPD já respondido é sobrescrita
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:887-895` (`responder-titular`)
- Problema: falta `p.status === 'aberto'`. A resposta dada ao titular (prestação de contas, LGPD art. 19) é trocada sem rastro: texto, autor e data antigos somem. Contraria "nada é apagado".
- Evidência: `b2_burlas.py G`: pt01 `"resposta":"Telefone atualizado no cadastro.","respondidoEm":"…-28T10:00"` → `"resposta":"RESPOSTA SOBRESCRITA","respondidoEm":"2026-11-13T18:05"`.
- Correção sugerida: `if (p.status !== 'aberto') return negar();` (complemento vira pedido/registro novo). Teste: responder pt01 de novo → sem mudança.

### [RS-16] Triagem repetida cria paciente e caso em dobro; grupo e risco não são conferidos
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:610-651` (`concluir-triagem`), `:652-658` (`marcar-duplicada`)
- Problema: falta `i.status === 'aguardando'`. Para inscrição sem CPF não há outra barreira: a segunda chamada cria outro paciente e outro caso. `marcar-duplicada` aceita inscrição já triada (ela passa a "duplicada" com caso criado). `tr-grupo` não é conferido (caso nasce `ativo` num grupo que não existe e fica invisível para todos menos a técnica), nem `tr-rk-tipo`/`tr-rk-nivel`.
- Evidência: `b2_burlas.py H` (inscrição i03): pacientes/casos `7/7 → 8/8 → 9/9`; depois `marcar-duplicada` → status `duplicada`; triagem com `tr-grupo: g-nao-existe` → `{"grupoId":"g-nao-existe","status":"ativo"}` e risco `tipo-inventado/nivel-inventado`.
- Correção sugerida: `if (!i || i.status !== 'aguardando') return negar();` nas duas; grupo via `repo().porId('grupos', …)`; tipo e nível contra as listas. Teste: segunda chamada não muda as contagens.

### [RS-17] Evolução ligada a sessão de outro caso, futura, inexistente ou que já tem evolução
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:283` (`sessaoId: … val('nova-sessao')`)
- Problema: o `sessaoId` não é conferido. Evolução apontando para sessão de outro paciente quebra a integridade ("uma sessão com presença tem uma evolução"), some com alertas de "sessão sem evolução" do outro caso (`sessoesSemEvolucao` e os checklists procuram por `e.sessaoId === s.id` sem olhar o caso) e permite duas evoluções para a mesma sessão.
- Evidência: `b2_burlas.py I` (bia, c01): gravou `sessaoId` = `s13` (caso c04), `s31` (agendada no futuro), `s01` (já tem a e01), `nao-existe`, `s03` (falta justificada); todas "assinada e enviada".
- Correção sugerida: aceitar só `''` ou sessão com `casoId === c.id`, `presenca === 'presente'` e sem evolução. Teste: os cinco casos → erro no campo `nova-sessao`.

### [RS-18] Adendo sem motivo (ou com motivo fora da lista)
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/acoes.js:321-328` (`motivo: val('admot-' + e.id)`)
- Problema: a regra é "correção só por adendo, com autor, data e **motivo**". A ação grava motivo vazio ou qualquer texto.
- Evidência: `b2_burlas.py I`: adendo gravado com `"motivo":""`; outro com `<b>qualquer</b>` (sai escapado na tela).
- Correção sugerida: `if (PEP.lista('motivosAdendo').indexOf(motivo) === -1) erro em admot-…`. Teste: sem o campo → nenhum adendo novo.

### [RS-19] Rascunho de resumo feito no dia da passagem impede para sempre o resumo da nova dupla
- Gravidade: médio · Status: CONFIRMADO
- Onde: `js/permissoes.js:292-298` (`resumosDaPassagem`: `e.data >= desde`, com `desde` = dia da última passagem), usado em `acoes.js:282` e `telas-caso.js:306-309`
- Problema: se a dupla antiga salvou um rascunho (ou teve o resumo devolvido) no mesmo dia em que a supervisão passou o caso com justificativa, esse rascunho continua contando como "o resumo desta passagem". A nova dupla não o vê (rascunho é só do autor), não pode editá-lo e recebe "já foi escrito": no fim do semestre seguinte, só passa com justificativa.
- Evidência: `b3_burlas.py F`: Bia salva rascunho do resumo; Helena passa c01 para a Dupla 2 com justificativa; Duda: `resumosDaPassagem = ['evo-…:rascunho:u-est1']`, `nova-evolucao` (transferência) → "O resumo de transferência desta passagem já foi escrito."; a tela não mostra o cartão nem o rascunho.
- Correção sugerida: comparar com a data **e hora** da passagem (`e` criado depois de `ult.em`) ou, mais simples, contar só resumos cujo autor ainda é da dupla atual ou que já estão `enviada`/`validada`. Teste: o cenário acima com Duda conseguindo escrever.

---

## Achados baixos

| ID | Onde | Problema | Correção |
|---|---|---|---|
| RS-20 | `telas-caso.js:57, 63-68, 368` | Técnica sem motivo vê o selo "Risco em acompanhamento / aguardando ciência" no cabeçalho de cada caso (c03, c04). O comentário do painel diz "para a técnica, só a contagem". | Não desenhar `seloRisco` quando `precisaJustificar(u, caso)`. |
| RS-21 | `acoes.js:451-464` | `registrar-evento-documento`: entrega pode ser registrada várias vezes; com devolutiva pendente, `data-tipo` inventado é **gravado** e depois estoura `TypeError` (`textos[tipo]`). | Lista fechada de tipos; negar `entrega` se já houver. |
| RS-22 | `acoes.js:234-240` | `registrar-consentimento`: aceita finalidade inventada, caso encerrado e revogação do contrato obrigatório (a tela esconde); o caso segue `ativo` sem contrato. | Conferir `finalidadesConsentimento`, status do caso e decidir o que acontece ao revogar o contrato. |
| RS-23 | `acoes.js:495-510, 1057-1073` | Caso **encerrado** aceita avaliação psicológica, orientação de supervisão e comunicação a terceiros (a tela não oferece). | Exigir `c.status === 'ativo'` (ou regra explícita para o pós-encerramento). |
| RS-24 | `estado.js:250-255` | Bloqueio de login é por texto digitado: com o usuário bloqueado, a mesma conta entra (e pode ser testada) pelo e-mail: dois contadores por conta. | Achar a conta primeiro e contar pelo `id` (ou pelo login canônico). |
| RS-25 | `acoes.js:698-706` | `definir-dupla` move estagiário que já tem dupla regravando a alocação: o histórico de quem esteve em qual dupla se perde e o acesso muda na hora. | Só para quem está sem dupla; mudança = encerrar a alocação e criar outra. |
| RS-26 | `acoes.js:678-685` | `alocar-estagiario` aceita id de supervisor ou id inexistente (`fantasma>g-b`). | Exigir usuário ativo com `perfil === 'estagiario'`. |
| RS-27 | `acoes.js:345-373` | `agendar-sessao` aceita data/hora impossíveis por fora da tela (31/02, 45/13, 20:99) e domingo. | Validar a data como em `V().dataNascimento`; `hh<24`, `mm<60`. |
| RS-28 | `acoes.js:173-178` | `confirmar-sessao` não confere estado: confirma sessão passada com presença e sessão que o próprio paciente avisou como falta. | Exigir `agendada` e data/hora futuras. |
| RS-29 | `acoes.js:203-210, 163-170` | `pedido-titular` aceita tipo fora da lista; `aceitar-termo` grava aceite de termo inventado (`versao` indefinida). | Conferir contra as listas. |
| RS-30 | `acoes.js:228-233` | `assinar-anamnese` repetida grava várias assinaturas da supervisão na mesma versão (3 após 2 cliques por fora). | `if (!assinadoPeloSupervisor(...))`, como em `assinar-plano`. |
| RS-31 | várias (`acoes.js:174, 229, 291, 613, 852…`) | Id inexistente ou visitante: a ação estoura `TypeError` no console em vez de responder "Sem permissão" (nada é gravado). | `if (!u || !registro) return negar();` no começo. |
| RS-32 | `acoes.js:379-380`; `telas-caso-extra.js:81-82` | O lembrete diz "na Clínica-Escola", e a tela e o comentário dizem "sem nome do serviço". Para menor, o WhatsApp vai ao responsável, mas o e-mail vai ao do paciente. | Alinhar texto e regra; definir o e-mail do responsável. |
| RS-33 | `estado.js:222, 254` | O texto digitado no campo "usuário" vai inteiro para a auditoria: quem digita a senha no campo errado deixa a senha na trilha. | Registrar o alvo só quando casa com uma conta; senão "(usuário desconhecido)". |
| RS-34 | `acoes.js:1054` | Mensagem "Declaração emitido" (concordância). | "emitido(a)" por modalidade. |
| RS-35 | `acoes.js:546-553` | `registrar-risco`: `rk-tipo` e o nível não são conferidos contra as listas; técnica registra risco em caso ativo sem motivo de acesso (só escrita). | Conferir listas; decidir se a escrita pede motivo. |
| RS-36 | `acoes.js:733-753` | `importar-estudantes` chamada duas vezes seguidas cria contas em dobro (a trava é só `b.disabled`). | Zerar `_importacao.linhas` ao começar. |

---

## Discordo da decisão

- **Direção gera senha provisória (e desliga o MFA) de supervisores e da técnica** (`podeGerirConta`, decisão registrada no README). No modo local a senha aparece na tela da direção: quem "nunca vê prontuário" consegue entrar como supervisor. A auditoria registra, mas o controle é só posterior. Sugestão: no protótipo, avisar o titular da conta no próximo acesso ("sua senha foi redefinida por …") e, em produção, manter só o link por e-mail (já previsto).
- **Técnica passa caso, registra risco e consentimento sem motivo de acesso.** Coerente com "camada operacional", mas são gravações em prontuário alheio sem o porquê. Vale ao menos registrar o motivo junto com a passagem.

---

## O que conferi e está correto

- **Leitura por rota**, com cada perfil de fora (duda em c01, iara, hugo, rafael em c01, marta, paciente01, visitante): `#/caso/<id>/<aba>` (8 abas), `#/documento`, `#/imprimir`, `#/triagem`, `#/paciente/…/editar`, `#/auditoria`, `#/estudantes`, `#/indicadores`, `#/solicitacoes`, `#/pedidos-lgpd`, `#/fila`, `#/alocacao`, `#/supervisao`, `#/meu-*`: todas negam ou redirecionam. Técnica sem motivo: só cabeçalho e formulário do motivo em todas as abas, documento e cópia.
- **55 ações e 3 formulários chamados direto** por esses perfis: nada gravado (exceto RS-13).
- **Ciclo da evolução**: não edita enviada nem validada; não edita a de colega; estagiária não valida; supervisora não valida caso de outro grupo; devolver exige comentário; validar duas vezes nega; assinaturas vigentes corretas; texto > 5000 recusado.
- **Risco**: ciência só do supervisor do caso e uma vez; notificação só supervisor do caso (técnica e estagiário negados; órgão conferido); não existe ação que edite um risco; cópia do menor (link de c04) sai sem a avaliação de violência e sem notificação.
- **Passagem**: bloqueia com evolução enviada, sem aviso ao paciente, sem resumo nem justificativa, para outro grupo (supervisor), para a mesma dupla e em caso de outro grupo; o resumo validado vale para uma passagem só; segundo resumo recusado; seções obrigatórias conferidas.
- **Agenda**: data anterior a hoje, sala vazia ou fora da lista, fora de 7h–21h; choque de dupla e de sala exato em 50 minutos (14:49 recusa, 14:50 aceita); presença/falta futura recusadas, justificada aceita, presença não muda depois.
- **Encerramento**: abandono recusado no encerramento manual; pendências bloqueiam; caso encerrado nega evolução, anamnese, agenda, risco, plano e documento.
- **Comunicações**: quebra de sigilo negada ao estagiário; fundamento obrigatório nos três tipos; esconder exige motivo; data futura recusada.
- **Paciente**: não mexe em sessão, consentimento ou caso de outro; não revoga o contrato; motivo de falta só da lista; revogação vira registro novo; menor não vê o motivo da técnica.
- **Contas**: direção não mexe na própria conta nem em paciente; técnica só em paciente; portal não duplica.
- **Login**: mensagem igual para senha errada, usuário inexistente e conta desativada; bloqueio no 5º erro, também com a senha certa; maiúsculas e espaços contam juntos; auditoria sem a senha.
- **Link**: só o hash guardado; 72 h; token errado e data errada tratados; leitura registrada no nome do paciente.
- **Busca**: só casos visíveis (por nome e por código); fila só para a técnica; termo fora do endereço.
- **Inatividade**: aviso a 1 minuto, rascunho novo e rascunho existente guardados, saída aos 15 minutos com auditoria.
