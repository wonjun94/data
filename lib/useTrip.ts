'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from './supabase/client'
import type { Member, PlaceWithOpinions, Trip } from './types'

export type TripPhase = 'loading' | 'login' | 'none' | 'pending' | 'rejected' | 'ready'

// 여행 방 하나의 데이터(방·참여자·후보·의견)를 읽고, 다른 사람의 변경을 Realtime으로 받아 다시 읽는다.
export function useTrip(id: string) {
  const [phase, setPhase] = useState<TripPhase>('loading')
  const [me, setMe] = useState<string | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [places, setPlaces] = useState<PlaceWithOpinions[]>([])
  const seq = useRef(0)

  const reload = useCallback(async () => {
    const n = ++seq.current
    const sb = createClient()
    const { data: auth } = await sb.auth.getUser()
    const user = auth.user
    if (!user) return setPhase('login')
    setMe(user.id)
    const { data: mine } = await sb.from('members').select('status').eq('trip_id', id).eq('user_id', user.id).maybeSingle()
    if (n !== seq.current) return
    if (!mine) return setPhase('none')
    if (mine.status !== 'approved') return setPhase(mine.status === 'pending' ? 'pending' : 'rejected')

    const [t, m, p] = await Promise.all([
      sb.from('trips').select('*').eq('id', id).single(),
      sb.from('members').select('*').eq('trip_id', id).order('joined_at'),
      sb.from('places').select('*, opinions(*)').eq('trip_id', id).order('created_at'),
    ])
    if (n !== seq.current) return
    if (t.data) setTrip(t.data as Trip)
    setMembers((m.data as Member[]) ?? [])
    setPlaces((p.data as PlaceWithOpinions[]) ?? [])
    setPhase('ready')
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  const live = phase === 'ready' || phase === 'pending'
  useEffect(() => {
    if (!live) return
    const sb = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    const kick = () => {
      clearTimeout(timer)
      timer = setTimeout(reload, 300)
    }
    const ch = sb
      .channel(`trip-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places', filter: `trip_id=eq.${id}` }, kick)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opinions' }, kick)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `trip_id=eq.${id}` }, kick)
      .subscribe()
    // 승인 대기 중에는 Realtime이 막혀 있어도 알 수 있게 주기적으로 확인
    const poll = phase === 'pending' ? setInterval(reload, 5000) : undefined
    return () => {
      clearTimeout(timer)
      if (poll) clearInterval(poll)
      sb.removeChannel(ch)
    }
  }, [live, phase, id, reload])

  return { phase, me, trip, members, places, reload }
}
