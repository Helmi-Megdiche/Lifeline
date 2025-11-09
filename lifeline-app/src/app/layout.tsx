import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import { ClientSyncProvider } from "@/components/ClientSyncProvider";
import { AuthGuard } from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import InstallPrompt from "./InstallPrompt";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AlertsProvider } from "@/contexts/AlertsContext";
import { GroupsProvider } from "@/contexts/GroupsContext";
import GlobalEmergencyListener from "@/components/GlobalEmergencyListener";
import OfflineQueueSync from "@/components/OfflineQueueSync";
import MapSnapshotSync from "@/components/MapSnapshotSync";
import OfflineContactsSync from "@/components/OfflineContactsSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LifeLine",
  description: "Offline-first emergency communication and resource app",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icons/icon-192x192.png" },
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-900 dark:text-dark-text-primary min-h-screen bg-white dark:bg-dark-bg-primary transition-colors duration-300`}
            suppressHydrationWarning
          >
            {/* Prevent FOUC (Flash of Unstyled Content) for dark mode - must run before React hydrates */}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    try {
                      const theme = localStorage.getItem('lifeline-theme');
                      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      const shouldBeDark = theme === 'dark' || (!theme && prefersDark);
                      if (shouldBeDark) {
                        document.documentElement.classList.add('dark');
                      } else {
                        document.documentElement.classList.remove('dark');
                      }
                    } catch (e) {}
                  })();
                `,
              }}
              suppressHydrationWarning
            />
        {/* Subtle medical cross pattern overlay */}
        <div 
          className="fixed inset-0 z-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dc2626' fill-opacity='1'%3E%3Cpath d='M30 20v20M20 30h20' stroke='%23dc2626' stroke-width='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
            `,
            backgroundSize: '120px 120px'
          }}
        ></div>
        
        <ThemeProvider>
          <Navbar />
          {/* Register service worker (once on client) */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch(() => {});
                  });
                }
              `
            }}
          />
              <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
                <ClientAuthProvider>
                  <AuthGuard>
                    <ClientSyncProvider>
                      <AlertsProvider>
                        <GroupsProvider>
                          <GlobalEmergencyListener />
                          <OfflineQueueSync />
                          <MapSnapshotSync />
                          <OfflineContactsSync />
                          <InstallPrompt />
                          {children}
                        </GroupsProvider>
                      </AlertsProvider>
                    </ClientSyncProvider>
                  </AuthGuard>
                </ClientAuthProvider>
              </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
