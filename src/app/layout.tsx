import type { Metadata } from "next";
import { Geist_Mono, Inter, Nunito } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AULA — AI Tutor in Your Browser",
  description:
    "An offline-first AI tutor powered by Gemma 4 E2B running 100% locally via WebGPU. No server, no account, no internet after first load.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning prevents false-positive hydration errors from
    // browser extensions (e.g. Edge's focus-visible polyfill) that inject
    // attributes like data-js-focus-visible onto <html>/<body> before React loads.
    <html
      lang="es"
      className={`${inter.variable} ${nunito.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
