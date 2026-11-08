# Documentação LGPD do Vínculo

Rascunho preparado pelo grupo para a instituição completar e validar com o jurídico e o encarregado de dados. Nomes da instituição e do encarregado são fictícios no protótipo. O texto público para os titulares está no site, em **Aviso de privacidade** (`#/privacidade`).

## 1. Encarregado de dados (art. 41)

- Nome e contato publicados no aviso de privacidade e no rodapé do site.
- Recebe os pedidos dos titulares (no protótipo, a tela **Pedidos LGPD** faz esse papel), responde à ANPD e orienta a equipe.
- Prazo adotado para responder ao titular: 15 dias (art. 19, II).

## 2. Registro das operações de tratamento (art. 37)

| Operação | Titulares | Dados | Finalidade | Base legal | Quem acessa | Retenção |
|---|---|---|---|---|---|---|
| Fila de espera | Pessoas que pedem atendimento (inclui menores, pelo responsável) | Identificação, CPF, contato, resumo do motivo | Organizar a fila e contatar | Art. 7º, VIII; art. 11, II, "f" | Psicólogo técnico | 12 meses após sair da fila (a validar) |
| Prontuário | Pacientes | Identificação, anamnese, evoluções, documentos, encerramento | Atendimento e registro obrigatório | Art. 11, II, "f" e "a" | Equipe do caso; técnico | Mínimo 5 anos (Res. CFP 05/2025, art. 18); instituição adota 20 (Lei 13.787/2018) |
| Supervisão | Pacientes, estagiários | Orientações ligadas ao caso | Formação supervisionada | Art. 11, II, "a"; grupo: consentimento | Supervisor e estagiários do caso | Igual ao prontuário |
| Avaliação psicológica | Pacientes | Instrumentos aplicados | Avaliação | Art. 11, II, "f" | Equipe do caso; técnico | Igual ao prontuário |
| Gravação, ensino, lembretes | Pacientes | Conforme a finalidade | Supervisão, ensino, aviso de sessão | Consentimento (arts. 7º, I, e 11, I), revogável | Equipe do caso | Até a revogação ou o fim da finalidade |
| Risco e notificação compulsória | Pacientes | Tipo e nível do risco, descrição, condutas, órgão notificado e protocolo | Proteger a vida e cumprir a notificação obrigatória | Art. 11, II, "a", "e" e "f" | Equipe do caso; técnico com motivo registrado | Igual ao prontuário |
| Plano de segurança | Pacientes | Sinais de alerta, estratégias, pessoas e serviços de apoio | Cuidado em situação de risco | Art. 11, II, "f" | Equipe do caso; o próprio paciente, no portal | Igual ao prontuário |
| Aviso de falta pelo paciente | Pacientes | Sessão e motivo de lista fechada (sem texto livre) | Organizar a agenda e entender as faltas (indicador sem nomes) | Art. 11, II, "f" | Equipe do caso; direção só o total por motivo | Igual ao prontuário |
| Contas e auditoria | Equipe e pacientes com conta | Nome, e-mail, matrícula, CRP, registros de acesso, motivo de acesso da técnica | Login, controle de acesso, prova de integridade, "quem acessou" para o paciente | Art. 7º, II e IX; arts. 6º, X, e 46 | Técnico (auditoria); o paciente vê os acessos ao próprio prontuário, por categoria | Acessos: mínimo 6 meses (Marco Civil, art. 15); auditoria do prontuário: igual ao prontuário |
| Verificação em duas etapas | Equipe (obrigatória em produção) e pacientes que ligarem | Segredo do aplicativo autenticador (no Supabase Auth) e códigos de recuperação (só o hash) | Segurança do acesso | Art. 46 | Ninguém da equipe lê o segredo; para quem perdeu o celular, a direção (contas da equipe) ou a técnica (contas de paciente) só desliga | Enquanto a conta existir |

Operador: provedor do banco em nuvem (Supabase, região São Paulo), sob contrato de tratamento de dados.

## 3. Relatório de impacto (RIPD) — resumo (art. 38)

**Por que fazer:** o sistema trata dado sensível de saúde, inclusive de crianças e adolescentes, em larga escala ao longo dos anos.

