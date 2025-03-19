import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SSO+ Login Widget',
  description: 'OTP-based phone verification login widget for Shopify stores',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500">
        {children}
      </body>
    </html>
  )
} 