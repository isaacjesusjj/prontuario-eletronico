# Opções gratuitas para os dados do Vinculum

O grupo pediu um leque de opções **sem custo** para guardar os dados, e uma análise: **o próprio JSON aguentaria?** Este documento compara as alternativas pelos mesmos critérios:

- o que é grátis;
- se os dados ficam no Brasil;
- quanto o Vinculum precisa mudar;
- para que cada opção serve.

Os números de uso vêm da projeção em [`banco-de-dados.md`](banco-de-dados.md): no cenário atual, ~109 MB de banco por ano, mais ~0,15 GB de anexos.

> **Resumo**
> - **Para a apresentação do PIC, o JSON aguenta** (dados fictícios, 74 KB) e já funciona. Custo zero, nada a fazer.
> - **Para dado real de paciente, o JSON não serve:** o arquivo inteiro iria para o navegador de quem abrisse o site, e qualquer pessoa leria todos os prontuários.
> - **A melhor opção gratuita com dado de teste é o Supabase Free.** O banco já está pronto para ele: zero mudança no código e dados em São Paulo. Cabe uns 4 anos no cenário atual, mas pausa depois de 7 dias sem uso e não tem backup.
> - **Para dado real sem pagar, o caminho mais seguro é o servidor da própria Faculdade**, rodando o mesmo banco (Supabase em versão instalada ou PostgreSQL). O dado fica na instituição e a TI cuida do backup.

---

## 1. O próprio JSON aguentaria?

**Para a demonstração, sim.** O arquivo `dados/dados-iniciais.json` tem 74 KB (sem espaços), dos quais 19 KB são configuração. Abre na hora, e cada navegador guarda a sua cópia. É o jeito certo de apresentar um protótipo com dados fictícios, e o modelo dele (uma coleção = uma tabela) é exatamente o que o banco usa.

**Para uso real, não.** Há seis motivos, e os dois primeiros sozinhos já decidem:

| # | Problema | Por quê |
|---|---|---|
| 1 | **Privacidade** | O JSON é um arquivo só. Quem abre o site recebe o arquivo inteiro, com todos os pacientes. A tela esconde o que a pessoa não pode ver, mas o dado está no navegador: basta apertar F12. No banco, as políticas RLS mandam para cada pessoa só as linhas que ela pode ver |
| 2 | **Não é compartilhado** | Hoje cada navegador tem a sua cópia (`localStorage`). O que a estagiária grava, a supervisora não vê. Para compartilhar, alguém teria de gravar o JSON num servidor, e aí volta o problema 1 |
| 3 | **Tamanho** | Com textos reais (evolução de ~1.500 caracteres), o JSON cresceria ~77 MB por ano no cenário atual. Passaria dos ~5 MB do `localStorage` em **menos de 1 mês**. Ficaria pesado para baixar no celular (~25 MB) em **~4 meses**. Chegaria a 100 MB, tamanho que o GitHub recusa num arquivo, em **~16 meses** |
| 4 | **Duas pessoas salvando ao mesmo tempo** | O arquivo é gravado inteiro: quem salva por último apaga o que o outro gravou |
| 5 | **Regras** | Quem tem o arquivo muda qualquer coisa: nada impede apagar uma evolução validada ou mudar a data de uma assinatura. No banco, os gatilhos recusam |
| 6 | **LGPD** | O GitHub Pages é público. O repositório guarda o histórico inteiro para sempre, então não dá para eliminar um dado quando a lei manda. E os servidores ficam fora do Brasil |

**Conclusão:** o JSON fica como modelo dos dados, fonte da migração e base da demonstração. Para uso real, os mesmos dados vão para um banco (`banco/migrar_json.py` faz a passagem).

## 2. JSON guardado em outro lugar (GitHub pela API, JSONBin e parecidos)

São serviços gratuitos que guardam um arquivo JSON e devolvem pela internet. Resolvem o problema 2 (compartilhar), mas não os outros:

| Opção | Grátis | O problema |
|---|---|---|
| Repositório do GitHub como banco (API REST) | 5.000 pedidos por hora por token | Repositório público expõe tudo. Repositório privado exige deixar o token no site, e quem pegar o token lê e apaga tudo. Cada gravação é um *commit*, e o histórico não se apaga. Duas gravações juntas dão conflito |
| JSONBin.io, JSONsilo, npoint e similares | Poucos MB e cota de pedidos (os limites variam e mudam com frequência) | Sem regra de acesso por pessoa, sem contrato de tratamento de dados, servidor fora do Brasil |

