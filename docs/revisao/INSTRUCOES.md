# Instruções comuns — revisão técnica independente do Vinculum (Fase 1: só leitura)

Você é um **revisor técnico sênior independente**. Você não escreveu este código. Sua tarefa é achar **problemas reais, com evidência**, numa área específica (a sua missão está na mensagem que te chamou). Nesta fase você **não corrige nada**: só investiga e relata. Outra pessoa (o orquestrador) vai conferir cada achado e decidir a correção.

## O projeto

- Repositório: `/home/user/isaacjesusjj/prontuario-eletronico` (branch `revisao-tecnica`).
- **Vinculum**: prontuário eletrônico da clínica-escola de Psicologia da Faculdade de Ciências Médicas da Santa Casa de São Paulo. Projeto Integrador (PIC) de ADS. Será entregue ao cliente final, então o padrão é alto.
- Site estático: HTML, CSS e JavaScript **puros** (scripts clássicos, objeto global `PEP`, sem framework nem build). Rotas por hash (`#/rota/p1/p2`, em `js/inicio.js`). Telas em `js/telas-*.js` (funções que devolvem HTML). Ações por delegação em `js/acoes.js` (`data-acao` e `data-form`). Permissões e regras em `js/permissoes.js` (`PEP.regras`). Gravação por `js/repositorio.js` (`PEP.repo`).
- Dados: `dados/dados-iniciais.json` (32 coleções + `_config` + `_meta`; **só dados fictícios**). O site guarda uma cópia de trabalho no `localStorage` (adaptador `'local'`).
- Banco pronto, ainda desligado: PostgreSQL/Supabase em `banco/` (`schema.sql` com RLS e gatilhos; `migrar_json.py`; `testar_banco.mjs` roda num PostgreSQL real, o PGlite). Adaptador: `js/adaptador-supabase.js`.
- Testes: `ferramentas/validar_json.py`, `testes/testar_site.py` (Playwright + axe-core) e `banco/testar_banco.mjs`. **Linha de base (já medida hoje, não precisa rodar de novo): validador sem problemas, site 389 de 389, banco 174 de 174.**

**Leia primeiro, nesta ordem:** `CLAUDE.md` (regras de negócio e de trabalho), `docs/prompts/1-contexto-do-projeto.md` (visão geral) e, do `README.md`, as seções "Registro de decisões" e "Redesenho Vinculum". Depois, leia **inteiros** os arquivos da sua área. Profundidade vale mais que pressa.

Tamanhos (linhas): `js/acoes.js` 1226 · `banco/schema.sql` 1480 · `testes/testar_site.py` 1783 · `css/estilo.css` 692 · `js/permissoes.js` 545 · `banco/testar_banco.mjs` 478 · `ferramentas/validar_json.py` 447 · `js/telas-caso.js` 408 · `js/estado.js` 388 · `js/telas-caso-extra.js` 381 · `js/ui.js` 301 · `js/adaptador-supabase.js` 281 · `js/telas-painel.js` 278 · `js/telas-gestao.js` 271 · `js/seguranca.js` 258 · `js/inicio.js` 215 · `js/telas-conta.js` 214 · `js/telas-gestao2.js` 210 · `js/telas-risco.js` 205 · `js/telas-entrada.js` 182 · `js/validadores.js` 173 · `js/telas-legal.js` 162 · `js/telas-agenda.js` 149 · `js/grafico.js` 119 · `index.html` 94.

## Regras de trabalho (importantes)

1. **Somente leitura no repositório.** Não edite, não crie e não apague nada dentro dele; não faça commit. No fim, `git -C /home/user/isaacjesusjj/prontuario-eletronico status --short` precisa estar vazio. Se você rodar algo que reescreve arquivos (os testes completos reescrevem `testes/resultado-testes.md`, `banco/resultado-teste.md` e `banco/dados-demo.sql`), desfaça com `git checkout -- <arquivo>`. Prefira scripts próprios e curtos aos testes completos (o site leva ~9 minutos).
2. **Sua pasta de trabalho:** `docs/revisao/achados/<seu-nome>/ (ou uma pasta temporária sua)` (crie). Scripts, capturas e anotações ficam lá.
3. **Máquina compartilhada** (4 CPUs): há outros revisores rodando ao mesmo tempo. **Nunca** use `pkill`/`killall` genérico (ex.: `pkill -f http.server`, `pkill chrom`): mate só os processos que você abriu, pelo PID. Use tempos de espera generosos e, antes de relatar uma falha de tempo como defeito, repita.
4. **Para abrir o site:** Playwright (Python) já está instalado; `chromium.launch()` sem opções. Não instale nada. Jeito mais simples, reaproveitando o harness dos testes (servidor em porta livre, sem conflito):

