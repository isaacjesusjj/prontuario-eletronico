# Prompt 2 — Validação e revisão técnica de todo o projeto (com autonomia)

> Use depois do Prompt 1 (contexto), na mesma sessão. Cole o texto abaixo ou peça: "siga `docs/prompts/2-revisao-tecnica.md`".

---

Agora quero que você faça uma **validação e uma revisão técnica independente de todo o Vinculum**: código, banco, dados, testes, documentação e o site funcionando. Pense como um revisor sênior que não escreveu nada disto e quer achar problemas de verdade, não confirmar o que já está escrito.

**Você tem autonomia para mudar o que for preciso** (código, banco, testes, documentação), dentro das travas abaixo. Não precisa me pedir licença para cada correção. Pergunte só quando a mudança envolver uma decisão do grupo, da clínica ou jurídica.

## Como trabalhar

1. **Comece medindo.** Rode os três testes antes de mudar qualquer coisa e anote o resultado (hoje: validador sem problemas, site 389 de 389, banco 174 de 174). Se algo já falhar, isso é o primeiro achado.
2. **Trabalhe num branch próprio:** `git checkout -b revisao-fable` a partir da `main` atualizada. Envie com `git push -u origin revisao-fable` e vá enviando ao longo do trabalho.
3. **Use o site de verdade**, além de ler o código: abra-o com o Playwright, que já está instalado. Teste em 390 px (celular), 820 px (tablet) e 1280 px (computador), com cada perfil: `bia.estagiaria`, `helena.supervisora`, `ana.tecnica`, `paciente01` e `marta.direcao`. A senha está em `_meta.senhaDemonstracao`. Percorra os fluxos principais e as telas de cada um.
4. **Commits pequenos**, um assunto por commit. A mensagem diz o problema, o que mudou e por quê, em português. Siga as instruções de atribuição de commit do seu ambiente.
5. **Antes de cada commit, os três testes, e só seguir com tudo verde.** Para cada defeito que corrigir, **acrescente um teste** que teria pegado o problema, em `testes/testar_site.py` ou em `banco/testar_banco.mjs`.
6. **Seja honesto.** Não diga que conferiu o que não conferiu. Se um teste falhar, mostre a saída. Separe o que você verificou do que é só suspeita.

## O que revisar

**Correção e regras de negócio**
- As regras do `CLAUDE.md` estão de fato implementadas e não têm brecha? Em especial:
  - o ciclo da evolução e a imutabilidade depois de validada;
  - o acesso que nasce e morre com o vínculo;
  - o fluxo de abandono;
  - a passagem do caso;
  - os documentos psicológicos e as comunicações;
  - as salas, o risco e a notificação.
- O site (`js/permissoes.js`) e o banco (políticas RLS e gatilhos em `banco/schema.sql`) dizem a mesma coisa? Procure regras que existem num lado e não no outro.
- O JSON, o `schema.sql`, a `migrar_json.py` e o `validar_json.py` estão coerentes: mesmas coleções, campos e listas?

**Segurança e privacidade**
- XSS: todo texto digitado passa por `PEP.util.esc()`? Procure `innerHTML` com dado sem escapar e atributos montados com texto do usuário.
- A CSP do `index.html` está justa? A exceção do VLibras está limitada ao necessário?
- Login: senha (PBKDF2), bloqueio progressivo, sessão por inatividade, verificação em duas etapas (TOTP, códigos de recuperação de uso único), link temporário do paciente (só o hash fica guardado).
- O que fica no `localStorage` e no `sessionStorage`. Se alguma coisa vaza para o endereço da página (por exemplo, o termo da busca), para o título da aba ou para o console.
- O adaptador do Supabase (`js/adaptador-supabase.js`): tratamento de erros, renovação do token, o que é enviado.
- LGPD e normas do CFP: o que o site promete nos textos legais (`js/telas-legal.js`) é o que ele faz?

**Acessibilidade e uso no celular**
- WCAG 2.2 AA:
  - teclado, foco visível e ordem de foco;
  - rótulos dos campos e erros ligados a eles;
  - contraste, também no alto contraste;
  - alvos de toque e leitor de tela no menu da conta, na barra de baixo e no "Mais".
- Nada de rolagem lateral; nada escondido atrás da barra de baixo; aumento do texto até 150%.
- Clareza: alguém que chega agora entende cada tela, cada aba e cada botão?

**Banco de dados**
- `banco/schema.sql`: índices para as consultas mais comuns, gatilhos sem furo, políticas RLS sem vazamento entre perfis, partições da auditoria.
- `banco/projecao.py` e `docs/banco-de-dados.md`: as premissas fazem sentido e os números do documento batem com a saída do script?

**Qualidade do código**
- Código morto, repetição, funções grandes demais, nomes confusos, comentários desatualizados.
- Desempenho em celular simples: tamanho dos arquivos, desenho das telas, trabalho repetido.
- Lembre que o código precisa continuar **simples e comentado**: o grupo vai explicá-lo na banca. Não troque clareza por esperteza.

**Testes e documentação**
- O que importa e não tem teste? Há testes frágeis ou que passam sem conferir de verdade?
- `README.md`, `CLAUDE.md`, `docs/*.md` e `banco/README.md` estão corretos e atualizados? Procure números desatualizados, funções descritas que não existem mais e passos que não funcionam.

## Travas (não passe delas sem me perguntar)

- **Não publique na `main`.** Deixe tudo no branch `revisao-fable`. Quando você terminar, eu e outra sessão do Claude vamos revisar antes de publicar.
- Não quebre as regras de negócio do `CLAUDE.md`. Se achar que alguma está errada, escreva o argumento no relatório e não mude sozinho.
- **Só dados fictícios. Nunca senha em texto.** Mudou o JSON → troque `_meta.versao`. Mudou permissão → mude o site e o banco juntos.
- Continue com HTML, CSS e JavaScript puros, sem framework, sem build e sem bibliotecas ou chamadas a servidores de terceiros (a exceção é o VLibras, como já está).
- Mantenha a identidade visual (verde `#007931`, Public Sans, logotipo, navegação). Ajuste de acessibilidade pode, desde que fique registrado.
- Não reabra sem motivo forte as decisões do "Registro de decisões" do `README.md`. Se discordar, argumente no relatório.
- Nada de apagar dados, testes ou documentos para "fazer passar". Teste que falha por defeito real se corrige no código.

## O que entregar

1. **`docs/revisao-tecnica-fable.md`**, com:
   - um resumo em 5 linhas para o grupo;
   - o que você conferiu e como (testes rodados, telas abertas, tamanhos de tela, perfis);
   - uma tabela de achados com gravidade (crítico, alto, médio, baixo), onde está, o problema, o que fez e o status (corrigido / pendente / precisa de decisão);
   - a lista de commits;
   - o que ficou para depois, com a sua recomendação;
   - como verificar.
2. **`README.md` e `docs/progresso.md` atualizados** com o que mudou.
3. **O branch `revisao-fable` enviado ao GitHub**, com os testes do GitHub Actions passando.
4. **Uma mensagem final para mim**, em português simples:
   - o que você mudou e por quê;
   - o que é mais importante eu saber;
   - o que precisa da decisão do grupo, da clínica ou do jurídico;
   - o nome do branch e onde está o relatório, para eu passar à outra sessão.