**Servem só para guardar dados fictícios de demonstração. Nunca para dado de paciente.**

## 3. Bancos na nuvem com plano gratuito

| Opção | O que o plano gratuito dá | Dados no Brasil? | Mudança no Vinculum | Quanto dura no cenário atual |
|---|---|---|---|---|
| **Supabase Free** (PostgreSQL) | 500 MB de banco, 1 GB de arquivos, login pronto com verificação em duas etapas, políticas RLS. **Pausa depois de 7 dias com pouco uso** (os dados ficam; é só reativar no painel). **Sem backup automático** | **Sim**: região São Paulo | **Nenhuma**: o `schema.sql`, a migração e o adaptador já estão prontos e testados | ~4 anos (passa de 500 MB no 5º ano). Os anexos cabem ~6 anos |
| **Neon Free** (PostgreSQL) | 1 GB por projeto (até 20 GB somando 100 projetos), 100 horas de máquina por mês por projeto. Tem API de dados com RLS e login (Neon Auth) | Não confirmado | **Pequena a média**: o banco é PostgreSQL, mas as funções de login do Supabase (`auth.uid()`, `auth.jwt()`) e os arquivos precisam de outro lugar | ~9 anos de banco. Não guarda arquivos |
| **Firebase Spark** (Google, banco Firestore) | 1 GB, 50 mil leituras e 20 mil gravações por dia. **Desde 2026, guardar arquivos exige o plano pago (Blaze)** | Há região em São Paulo | **Grande**: não é SQL. Tudo vira documentos e "regras de segurança"; os gatilhos viram funções, que também exigem o plano pago | O espaço dura anos, mas **50 mil leituras por dia acabam rápido**: uma tela de prontuário lê dezenas de registros |
| **Turso Free** (SQLite na nuvem) | 5 GB, 500 milhões de linhas lidas e 10 milhões gravadas por mês. Sem contrato de tratamento de dados no plano gratuito | Não confirmado | **Grande**: não tem login nem regra por usuário. Precisaria de um servidor nosso no meio | Décadas de espaço |
| **Cloudflare D1** (SQLite) + Workers | 5 GB, 5 milhões de linhas lidas e 100 mil gravadas por dia. Passou do limite, as consultas falham até o dia seguinte | Não confirmado | **Grande**: escrever a API nos Workers, com login e regras feitos por nós | Décadas de espaço |
| **MongoDB Atlas M0** | 512 MB, 100 operações por segundo | Há São Paulo na lista (confirmar no painel) | **Grande**: não é SQL e precisa de um servidor nosso | ~4 anos |
| **Appwrite Cloud Free** | Login, banco por documentos, arquivos; ~500 mil leituras e 250 mil gravações por mês; pausa depois de 1 semana sem uso | Não confirmado | **Grande**: regras viram permissões por documento | Leituras por mês provavelmente insuficientes |
| **Nhost Starter** (PostgreSQL + GraphQL) | ~1 GB de banco e de arquivos (as fontes divergem); pausa depois de 1 semana sem uso | Não confirmado | **Média**: é PostgreSQL, mas as permissões são do Hasura, não as nossas políticas RLS | ~9 anos de banco |

**Dados fora do Brasil:** dado de saúde é sensível. Guardar fora do país exige as salvaguardas de transferência internacional (LGPD, art. 33; regulamento da ANPD, Resolução CD/ANPD 19/2024) e a ciência do encarregado de dados. Manter no Brasil simplifica.

## 4. Programas gratuitos (código aberto) instalados num computador

O programa é de graça. O custo é a máquina e alguém para cuidar: atualizações, backup e segurança.

| Programa | O que é | Mudança no Vinculum |
|---|---|---|
| **Supabase instalado** (código aberto, roda em Docker) | O mesmo Supabase da nuvem, no nosso servidor: PostgreSQL, login, arquivos e API | **Nenhuma**: o mesmo `schema.sql` |
| **PostgreSQL + PostgREST** | O mínimo: o banco e a API gerada a partir das tabelas, que respeita as políticas RLS | **Pequena**: falta o login. O Supabase instalado já traz login pronto |
| **PocketBase** | Um arquivo só (Go + SQLite) com login, arquivos, API e painel. Licença MIT | **Grande**: as regras viram "API rules" e ganchos em JavaScript. Projeto mantido por uma pessoa só |

**Onde rodar sem pagar:**

