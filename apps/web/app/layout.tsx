import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robot Lead Management | Codepath",
  description: "Dashboard de leads e prospecção comercial da Codepath.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans text-slate-950 antialiased">{children}</body>
    </html>
  );
}