| Risco | Probabilidade | Impacto | Medidas no Vínculo | Risco residual |
|---|---|---|---|---|
| Estagiário acessar caso que não é dele | Média | Alto | Acesso por vínculo ativo (RLS no banco); auditoria de toda abertura e tentativa negada | Baixo |
| Ex-estagiário continuar acessando | Média | Alto | Vínculo com data de fim; direção encerra no fim do semestre; acesso cai na hora; o caso passa para a nova dupla por registro próprio (a dupla anterior perde o acesso) | Baixo |
| Alteração de registro clínico depois de assinado | Baixa | Alto | Evolução validada imutável (trigger); correção só por adendo; hash do texto na assinatura | Baixo |
| Senha fraca ou vazada | Média | Alto | Mínimo de 15 caracteres, lista de senhas comuns, hash PBKDF2/bcrypt, bloqueio progressivo, verificação em duas etapas (com ela, o banco não entrega nada a quem tem só a senha) | Baixo com MFA obrigatório para a equipe |
| Técnica abrir prontuário sem necessidade | Média | Alto | Motivo registrado antes do conteúdo clínico de caso fora da equipe (vale 12 h, exigido pelo banco); o paciente vê quem acessou | Baixo |
| Pessoa em risco sem acompanhamento | Média | Alto | Risco registrado no caso, ciência obrigatória da supervisão (aviso no painel), notificação com órgão e prazo, plano de segurança no portal | Médio (depende da conduta clínica) |
| Cópia ao responsável expor relato de violência | Baixa | Alto | Relato de violência e notificação ficam fora da cópia de criança ou adolescente; só a equipe vê o que foi omitido | Baixo |
| Contornar as regras chamando a API direto | Baixa | Alto | Regras de transição, carimbo de tempo e RLS no próprio banco; testes negativos automáticos | Baixo |
| Tela vista por outra pessoa (sala compartilhada) | Média | Médio | Modo discreto (iniciais no lugar de nomes) e "Cobrir tela" | Baixo |
| Sessão aberta em computador compartilhado | Média | Médio | Sessão na aba, encerra com 15 min sem uso, aviso antes | Baixo |
| Conteúdo clínico vazar por WhatsApp/e-mail | Média | Alto | Lembretes sem nome do serviço nem conteúdo; termo de sigilo proíbe envio fora do sistema | Médio (depende de pessoas) |
| Formulário público revelar quem é paciente | Baixa | Alto | Mensagem igual para CPF novo ou já cadastrado; duplicidade só para a equipe | Baixo |
| Arquivo malicioso nos anexos | Baixa | Médio | Só PDF/JPG/PNG até 2 MB, conferindo o conteúdo; bucket privado | Baixo |
| Perda de dados | Baixa | Alto | Plano Pro com backup diário (7 dias) + exportação periódica; teste de restauração | Baixo |
| Adulteração da auditoria | Baixa | Alto | Cadeia de hash; tabela só de inserção; verificação no banco e na tela | Baixo |

**Conclusão:** com as medidas acima e a ativação do MFA obrigatório para a equipe e do backup no plano de produção, o risco residual é aceitável para iniciar um piloto com dados reais, após aprovação da coordenação, do encarregado e do jurídico.

## 4. Plano de resposta a incidentes (art. 48; Res. CD/ANPD 15/2024)

1. **Detectar:** alerta da auditoria (acessos negados em sequência, verificação da cadeia quebrada) ou aviso de qualquer usuário ao encarregado.
2. **Conter:** bloquear contas envolvidas, revogar links de leitura, trocar chaves de acesso do banco.
3. **Avaliar o risco** aos titulares (dados de saúde = risco relevante na maioria dos casos).
4. **Comunicar** a ANPD e os titulares em até **3 dias úteis** do conhecimento, com complementação em até 20 dias úteis se necessário.
5. **Registrar** o incidente e as medidas; guardar o registro por no mínimo 5 anos.
6. **Corrigir** a causa e revisar este documento.

## 5. Termos e consentimentos (versão 2026.1)

| Documento | Onde está | Quem aceita | Como fica registrado |
|---|---|---|---|
| Aviso de privacidade | `#/privacidade` (rodapé de todas as telas) | Todos (ciência) | Versão gravada na inscrição |
| Termos de uso | `#/termos` | Pacientes com conta | Tabela `aceites` |
| Termo de responsabilidade e sigilo | 1º acesso da equipe | Estagiários, supervisores, técnicos, direção | Tabela `aceites` (Res. CFP 05/2025, art. 10, III) |
| Consentimentos por finalidade | Triagem; "Meus dados" do paciente | Paciente ou responsável | Tabela `consentimentos`: um registro por mudança, com data, quem registrou e versão do termo |
