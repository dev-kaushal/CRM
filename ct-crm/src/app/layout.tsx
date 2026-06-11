import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "CT-CRM | Enterprise Customer Relationship Management",
  description:
    "Next-gen AI-native glassmorphic CRM system for managing leads, contacts, accounts, and sales pipelines with enterprise-grade security.",
  keywords: "CRM, sales pipeline, lead management, customer relationship, enterprise",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" data-theme="dark" className="dark h-full" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Cause:wght@100..900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=Syncopate:wght@700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-full flex flex-col antialiased">
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "var(--card-bg)",
                  color: "var(--text-color)",
                  border: "1px solid var(--card-border)",
                  fontFamily: '"Cause", cursive, system-ui, sans-serif',
                },
              }}
            />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
