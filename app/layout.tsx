import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/components/theme-provider'
import { AppContent } from '../components/AppContent'

export const metadata: Metadata = {
  title: 'Social Network',
  description: 'Modern social media platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppContent>
              {children}
            </AppContent>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 