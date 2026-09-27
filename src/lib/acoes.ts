// Todas as alterações de dados passam por aqui. Cada ação:
//   1) confere se quem está logado tem permissão no módulo e acesso à unidade;
//   2) valida os dados;
//   3) devolve um NOVO estado (nada é alterado no lugar) + registro de auditoria.
// Quando o banco real (Supabase) for ligado, estas mesmas regras viram o lado servidor
// (ver docs/ARQUITETURA.md) — a tela nunca é a única barreira.
import type {
  Agendamento,
  Cliente,
  Compromisso,
  Configuracoes,
  Estado,
  ItemEstoque,
  Lancamento,
  Membro,
  ModeloChecklist,
  Modulo,
  Ordem,
  Projeto,
  Servico,
  Sessao,
  StatusOrdem,
  Tarefa,
  TipoMovimento,
  Unidade,
} from "./tipos.ts";
import {
  acessaUnidade,
  aplicarMovimento,
  dataValida,
  pode,
  STATUS_ORDEM,
  temConflito,
  transicaoValida,
  validarEmail,
  validarPlaca,
  validarTelefone,
  type Erros,
} from "./regras.ts";

export type Resultado = { ok: true; estado: Estado; id?: string } | { ok: false; erro: string; erros?: Erros };

type Sem<T, K extends keyof T> = Omit<T, K> & { id?: string };

export type Acao =
  | { tipo: "cliente.salvar"; dados: Sem<Cliente, "id" | "criadoEm" | "demonstrativo"> }
  | { tipo: "cliente.excluir"; id: string }
  | { tipo: "cliente.interacao"; clienteId: string; canal: string; resumo: string }
  | { tipo: "servico.salvar"; dados: Sem<Servico, "id"> }
  | { tipo: "agendamento.salvar"; dados: Sem<Agendamento, "id" | "status" | "ordemId">; permitirSobreposicao?: boolean }
  | { tipo: "agendamento.confirmar"; id: string }
  | { tipo: "agendamento.cancelar"; id: string }
  | { tipo: "agendamento.converter"; id: string; veiculo: Ordem["veiculo"] }
  | { tipo: "ordem.salvar"; dados: Sem<Ordem, "id" | "numero" | "status" | "historico" | "criadaEm" | "inicio" | "fim"> }
  | { tipo: "ordem.status"; id: string; para: StatusOrdem }
  | { tipo: "ordem.checklist"; id: string; indice: number }
  | { tipo: "item.salvar"; dados: Sem<ItemEstoque, "id" | "quantidade"> & { quantidade?: number } }
  | { tipo: "item.movimento"; itemId: string; mov: TipoMovimento; quantidade: number; motivo: string }
  | { tipo: "membro.salvar"; dados: Sem<Membro, "id"> }
  | { tipo: "tarefa.salvar"; dados: Sem<Tarefa, "id" | "comentarios"> }
  | { tipo: "tarefa.comentar"; id: string; texto: string }
  | { tipo: "tarefa.excluir"; id: string }
  | { tipo: "compromisso.salvar"; dados: Sem<Compromisso, "id"> }
  | { tipo: "compromisso.excluir"; id: string }
  | { tipo: "checklist.salvar"; dados: Sem<ModeloChecklist, "id"> }
  | { tipo: "checklist.excluir"; id: string }
  | { tipo: "lancamento.salvar"; dados: Sem<Lancamento, "id" | "autorId" | "demonstrativo"> }
  | { tipo: "lancamento.excluir"; id: string }
  | { tipo: "projeto.salvar"; dados: Sem<Projeto, "id" | "decisoes"> }
  | { tipo: "projeto.decisao"; id: string; texto: string }
  | { tipo: "unidade.salvar"; dados: Sem<Unidade, "id"> }
  | { tipo: "config.salvar"; dados: Configuracoes };