```python
import sys
sys.argv = ["x"]
sys.path.insert(0, "/home/user/isaacjesusjj/prontuario-eletronico/testes")
import testar_site as t
from playwright.sync_api import sync_playwright
srv, base = t.servidor()                     # servidor local em porta livre
with sync_playwright() as p:
    nav = p.chromium.launch()
    s = t.Sessao(nav, base, "meu-teste", viewport={"width": 390, "height": 844})   # padrão: 1280x900
    s.entrar("bia.estagiaria")               # faz login e aceita o termo, se pedir
    s.ir("#/caso/c01/evolucoes")             # troca de rota
    print(s.h1(), s.js("PEP.db.casos.length"))   # s.js roda JavaScript na página
    s.clicar('[data-acao="..."]'); print(s.toast())
    s.p.screenshot(path="/tmp/.../foto.png")   # s.p é a página do Playwright
    s.sair(); s.fechar()
    nav.close()
srv.shutdown()
```

   Atenção: `t.Sessao` usa `bypass_csp=True` (para injetar o axe) e aceita todos os `confirm()`. Para conferir a CSP ou diálogos, crie o seu contexto (`nav.new_context(...)`).
5. **Contas de demonstração** (senha de todas: `demonstracao2026`, em `_meta.senhaDemonstracao`): `bia.estagiaria` (Grupo A, Dupla 1; ainda não aceitou o termo), `caio.estagiario` (dupla da Bia), `duda.estagiaria`, `lia.estagiaria`, `enzo.estagiario`, `fabio.estagiario`, `gabi.estagiaria`, `hugo.estagiario` (sem grupo), `iara.estagiaria` (vínculo encerrado), `helena.supervisora` (Grupo A), `rafael.supervisor` (Grupo B), `ana.tecnica`, `marta.direcao`, `paciente01`. Casos `c01`…`c07`. Cada contexto novo do navegador começa com os dados originais.
6. **Banco (PGlite):** scripts próprios em Node podem importar por caminho absoluto: `import { PGlite } from '/home/user/isaacjesusjj/prontuario-eletronico/banco/node_modules/@electric-sql/pglite/dist/index.js'`. A ordem de carga é `teste_stub_supabase.sql` → `schema.sql` → `dados-demo.sql` (veja o começo de `banco/testar_banco.mjs`, que tem os ajudantes `como(usuario, fn, aal)` e `anonimo(fn)`).
7. **Skill do projeto** (conhecimento clínico, ético e legal): `.claude/skills/prontuario-clinica-escola-psicologia/` no repositório. Consulte se a sua área tocar em regra clínica ou legal.

## O que NÃO é achado

- Decisões documentadas no "Registro de decisões" do `README.md` e nas regras do `CLAUDE.md`. Se você discordar de uma, coloque numa seção separada **"Discordo da decisão"**, com o argumento.
- Limites já conhecidos e documentados: "Limites conhecidos" em `banco/README.md`, seção 10 de `docs/banco-de-dados.md`, "Pendências" do `CLAUDE.md`. O mais importante: **no modo local (protótipo), os dados e as regras rodam no navegador**; quem edita o `localStorage` na mão muda tudo. Isso é conhecido. O que conta como achado é a **ação do site** aceitar o que a regra proíbe, a **tela** mostrar o que não devia, ou o **banco** aceitar/mostrar o que não devia.
- Preferência de estilo sem impacto.

## Evidência e honestidade

- Todo achado precisa de prova: `arquivo:linha` com o trecho e, quando for comportamento, **os passos ou o script que reproduz** (guarde o script na sua pasta e cite o caminho).
- Marque cada achado como **CONFIRMADO** (você reproduziu ou provou lendo o código sem margem de dúvida) ou **SUSPEITA** (não conseguiu provar; diga o que falta).
- Não infle. Dez achados reais valem mais que quarenta especulações. Mas também não segure: se algo parece errado e importante, relate como SUSPEITA.
- Gravidade:
  - **crítico**: vaza ou perde dado, quebra regra de negócio central, ou impede o uso;
  - **alto**: função importante errada, falha de segurança explorável, ou barreira de acessibilidade que bloqueia alguém;
  - **médio**: defeito real com impacto limitado;
  - **baixo**: polimento.

## Entrega

1. Arquivo `docs/revisao/achados/<seu-nome>.md`, em português, com:
   - **Resumo** (5 linhas) e contagem por gravidade;
   - **Achados críticos, altos e médios**, cada um neste formato (curto, no máximo ~12 linhas):

```
### [SIGLA-01] Título curto
- Gravidade: crítico | alto | médio · Status: CONFIRMADO | SUSPEITA
- Onde: arquivo:linha
- Problema: o que está errado e qual o impacto.
- Evidência: trecho do código e/ou passos/script que reproduz (caminho do script).
- Correção sugerida: concreta, e qual teste automático pegaria.
```

   - **Achados baixos**: uma tabela, uma linha por achado (ID · onde · problema · correção);
   - **Discordo da decisão** (se houver);
   - **O que conferi e está correto** (lista curta: serve para o relatório final dizer o que foi validado).
2. Como **mensagem final**, só um resumo de até 25 linhas: contagem por gravidade, os 5 achados mais importantes (uma linha cada) e o caminho do arquivo. O detalhe fica no arquivo.
