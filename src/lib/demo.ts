// Dados de DEMONSTRAÇÃO. Tudo aqui é fictício — nenhum nome, telefone ou valor é real.
// Preços de serviço começam como "não definido" porque ainda não foram aprovados.
import type { Estado } from "./tipos.ts";

function em(dias: number, hora: number, min = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, min, 0, 0);
  return d.toISOString();
}

function dia(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const TODAS = ["u-lava", "u-oficinas", "u-melipona"];

export function criarEstadoDemo(): Estado {
  const checklistLavagem = [
    "Conferir veículo com o cliente (avarias visíveis)",
    "Pré-lavagem",
    "Lavagem com produto biodegradável",
    "Secagem",
    "Conferência final com o cliente",
  ];

  return {
    versao: 1,
    proximoNumeroOrdem: 3,
    unidades: [
      { id: "u-lava", nome: "Lava-jato ecológico", descricao: "Operação inicial em Itatiaia.", ativa: true },
      { id: "u-oficinas", nome: "Oficinas e capacitação", descricao: "Frente futura — atividades e capacitação.", ativa: true },
      { id: "u-melipona", nome: "Área ecológica / meliponicultura", descricao: "Frente futura — pomar, lago e abelhas sem ferrão.", ativa: true },
    ],
    membros: [
      { id: "m-admin", nome: "Admin Demonstração", papel: "admin", funcao: "Sócio (exemplo)", unidades: TODAS, ativo: true },
      { id: "m-gestor", nome: "Gestora Demonstração", papel: "gestor", funcao: "Gestão do lava-jato (exemplo)", unidades: ["u-lava"], ativo: true, reportaA: "m-admin" },
      { id: "m-atend", nome: "Atendente Demonstração", papel: "atendimento", funcao: "Atendimento (exemplo)", unidades: ["u-lava"], ativo: true, reportaA: "m-gestor" },
      { id: "m-oper", nome: "Operador Demonstração", papel: "operacao", funcao: "Lavador (exemplo)", unidades: ["u-lava"], ativo: true, reportaA: "m-gestor" },
      { id: "m-proj", nome: "Coordenação Demonstração", papel: "projetos", funcao: "Projetos ecológicos (exemplo)", unidades: ["u-oficinas", "u-melipona"], ativo: true, reportaA: "m-admin" },
      { id: "m-fin", nome: "Consulta Demonstração", papel: "financeiro_consulta", funcao: "Acompanhamento financeiro (exemplo)", unidades: ["u-lava"], ativo: true, reportaA: "m-admin" },
    ],
    clientes: [
      {
        id: "c-1", unidadeId: "u-lava", nome: "Cliente Exemplo Um", telefone: "(00) 90000-0001", email: "cliente1@exemplo.invalid",
        origem: "Indicação", indicadoPor: "Cliente Exemplo Dois", estagio: "convertido",
        consentimento: { contatoPermitido: true, data: em(-10, 10), origem: "Balcão — autorizou contato por WhatsApp" },
        naoContatar: false, observacoes: "Prefere atendimento pela manhã.", criadoEm: em(-10, 10), demonstrativo: true,
      },
      {
        id: "c-2", unidadeId: "u-lava", nome: "Cliente Exemplo Dois", telefone: "(00) 90000-0002", email: "",
        origem: "Passou em frente", indicadoPor: "", estagio: "agendado",
        consentimento: { contatoPermitido: false }, naoContatar: false, observacoes: "", criadoEm: em(-20, 15), demonstrativo: true,
      },
      {
        id: "c-3", unidadeId: "u-lava", nome: "Contato Exemplo Três", telefone: "(00) 90000-0003", email: "",
        origem: "Instagram", indicadoPor: "", estagio: "interessado",
        consentimento: { contatoPermitido: true, data: em(-2, 18), origem: "Pediu orçamento por mensagem" },
        naoContatar: false, observacoes: "Perguntou sobre higienização interna.", criadoEm: em(-2, 18), demonstrativo: true,
      },
      {
        id: "c-4", unidadeId: "u-lava", nome: "Contato Exemplo Quatro", telefone: "", email: "",
        origem: "Evento", indicadoPor: "", estagio: "nao_prosseguir",
        consentimento: { contatoPermitido: false }, naoContatar: true, observacoes: "Pediu para não ser contatado.", criadoEm: em(-40, 9), demonstrativo: true,
      },
    ],
    interacoes: [
      { id: "i-1", clienteId: "c-3", data: em(-2, 18, 30), canal: "WhatsApp", resumo: "Enviadas informações gerais; aguardando definição de preço.", autorId: "m-atend" },
      { id: "i-2", clienteId: "c-1", data: em(-10, 10, 5), canal: "Presencial", resumo: "Primeira visita; gostou da proposta de produtos naturais.", autorId: "m-atend" },
    ],
    servicos: [
      { id: "s-ext", unidadeId: "u-lava", nome: "Lavagem externa", descricao: "Carroceria, rodas e vidros com produtos biodegradáveis.", duracaoMin: 40, preco: null, checklist: checklistLavagem, ativo: true },
      { id: "s-comp", unidadeId: "u-lava", nome: "Lavagem completa", descricao: "Externa + aspiração e limpeza interna.", duracaoMin: 90, preco: null, checklist: [...checklistLavagem.slice(0, 4), "Aspiração", "Limpeza de painel e portas", checklistLavagem[4]], ativo: true },
      { id: "s-hig", unidadeId: "u-lava", nome: "Higienização interna", descricao: "Bancos e carpetes. Produto a definir.", duracaoMin: 180, preco: null, checklist: ["Conferir veículo com o cliente", "Aspiração", "Higienização de bancos", "Secagem", "Conferência final"], ativo: false },
    ],
    agendamentos: [
      { id: "a-1", unidadeId: "u-lava", clienteId: "c-1", servicoId: "s-comp", inicio: em(0, 9), duracaoMin: 90, status: "convertido", responsavelId: "m-oper", observacoes: "", ordemId: "o-1" },
      { id: "a-2", unidadeId: "u-lava", clienteId: "c-2", servicoId: "s-ext", inicio: em(0, 14), duracaoMin: 40, status: "confirmado", responsavelId: "m-oper", observacoes: "" },
      { id: "a-3", unidadeId: "u-lava", clienteId: "c-3", servicoId: "s-ext", inicio: em(1, 10), duracaoMin: 40, status: "agendado", responsavelId: "", observacoes: "Primeira lavagem." },
    ],
    ordens: [
      {
        id: "o-1", numero: 1, unidadeId: "u-lava", agendamentoId: "a-1", clienteId: "c-1", servicoId: "s-comp",
        veiculo: { marca: "Marca Exemplo", modelo: "Hatch", cor: "Prata", placa: "" }, valor: null, status: "em_execucao",
        checklist: [...checklistLavagem.slice(0, 4), "Aspiração", "Limpeza de painel e portas", checklistLavagem[4]].map((t, i) => ({ texto: t, feito: i < 2 })),
        inicio: em(0, 9, 10), observacoes: "", criadaEm: em(0, 9),
        historico: [{ status: "aguardando", data: em(0, 9), autorId: "m-atend" }, { status: "em_execucao", data: em(0, 9, 10), autorId: "m-oper" }],
      },
      {
        id: "o-2", numero: 2, unidadeId: "u-lava", clienteId: "c-2", servicoId: "s-ext",
        veiculo: { marca: "Marca Exemplo", modelo: "Sedã", cor: "Azul", placa: "" }, valor: null, status: "entregue",
        checklist: checklistLavagem.map((t) => ({ texto: t, feito: true })),
        inicio: em(-1, 15), fim: em(-1, 15, 45), observacoes: "", criadaEm: em(-1, 14, 50),
        historico: [
          { status: "aguardando", data: em(-1, 14, 50), autorId: "m-atend" },
          { status: "em_execucao", data: em(-1, 15), autorId: "m-oper" },
          { status: "pronto", data: em(-1, 15, 45), autorId: "m-oper" },
          { status: "entregue", data: em(-1, 16), autorId: "m-atend" },
        ],
      },
    ],
    itens: [
      { id: "e-1", unidadeId: "u-lava", nome: "Shampoo automotivo biodegradável (exemplo)", categoria: "Produto de limpeza", medida: "L", quantidade: 4, minimo: 5, fornecedor: "Fornecedor a definir", lote: "", validade: dia(20), ativo: true, observacoes: "Biodegradabilidade depende da ficha técnica do fornecedor." },
      { id: "e-2", unidadeId: "u-lava", nome: "Pano de microfibra", categoria: "Material", medida: "un", quantidade: 30, minimo: 10, fornecedor: "", lote: "", validade: "", ativo: true, observacoes: "" },
      { id: "e-3", unidadeId: "u-lava", nome: "Cera vegetal (exemplo)", categoria: "Produto de acabamento", medida: "kg", quantidade: 2, minimo: 1, fornecedor: "", lote: "", validade: "", ativo: true, observacoes: "" },
    ],
    movimentos: [
      { id: "mv-1", itemId: "e-1", tipo: "entrada", quantidade: 10, data: em(-15, 11), motivo: "Compra inicial (exemplo)", autorId: "m-gestor" },
      { id: "mv-2", itemId: "e-1", tipo: "saida", quantidade: 6, data: em(-1, 17), motivo: "Uso da semana", autorId: "m-oper" },
    ],
    tarefas: [
      { id: "t-1", unidadeId: "u-lava", projetoId: "p-lava", titulo: "Definir tabela de preços dos serviços", responsavelId: "m-admin", prazo: dia(7), prioridade: "alta", status: "a_fazer", comentarios: [] },
      { id: "t-2", unidadeId: "u-lava", projetoId: "p-lava", titulo: "Levantar fornecedores de produtos biodegradáveis com ficha técnica", responsavelId: "m-gestor", prazo: dia(10), prioridade: "media", status: "fazendo", comentarios: [{ texto: "Pedir ficha técnica de cada produto antes de comprar.", autorId: "m-admin", data: em(-1, 12) }] },
      { id: "t-3", unidadeId: "u-melipona", projetoId: "p-melipona", titulo: "Pesquisar requisitos para meliponicultura", responsavelId: "m-proj", prazo: dia(30), prioridade: "baixa", status: "a_fazer", comentarios: [] },
    ],
    compromissos: [
      { id: "cp-1", unidadeId: "u-lava", titulo: "Reunião de sócios (exemplo)", tipo: "reuniao", inicio: em(3, 19), local: "A definir", observacoes: "Pauta: preços, horário e mão de obra." },
      { id: "cp-2", unidadeId: "u-oficinas", titulo: "Planejamento da primeira oficina (exemplo)", tipo: "oficina", inicio: em(12, 15), local: "", observacoes: "" },
    ],
    checklists: [
      { id: "ck-1", unidadeId: "u-lava", nome: "Abertura do dia (rascunho)", tipo: "abertura", itens: ["Conferir estoque de produtos", "Ligar e testar equipamentos", "Organizar área de lavagem"] },
      { id: "ck-2", unidadeId: "u-lava", nome: "Fechamento do dia (rascunho)", tipo: "fechamento", itens: ["Registrar saídas de estoque", "Limpar área", "Desligar equipamentos"] },
    ],
    lancamentos: [
      { id: "l-1", unidadeId: "u-lava", tipo: "saida", categoria: "Estrutura", data: dia(15), descricao: "Equipamento de lavagem (exemplo, sem cotação)", valor: 450000, estado: "estimativa", autorId: "m-admin", notas: "Valor ilustrativo.", demonstrativo: true },
      { id: "l-2", unidadeId: "u-lava", tipo: "saida", categoria: "Insumos", data: dia(-15), descricao: "Compra inicial de produtos (exemplo)", valor: 38000, estado: "realizado", autorId: "m-gestor", notas: "", demonstrativo: true },
      { id: "l-3", unidadeId: "u-oficinas", tipo: "saida", categoria: "Materiais", data: dia(20), descricao: "Materiais de oficina (exemplo)", valor: 60000, estado: "proposta", autorId: "m-proj", notas: "", demonstrativo: true },
    ],
    projetos: [
      { id: "p-lava", unidadeId: "u-lava", nome: "Implantação do lava-jato ecológico", objetivo: "Abrir a operação inicial com produtos naturais e gerar recursos para o ecossistema.", responsavelId: "m-admin", status: "planejamento", proximosPassos: "Definir preços, horário, mão de obra e fornecedores.", decisoes: [{ texto: "Começar pela operação do lava-jato antes das outras frentes.", data: em(-5, 20), autorId: "m-admin" }] },
      { id: "p-oficinas", unidadeId: "u-oficinas", nome: "Oficinas e capacitação", objetivo: "Oferecer atividades fora das telas e capacitação, com foco futuro em jovens.", responsavelId: "m-proj", status: "ideia", proximosPassos: "Atividades com menores exigem fluxo próprio, revisão humana e consentimentos antes de qualquer cadastro.", decisoes: [] },
      { id: "p-melipona", unidadeId: "u-melipona", nome: "Meliponicultura e pomar", objetivo: "Área ecológica com abelhas sem ferrão, pomar e lago.", responsavelId: "m-proj", status: "ideia", proximosPassos: "Pesquisar requisitos e custos.", decisoes: [] },
    ],
    config: {
      nomeNegocio: "Eco Lava Jato",
      cidade: "Itatiaia/RJ",
      contatos: "",
      horario: "",
      capacidadeSimultanea: 1,
      pedirPlaca: false,
      orcamentoReferencia: { mostrar: false, valor: 1500000 },
      regrasLocal: {
        texto: "Intenção expressa na reunião: espaço principal familiar e terapêutico, sem álcool, cigarro e outras drogas. Texto final depende de aprovação dos responsáveis.",
        aprovado: false,
      },
      politicaDados: "",
    },
    auditoria: [],
  };
}
