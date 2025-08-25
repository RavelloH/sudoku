import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Script from "next/script";
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
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9856908450408828"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        
        {/* Google Analytics */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-3LK63REEMX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-3LK63REEMX');
          `}
        </Script>

        {/* Custom Analytics */}
        <Script
          defer
          src="https://analytics.ravelloh.top/script.js"
          data-website-id="66dd4070-59ae-4a68-a68e-fe671dcae7cd"
          strategy="afterInteractive"
        />

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
