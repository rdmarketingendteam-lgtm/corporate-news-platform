import type { Metadata, Viewport } from 'next'

import { ConsentBanner } from '../components/ConsentBanner'
import { ShellWrapper } from '../components/ShellWrapper'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import { site } from '../lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: 'Newspaper Demo | The Best News Magazine Portal', template: `%s | Newspaper Demo` },
  description: 'Newspaper Demo — The Best News Magazine Theme. Live updates, breaking headlines & in-depth coverage across global categories.',
  icons: {
    icon: 'https://demo.tagdiv.com/newspaper_pro/wp-content/uploads/2022/10/np12blue-white.png',
  },
  openGraph: { siteName: 'Newspaper Demo', locale: site.locale, type: 'website' },
  twitter: { card: 'summary_large_image' },
  alternates: { types: { 'application/rss+xml': [{ url: '/feed.xml', title: `${site.name} — latest` }] } },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#4db2ec' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&family=Roboto:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/altroz/css/bootstrap.min.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
        <link rel="stylesheet" href="/newspaper_pro.css?v=20261124_v15" />
      </head>
      <body>
        <ShellWrapper
          header={<SiteHeader />}
          footer={<SiteFooter />}
          consent={<ConsentBanner />}
        >
          {children}
        </ShellWrapper>
      </body>
    </html>
  )
}
