import './globals.css';
import { AppProvider } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import AuthGuard from '@/components/AuthGuard';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="bg-slate-950 min-h-screen text-slate-200 selection:bg-indigo-500/30">
        <AppProvider>
          <AuthGuard>
            <Navigation />
            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pt-24">
              {children}
            </main>
          </AuthGuard>
        </AppProvider>
      </body>
    </html>
  );
}