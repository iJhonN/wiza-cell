import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/AppLayout";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Wiza Cell | Sistema de Gestão",
    description: "Sistema ERP e controle de estoque para Wiza Cell",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="pt-BR"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
        <body className="min-h-full bg-stone-900 text-stone-100">
        <AppLayout>
            {children}
        </AppLayout>
        </body>
        </html>
    );
}