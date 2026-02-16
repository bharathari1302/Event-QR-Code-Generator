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
    template: '%s | Event QR System',
    default: 'Event QR System',
  },
  description: "Event QR Verification System",
};

import { AuthProvider } from "./context/AuthContext";

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
        <AuthProvider>
          <DevToolsHider />
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
            <footer className="w-full py-3 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
              Developed by <span className="font-semibold text-gray-600">BHARAT HARI S</span> — AIML
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
