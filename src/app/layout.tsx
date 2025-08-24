import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RavelloH's Sudoku - 精美的数独游戏",
  description: "一个精美的在线数独游戏，支持多种难度，智能提示，历史记录和多种游戏模式。",
  keywords: "数独,Sudoku,游戏,puzzle,RavelloH",
  authors: [{ name: "RavelloH", url: "https://ravelloh.top" }],
  openGraph: {
    title: "RavelloH's Sudoku - 精美的数独游戏",
    description: "一个精美的在线数独游戏，支持多种难度，智能提示，历史记录和多种游戏模式。",
    url: "https://sudoku.ravelloh.top",
    siteName: "RavelloH's Sudoku",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RavelloH's Sudoku - 精美的数独游戏",
    description: "一个精美的在线数独游戏，支持多种难度，智能提示，历史记录和多种游戏模式。",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2dd4bf" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
