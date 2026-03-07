import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Butcherbird OS',
  description: 'Operating system for Butcherbird Global',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `try{var t=localStorage.getItem('bbg-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`
        }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
