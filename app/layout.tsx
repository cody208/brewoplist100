import './globals.css'; import Link from 'next/link'
export const metadata = { title: 'BrewOps', description: 'Brewery checklist app' }
export default function RootLayout({ children }:{children:React.ReactNode}) {
  return (<html lang="en"><body>
    <header className="bg-white border-b"><div className="container py-3 flex gap-4">
      <Link href="/" className="font-bold">BrewOps</Link>
      <nav className="flex gap-3 text-sm">
        <Link href="/work">Work</Link><Link href="/review">Review</Link><Link href="/admin/templates">Admin</Link>
      </nav>
    </div></header>
    <main className="container py-6">{children}</main></body></html>)
}
