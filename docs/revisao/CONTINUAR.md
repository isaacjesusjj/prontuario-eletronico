# Revisão técnica do Vinculum — como continuar

> **Para quem assume (outra sessão ou outro modelo):** leia este arquivo inteiro, depois o `CLAUDE.md` e os dois prompts em `docs/prompts/`. Ele diz o que foi pedido, onde o trabalho parou e o próximo passo. Atualizado em 13/11/2026.

## O pedido do Isaac

Rodar os prompts `docs/prompts/1-contexto-do-projeto.md` e `docs/prompts/2-revisao-tecnica.md`: validação e revisão técnica de **todo** o projeto e do site, com autonomia para corrigir, usando quantos agentes forem úteis. Entregar o site estruturado, validado, revisado e pronto para o cliente final.

Travas que continuam valendo:

- **Não publicar na `main`** sem o Isaac dizer "pode publicar". Todo envio para a `main` publica o site.
- Trabalhar no branch **`revisao-tecnica`** (já existe no GitHub).
- Os três testes verdes antes de cada commit; um teste novo para cada defeito corrigido.
- Demais regras: `CLAUDE.md` e a seção "Travas" do prompt 2.

## Onde parou

**Fase 1 de 5 (revisão), no começo.** O plano tem cinco fases:

1. Revisão independente, por área, só de leitura (dez revisores).
2. Triagem: conferir cada achado, tirar duplicados e decidir.
3. Correções, com teste novo para cada defeito.
4. Segunda revisão das mudanças e validação final (testes, GitHub Actions, telas nos três tamanhos).
5. Relatório `docs/revisao-tecnica.md`, `README.md` e `docs/progresso.md` atualizados, e pedido de publicação.

**Por que parou:** os dez revisores foram disparados em paralelo e a conta bateu no limite de uso duas vezes, em poucos minutos. Nenhum revisor chegou a entregar relatório. O que eles tinham começado está em `docs/revisao/parcial/` (só scripts de apoio, sem conclusões).

**Lição para quem continua:** não rode os dez de uma vez. Rode um ou dois revisores por vez, ou faça a revisão em sequência na própria sessão.

## Linha de base (medida em 13/11, no commit `31bd555` da `main`)

| Teste | Resultado |
|---|---|
| `python ferramentas/validar_json.py` | sem problemas (1 aviso de propósito: sessão s40 do caso c03) |
| `python testes/testar_site.py` | 389 de 389 (73 telas no axe-core) |
| `cd banco && python3 migrar_json.py && node testar_banco.mjs` | 174 de 174 |

O branch `revisao-tecnica` ainda não mudou nenhum arquivo de código: só acrescentou esta pasta e ajustou textos em `CLAUDE.md`, `docs/progresso.md` e `docs/prompts/2-revisao-tecnica.md`.

## O que já foi conferido (pelo orquestrador, antes da pausa)

| Conferência | Como | Resultado |
|---|---|---|
| Ações e formulários × botões | Script que cruza `PEP.acoes`/`PEP.formularios` (85 ações, 13 formulários) com os `data-acao`/`data-form` das telas | Sem pontas soltas |
| Rotas × títulos × links | Mesmo script, em `js/inicio.js` | Sem rota sem título nem link para rota inexistente |
| `_config` lido × definido | `PEP.regra('x')` e `PEP.lista('x')` × o JSON | Nenhuma leitura de chave inexistente. Só `regras.faltasIntercaladasSugestao` nunca é lida (pendência já documentada) |
| Variáveis CSS | Definidas × usadas | Todas batem |
| Texto sem escape (XSS na saída) | `parcial/xss_e_pular.py`: põe uma carga com `<img onerror>` em cerca de 285 campos de texto livre do `PEP.db` e visita todas as rotas e abas com 6 perfis (estagiária, 2 supervisores, técnica, direção, paciente) | **0 achados**: nenhuma tela executou script nem criou elemento a partir de dado |

O teste de XSS cobre a **saída** (o que já está nos dados). Falta conferir a **entrada** campo a campo (formulários) e os outros itens da missão `seguranca`.

