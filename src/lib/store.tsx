"use client";
// Guarda o estado do modo demonstração no navegador (localStorage) e expõe as ações.
// Cada navegador tem sua própria cópia: nada é enviado para servidor nenhum.
// Para produção, este arquivo é o ponto de troca pelo adaptador Supabase (docs/ARQUITETURA.md).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { executar as executarAcao, type Acao, type Resultado } from "./acoes.ts";
import { criarEstadoDemo } from "./demo.ts";
import { acessaUnidade } from "./regras.ts";
import type { Estado, Membro, Sessao, Unidade } from "./tipos.ts";

const CHAVE_DADOS = "eco-lava-jato:dados:v1";
const CHAVE_SESSAO = "eco-lava-jato:sessao";
const CHAVE_UNIDADE = "eco-lava-jato:unidade";

function ler<T>(chave: string): T | null {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Navegador sem armazenamento (aba anônima, bloqueio): segue só em memória.
  }
}

interface Contexto {
  estado: Estado;
  sessao: Sessao | null;
  membro: Membro | null;
  unidade: Unidade | null;
  unidadesVisiveis: Unidade[];
  escolherUnidade: (id: string) => void;
  executar: (acao: Acao) => Resultado;
  entrar: (membroId: string) => void;
  sair: () => void;
  reiniciarDemo: () => void;
}

const Ctx = createContext<Contexto | null>(null);

export function ProvedorDados({ children }: { children: React.ReactNode }) {
  const [carregado, setCarregado] = useState(false);
  const [estado, setEstado] = useState<Estado>(() => criarEstadoDemo());
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [unidadeId, setUnidadeId] = useState<string>("u-lava");

  useEffect(() => {
    const salvo = ler<Estado>(CHAVE_DADOS);
    // Leitura única do armazenamento do navegador ao montar.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (salvo?.versao === 1) setEstado(salvo);
    setSessao(ler<Sessao>(CHAVE_SESSAO));
    const u = ler<string>(CHAVE_UNIDADE);
    if (u) setUnidadeId(u);
    setCarregado(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Mantém abas abertas do mesmo navegador em sincronia.
    const aoMudar = (ev: StorageEvent) => {
      if (ev.key === CHAVE_DADOS) {
        const novo = ler<Estado>(CHAVE_DADOS);
        if (novo) setEstado(novo);
      }
    };
    window.addEventListener("storage", aoMudar);
    return () => window.removeEventListener("storage", aoMudar);
  }, []);

  const membro = useMemo(
    () => (sessao ? (estado.membros.find((m) => m.id === sessao.membroId && m.ativo) ?? null) : null),
    [estado.membros, sessao],
  );

  const unidadesVisiveis = useMemo(
    () => (membro ? estado.unidades.filter((u) => u.ativa && acessaUnidade(membro, u.id)) : []),
    [estado.unidades, membro],
  );

  const unidade = unidadesVisiveis.find((u) => u.id === unidadeId) ?? unidadesVisiveis[0] ?? null;

  const executar = useCallback(
    (acao: Acao): Resultado => {
      if (!sessao) return { ok: false, erro: "Entre para continuar." };
      const r = executarAcao(estado, sessao, acao);
      if (r.ok) {
        setEstado(r.estado);
        gravar(CHAVE_DADOS, r.estado);
      }
      return r;
    },
    [estado, sessao],
  );

  const valor: Contexto = {
    estado,
    sessao,
    membro,
    unidade,
    unidadesVisiveis,
    escolherUnidade: (id) => {
      setUnidadeId(id);
      gravar(CHAVE_UNIDADE, id);
    },
    executar,
    entrar: (membroId) => {
      const s = { membroId };
      setSessao(s);
      gravar(CHAVE_SESSAO, s);
    },
    sair: () => {
      setSessao(null);
      gravar(CHAVE_SESSAO, null);
    },
    reiniciarDemo: () => {
      const novo = criarEstadoDemo();
      setEstado(novo);
      gravar(CHAVE_DADOS, novo);
    },
  };

  if (!carregado) {
    return (
      <div className="grid min-h-dvh place-items-center text-suave" role="status">
        Carregando…
      </div>
    );
  }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDados(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDados fora do ProvedorDados");
  return c;
}
