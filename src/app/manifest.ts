import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eco Lava Jato",
    short_name: "Eco Lava Jato",
    description: "Gestão do lava-jato ecológico e das frentes do projeto.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F2E7",
    theme_color: "#14566A",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
