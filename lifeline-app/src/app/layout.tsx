import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import GlobalEmergencyListener from '@/components/GlobalEmergencyListener';
import OfflineQueueSync from '@/components/OfflineQueueSync';
import OfflineContactsSync from '@/components/OfflineContactsSync';
import MapSnapshotSync from '@/components/MapSnapshotSync';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ClientAuthProvider } from '@/contexts/ClientAuthContext';
import { AlertsProvider } from '@/contexts/AlertsContext';
import { GroupsProvider } from '@/contexts/GroupsContext';

export const metadata: Metadata = {
  title: 'LifeLine',
  description: 'Offline-first emergency communication & resource platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ClientAuthProvider>
            <GroupsProvider>
              <AlertsProvider>
                <Navbar />
                {/* Global background sync helpers */}
                <OfflineQueueSync />
                <OfflineContactsSync />
                <MapSnapshotSync />
                {/* Global emergency listener (keyword + amplitude) */}
                <GlobalEmergencyListener />
                <main className="min-h-screen">{children}</main>
              </AlertsProvider>
            </GroupsProvider>
          </ClientAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


