"use client";
import { ProvedorDados } from "@/lib/store";
import { ProvedorUi } from "./ui";

export function Provedores({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorDados>
      <ProvedorUi>{children}</ProvedorUi>
    </ProvedorDados>
  );
}
