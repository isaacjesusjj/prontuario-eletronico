# Vínculo — Prontuário Eletrônico da Clínica-Escola de Psicologia

Protótipo funcional do **Projeto Integrador de Curso (PIC)** — Análise e Desenvolvimento de Sistemas, Faculdade de Ciências Médicas da Santa Casa de São Paulo, 2º semestre de 2026 (Etapa 4: HTML, CSS e JavaScript).

**Site:** https://isaacjesusjj.github.io/prontuario-eletronico/

**Grupo:** Daniel Dantas, Dilson Rodrigues e Isaac de Jesus Lima.

> ⚠️ **Protótipo acadêmico.** Todos os dados são fictícios. Login, permissões e banco de dados são simulados no navegador, só para demonstração. Autenticação real, servidor, banco de dados e criptografia são etapas futuras.

---

## O problema

Na clínica-escola, os registros são feitos em papel, e muitos pacientes vêm à primeira sessão e não voltam. Não existe hoje um jeito de saber **por que** eles abandonam o tratamento.

## A solução

O Vínculo acompanha o paciente da fila de espera até o encerramento, com a supervisão presente em cada registro:

- **Fila de espera online**, com aviso de urgência (SAMU 192, CVV 188) e aviso de privacidade.
- **Triagem e cadastro** pela psicóloga técnica, com consentimentos separados por finalidade.
- **Alocação:** a direção monta os grupos, o supervisor forma duplas ou trios e o técnico aloca os pacientes.
- **Prontuário do caso:** anamnese, evoluções, documentos emitidos e anexos.
- **Evolução com validação:** rascunho → enviada à supervisão → validada (assinatura do estagiário e do supervisor) → bloqueada. Correção só por adendo.
- **Fluxo de abandono:** duas faltas seguidas sem justificativa abrem o registro de contato e motivo antes de liberar a vaga.
- **Indicadores agregados:** pacientes atendidos, taxa de retorno, média de sessões e motivos de abandono.
- **Acesso do paciente ao prontuário**, com conferência de identidade e cópia em PDF.
- **Trilha de auditoria:** quem abriu ou alterou cada prontuário, e quando.

## Como usar

- **Online:** abra o link do GitHub Pages.
- **No computador:** baixe a pasta e abra o `index.html` com dois cliques (não precisa de servidor).
- Para voltar ao estado inicial, use **"Restaurar dados de demonstração"** na tela de entrada.

### Perfis para demonstrar

| Perfil | Quem | O que mostrar |
|---|---|---|
| Estagiário(a) | Bia, Duda, Enzo | Só vê os próprios casos; escreve evolução e envia à supervisão |
| Supervisor(a) | Helena (Grupo A), Rafael (Grupo B) | Valida ou devolve evoluções; registra orientações fora do prontuário |
| Psicólogo(a) técnico(a) | Ana Lúcia | Fila, triagem, alocação, acesso do paciente e auditoria |
| Paciente | Paciente Exemplo 01 | Confirma presença e pede cópia do prontuário |
| Direção do curso | Marta | Só indicadores agregados e grupos de estágio |

O roteiro da apresentação está em [`docs/roteiro-apresentacao.md`](docs/roteiro-apresentacao.md).

## Estrutura

```
index.html               página única; carrega os scripts na ordem
css/estilo.css           identidade visual (cores em variáveis no topo)
js/dados.js              dados fictícios de demonstração
js/estado.js             armazenamento no navegador e auditoria
js/permissoes.js         regras de acesso e de negócio
js/ui.js                 topo, menu por perfil e componentes
js/telas-*.js            telas (entrada, painéis, prontuário, gestão)
js/acoes.js              o que cada botão faz
js/app.js                navegação por hash (#/rota) e inicialização
```

Decisões técnicas: HTML, CSS e JavaScript puros, sem frameworks nem build; scripts clássicos e dados em `.js` (funciona com duplo clique e no GitHub Pages); caminhos relativos; layout responsivo; foco visível e rótulos em todos os campos.

## Registro de correções em relação à Etapa 1

Mudanças feitas pelo grupo ao validar os requisitos da Etapa 1. **Devem ser confirmadas com o cliente.**

