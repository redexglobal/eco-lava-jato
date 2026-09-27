"use client";
import { useEffect, useRef } from "react";
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

/** Ação rápida: ao chegar na página com `?novo`, abre o formulário de criação uma vez e limpa o endereço. */
export function useAbrirSeNovo(abrir: () => void, permitido: boolean) {
  const feito = useRef(false);
  const ref = useRef(abrir);
  useEffect(() => {
    ref.current = abrir;
  });
  useEffect(() => {
    if (feito.current || !permitido) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("novo")) return;
    feito.current = true;
    url.searchParams.delete("novo");
    window.history.replaceState(null, "", url.pathname + url.search);
    ref.current();
  }, [permitido]);
}