| Lugar | Vantagem | Cuidado |
|---|---|---|
| **Servidor da Faculdade** (pedir à TI) | O dado fica na instituição, que é a controladora. A TI já faz backup. É o arranjo mais simples para a LGPD | Depende de a TI aceitar e cuidar |
| **Computador da própria clínica** (rede local) | Grátis, e o dado não sai da clínica | Só funciona dentro da rede da clínica. O backup e a máquina ligada ficam por conta da equipe |
| **Oracle Cloud Always Free** (máquina virtual gratuita) | Gratuita sem prazo | Em junho de 2026, o limite caiu para 2 processadores e 12 GB de memória. Máquinas acima do limite são desligadas e apagadas. Não confirmei se São Paulo pode ser a região dessas máquinas. Arriscado para dado real |

## 5. Créditos para estudantes

- **Azure for Students (Microsoft):** as fontes falam em US$ 100 de crédito por ano, sem cartão de crédito, renovável enquanto o aluno estiver matriculado. A Azure tem região no Brasil. Daria para um PostgreSQL gerenciado (exige a mesma adaptação de login que o Neon). Conferir as condições na página da Microsoft.
- **GitHub Student Developer Pack:** reúne ofertas para estudantes. Segundo uma fonte, o crédito da DigitalOcean saiu do pacote em julho de 2026. Conferir a lista atual.

Crédito acaba: serve para o PIC ou para um piloto, não para guardar prontuário por 20 anos.

## 6. Recomendação

| Momento | Opção | Por quê |
|---|---|---|
| **Apresentação do PIC** (dados fictícios) | **JSON**, como já está | Funciona, custo zero, nada a fazer |
| Mostrar o banco de verdade na banca | **Supabase Free** | O banco já está pronto e testado para ele (cerca de 30 minutos, passo a passo em `banco/README.md`). Antes da banca, abrir o painel para reativar o projeto, se tiver pausado |
| Piloto com pacientes reais, sem custo | **Servidor da Faculdade** com Supabase instalado (ou PostgreSQL + PostgREST) | Mesmo código, dado na instituição, backup pela TI |
| Uso real com custo baixo | **Supabase Pro** (US$ 25/mês) | Backup diário, não pausa, dados em São Paulo; cabe 20 anos no cenário atual |
| **Não recomendado para dado real** | JSON, GitHub como banco, JSONBin; qualquer plano gratuito sem backup; Oracle Always Free | Privacidade, perda de dados ou risco de a máquina sumir |

"Gratuito" com dado de saúde real quer dizer que alguém assume o trabalho de backup, atualização e segurança, e responde por ele. Na clínica-escola, quem responde pelos dados é a instituição. Por isso a decisão final é da Faculdade, com o encarregado de dados.

## Fontes

Preços e limites mudam com frequência. Conferidos em novembro de 2026; confirme na página oficial de cada serviço antes de decidir.

- Supabase: [pausa por inatividade (FAQ oficial)](https://supabase.com/kb/faqs/platform/free-project-pausing), [limites do plano gratuito](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
- Neon: [limites do plano gratuito (FAQ oficial)](https://neon.com/faqs/free-plan-limits-and-quotas), [API de dados com RLS](https://neon.com/docs/data-api/access-control)
- Firebase: [preços oficiais](https://firebase.google.com/pricing), [Spark × Blaze e armazenamento](https://dev.to/androve2k/spark-vs-blaze-the-firebase-pricing-guide-i-wish-id-read-sooner-onb)
- Turso: [preços oficiais](https://turso.tech/pricing.md)
- Cloudflare D1: [aplicação dos limites do plano gratuito](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
- MongoDB Atlas: [limites do cluster gratuito](https://mongodb.com/docs/atlas/reference/free-shared-limitations/)
- Appwrite: [plano gratuito](https://appwrite.io/docs/advanced/platform/free), [leituras e gravações](https://appwrite.io/blog/post/announcing-database-reads-and-writes-pricing)
- Nhost: [preços](https://nhost.io/pricing)
- PocketBase: [FAQ oficial](https://pocketbase.io/faq/)
- Oracle Cloud: [recursos Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm), [mudança de junho de 2026](https://tilnote.io/pages/6a623c5c1599458001e35c78.md)
- GitHub API: [limites de uso](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- JSON na nuvem: [JSONBin](https://jsonbin.io/), [JSONsilo](https://jsonsilo.com/pricing)
- Estudantes: [GitHub Student Developer Pack 2026](https://capitalandcompute.net/blog/github-student-developer-pack-2026/), [vantagens para estudantes](https://www.buildmvpfast.com/blog/student-developer-perks-free-ai-tools-copilot-cursor-2026)
