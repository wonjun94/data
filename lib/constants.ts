import type { Budget, Category, Opinion } from './types'

export const CATEGORIES: { k: Category; label: string; color: string }[] = [
  { k: 'sight', label: '명소', color: '#C0841A' },
  { k: 'food', label: '맛집', color: '#D2492A' },
  { k: 'cafe', label: '카페', color: '#8A5A3B' },
  { k: 'activity', label: '체험', color: '#0E8F8A' },
]
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.k, c])) as Record<Category, (typeof CATEGORIES)[number]>

export const BUDGETS: { k: Budget; label: string; hint: string }[] = [
  { k: 'low', label: '저예산', hint: '가성비 위주' },
  { k: 'mid', label: '중간', hint: '적당히' },
  { k: 'high', label: '여유', hint: '좋은 곳 위주' },
]
export const BUDGET_LABEL: Record<Budget, string> = { low: '저예산', mid: '중간 예산', high: '여유 예산' }

export const STYLE_TAGS = [
  '로컬 맛집', '바다', '자연·풍경', '역사·문화', '카페 투어', '사진 명소',
  '야경', '쇼핑', '액티비티', '휴식·힐링', '아이와 함께', '술·바',
]

// 기존 테마 여행 지구본의 테마
export const THEMES = [
  { k: 'all', label: '전체', v: '--accent' },
  { k: 'relax', label: '휴양', v: '--t-relax' },
  { k: 'sightseeing', label: '관광·문화', v: '--t-sight' },
  { k: 'adventure', label: '익스트림', v: '--t-adv' },
  { k: 'nature', label: '아름다운 자연', v: '--t-nature' },
  { k: 'film', label: '영화·드라마 촬영지', v: '--t-film' },
]

export function mapsSearchUrl(name: string, nameLocal: string | null, destination: string) {
  const q = nameLocal ? `${nameLocal} ${name}` : `${name} ${destination}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function voteCounts(ops: Opinion[]) {
  let up = 0, down = 0
  for (const o of ops) {
    if (o.vote === 'up') up++
    else if (o.vote === 'down') down++
  }
  return { up, down }
}
