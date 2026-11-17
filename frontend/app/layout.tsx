import { cookies } from "next/headers"
import { isLanguage, LANGUAGE_LOCALES } from "@/lib/i18n"
import { Analytics } from '@vercel/analytics/next'
import '@fontsource-variable/noto-sans-arabic'
import type { Metadata, Viewport } from 'next'
import { MarketingLanguageProvider } from '@/components/marketing-language'
import './globals.css'

export const metadata: Metadata = {
  title: 'MIRROR — Virtual fitting and retail management',
  description: 'Virtual fitting and retail operations for fashion brands, branches, and in-store smart mirrors.',
  generator: 'v0',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
    themeColor: '#101a15',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const stored = (await cookies()).get("mirror_language")?.value;
  const language = isLanguage(stored) ? stored : "EN";
  return (
    <html lang={LANGUAGE_LOCALES[language]} dir={language === "AR" ? "rtl" : "ltr"}>
      <body className="antialiased">
        <MarketingLanguageProvider initialLanguage={language}>{children}</MarketingLanguageProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
