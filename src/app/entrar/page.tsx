"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDados } from "@/lib/store";
import { PAPEIS } from "@/lib/regras";
import { Aviso } from "@/componentes/ui";

export default function Entrar() {
  const { estado, entrar } = useDados();
  const router = useRouter();
  const ativos = estado.membros.filter((m) => m.ativo);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Image src="/marca/simbolo.png" alt="" width={96} height={96} className="mx-auto rounded-full" priority />
        <h1 className="mt-3 font-titulo text-5xl text-marca-forte">Eco Lava Jato</h1>
        <p className="mt-1 tracking-wide text-folha-forte">Brilho que vem da natureza</p>
      </div>

      <Aviso titulo="Modo demonstração — sem login real">
        Escolha um perfil para ver o sistema pelos olhos de cada função. Os dados são fictícios e ficam salvos apenas
        neste navegador. Antes de usar com clientes reais, é preciso ligar o banco de dados e o login seguro (veja o README).
      </Aviso>

      <ul className="grid gap-3 sm:grid-cols-2">
        {ativos.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => { entrar(m.id); router.replace("/"); }}
              className="w-full rounded-xl border border-borda bg-superficie p-4 text-left transition hover:border-marca hover:shadow-sm"
            >
              <p className="font-medium">{m.nome}</p>
              <p className="text-sm text-marca">{PAPEIS[m.papel].nome}</p>
              <p className="mt-1 text-xs text-suave">{PAPEIS[m.papel].descricao}</p>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