## Achados confirmados até agora (ainda não corrigidos)

| ID | Gravidade | Onde | Problema | Correção sugerida |
|---|---|---|---|---|
| ORQ-01 | alto (acessibilidade) | `index.html:23` (`<a class="pular" href="#app">`) e `js/inicio.js` (`lerRota`) | O link "Pular para o conteúdo" troca o endereço para `#app`. Como as rotas usam o `#`, o site entende `app` como rota: com login, cai em **"Página não encontrada"**; sem login, volta para a entrada. Quem navega por teclado perde a tela em que estava. Reproduzido com `helena.supervisora` em `#/caso/c01/evolucoes` | Tratar o clique no `a.pular` em JavaScript: `preventDefault()` e `document.getElementById('app').focus()`, sem mudar o endereço. Teste: focar o link, apertar Enter e conferir que o endereço e o título da tela não mudam e que o foco foi para `#app`. O teste atual ("primeiro Tab vai para 'Pular para o conteúdo'") não confere isso |
| ORQ-02 | baixo (texto) | `js/telas-legal.js:113` | A matriz "Regras e leis" ainda manda ver em "Técnico → Acesso do paciente", nome antigo do menu | Trocar por "Técnica → Pedidos → Cópia do prontuário" |
| ORQ-03 | baixo (código) | `css/estilo.css` | Classes sem uso em `js/` e no `index.html`: `.links-entrada` e `.so-impressao` | Remover as duas |

## Os dez revisores (Fase 1)

As instruções comuns estão em [`INSTRUCOES.md`](INSTRUCOES.md) e a missão de cada um em [`missoes/`](missoes/). Cada revisor trabalha **só lendo** e entrega `docs/revisao/achados/<nome>.md`.

| Revisor | Missão | Estado |
|---|---|---|
| `regras-site` | As ações do site aplicam as regras de negócio? (tentar burlar pelo console) | começou; scripts em `parcial/` |
| `paridade` | Site × banco × JSON dizem a mesma coisa? | não entregou |
| `seguranca` | XSS na entrada, CSP, login, sessão, vazamentos, modo discreto, anexos, adaptador | não entregou (a saída sem escape já foi conferida acima) |
| `banco` | `schema.sql`: matriz de acesso executada, gatilhos, funções, auditoria, escala | não entregou |
| `acessibilidade` | WCAG 2.2 AA e uso real em 320, 390, 820 e 1280 px | não começou |
| `exploratorio` | Usar o sistema de ponta a ponta como o cliente final | começou; apoio em `parcial/exploratorio_lib.py` |
| `codigo` | Código morto, erros latentes, redesenho da tela, estado entre usuários, desempenho | não começou (o cruzamento de referências já foi feito acima) |
| `testes` | Os testes provam o que dizem? (mutações, lacunas, GitHub Actions) | não começou |
| `documentacao` | Documentos e textos do site corretos e atuais; roteiro funciona? | não começou |
| `normas` | As normas citadas existem e dizem o que o sistema afirma? | não começou |

## Próximo passo

1. Atualize o branch: `git fetch origin && git checkout revisao-tecnica && git pull`.
2. Rode os três testes para confirmar a linha de base.
3. Corrija ORQ-01, ORQ-02 e ORQ-03, cada um com o seu teste.
4. Siga a Fase 1, uma missão por vez, na ordem de valor para a entrega: `regras-site`, `seguranca`, `banco`, `paridade`, `exploratorio`, `acessibilidade`, `testes`, `codigo`, `documentacao`, `normas`.
5. Depois, as fases 2 a 5. No fim, atualize `CLAUDE.md` e `docs/progresso.md` (tire o aviso de revisão pausada) e pergunte ao Isaac se pode publicar.

**Honestidade na entrega:** "pronto para o cliente final" hoje quer dizer site e banco prontos e testados, com dados fictícios. O uso com pacientes reais ainda depende de ligar o banco e das validações com a clínica e o encarregado de dados (lista no `CLAUDE.md`).
