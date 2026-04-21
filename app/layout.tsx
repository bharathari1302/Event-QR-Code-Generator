import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DevToolsHider from "./components/DevToolsHider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Q-Swift',
    default: 'Q-Swift | Event QR System',
  },
  description: "Q-Swift - Professional Event QR & Token Verification System",
  icons: {
    icon: '/favicon.png',
  }
};

import { AuthProvider } from "./context/AuthContext";
import SessionProviderWrapper from "./components/SessionProviderWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <SessionProviderWrapper>
          <AuthProvider>
            <DevToolsHider />
            <div className="min-h-screen flex flex-col">
              <main className="flex-1">{children}</main>
              <footer className="w-full py-4 text-center text-xs text-gray-400 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-t border-gray-200/60">
                <span className="tracking-wide">Developed by </span><span className="font-bold text-gradient">BHARAT HARI S</span><span className="mx-1.5 text-gray-300">•</span><span className="tracking-wider uppercase text-[10px] font-semibold text-gray-400">AIML</span>
              </footer>
            </div>
          </AuthProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
