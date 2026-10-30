import type { Metadata, Viewport } from 'next'
import TopBar from '@/components/TopBar'
import './globals.css'

export const metadata: Metadata = {
  title: '떠날지도',
  description: 'AI가 추린 여행 후보를 동행과 함께 고르고, 구글 내 지도로 옮기세요.',
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