| O que estava | O que ficou | Por quê |
|---|---|---|
| Direção do curso via todos os prontuários, documentos e dados de pacientes | Direção vê só indicadores agregados e grupos de estágio | Sigilo (Código de Ética) e princípio da necessidade (LGPD) |
| Tabela permitia ao Psicólogo Técnico editar/remover evolução | Ninguém edita ou apaga evolução validada; correção só por adendo | Coerência com o próprio requisito de imutabilidade da Etapa 1 |
| Evolução salva pelo estudante, sem revisão | Ciclo com validação e assinatura do supervisor | Res. CFP 01/2009, art. 3º, e Res. CFP 05/2025, art. 19 |
| Técnico "autorizava" o acesso do paciente | O sistema registra o pedido, confere a identidade e entrega; o técnico organiza a entrega | O prontuário é de acesso irrestrito ao paciente (Res. CFP 05/2025, art. 13) |
| Testes psicológicos anexados ao prontuário e incluídos no PDF | Testes numa área restrita, fora do prontuário e do PDF | Res. CFP 05/2025, art. 14, e Res. CFP 01/2009 |
| Local das orientações de supervisão não definido | Registro de supervisão separado, fora do prontuário e do PDF | Res. CFP 05/2025, art. 17, §2º |
| Duas faltas → realocar outro paciente | Duas faltas sem justificativa abrem o fluxo de contato e motivo; só então a vaga é liberada | Ataca a dor principal do cliente: saber por que o paciente não volta |
| Supervisor acessava "todos os casos" | Supervisor acessa os casos dos seus grupos | Princípio da necessidade; a técnica responsável continua vendo todos, com auditoria |
| Alocação com três responsáveis diferentes | Direção monta grupos; supervisor forma duplas/trios; técnico aloca pacientes | Inconsistência entre requisitos, casos de uso e funcionalidades |
| Escalabilidade: "800 usuários simultâneos" × "800 estudantes" | Tratado como 800 estudantes cadastrados no total | Os dois números da Etapa 1 se contradiziam (validar com o cliente) |
| Chat paciente–psicólogo e notificações (no protótipo v1) | Sem chat; lembretes sem conteúdo clínico | Mensagens de crise poderiam ficar sem ninguém olhando |
| Fila de espera sem orientação de urgência | Aviso de urgência e de privacidade no formulário público | Quem está em risco não pode esperar a fila |

**Sugestão para validar com o cliente:** perda de vaga também com 3 faltas intercaladas sem justificativa (regra comum em clínicas-escola).

## Registro de decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Nome | Vínculo | Remete ao vínculo terapêutico e ao problema do paciente que não volta |
| Cores | Verde institucional estimado da Santa Casa | Identidade da faculdade; tons ajustáveis no topo de `css/estilo.css` |
| Escopo | Núcleo + todos os extras | Mostrar o fluxo completo na apresentação |
| Tecnologia | HTML, CSS e JS puros | Exigência da Etapa 4 e facilidade para explicar o código |

## ODS (Agenda 2030 da ONU)

- **ODS 3 — Saúde e bem-estar:** mais continuidade no cuidado em saúde mental.
- **ODS 4 — Educação de qualidade:** formação supervisionada dos estudantes de Psicologia.

## Créditos

- **Etapa 1 (requisitos, 1º semestre de 2026):** Adônis Silveira, Isaac Jesus, Felipe Moretti e Giovane Guedes.
- **Protótipo de telas v1:** Daniel Dantas, Dilson Rodrigues, Gustavo Santos e Ryan Mendes.

## Próximas etapas

1. Etapa 1 revisada: correções acima e associação com ODS.
2. Etapa 2: protótipo de baixa fidelidade, diagrama de navegação e DER.
3. Etapa 3: protótipo de alta fidelidade no Figma.
4. Evolução futura: back-end, banco de dados, autenticação real e criptografia.

## Referências

- Resolução CFP nº 05/2025 (estágios e serviço-escola)
- Resolução CFP nº 01/2009 (registro documental e prontuário)
- Código de Ética Profissional do Psicólogo (Resolução CFP nº 10/2005)
- Resolução CFP nº 31/2022 (avaliação psicológica e SATEPSI)
- Lei Geral de Proteção de Dados — Lei nº 13.709/2018
