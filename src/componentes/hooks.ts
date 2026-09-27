"use client";
import { useDados } from "@/lib/store";
import { useUi } from "./ui";
import { pode } from "@/lib/regras";
import type { Acao } from "@/lib/acoes";
import type { Erros } from "@/lib/regras";
import type { Modulo } from "@/lib/tipos";

/** Executa uma ação e mostra o resultado. Devolve o id criado/alterado, ou null se falhou. */
export function useAcao() {
  const { executar } = useDados();
  const { avisar } = useUi();
  return (acao: Acao, opcoes: { sucesso?: string; setErros?: (e: Erros) => void } = {}): string | null => {
    const r = executar(acao);
    if (r.ok) {
      opcoes.setErros?.({});
      if (opcoes.sucesso) avisar(opcoes.sucesso);
      return r.id ?? "ok";
    }
    opcoes.setErros?.(r.erros ?? {});
    avisar(r.erro, "erro");
    return null;
  };
}

export function usePermissao(modulo: Modulo) {
  const { membro } = useDados();
  return {
    ler: !!membro && pode(membro.papel, modulo, "ler"),
    editar: !!membro && pode(membro.papel, modulo, "editar"),
  };
}

/** Nome de uma pessoa da equipe a partir do id. */
export function useNomes() {
  const { estado } = useDados();
  return {
    membro: (id?: string) => estado.membros.find((m) => m.id === id)?.nome ?? (id ? "—" : "Sem responsável"),
    cliente: (id?: string) => estado.clientes.find((c) => c.id === id)?.nome ?? "Cliente removido",
    servico: (id?: string) => estado.servicos.find((s) => s.id === id)?.nome ?? "—",
    unidade: (id?: string) => estado.unidades.find((u) => u.id === id)?.nome ?? "—",
  };
}
