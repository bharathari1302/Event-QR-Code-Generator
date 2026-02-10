import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DevToolsHider from "./components/DevToolsHider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Event QR System',
    default: 'Event QR System',
  },
  description: "Event QR Verification System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DevToolsHider />
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">{children}</main>
          <footer className="w-full py-3 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            Developed by <span className="font-semibold text-gray-600">BHARAT HARI S</span> — AIML
          </footer>
        </div>
      </body>
    </html>
  );
}
