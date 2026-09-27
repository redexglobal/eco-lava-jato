"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { useDados } from "@/lib/store";
import { PAPEIS, pode } from "@/lib/regras";
import { NAV, moduloDaRota } from "./navegacao";
import { Vazio } from "./ui";

export function Shell({ children }: { children: React.ReactNode }) {
  const { membro, unidade, unidadesVisiveis, escolherUnidade, sair } = useDados();
  const caminho = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!membro) router.replace("/entrar");
  }, [membro, router]);

  if (!membro) return null;

  const itens = NAV.filter((n) => !n.modulo || pode(membro.papel, n.modulo, "ler"));
  const modulo = moduloDaRota(caminho);
  const permitido = !modulo || pode(membro.papel, modulo, "ler");
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(href + "/"));

  const menu = (
    <nav aria-label="Seções" className="flex flex-col gap-1">
      {itens.map(({ href, rotulo, icone: Icone }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMenuAberto(false)}
          aria-current={ativo(href) ? "page" : undefined}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-texto/80 hover:bg-fundo aria-[current=page]:bg-marca aria-[current=page]:font-medium aria-[current=page]:text-white"
        >
          <Icone size={18} aria-hidden />
          {rotulo}
        </Link>
      ))}
    </nav>
  );

  const rodape = (
    <div className="mt-auto space-y-3 border-t border-borda pt-4 text-sm">
      <div>
        <p className="font-medium">{membro.nome}</p>
        <p className="text-xs text-suave">{PAPEIS[membro.papel].nome}</p>
      </div>
      <button
        type="button"
        onClick={() => { sair(); router.replace("/entrar"); }}
        className="flex items-center gap-2 text-suave hover:text-texto"
      >
        <LogOut size={16} aria-hidden /> Sair / trocar perfil
      </button>
    </div>
  );

  const marca = (
    <Link href="/" className="flex items-center gap-2">
      <Image src="/marca/simbolo.png" alt="" width={40} height={40} className="rounded-full" />
      <span className="font-titulo text-2xl leading-none text-marca-forte">Eco Lava Jato</span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-superficie focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>

      {/* Lateral fixa no computador */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-borda bg-superficie p-4 lg:flex">
        {marca}
        {menu}
        {rodape}
      </aside>

      {/* Gaveta no celular */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/40" onClick={() => setMenuAberto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-superficie p-4">
            <div className="flex items-center justify-between">
              {marca}
              <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} className="p-1"><X /></button>
            </div>
            {menu}
            {rodape}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <div className="bg-alerta-claro px-4 py-1.5 text-center text-xs text-alerta">
          <strong>Modo demonstração:</strong> dados fictícios salvos só neste navegador. Não é seguro para dados reais de clientes.{" "}
          <Link href="/configuracoes#demo" className="underline">Saiba mais</Link>
        </div>
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-borda bg-fundo/90 px-4 py-3 backdrop-blur">
          <button type="button" aria-label="Abrir menu" onClick={() => setMenuAberto(true)} className="rounded-md p-1 lg:hidden">
            <Menu />
          </button>
          <div className="lg:hidden">{marca}</div>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden text-suave sm:inline">Unidade:</span>
            <select
              value={unidade?.id ?? ""}
              onChange={(e) => escolherUnidade(e.target.value)}
              className="max-w-[12rem] rounded-lg border border-borda bg-superficie px-2 py-1.5 text-sm"
              aria-label="Unidade ou frente selecionada"
            >
              {unidadesVisiveis.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </label>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {!unidade ? (
            <Vazio titulo="Nenhuma unidade vinculada ao seu perfil" texto="Peça a um administrador para vincular você a uma unidade." />
          ) : permitido ? (
            children
          ) : (
            <Vazio titulo="Sem acesso a esta seção" texto={`O papel "${PAPEIS[membro.papel].nome}" não tem permissão para ver esta área.`} acao={<Link className="text-marca underline" href="/">Voltar à visão geral</Link>} />
          )}
        </main>
      </div>
    </div>
  );
}
