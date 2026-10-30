import type { Metadata, Viewport } from 'next'
import TopBar from '@/components/TopBar'
import './globals.css'

// 링크 미리보기 이미지가 절대 주소로 나가도록 사이트 주소를 정한다 (Vercel에서는 자동으로 잡힘)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || 'http://localhost:3000'

const description = '동행과 함께 고르는 여행지. AI가 후보를 추리고, 다 같이 투표하고, 확정한 곳은 구글 내 지도로 한 번에.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '떠날지도',
  description,
  openGraph: { title: '떠날지도', description, siteName: '떠날지도', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '떠날지도', description },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <TopBar />
        <main className="wrap">{children}</main>
      </body>
    </html>
  )
}
