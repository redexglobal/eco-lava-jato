// Modelo de domínio do Eco Lava Jato.
// Valores em dinheiro são sempre inteiros em CENTAVOS (evita erro de arredondamento).
// Datas são strings ISO. `null` em preço/valor significa "ainda não definido".

export type Papel =
  | "admin"
  | "gestor"
  | "atendimento"
  | "operacao"
  | "projetos"
  | "financeiro_consulta";

export type Modulo =
  | "clientes"
  | "agenda"
  | "operacao"
  | "servicos"
  | "estoque"
  | "equipe"
  | "tarefas"
  | "financeiro"
  | "projetos"
  | "configuracoes";

/** Uma frente do ecossistema (lava-jato, oficinas, meliponicultura…). Dados não se misturam entre unidades. */
export interface Unidade {
  id: string;
  nome: string;
  descricao: string;
  ativa: boolean;
}

export interface Membro {
  id: string;
  nome: string;
  papel: Papel;
  /** Cargo em texto livre; cargos oficiais ainda não foram definidos. */
  funcao: string;
  unidades: string[];
  ativo: boolean;
  /** Para o organograma: a quem esta pessoa se reporta. */
  reportaA?: string;
}

export type EstagioCliente = "lead" | "em_contato" | "cliente" | "inativo";

export interface Consentimento {
  contatoPermitido: boolean;
  data?: string;
  origem?: string;
}

export interface Cliente {
  id: string;
  unidadeId: string;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  indicadoPor: string;
  estagio: EstagioCliente;
  consentimento: Consentimento;
  naoContatar: boolean;
  observacoes: string;
  criadoEm: string;
  demonstrativo: boolean;
}

export interface Interacao {
  id: string;
  clienteId: string;
  data: string;
  canal: string;
  resumo: string;
  autorId: string;
}

export interface Servico {
  id: string;
  unidadeId: string;
  nome: string;
  descricao: string;
  duracaoMin: number;
  /** Centavos. null = preço ainda não aprovado pelos responsáveis. */
  preco: number | null;
  checklist: string[];
  ativo: boolean;
}

export type StatusAgendamento = "agendado" | "confirmado" | "cancelado" | "convertido";

export interface Agendamento {
  id: string;
  unidadeId: string;
  clienteId: string;
  servicoId: string;
  inicio: string;
  duracaoMin: number;
  status: StatusAgendamento;
  responsavelId: string;
  observacoes: string;
  ordemId?: string;
}

export type StatusOrdem = "aguardando" | "em_execucao" | "pronto" | "entregue" | "cancelado";

export interface Veiculo {
  marca: string;
  modelo: string;
  cor: string;
  placa: string;
}

export interface Ordem {
  id: string;
  numero: number;
  unidadeId: string;
  agendamentoId?: string;
  clienteId: string;
  servicoId: string;
  veiculo: Veiculo;
  /** Centavos, definido pelo operador. null = sem valor. */
  valor: number | null;
  status: StatusOrdem;
  checklist: { texto: string; feito: boolean }[];
  inicio?: string;
  fim?: string;
  observacoes: string;
  historico: { status: StatusOrdem; data: string; autorId: string }[];
  criadaEm: string;
}

export interface ItemEstoque {
  id: string;
  unidadeId: string;
  nome: string;
  categoria: string;
  medida: string;
  quantidade: number;
  minimo: number;
  fornecedor: string;
  lote: string;
  validade: string;
  ativo: boolean;
  observacoes: string;
}

export type TipoMovimento = "entrada" | "saida" | "ajuste";

export interface Movimento {
  id: string;
  itemId: string;
  tipo: TipoMovimento;
  /** Para ajuste é a nova quantidade; para entrada/saída é a variação (positiva). */
  quantidade: number;
  data: string;
  motivo: string;
  autorId: string;
}

export type StatusTarefa = "a_fazer" | "fazendo" | "feito";
export type Prioridade = "baixa" | "media" | "alta";

export interface Tarefa {
  id: string;
  unidadeId: string;
  projetoId: string;
  titulo: string;
  responsavelId: string;
  prazo: string;
  prioridade: Prioridade;
  status: StatusTarefa;
  comentarios: { texto: string; autorId: string; data: string }[];
}

export interface Compromisso {
  id: string;
  unidadeId: string;
  titulo: string;
  tipo: "reuniao" | "oficina" | "operacional";
  inicio: string;
  local: string;
  observacoes: string;
}

export interface ModeloChecklist {
  id: string;
  unidadeId: string;
  nome: string;
  tipo: "abertura" | "fechamento" | "servico";
  itens: string[];
}

export type EstadoLancamento = "estimativa" | "proposta" | "aprovado" | "realizado";

export interface Lancamento {
  id: string;
  unidadeId: string;
  tipo: "entrada" | "saida";
  categoria: string;
  data: string;
  descricao: string;
  valor: number;
  estado: EstadoLancamento;
  autorId: string;
  notas: string;
  demonstrativo: boolean;
}

export type StatusProjeto = "ideia" | "planejamento" | "em_andamento" | "pausado" | "concluido";

export interface Projeto {
  id: string;
  unidadeId: string;
  nome: string;
  objetivo: string;
  responsavelId: string;
  status: StatusProjeto;
  proximosPassos: string;
  decisoes: { texto: string; data: string; autorId: string }[];
}

export interface Configuracoes {
  nomeNegocio: string;
  cidade: string;
  contatos: string;
  /** Texto livre; horário de funcionamento ainda não definido. */
  horario: string;
  /** Quantos atendimentos podem acontecer ao mesmo tempo. */
  capacidadeSimultanea: number;
  pedirPlaca: boolean;
  orcamentoReferencia: { mostrar: boolean; valor: number };
  regrasLocal: { texto: string; aprovado: boolean };
  politicaDados: string;
}

export interface RegistroAuditoria {
  id: string;
  data: string;
  autorId: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  resumo: string;
}

export interface Estado {
  versao: 1;
  unidades: Unidade[];
  membros: Membro[];
  clientes: Cliente[];
  interacoes: Interacao[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  ordens: Ordem[];
  itens: ItemEstoque[];
  movimentos: Movimento[];
  tarefas: Tarefa[];
  compromissos: Compromisso[];
  checklists: ModeloChecklist[];
  lancamentos: Lancamento[];
  projetos: Projeto[];
  config: Configuracoes;
  auditoria: RegistroAuditoria[];
  proximoNumeroOrdem: number;
}

export interface Sessao {
  membroId: string;
}
