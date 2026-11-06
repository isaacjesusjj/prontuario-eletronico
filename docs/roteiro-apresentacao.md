# Roteiro de apresentação — Vínculo (03/12/2026)

Duração sugerida: 12 minutos de site + o diagnóstico de viabilidade nos slides. A divisão entre os integrantes é só uma sugestão.

## Antes de começar

1. Abra o site pelo link: https://isaacjesusjj.github.io/prontuario-eletronico/
2. Na tela de login, clique em **"Restaurar dados de demonstração"** (rodapé). Isso também ajusta as datas: a sessão "de hoje" cai no dia da apresentação.
3. Navegador em tela cheia, zoom entre 100% e 125%.
4. Para trocar de perfil, use **"Sair"** no topo. Senha de todas as contas: **demonstracao2026**.

## Cola de logins

| Quem | Perfil | Usuário |
|---|---|---|
| Ana Lúcia | Psicóloga técnica | `ana.tecnica` |
| Helena | Supervisora do Grupo A | `helena.supervisora` |
| Bia | Estagiária (Grupo A, Dupla 1) — ainda não aceitou o termo | `bia.estagiaria` |
| Enzo | Estagiário (Grupo B, Trio 1) | `enzo.estagiario` |
| Iara | Estagiária do semestre passado (vínculo encerrado) | `iara.estagiaria` |
| Paciente Exemplo 01 | Paciente | `paciente01` |
| Marta | Direção do curso | `marta.direcao` |

## 1. Abertura, fila e CPF — Isaac (2 min)

- O problema: registros em papel e pacientes que vêm uma vez e não voltam.
- **Entrar na fila de espera** → enviar vazio: os campos com erro ficam marcados e o foco vai para o primeiro.
- Digite o CPF `123.456.789-00` → "CPF inválido" (dígito verificador).
- Frase: "Se o CPF já estiver cadastrado, o formulário **não avisa**: isso revelaria quem é paciente da clínica. Quem vê é a equipe."

## 2. Login e primeiro acesso — Isaac (1,5 min)

- `bia.estagiaria` com senha errada → mensagem genérica. "Com 5 erros, bloqueia por 30 segundos, e a senha digitada nunca é gravada."
- Login certo → **Termo de responsabilidade e sigilo** antes de tudo (Res. CFP 05/2025, art. 10, III). Sem aceitar, não navega.
- "A senha não fica no JSON: só o hash, com 600 mil iterações."

## 3. Psicóloga técnica — Daniel (2 min)

- `ana.tecnica` → **Fila de espera**: a inscrição **i05** aparece com "CPF já cadastrado".
- **Triar** → aviso: o novo caso fica ligado ao cadastro que já existe, sem duplicar o paciente.
- Mostre os **consentimentos por finalidade**: cada um com data, quem registrou e versão do termo.
- **Auditoria** → **Verificar integridade**: "Cadeia íntegra".

## 4. Estagiária — Dilson (2 min)

- `bia.estagiaria` → **Paciente Exemplo 01** → **Sessões e faltas** → sessão de **hoje** → **Presente**.
- **Lembrete WhatsApp** numa sessão futura: a mensagem não tem nome do serviço nem conteúdo clínico.
- **Evoluções** → **Nova evolução** → tema, intervenção e plano → **Assinar e enviar à supervisão**.
- **Agenda** → semana e mês.
- Tente abrir um caso do Enzo: **acesso não permitido** (e a tentativa vai para a auditoria).

## 5. Supervisora — Isaac (1,5 min)

- `helena.supervisora` → **Validação** → **Validar e assinar**. A evolução validada não tem mais campo de edição: correção só por **adendo**.
- Aba **Supervisão**: orientações fora do prontuário (o paciente não recebe isso na cópia).

## 6. Abandono de tratamento — Daniel (1 min)

- `bia.estagiaria` → **Paciente Exemplo 02** → **Sessões e faltas**: duas faltas seguidas abriram o **fluxo de abandono**.
- Registre o contato com o motivo → **Encerrar por abandono e liberar a vaga**.
- Frase-chave: "Antes, a vaga era só realocada. Agora a clínica sabe **por que** o paciente saiu."

## 7. Paciente e LGPD — Dilson (1,5 min)

- `paciente01` → **Meus dados (LGPD)**: dados guardados, autorizações (revogar lembretes) e pedido ao encarregado.
- **Meu prontuário** → **Pedir cópia**. Depois, `ana.tecnica` → **Acesso do paciente** → identidade conferida → **gerar link de leitura** (72 h, pede a data de nascimento).

## 8. Direção, rodízio e fechamento — Dilson (1 min)

- `marta.direcao` → **Indicadores** (sem nomes) → **Grupos de estágio** → **Encerrar estágio**: o acesso termina na hora.
- `iara.estagiaria`: entra, mas não vê nenhum caso (vínculo do semestre passado).
- Rodapé: **Regras e leis** (cada regra com a norma) e **Acessibilidade** (A−/A+, contraste, Libras).
- Passe para os slides: "Agora, por que isso é viável."

## Provas ao vivo (F12)

- **Network:** recarregue e mostre `dados-iniciais.json` (200) e que **nenhum** arquivo vem de outro site.
- **Console:** `PEP.db.usuarios[0].senhaHash` → mostra `pbkdf2-sha256$600000$...` (nada de senha).
- **Console (como Bia):** `PEP.regras.podeVerCaso(PEP.estado.usuarioAtual(), PEP.util.porId(PEP.db.casos, 'c04'))` → `false`.
- **Console (como Ana):** `PEP.db.auditoria[1].acao = 'apaguei'` → **Auditoria** → **Verificar integridade** → "Cadeia quebrada no evento 2".
- **Console:** `PEP.validar.cpf('123.456.789-00')` → `false`.
- **Application:** `sessionStorage` tem a sessão (some ao fechar a aba); `localStorage` tem a cópia dos dados.

## Perguntas prováveis

- **Quais as stacks?** Hoje: HTML, CSS e JavaScript puros no GitHub Pages. Banco: PostgreSQL no Supabase (região São Paulo), com Supabase Auth e Storage. A troca é `js/config-banco.js`.
- **O banco aguenta?** ~84 MB por ano no cenário atual; ~16 GB em 20 anos no cenário ×10. O pico é de ~47 pessoas ao mesmo tempo. O PostgreSQL aguenta muito mais.
- **Por que não MySQL?** Também aguentaria, mas não tem regra de acesso por linha: o sigilo ficaria só no código.
- **Como provam que funciona?** 154 verificações automáticas no site, 56 no banco (PostgreSQL de verdade) e o validador do JSON.
- **E se alguém chamar a API direto?** O banco aplica as mesmas regras (RLS): a estagiária só recebe as linhas dos casos dela.
- **Por que a senha não exige símbolo?** O NIST proibiu regras de composição em 2025: elas levam a senhas previsíveis. Vale o comprimento (15 caracteres) e a lista de senhas comuns.
- **Os dados são reais?** Não. Tudo é fictício; CPFs gerados por algoritmo.
- **Por que a direção não vê o prontuário?** Sigilo: a função dela é acadêmica; indicadores bastam.
- **Por que o paciente pode ler o prontuário?** É direito dele (Res. CFP 05/2025, art. 13). Por isso o registro é técnico e a supervisão fica separada.
- **E o Figma?** É a Etapa 3, feita a partir das telas do site.

## Plano B

- **Sem internet:** abra a pasta no VS Code com a extensão **Live Server**.
- **Algo estranho na tela:** **Sair** → **"Restaurar dados de demonstração"**.
- **VLibras não abre:** depende do site do governo; mostre a declaração de acessibilidade.
