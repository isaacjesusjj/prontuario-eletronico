# Roteiro de apresentação — Vínculo

Duração sugerida: 8 a 10 minutos. A divisão entre os integrantes é só uma sugestão.

## Antes de começar

1. Abra o site e clique em **"Restaurar dados de demonstração"** (fica no rodapé da tela de entrada).
2. Deixe o navegador em tela cheia e com zoom de 100% a 125%.
3. Para trocar de perfil durante a apresentação, use o botão **"Trocar perfil"** no topo.

## 1. Abertura — Isaac (1 min)

- O problema: registros em papel e pacientes que vêm uma vez e não voltam.
- A proposta: um prontuário que acompanha o paciente da fila de espera até o encerramento, com supervisão em cada registro.
- Aviso: protótipo com dados fictícios; login e permissões são simulados.

## 2. Paciente entra na fila — Isaac (1 min)

- Tela de entrada → **Entrar na fila de espera**.
- Mostre o **aviso de urgência** (SAMU 192, CVV 188) e o **aviso de privacidade**.
- Preencha e envie.

## 3. Psicóloga técnica — Daniel (1,5 min)

- Entre como **Ana Lúcia** → **Fila de espera** → **Triar** a primeira inscrição.
- Mostre os **consentimentos por finalidade** (gravação, supervisão em grupo, uso em ensino).
- Aloque ao **Grupo A** e conclua.
- Abra **Auditoria**: cada abertura de prontuário fica registrada.

## 4. Estagiária — Dilson (1,5 min)

- Entre como **Bia** → painel com evoluções pendentes e devolvidas.
- Abra **Paciente Exemplo 01** → **Evoluções** → **Nova evolução** → **Assinar e enviar à supervisão**.
- Troque para **Enzo**: ele vê outros casos. Cada estagiário só acessa os casos da própria dupla ou trio.

## 5. Supervisora — Isaac (1,5 min)

- Entre como **Helena** → **Validação** → abra a evolução → **Validar e assinar**.
- Mostre que a evolução validada **não tem campo de edição**: correção só por **adendo**.
- Aba **Supervisão**: orientações ficam **fora do prontuário** (o paciente não recebe isso na cópia).

## 6. Abandono de tratamento — Daniel (1,5 min)

- Entre como **Bia** → **Paciente Exemplo 02** → **Sessões e faltas**.
- Duas faltas seguidas abriram o **fluxo de abandono**.
- Registre a tentativa de contato com o motivo (ex.: "Transporte ou distância") → **Encerrar por abandono e liberar a vaga**.
- Frase-chave: "Antes, a vaga era só realocada. Agora a clínica sabe **por que** o paciente saiu."

## 7. Paciente e acesso ao prontuário — Dilson (1 min)

- Entre como **Paciente Exemplo 01** → **Confirmar presença** → **Meu prontuário** → **Pedir cópia**.
- Volte como **Ana Lúcia** → **Acesso do paciente** → conferir identidade → **Gerar cópia (PDF)**.
- Mostre que a cópia **não traz** rascunhos, orientações de supervisão nem testes.

## 8. Direção e fechamento — Dilson (1 min)

- Entre como **Marta** → **Indicadores**: atendidos, taxa de retorno e **motivos de abandono** — sem nomes de pacientes.
- Tente abrir um prontuário: **acesso não permitido**.
- Próximos passos: Etapas 2 e 3 do PIC (baixa fidelidade, navegação, DER e Figma) e, no futuro, back-end com segurança real.

## Perguntas prováveis

- **Os dados são reais?** Não. Tudo é fictício; no sistema real, nada de dado de paciente em ambiente de teste.
- **Por que a direção não vê o prontuário?** Sigilo: a função dela é acadêmica, e indicadores agregados bastam.
- **Por que não dá para editar uma evolução?** O prontuário é documento: corrigir apagando esconderia o que foi registrado. O adendo corrige deixando rastro.
- **Por que o paciente pode pedir o prontuário?** É direito dele pela Resolução CFP 05/2025. Por isso o registro é técnico e objetivo, e a supervisão fica separada.
- **E a segurança?** Aqui é simulada no navegador. No sistema real: login institucional, servidor, banco de dados e criptografia.
