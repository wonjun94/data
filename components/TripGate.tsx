'use client'

import Link from 'next/link'
import LoginForm from './LoginForm'
import Mascot from './Mascot'
import type { TripPhase } from '@/lib/useTrip'

// 승인된 멤버가 아닐 때 보드 대신 보여주는 화면
export default function TripGate({ phase, next }: { phase: TripPhase; next: string }) {
  return (
    <div className="narrow stack">
      {phase === 'loading' && <Mascot mood="searching" text="여행 방을 여는 중이에요" />}
      {phase === 'login' && <LoginForm next={next} intro="이 방을 보려면 이메일로 로그인해 주세요." />}
      {phase === 'none' && (
        <>
          <Mascot mood="trouble" text="이 방의 참여자가 아니에요. 방장에게 초대 링크를 받아 주세요." />
          <Link href="/" className="btn ghost">처음 화면으로</Link>
        </>
      )}
      {phase === 'pending' && (
        <>
          <Mascot mood="trouble" text="방장의 승인을 기다리는 중이에요." />
          <p className="muted small">승인되면 이 화면이 자동으로 후보 보드로 바뀌어요.</p>
        </>
      )}
      {phase === 'rejected' && <Mascot mood="trouble" text="방장이 참여를 거절했어요." />}
    </div>
  )
}
