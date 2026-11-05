/* =========================================================
   dados.js — dados 100% FICTÍCIOS para a demonstração.
   Nenhum nome, telefone ou caso é real.
   A função devolve uma cópia nova, usada também no botão
   "Restaurar dados de demonstração".
   ========================================================= */
var PEP = window.PEP || {};
window.PEP = PEP;

PEP.criarDadosIniciais = function () {
  return {
    // ---------- Usuários (perfis simulados) ----------
    usuarios: [
      { id: 'u-tec',  nome: 'Ana Lúcia',  perfil: 'tecnico',    descricao: 'Psicóloga técnica (responsável técnica)', crp: 'CRP 00/00001 (fictício)' },
      { id: 'u-sup1', nome: 'Helena',     perfil: 'supervisor', descricao: 'Supervisora do Grupo A', crp: 'CRP 00/00002 (fictício)' },
      { id: 'u-sup2', nome: 'Rafael',     perfil: 'supervisor', descricao: 'Supervisor do Grupo B',  crp: 'CRP 00/00003 (fictício)' },
      { id: 'u-est1', nome: 'Bia',        perfil: 'estagiario', descricao: 'Estagiária · Grupo A, Dupla 1' },
      { id: 'u-est2', nome: 'Caio',       perfil: 'estagiario', descricao: 'Estagiário · Grupo A, Dupla 1' },
      { id: 'u-est3', nome: 'Duda',       perfil: 'estagiario', descricao: 'Estagiária · Grupo A, Dupla 2' },
      { id: 'u-est4', nome: 'Lia',        perfil: 'estagiario', descricao: 'Estagiária · Grupo A, Dupla 2' },
      { id: 'u-est5', nome: 'Enzo',       perfil: 'estagiario', descricao: 'Estagiário · Grupo B, Trio 1' },
      { id: 'u-est6', nome: 'Fábio',      perfil: 'estagiario', descricao: 'Estagiário · Grupo B, Trio 1' },
      { id: 'u-est7', nome: 'Gabi',       perfil: 'estagiario', descricao: 'Estagiária · Grupo B, Trio 1' },
      { id: 'u-est8', nome: 'Hugo',       perfil: 'estagiario', descricao: 'Estagiário · ainda sem grupo' },
      { id: 'u-pac1', nome: 'Paciente Exemplo 01', perfil: 'paciente', descricao: 'Paciente em atendimento', pacienteId: 'p01' },
      { id: 'u-dir',  nome: 'Marta',      perfil: 'direcao',    descricao: 'Direção do curso de Psicologia' }
    ],

    // ---------- Grupos de estágio ----------
    // Direção define os grupos por supervisor; supervisor forma duplas/trios.
    grupos: [
      { id: 'g-a', nome: 'Grupo A', foco: 'Psicoterapia de adultos', supervisorId: 'u-sup1',
        subgrupos: [
          { id: 'd-a1', nome: 'Dupla 1', estagiarios: ['u-est1', 'u-est2'] },
          { id: 'd-a2', nome: 'Dupla 2', estagiarios: ['u-est3', 'u-est4'] }
        ] },
      { id: 'g-b', nome: 'Grupo B', foco: 'Adolescentes e famílias', supervisorId: 'u-sup2',
        subgrupos: [
          { id: 't-b1', nome: 'Trio 1', estagiarios: ['u-est5', 'u-est6', 'u-est7'] }
        ] }
    ],
    estagiariosSemGrupo: ['u-est8'],

    // ---------- Pacientes (camada operacional) ----------
    pacientes: [
      { id: 'p01', nome: 'Paciente Exemplo 01', idade: 29, contato: '(11) 90000-0001 (fictício)', responsavel: '' },
      { id: 'p02', nome: 'Paciente Exemplo 02', idade: 41, contato: '(11) 90000-0002 (fictício)', responsavel: '' },
      { id: 'p03', nome: 'Paciente Exemplo 03', idade: 35, contato: '(11) 90000-0003 (fictício)', responsavel: '' },
      { id: 'p04', nome: 'Paciente Exemplo 04', idade: 15, contato: '(11) 90000-0004 (fictício)', responsavel: 'Responsável Exemplo 04' },
      { id: 'p05', nome: 'Paciente Exemplo 05', idade: 23, contato: '(11) 90000-0005 (fictício)', responsavel: '' },
      { id: 'p06', nome: 'Paciente Exemplo 06', idade: 52, contato: '(11) 90000-0006 (fictício)', responsavel: '' },
      { id: 'p07', nome: 'Paciente Exemplo 07', idade: 33, contato: '(11) 90000-0007 (fictício)', responsavel: '' }
    ],

    // ---------- Fila de espera online ----------
    inscricoes: [
      { id: 'i01', nome: 'Pessoa Inscrita 01', idade: 27, contato: '(11) 90000-1001 (fictício)', resumo: 'Ansiedade antes de provas', periodo: 'Tarde', data: '2026-09-02', status: 'aguardando' },
      { id: 'i02', nome: 'Pessoa Inscrita 02', idade: 44, contato: '(11) 90000-1002 (fictício)', resumo: 'Luto recente na família', periodo: 'Manhã', data: '2026-09-15', status: 'aguardando' },
      { id: 'i03', nome: 'Pessoa Inscrita 03', idade: 12, contato: '(11) 90000-1003 (fictício)', resumo: 'Dificuldade de adaptação na escola (inscrito pelo responsável)', periodo: 'Tarde', data: '2026-10-07', status: 'aguardando' },
      { id: 'i04', nome: 'Pessoa Inscrita 04', idade: 38, contato: '(11) 90000-1004 (fictício)', resumo: 'Conflitos no relacionamento', periodo: 'Noite', data: '2026-10-21', status: 'aguardando' }
    ],

    // ---------- Casos (processo terapêutico) ----------
    casos: [
      { id: 'c01', pacienteId: 'p01', grupoId: 'g-a', subgrupoId: 'd-a1', status: 'ativo', inicio: '2026-08-19',
        demanda: 'Ansiedade relacionada ao trabalho, com prejuízo no sono.',
        objetivos: 'Compreender os gatilhos da ansiedade e construir estratégias de enfrentamento.',
        anamnese: { queixa: 'Preocupação constante e dificuldade para dormir.', historicoFamiliar: 'Relata histórico de ansiedade na família.', medicacoes: 'Nenhuma no momento.', sintomas: 'Insônia inicial, tensão muscular.', historicoClinico: 'Sem atendimento psicológico anterior.' },
        consentimentos: { contrato: true, supervisaoGrupo: true, gravacao: false, ensinoAnonimo: true } },
      { id: 'c02', pacienteId: 'p02', grupoId: 'g-a', subgrupoId: 'd-a1', status: 'ativo', inicio: '2026-09-09',
        demanda: 'Tristeza persistente após mudança de cidade.',
        objetivos: 'Acolher a demanda e fortalecer a rede de apoio.',
        anamnese: { queixa: 'Sensação de isolamento.', historicoFamiliar: 'Não informado.', medicacoes: 'Não informado.', sintomas: 'Desânimo, pouca energia.', historicoClinico: 'Não informado.' },
        consentimentos: { contrato: true, supervisaoGrupo: true, gravacao: false, ensinoAnonimo: false } },
      { id: 'c03', pacienteId: 'p03', grupoId: 'g-a', subgrupoId: 'd-a2', status: 'ativo', inicio: '2026-08-26',
        demanda: 'Dificuldade em lidar com críticas no ambiente acadêmico.',
        objetivos: 'Trabalhar autoestima e comunicação assertiva.',
        anamnese: { queixa: 'Medo intenso de errar.', historicoFamiliar: 'Pais exigentes, segundo relato.', medicacoes: 'Nenhuma.', sintomas: 'Procrastinação, autocrítica elevada.', historicoClinico: 'Fez terapia por 3 meses em 2023.' },
        consentimentos: { contrato: true, supervisaoGrupo: true, gravacao: true, ensinoAnonimo: true } },
      { id: 'c04', pacienteId: 'p04', grupoId: 'g-b', subgrupoId: 't-b1', status: 'ativo', inicio: '2026-09-02',
        demanda: 'Conflitos familiares e queda no rendimento escolar (adolescente, com responsável).',
        objetivos: 'Escuta do adolescente e orientação ao responsável, preservando o sigilo do essencial.',
        anamnese: { queixa: 'Brigas frequentes em casa.', historicoFamiliar: 'Separação recente dos pais.', medicacoes: 'Nenhuma.', sintomas: 'Irritabilidade, isolamento no quarto.', historicoClinico: 'Sem histórico.' },
        consentimentos: { contrato: true, supervisaoGrupo: true, gravacao: false, ensinoAnonimo: false } },
      { id: 'c05', pacienteId: 'p05', grupoId: 'g-b', subgrupoId: 't-b1', status: 'encerrado', inicio: '2026-08-12',
        demanda: 'Insegurança na escolha profissional.', objetivos: 'Orientação e autoconhecimento.',
        anamnese: { queixa: 'Dúvidas sobre o curso.', historicoFamiliar: '-', medicacoes: '-', sintomas: '-', historicoClinico: '-' },
        consentimentos: { contrato: true, supervisaoGrupo: true, gravacao: false, ensinoAnonimo: false },
        encerramento: { data: '2026-10-01', tipo: 'abandono', motivo: 'Horário incompatível com o trabalho', registro: 'Duas faltas seguidas; contato por telefone confirmou que o horário ficou incompatível. Vaga liberada e orientação sobre nova inscrição.' } },
      { id: 'c06', pacienteId: 'p06', grupoId: 'g-b', subgrupoId: 't-b1', status: 'encerrado', inicio: '2026-03-10',
        demanda: 'Luto.', objetivos: 'Elaboração do luto.',
        anamnese: { queixa: 'Perda recente.', historicoFamiliar: '-', medicacoes: '-', sintomas: '-', historicoClinico: '-' },
        consentimentos: { contrato: true, supervisaoGrupo: true, gravacao: false, ensinoAnonimo: false },
        encerramento: { data: '2026-09-30', tipo: 'alta', motivo: 'Objetivos alcançados', registro: 'Alta combinada com a paciente após revisão dos objetivos.' } },
      { id: 'c07', pacienteId: 'p07', grupoId: null, subgrupoId: null, status: 'aguardando-alocacao', inicio: '2026-11-03',
        demanda: 'Estresse e irritabilidade (triagem concluída).', objetivos: 'A definir no início do atendimento.',
        anamnese: { queixa: '', historicoFamiliar: '', medicacoes: '', sintomas: '', historicoClinico: '' },
        consentimentos: { contrato: false, supervisaoGrupo: false, gravacao: false, ensinoAnonimo: false } }
    ],

    // ---------- Sessões (agenda e presença) ----------
    // presenca: presente | falta | falta-justificada | agendada
    sessoes: [
      { id: 's01', casoId: 'c01', data: '2026-08-19', hora: '14:00', presenca: 'presente' },
      { id: 's02', casoId: 'c01', data: '2026-08-26', hora: '14:00', presenca: 'presente' },
      { id: 's03', casoId: 'c01', data: '2026-09-02', hora: '14:00', presenca: 'falta-justificada' },
      { id: 's04', casoId: 'c01', data: '2026-09-09', hora: '14:00', presenca: 'presente' },
      { id: 's05', casoId: 'c01', data: '2026-11-11', hora: '14:00', presenca: 'agendada', confirmada: false },
      { id: 's06', casoId: 'c02', data: '2026-09-09', hora: '10:00', presenca: 'presente' },
      { id: 's07', casoId: 'c02', data: '2026-09-16', hora: '10:00', presenca: 'falta' },
      { id: 's08', casoId: 'c02', data: '2026-09-23', hora: '10:00', presenca: 'falta' },
      { id: 's09', casoId: 'c03', data: '2026-08-26', hora: '16:00', presenca: 'presente' },
      { id: 's10', casoId: 'c03', data: '2026-09-02', hora: '16:00', presenca: 'presente' },
      { id: 's11', casoId: 'c03', data: '2026-09-09', hora: '16:00', presenca: 'presente' },
      { id: 's12', casoId: 'c03', data: '2026-11-05', hora: '16:00', presenca: 'agendada', confirmada: true },
      { id: 's13', casoId: 'c04', data: '2026-09-02', hora: '09:00', presenca: 'presente' },
      { id: 's14', casoId: 'c04', data: '2026-09-09', hora: '09:00', presenca: 'presente' },
      { id: 's15', casoId: 'c04', data: '2026-11-06', hora: '09:00', presenca: 'agendada', confirmada: false },
      { id: 's16', casoId: 'c05', data: '2026-08-12', hora: '11:00', presenca: 'presente' },
      { id: 's17', casoId: 'c05', data: '2026-08-19', hora: '11:00', presenca: 'falta' },
      { id: 's18', casoId: 'c05', data: '2026-08-26', hora: '11:00', presenca: 'falta' },
      { id: 's19', casoId: 'c06', data: '2026-03-10', hora: '15:00', presenca: 'presente' },
      { id: 's20', casoId: 'c06', data: '2026-03-17', hora: '15:00', presenca: 'presente' },
      { id: 's21', casoId: 'c06', data: '2026-03-24', hora: '15:00', presenca: 'presente' },
      { id: 's22', casoId: 'c06', data: '2026-03-31', hora: '15:00', presenca: 'presente' }
    ],

    // ---------- Evoluções ----------
    // status: rascunho | enviada | devolvida | validada (validada = bloqueada)
    evolucoes: [
      { id: 'e01', casoId: 'c01', sessaoId: 's01', autorId: 'u-est1', data: '2026-08-19', status: 'validada',
        texto: 'Sessão 1. Acolhimento e contrato terapêutico (horário, faltas, sigilo e seus limites). Paciente relata preocupação constante com o trabalho e dificuldade para dormir. Objetivo inicial combinado: compreender os gatilhos da ansiedade.',
        assinaturas: [{ usuarioId: 'u-est1', em: '2026-08-19T16:10' }, { usuarioId: 'u-sup1', em: '2026-08-21T09:30' }], adendos: [] },
      { id: 'e02', casoId: 'c01', sessaoId: 's02', autorId: 'u-est2', data: '2026-08-26', status: 'validada',
        texto: 'Sessão 2. Exploração das situações que disparam a ansiedade no trabalho. Introduzido registro diário de situações, pensamentos e reações.',
        assinaturas: [{ usuarioId: 'u-est2', em: '2026-08-26T16:05' }, { usuarioId: 'u-sup1', em: '2026-08-28T10:00' }],
        adendos: [{ id: 'ad01', autorId: 'u-est2', em: '2026-08-29T11:20', motivo: 'Correção de informação', texto: 'Onde se lê "registro diário", leia-se "registro diário durante a semana útil", conforme combinado em sessão.' }] },
      { id: 'e03', casoId: 'c01', sessaoId: 's04', autorId: 'u-est1', data: '2026-09-09', status: 'enviada',
        texto: 'Sessão 3. Revisão do registro diário: paciente identifica reuniões com a chefia como principal gatilho. Trabalhadas estratégias de respiração e preparação prévia para reuniões.',
        assinaturas: [{ usuarioId: 'u-est1', em: '2026-09-09T16:00' }], adendos: [] },
      { id: 'e04', casoId: 'c01', sessaoId: null, autorId: 'u-est1', data: '2026-11-04', status: 'rascunho',
        texto: 'Rascunho: planejar a revisão dos objetivos na próxima sessão.', assinaturas: [], adendos: [] },
      { id: 'e05', casoId: 'c03', sessaoId: 's11', autorId: 'u-est3', data: '2026-09-09', status: 'devolvida',
        texto: 'Sessão 3. Paciente contou com muitos detalhes uma briga com a mãe, que gritou com ela na frente dos vizinhos e a chamou de fracassada.',
        comentarioSupervisor: 'Registre o tema e a intervenção, não o relato detalhado: o prontuário pode ser lido pela paciente. Ex.: "Trabalhado conflito familiar e o impacto na autoestima".',
        assinaturas: [{ usuarioId: 'u-est3', em: '2026-09-09T18:00' }], adendos: [] },
      { id: 'e06', casoId: 'c04', sessaoId: 's13', autorId: 'u-est5', data: '2026-09-02', status: 'validada',
        texto: 'Sessão 1 com o adolescente e o responsável. Contrato terapêutico e combinados sobre o sigilo: ao responsável será comunicado apenas o essencial para o cuidado.',
        assinaturas: [{ usuarioId: 'u-est5', em: '2026-09-02T11:00' }, { usuarioId: 'u-sup2', em: '2026-09-04T08:45' }], adendos: [] },
      { id: 'e07', casoId: 'c04', sessaoId: 's14', autorId: 'u-est6', data: '2026-09-09', status: 'enviada',
        texto: 'Sessão 2 individual com o adolescente. Explorados interesses e rotina escolar; vínculo em construção.',
        assinaturas: [{ usuarioId: 'u-est6', em: '2026-09-09T11:15' }], adendos: [] },
      { id: 'e08', casoId: 'c02', sessaoId: 's06', autorId: 'u-est2', data: '2026-09-09', status: 'validada',
        texto: 'Sessão 1. Acolhimento. Paciente relata isolamento após mudança de cidade. Combinado contrato e frequência semanal.',
        assinaturas: [{ usuarioId: 'u-est2', em: '2026-09-09T12:00' }, { usuarioId: 'u-sup1', em: '2026-09-11T09:00' }], adendos: [] }
    ],

    // ---------- Registro de supervisão (FORA do prontuário) ----------
    orientacoes: [
      { id: 'o01', casoId: 'c01', supervisorId: 'u-sup1', em: '2026-08-21T09:40', texto: 'Bom início. Manter o foco nos objetivos combinados e observar o tempo de fala de cada estagiário da dupla.' },
      { id: 'o02', casoId: 'c04', supervisorId: 'u-sup2', em: '2026-09-04T09:00', texto: 'Atenção ao combinado de sigilo com o responsável. Planejar uma sessão de orientação familiar no próximo mês.' }
    ],

    // ---------- Documentos emitidos (cópia no prontuário) ----------
    documentos: [
      { id: 'doc01', casoId: 'c01', tipo: 'Declaração', titulo: 'Declaração de comparecimento', finalidade: 'Justificar ausência no trabalho', destinatario: 'A própria paciente', emitidoEm: '2026-09-09', autorId: 'u-est1', assinadoPor: ['u-est1', 'u-sup1'] }
    ],

    // ---------- Anexos externos (upload simulado: só o nome) ----------
    anexos: [
      { id: 'a01', casoId: 'c01', arquivo: 'encaminhamento-ubs.pdf', descricao: 'Encaminhamento recebido da UBS', enviadoPor: 'u-tec', em: '2026-08-19' }
    ],

    // ---------- Avaliação psicológica (ÁREA RESTRITA, fora do prontuário) ----------
    avaliacoes: [
      { id: 'av01', casoId: 'c03', instrumento: 'Instrumento de rastreio (exemplo fictício)', aplicadoPor: 'u-est3', em: '2026-09-02', observacao: 'Protocolo arquivado na área restrita. Resultado discutido em supervisão.' }
    ],

    // ---------- Tentativas de contato (abandono) ----------
    contatos: [
      { id: 'ct01', casoId: 'c05', em: '2026-08-27', canal: 'Telefone', resultado: 'Não atendeu', motivo: '', registradoPor: 'u-est5' },
      { id: 'ct02', casoId: 'c05', em: '2026-08-29', canal: 'Telefone', resultado: 'Desistiu', motivo: 'Horário incompatível com o trabalho', registradoPor: 'u-est5' }
    ],

    // ---------- Solicitações de acesso ao prontuário ----------
    // status: recebida | identidade-conferida | entregue
    // Começa vazia: na apresentação, o paciente faz o pedido ao vivo.
    solicitacoes: [],

    // ---------- Trilha de auditoria (simulada) ----------
    auditoria: [
      { id: 'au01', em: '2026-11-03T14:30', usuarioId: 'u-tec', acao: 'Concluiu triagem', alvo: 'c07' }
    ]
  };
};
