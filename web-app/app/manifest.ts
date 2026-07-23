import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SMElink",
    short_name: "SMElink",
    description: "Sales, expenses, orders and stock in one practical workspace.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F6F8FA",
    theme_color: "#16324F",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
