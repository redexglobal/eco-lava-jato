import {
  Boxes, CalendarDays, ClipboardList, Droplets, FolderTree, House, ListChecks,
  Settings, Users, UsersRound, Wallet, type LucideIcon,
} from "lucide-react";
import type { Modulo } from "@/lib/tipos";

export interface ItemNav {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** null = qualquer pessoa logada vê. */
  modulo: Modulo | null;
}

export const NAV: ItemNav[] = [
  { href: "/", rotulo: "Visão geral", icone: House, modulo: null },
  { href: "/clientes", rotulo: "Clientes", icone: UsersRound, modulo: "clientes" },
  { href: "/agenda", rotulo: "Agenda", icone: CalendarDays, modulo: "agenda" },
  { href: "/operacao", rotulo: "Operação", icone: ClipboardList, modulo: "operacao" },
  { href: "/servicos", rotulo: "Serviços", icone: Droplets, modulo: "servicos" },
  { href: "/estoque", rotulo: "Estoque", icone: Boxes, modulo: "estoque" },
  { href: "/equipe", rotulo: "Equipe", icone: Users, modulo: "equipe" },
  { href: "/tarefas", rotulo: "Tarefas", icone: ListChecks, modulo: "tarefas" },
  { href: "/financeiro", rotulo: "Financeiro", icone: Wallet, modulo: "financeiro" },
  { href: "/projetos", rotulo: "Projetos", icone: FolderTree, modulo: "projetos" },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings, modulo: "configuracoes" },
];

export function moduloDaRota(caminho: string): Modulo | null {
  const item = NAV.find((n) => n.href !== "/" && (caminho === n.href || caminho.startsWith(n.href + "/")));
  return item?.modulo ?? null;
}
