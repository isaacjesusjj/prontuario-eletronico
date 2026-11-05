# Roteiro de apresentação — Vínculo

Duração sugerida: 8 a 10 minutos. A divisão entre os integrantes é só uma sugestão.

## Antes de começar

1. Abra o site pelo link: https://isaacjesusjj.github.io/prontuario-eletronico/ (com dois cliques no arquivo ele não carrega os dados).
2. Na tela de login, clique em **"Restaurar dados de demonstração"** (rodapé).
3. Deixe o navegador em tela cheia, com zoom de 100% a 125%.
4. Para trocar de perfil, use **"Sair"** no topo e entre com outra conta.

## Cola de logins

Senha de todas as contas: **vinculo2026**. Na tela de login, clicar no cartão da conta preenche usuário e senha; depois é só clicar em **Entrar** (ou apertar Enter).

| Quem | Perfil | Usuário |
|---|---|---|
| Ana Lúcia | Psicóloga técnica | `ana.tecnica` |
| Helena | Supervisora do Grupo A | `helena.supervisora` |
| Rafael | Supervisor do Grupo B | `rafael.supervisor` |
| Bia | Estagiária (Grupo A, Dupla 1) | `bia.estagiaria` |
| Duda | Estagiária (Grupo A, Dupla 2) | `duda.estagiaria` |
| Enzo | Estagiário (Grupo B, Trio 1) | `enzo.estagiario` |
| Paciente Exemplo 01 | Paciente | `paciente01` |
| Marta | Direção do curso | `marta.direcao` |

## 1. Abertura e login — Isaac (1,5 min)

- O problema: registros em papel e pacientes que vêm uma vez e não voltam.
- A proposta: um prontuário que acompanha o paciente da fila de espera até o encerramento, com supervisão em cada registro.
- **Login:** digite `bia.estagiaria` com uma senha errada → aparece **"Usuário ou senha incorretos"**, sem dizer qual dos dois errou (para não ajudar quem tenta adivinhar).
- Explique: cada perfil vê só o que precisa depois de entrar. Depois de 5 erros seguidos, o login fica bloqueado por 30 segundos. Toda tentativa vai para a auditoria (a senha digitada nunca é gravada).
- Aviso: protótipo com dados fictícios; login e permissões rodam no navegador só para a demonstração.

## 2. Paciente entra na fila — Isaac (1 min)

- Na tela de login → **Entrar na fila de espera** (não precisa de conta).
- Mostre o **aviso de urgência** (SAMU 192, CVV 188) e o **aviso de privacidade**.
- Preencha e envie.

## 3. Psicóloga técnica — Daniel (1,5 min)

- Entre com `ana.tecnica` → **Fila de espera** → **Triar** a primeira inscrição.
- Mostre os **consentimentos por finalidade** (gravação, supervisão em grupo, uso em ensino).
- Aloque ao **Grupo A** e conclua.
- Abra **Auditoria**: aparecem os logins, a tentativa com senha errada e cada abertura de prontuário.

## 4. Estagiária — Dilson (2 min)

- **Sair** → entre com `bia.estagiaria` → painel com evoluções pendentes.
- Abra **Paciente Exemplo 01** → **Sessões e faltas** → na sessão de **04/11**, clique em **Presente**.
- Vá em **Evoluções** → **Nova evolução** → escolha a sessão de 04/11 → escreva tema, intervenção e plano → **Assinar e enviar à supervisão**.
- **Sair** → entre com `enzo.estagiario`: ele vê outros casos. Cada estagiário só acessa os casos da própria dupla ou trio.

## 5. Supervisora — Isaac (1,5 min)

- **Sair** → entre com `helena.supervisora` → **Validação** → abra a evolução da Bia → **Validar e assinar**.
- Mostre que a evolução validada **não tem campo de edição**: correção só por **adendo**.
- Aba **Supervisão**: orientações ficam **fora do prontuário** (o paciente não recebe isso na cópia).

## 6. Abandono de tratamento — Daniel (1,5 min)

- **Sair** → entre com `bia.estagiaria` → **Paciente Exemplo 02** → **Sessões e faltas**.
- Duas faltas seguidas abriram o **fluxo de abandono**.
- Registre a tentativa de contato com o motivo (ex.: "Transporte ou distância") → **Encerrar por abandono e liberar a vaga**.
- Frase-chave: "Antes, a vaga era só realocada. Agora a clínica sabe **por que** o paciente saiu."

## 7. Paciente e acesso ao prontuário — Dilson (1 min)

- **Sair** → entre com `paciente01` → **Confirmar presença** → **Meu prontuário** → **Pedir cópia**.
- **Sair** → entre com `ana.tecnica` → **Acesso do paciente** → **Identidade conferida** → **Gerar cópia (PDF)**.
- Mostre que a cópia **não traz** rascunhos, orientações de supervisão nem testes.

## 8. Direção e fechamento — Dilson (1 min)

- **Sair** → entre com `marta.direcao` → **Indicadores**: atendidos, taxa de retorno e **motivos de abandono** — sem nomes de pacientes.
- Tente abrir um prontuário: **acesso não permitido**.
- Próximos passos: Etapas 2 e 3 do PIC (baixa fidelidade, navegação, DER e Figma) e, no futuro, back-end com segurança real.

## Se der tempo

- Entre com `duda.estagiaria` → **Paciente Exemplo 03** → **Evoluções**: uma evolução **devolvida** pela supervisora, com o comentário explicando o que corrigir, e o alerta de **sessões sem evolução**.

## Perguntas prováveis

- **Os dados são reais?** Não. Tudo é fictício; no sistema real, nada de dado de paciente em ambiente de teste.
- **Onde ficam os dados?** No arquivo `dados/dados-iniciais.json`, organizado em coleções ligadas por ids (usuários, casos, sessões, evoluções…), como tabelas de um banco de dados. As mudanças feitas na demonstração ficam guardadas no navegador.
- **As senhas ficam no JSON?** No protótipo, sim, porque tudo roda no navegador. No sistema real, o servidor confere o login e guarda só o hash da senha; a senha nunca chega ao navegador.
- **Por que a direção não vê o prontuário?** Sigilo: a função dela é acadêmica, e indicadores agregados bastam.
- **Por que não dá para editar uma evolução?** O prontuário é documento: corrigir apagando esconderia o que foi registrado. O adendo corrige deixando rastro.
- **Por que o paciente pode pedir o prontuário?** É direito dele pela Resolução CFP 05/2025. Por isso o registro é técnico e objetivo, e a supervisão fica separada.
- **E a segurança?** Aqui é simulada no navegador. No sistema real: login institucional, servidor, banco de dados e criptografia.

## Plano B

- **Sem internet:** abra a pasta do projeto no VS Code e use a extensão **Live Server**. Com dois cliques no `index.html` o navegador bloqueia a leitura do JSON e aparece um aviso.
- **Algo estranho na tela:** clique em **Sair** e depois em **"Restaurar dados de demonstração"**.
