// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BrewOps',
  description: 'Brewery checklists',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <a href="/" className="font-semibold">BrewOps</a>
            <nav className="text-sm flex gap-3">
              <a href="/work" className="hover:underline">Work</a>
              <a href="/review" className="hover:underline">Review</a>
              <a href="/admin/templates" className="hover:underline">Admin</a>
              <span className="mx-2 text-gray-300">|</span>
              <a href="/admin/signin" className="hover:underline">Admin sign in</a>
              <a href="/employee/signin" className="hover:underline">Employee sign in</a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
