import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Provedores } from "@/componentes/Provedores";
import "./globals.css";

const titulo = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--fonte-titulo" });
const texto = Inter({ subsets: ["latin"], variable: "--fonte-texto" });

export const metadata: Metadata = {
  title: { default: "Eco Lava Jato", template: "%s · Eco Lava Jato" },
  description: "Gestão do Eco Lava Jato: clientes, agenda, ordens de serviço, estoque, equipe, projetos e financeiro gerencial.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Eco Lava Jato", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  // Painel interno: não é conteúdo para buscador.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#F3F2E7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${texto.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <Provedores>{children}</Provedores>
      </body>
    </html>
  );
}
