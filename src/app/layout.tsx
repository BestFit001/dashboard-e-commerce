import './globals.css';
import { AppProvider } from '@/context/AppContext';
import Navigation from '@/components/Navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className="dark">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased selection:bg-indigo-500 selection:text-white">
        <AppProvider>
          <div className="flex flex-col min-h-screen">
            <Navigation />
            <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}