import './globals.css';
export const metadata = {
  title: 'Dashboard de E-commerce',
  description: 'Painel de importação e liquidez',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}