const MODULO: Record<Acao["tipo"], Modulo> = {
  "cliente.salvar": "clientes",
  "cliente.excluir": "clientes",
  "cliente.interacao": "clientes",
  "servico.salvar": "servicos",
  "agendamento.salvar": "agenda",
  "agendamento.confirmar": "agenda",
  "agendamento.cancelar": "agenda",
  "agendamento.converter": "operacao",
  "ordem.salvar": "operacao",
  "ordem.status": "operacao",
  "ordem.checklist": "operacao",
  "item.salvar": "estoque",
  "item.movimento": "estoque",
  "membro.salvar": "equipe",
  "tarefa.salvar": "tarefas",
  "tarefa.comentar": "tarefas",
  "tarefa.excluir": "tarefas",
  "compromisso.salvar": "tarefas",
  "compromisso.excluir": "tarefas",
  "checklist.salvar": "operacao",
  "checklist.excluir": "operacao",
  "lancamento.salvar": "financeiro",
  "lancamento.excluir": "financeiro",
  "projeto.salvar": "projetos",
  "projeto.decisao": "projetos",
  "unidade.salvar": "configuracoes",
  "config.salvar": "configuracoes",
};

export function moduloDaAcao(tipo: Acao["tipo"]): Modulo {
  return MODULO[tipo];
}

const novoId = () => crypto.randomUUID();
const agora = () => new Date().toISOString();
const falha = (erro: string, erros?: Erros): Resultado => ({ ok: false, erro, erros });
const texto = (s: string | undefined) => (s ?? "").trim();

function upsert<T extends { id: string }>(lista: T[], item: T): T[] {
  return lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];
}

function auditar(e: Estado, s: Sessao, acao: string, entidade: string, entidadeId: string, resumo: string): Estado {
  const reg = { id: novoId(), data: agora(), autorId: s.membroId, acao, entidade, entidadeId, resumo };
  return { ...e, auditoria: [reg, ...e.auditoria].slice(0, 500) };
}

/** Executa uma ação. Nunca lança exceção para erro de uso: devolve { ok: false }. */
export function executar(estado: Estado, sessao: Sessao, acao: Acao): Resultado {
  const membro = estado.membros.find((m) => m.id === sessao.membroId && m.ativo);
  if (!membro) return falha("Sessão inválida. Entre novamente.");
  if (!pode(membro.papel, MODULO[acao.tipo], "editar")) {
    return falha("Seu papel não tem permissão para esta ação.");
  }
  const unidadeOk = (unidadeId: string) => acessaUnidade(membro, unidadeId);
  const r = rodar(estado, sessao, membro, acao, unidadeOk);
  return r;
}

function rodar(
  e: Estado,
  s: Sessao,
  membro: Membro,
  acao: Acao,
  unidadeOk: (id: string) => boolean,
): Resultado {
  const semUnidade = falha("Você não tem acesso a esta unidade.");

  switch (acao.tipo) {
    // ------------------------------------------------------------ clientes
    case "cliente.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      const erros: Erros = {};
      if (!texto(d.nome)) erros.nome = "Informe o nome.";
      if (!validarTelefone(d.telefone)) erros.telefone = "Telefone com DDD, só números (10 a 13 dígitos).";
      if (!validarEmail(d.email)) erros.email = "E-mail inválido.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      const anterior = d.id ? e.clientes.find((c) => c.id === d.id) : undefined;
      if (d.id && !anterior) return falha("Cliente não encontrado.");
      const consentimento = { ...d.consentimento };
      if (consentimento.contatoPermitido && !consentimento.data) consentimento.data = agora();
      const c: Cliente = {
        ...d,
        id: d.id ?? novoId(),
        nome: texto(d.nome),
        telefone: texto(d.telefone),
        email: texto(d.email),
        consentimento,
        // Quem pede para não ser contatado perde o consentimento de contato.
        ...(d.naoContatar ? { consentimento: { ...consentimento, contatoPermitido: false } } : {}),
        criadoEm: anterior?.criadoEm ?? agora(),
        demonstrativo: anterior?.demonstrativo ?? false,
      };
      const e2 = { ...e, clientes: upsert(e.clientes, c) };
      return { ok: true, id: c.id, estado: auditar(e2, s, anterior ? "editar" : "criar", "cliente", c.id, anterior ? "Cliente atualizado" : "Cliente cadastrado") };
    }
    case "cliente.excluir": {
      const c = e.clientes.find((x) => x.id === acao.id);
      if (!c) return falha("Cliente não encontrado.");
      if (!unidadeOk(c.unidadeId)) return semUnidade;
      // Exclusão LGPD: remove o cadastro e o histórico de contatos. Ordens e agendamentos
      // continuam (são registro operacional), mas sem nome/contato — aparecem como "Cliente removido".
      const e2 = {
        ...e,
        clientes: e.clientes.filter((x) => x.id !== c.id),
        interacoes: e.interacoes.filter((i) => i.clienteId !== c.id),
      };
      return { ok: true, estado: auditar(e2, s, "excluir", "cliente", c.id, "Cadastro excluído a pedido (dados pessoais removidos)") };
    }
    case "cliente.interacao": {
      const c = e.clientes.find((x) => x.id === acao.clienteId);
      if (!c) return falha("Cliente não encontrado.");
      if (!unidadeOk(c.unidadeId)) return semUnidade;
      if (!texto(acao.resumo)) return falha("Escreva um resumo do contato.", { resumo: "Obrigatório." });
      const i = { id: novoId(), clienteId: c.id, data: agora(), canal: texto(acao.canal) || "Outro", resumo: texto(acao.resumo), autorId: s.membroId };
      return { ok: true, estado: { ...e, interacoes: [i, ...e.interacoes] } };
    }

    // ------------------------------------------------------------ serviços
    case "servico.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      const erros: Erros = {};
      if (!texto(d.nome)) erros.nome = "Informe o nome.";
      if (!Number.isInteger(d.duracaoMin) || d.duracaoMin < 5 || d.duracaoMin > 24 * 60) erros.duracaoMin = "Duração entre 5 e 1440 minutos.";
      if (d.preco !== null && (!Number.isInteger(d.preco) || d.preco < 0)) erros.preco = "Preço inválido.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      const sv: Servico = { ...d, id: d.id ?? novoId(), nome: texto(d.nome), checklist: d.checklist.map(texto).filter(Boolean) };
      return { ok: true, id: sv.id, estado: auditar({ ...e, servicos: upsert(e.servicos, sv) }, s, d.id ? "editar" : "criar", "servico", sv.id, sv.nome) };
    }

    // ------------------------------------------------------------ agenda
    case "agendamento.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      const erros: Erros = {};
      if (!e.clientes.some((c) => c.id === d.clienteId)) erros.clienteId = "Escolha um cliente.";
      if (!e.servicos.some((x) => x.id === d.servicoId && x.ativo)) erros.servicoId = "Escolha um serviço ativo.";
      if (!dataValida(d.inicio)) erros.inicio = "Informe data e hora.";
      if (!Number.isInteger(d.duracaoMin) || d.duracaoMin < 5) erros.duracaoMin = "Duração mínima de 5 minutos.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      const anterior = d.id ? e.agendamentos.find((a) => a.id === d.id) : undefined;
      if (anterior && (anterior.status === "cancelado" || anterior.status === "convertido")) {
        return falha("Agendamento cancelado ou já convertido não pode ser editado.");
      }
      const a: Agendamento = { ...d, id: d.id ?? novoId(), status: anterior?.status ?? "agendado", ordemId: anterior?.ordemId };
      if (!acao.permitirSobreposicao && temConflito(e.agendamentos, a, e.config.capacidadeSimultanea)) {
        return falha(`Horário cheio: já há ${e.config.capacidadeSimultanea} atendimento(s) neste intervalo. Escolha outro horário ou confirme a sobreposição.`, { inicio: "Conflito de horário." });
      }
      return { ok: true, id: a.id, estado: auditar({ ...e, agendamentos: upsert(e.agendamentos, a) }, s, anterior ? "editar" : "criar", "agendamento", a.id, anterior ? "Agendamento alterado" : "Agendamento criado") };
    }
    case "agendamento.confirmar":
    case "agendamento.cancelar": {
      const a = e.agendamentos.find((x) => x.id === acao.id);
      if (!a) return falha("Agendamento não encontrado.");
      if (!unidadeOk(a.unidadeId)) return semUnidade;
      if (a.status === "cancelado" || a.status === "convertido") return falha("Este agendamento já foi encerrado.");
      const status: Agendamento["status"] = acao.tipo === "agendamento.cancelar" ? "cancelado" : "confirmado";
      const e2 = { ...e, agendamentos: upsert(e.agendamentos, { ...a, status }) };
      return { ok: true, estado: auditar(e2, s, status, "agendamento", a.id, `Agendamento ${status}`) };
    }
    case "agendamento.converter": {
      const a = e.agendamentos.find((x) => x.id === acao.id);
      if (!a) return falha("Agendamento não encontrado.");
      if (!unidadeOk(a.unidadeId)) return semUnidade;
      if (a.status === "cancelado") return falha("Agendamento cancelado não vira ordem de serviço.");
      // Idempotente: converter duas vezes devolve a mesma ordem.
      if (a.status === "convertido" && a.ordemId) return { ok: true, id: a.ordemId, estado: e };
      const erroVeiculo = validarVeiculo(acao.veiculo, e.config.pedirPlaca);
      if (erroVeiculo) return falha("Revise os dados do veículo.", erroVeiculo);
      const sv = e.servicos.find((x) => x.id === a.servicoId);
      const o: Ordem = {
        id: novoId(),
        numero: e.proximoNumeroOrdem,
        unidadeId: a.unidadeId,
        agendamentoId: a.id,
        clienteId: a.clienteId,
        servicoId: a.servicoId,
        veiculo: limparVeiculo(acao.veiculo),
        valor: sv?.preco ?? null,
        status: "aguardando",
        checklist: (sv?.checklist ?? []).map((t) => ({ texto: t, feito: false })),
        observacoes: a.observacoes,
        historico: [{ status: "aguardando", data: agora(), autorId: s.membroId }],
        criadaEm: agora(),
      };
      const e2: Estado = {
        ...e,
        ordens: [...e.ordens, o],
        agendamentos: upsert(e.agendamentos, { ...a, status: "convertido", ordemId: o.id }),
        proximoNumeroOrdem: e.proximoNumeroOrdem + 1,
      };
      return { ok: true, id: o.id, estado: auditar(e2, s, "criar", "ordem", o.id, `OS #${o.numero} criada a partir de agendamento`) };
    }

    // ------------------------------------------------------------ ordens
    case "ordem.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      const erros: Erros = { ...(validarVeiculo(d.veiculo, e.config.pedirPlaca) ?? {}) };
      if (!e.clientes.some((c) => c.id === d.clienteId) && !d.id) erros.clienteId = "Escolha um cliente.";
      if (!e.servicos.some((x) => x.id === d.servicoId)) erros.servicoId = "Escolha um serviço.";
      if (d.valor !== null && (!Number.isInteger(d.valor) || d.valor < 0)) erros.valor = "Valor inválido.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      const anterior = d.id ? e.ordens.find((o) => o.id === d.id) : undefined;
      if (d.id && !anterior) return falha("Ordem não encontrada.");
      if (anterior && (anterior.status === "entregue" || anterior.status === "cancelado")) {
        return falha("Ordem encerrada não pode ser editada.");
      }
      const o: Ordem = anterior
        ? { ...anterior, ...d, id: anterior.id, veiculo: limparVeiculo(d.veiculo) }
        : {
            ...d,
            id: novoId(),
            numero: e.proximoNumeroOrdem,
            veiculo: limparVeiculo(d.veiculo),
            status: "aguardando",
            historico: [{ status: "aguardando", data: agora(), autorId: s.membroId }],
            criadaEm: agora(),
          };
      const e2 = { ...e, ordens: upsert(e.ordens, o), proximoNumeroOrdem: anterior ? e.proximoNumeroOrdem : e.proximoNumeroOrdem + 1 };
      return { ok: true, id: o.id, estado: auditar(e2, s, anterior ? "editar" : "criar", "ordem", o.id, `OS #${o.numero}`) };
    }
    case "ordem.status": {
      const o = e.ordens.find((x) => x.id === acao.id);
      if (!o) return falha("Ordem não encontrada.");
      if (!unidadeOk(o.unidadeId)) return semUnidade;
      if (!transicaoValida(o.status, acao.para)) {
        return falha(`Não é possível passar de "${STATUS_ORDEM[o.status]}" para "${STATUS_ORDEM[acao.para]}".`);
      }
      const t = agora();
      const nova: Ordem = {
        ...o,
        status: acao.para,
        inicio: acao.para === "em_execucao" && !o.inicio ? t : o.inicio,
        fim: acao.para === "pronto" ? t : acao.para === "em_execucao" ? undefined : o.fim,
        historico: [...o.historico, { status: acao.para, data: t, autorId: s.membroId }],
      };
      return { ok: true, estado: auditar({ ...e, ordens: upsert(e.ordens, nova) }, s, "status", "ordem", o.id, `OS #${o.numero}: ${STATUS_ORDEM[o.status]} → ${STATUS_ORDEM[acao.para]}`) };
    }
    case "ordem.checklist": {
      const o = e.ordens.find((x) => x.id === acao.id);
      if (!o) return falha("Ordem não encontrada.");
      if (!unidadeOk(o.unidadeId)) return semUnidade;
      if (o.status === "entregue" || o.status === "cancelado") return falha("Ordem encerrada.");
      if (!o.checklist[acao.indice]) return falha("Item não encontrado.");
      const checklist = o.checklist.map((c, i) => (i === acao.indice ? { ...c, feito: !c.feito } : c));
      return { ok: true, estado: { ...e, ordens: upsert(e.ordens, { ...o, checklist }) } };
    }

    // ------------------------------------------------------------ estoque
    case "item.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      const erros: Erros = {};
      if (!texto(d.nome)) erros.nome = "Informe o nome.";
      if (!texto(d.medida)) erros.medida = "Informe a unidade de medida (L, kg, un…).";
      if (!(d.minimo >= 0)) erros.minimo = "Mínimo inválido.";
      if (d.validade && !dataValida(d.validade)) erros.validade = "Data inválida.";
      const anterior = d.id ? e.itens.find((i) => i.id === d.id) : undefined;
      const quantidade = anterior ? anterior.quantidade : (d.quantidade ?? 0);
      if (!(quantidade >= 0)) erros.quantidade = "Quantidade inválida.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      // A quantidade de um item existente só muda por movimentação (fica rastreável).
      const it: ItemEstoque = { ...d, id: anterior?.id ?? novoId(), nome: texto(d.nome), quantidade };
      return { ok: true, id: it.id, estado: auditar({ ...e, itens: upsert(e.itens, it) }, s, anterior ? "editar" : "criar", "item", it.id, it.nome) };
    }
    case "item.movimento": {
      const it = e.itens.find((x) => x.id === acao.itemId);
      if (!it) return falha("Item não encontrado.");
      if (!unidadeOk(it.unidadeId)) return semUnidade;
      if (acao.mov === "ajuste" && !texto(acao.motivo)) return falha("Ajuste exige motivo.", { motivo: "Explique o ajuste." });
      const r = aplicarMovimento(it.quantidade, acao.mov, acao.quantidade);
      if (!r.ok) return falha(r.erro, { quantidade: r.erro });
      const m = { id: novoId(), itemId: it.id, tipo: acao.mov, quantidade: acao.quantidade, data: agora(), motivo: texto(acao.motivo), autorId: s.membroId };
      const e2 = { ...e, itens: upsert(e.itens, { ...it, quantidade: r.quantidade }), movimentos: [m, ...e.movimentos] };
      return { ok: true, estado: auditar(e2, s, acao.mov, "item", it.id, `${it.nome}: ${it.quantidade} → ${r.quantidade} ${it.medida}`) };
    }

    // ------------------------------------------------------------ equipe
    case "membro.salvar": {
      const d = acao.dados;
      const erros: Erros = {};
      if (!texto(d.nome)) erros.nome = "Informe o nome.";
      if (!d.unidades.length && d.papel !== "admin") erros.unidades = "Vincule ao menos uma unidade.";
      if (d.reportaA && d.reportaA === d.id) erros.reportaA = "A pessoa não pode se reportar a si mesma.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      if (d.id === membro.id && (d.papel !== membro.papel || !d.ativo)) {
        return falha("Você não pode alterar o próprio papel nem se desativar.");
      }
      const restantesAdmin = e.membros.filter((m) => m.papel === "admin" && m.ativo && m.id !== d.id).length;
      if (restantesAdmin === 0 && (d.papel !== "admin" || !d.ativo)) return falha("É preciso manter ao menos um administrador ativo.");
      const m: Membro = { ...d, id: d.id ?? novoId(), nome: texto(d.nome), funcao: texto(d.funcao) };
      return { ok: true, id: m.id, estado: auditar({ ...e, membros: upsert(e.membros, m) }, s, d.id ? "editar" : "criar", "membro", m.id, `${m.nome} — papel ${m.papel}${m.ativo ? "" : " (inativo)"}`) };
    }

    // ------------------------------------------------------------ tarefas e calendário
    case "tarefa.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      if (!texto(d.titulo)) return falha("Revise os campos destacados.", { titulo: "Informe o título." });
      if (d.prazo && !dataValida(d.prazo)) return falha("Revise os campos destacados.", { prazo: "Data inválida." });
      const anterior = d.id ? e.tarefas.find((t) => t.id === d.id) : undefined;
      const t: Tarefa = { ...d, id: anterior?.id ?? novoId(), titulo: texto(d.titulo), comentarios: anterior?.comentarios ?? [] };
      return { ok: true, id: t.id, estado: { ...e, tarefas: upsert(e.tarefas, t) } };
    }
    case "tarefa.comentar": {
      const t = e.tarefas.find((x) => x.id === acao.id);
      if (!t) return falha("Tarefa não encontrada.");
      if (!unidadeOk(t.unidadeId)) return semUnidade;
      if (!texto(acao.texto)) return falha("Escreva o comentário.");
      const c = { texto: texto(acao.texto), autorId: s.membroId, data: agora() };
      return { ok: true, estado: { ...e, tarefas: upsert(e.tarefas, { ...t, comentarios: [...t.comentarios, c] }) } };
    }
    case "tarefa.excluir": {
      const t = e.tarefas.find((x) => x.id === acao.id);
      if (!t) return falha("Tarefa não encontrada.");
      if (!unidadeOk(t.unidadeId)) return semUnidade;
      return { ok: true, estado: auditar({ ...e, tarefas: e.tarefas.filter((x) => x.id !== t.id) }, s, "excluir", "tarefa", t.id, t.titulo) };
    }
    case "compromisso.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      const erros: Erros = {};
      if (!texto(d.titulo)) erros.titulo = "Informe o título.";
      if (!dataValida(d.inicio)) erros.inicio = "Informe data e hora.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      const c: Compromisso = { ...d, id: d.id ?? novoId(), titulo: texto(d.titulo) };
      return { ok: true, id: c.id, estado: { ...e, compromissos: upsert(e.compromissos, c) } };
    }
    case "compromisso.excluir": {
      const c = e.compromissos.find((x) => x.id === acao.id);
      if (!c) return falha("Compromisso não encontrado.");
      if (!unidadeOk(c.unidadeId)) return semUnidade;
      return { ok: true, estado: { ...e, compromissos: e.compromissos.filter((x) => x.id !== c.id) } };
    }
    case "checklist.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      const itens = d.itens.map(texto).filter(Boolean);
      const erros: Erros = {};
      if (!texto(d.nome)) erros.nome = "Informe o nome.";
      if (!itens.length) erros.itens = "Inclua ao menos um item.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      const c: ModeloChecklist = { ...d, id: d.id ?? novoId(), nome: texto(d.nome), itens };
      return { ok: true, id: c.id, estado: { ...e, checklists: upsert(e.checklists, c) } };
    }
    case "checklist.excluir": {
      const c = e.checklists.find((x) => x.id === acao.id);
      if (!c) return falha("Checklist não encontrado.");
      if (!unidadeOk(c.unidadeId)) return semUnidade;
      return { ok: true, estado: { ...e, checklists: e.checklists.filter((x) => x.id !== c.id) } };
    }

    // ------------------------------------------------------------ financeiro
    case "lancamento.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      const erros: Erros = {};
      if (!texto(d.descricao)) erros.descricao = "Informe a descrição.";
      if (!texto(d.categoria)) erros.categoria = "Informe a categoria.";
      if (!dataValida(d.data)) erros.data = "Informe a data.";
      if (!Number.isInteger(d.valor) || d.valor <= 0) erros.valor = "Valor deve ser maior que zero.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      const anterior = d.id ? e.lancamentos.find((l) => l.id === d.id) : undefined;
      const l: Lancamento = { ...d, id: anterior?.id ?? novoId(), descricao: texto(d.descricao), categoria: texto(d.categoria), autorId: anterior?.autorId ?? s.membroId, demonstrativo: anterior?.demonstrativo ?? false };
      return { ok: true, id: l.id, estado: auditar({ ...e, lancamentos: upsert(e.lancamentos, l) }, s, anterior ? "editar" : "criar", "lancamento", l.id, `${l.tipo} ${l.estado}: ${(l.valor / 100).toFixed(2)}`) };
    }
    case "lancamento.excluir": {
      const l = e.lancamentos.find((x) => x.id === acao.id);
      if (!l) return falha("Lançamento não encontrado.");
      if (!unidadeOk(l.unidadeId)) return semUnidade;
      return { ok: true, estado: auditar({ ...e, lancamentos: e.lancamentos.filter((x) => x.id !== l.id) }, s, "excluir", "lancamento", l.id, `${l.descricao} (${(l.valor / 100).toFixed(2)})`) };
    }

    // ------------------------------------------------------------ projetos
    case "projeto.salvar": {
      const d = acao.dados;
      if (!unidadeOk(d.unidadeId)) return semUnidade;
      if (!texto(d.nome)) return falha("Revise os campos destacados.", { nome: "Informe o nome." });
      const anterior = d.id ? e.projetos.find((p) => p.id === d.id) : undefined;
      const p: Projeto = { ...d, id: anterior?.id ?? novoId(), nome: texto(d.nome), decisoes: anterior?.decisoes ?? [] };
      return { ok: true, id: p.id, estado: auditar({ ...e, projetos: upsert(e.projetos, p) }, s, anterior ? "editar" : "criar", "projeto", p.id, p.nome) };
    }
    case "projeto.decisao": {
      const p = e.projetos.find((x) => x.id === acao.id);
      if (!p) return falha("Projeto não encontrado.");
      if (!unidadeOk(p.unidadeId)) return semUnidade;
      if (!texto(acao.texto)) return falha("Descreva a decisão.");
      const dec = { texto: texto(acao.texto), data: agora(), autorId: s.membroId };
      return { ok: true, estado: auditar({ ...e, projetos: upsert(e.projetos, { ...p, decisoes: [dec, ...p.decisoes] }) }, s, "decisao", "projeto", p.id, dec.texto.slice(0, 80)) };
    }

    // ------------------------------------------------------------ configurações
    case "unidade.salvar": {
      const d = acao.dados;
      if (!texto(d.nome)) return falha("Revise os campos destacados.", { nome: "Informe o nome." });
      const u: Unidade = { ...d, id: d.id ?? novoId(), nome: texto(d.nome) };
      return { ok: true, id: u.id, estado: auditar({ ...e, unidades: upsert(e.unidades, u) }, s, d.id ? "editar" : "criar", "unidade", u.id, u.nome) };
    }
    case "config.salvar": {
      const d = acao.dados;
      const erros: Erros = {};
      if (!texto(d.nomeNegocio)) erros.nomeNegocio = "Informe o nome do negócio.";
      if (!Number.isInteger(d.capacidadeSimultanea) || d.capacidadeSimultanea < 1 || d.capacidadeSimultanea > 50) erros.capacidadeSimultanea = "Entre 1 e 50.";
      if (!Number.isInteger(d.orcamentoReferencia.valor) || d.orcamentoReferencia.valor < 0) erros.orcamento = "Valor inválido.";
      if (Object.keys(erros).length) return falha("Revise os campos destacados.", erros);
      return { ok: true, estado: auditar({ ...e, config: d }, s, "editar", "configuracoes", "config", "Configurações alteradas") };
    }
  }
}

function validarVeiculo(v: Ordem["veiculo"], pedirPlaca: boolean): Erros | null {
  const erros: Erros = {};
  if (!texto(v.modelo)) erros.modelo = "Informe ao menos o modelo.";
  if (pedirPlaca && !texto(v.placa)) erros.placa = "Placa exigida pela configuração.";
  if (!validarPlaca(v.placa)) erros.placa = "Placa no formato ABC-1234 ou ABC1D23.";
  return Object.keys(erros).length ? erros : null;
}

function limparVeiculo(v: Ordem["veiculo"]): Ordem["veiculo"] {
  return { marca: texto(v.marca), modelo: texto(v.modelo), cor: texto(v.cor), placa: texto(v.placa).toUpperCase() };
}
