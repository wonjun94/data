// 마스코트 '포트'(패스포트 씨): 모자를 쓰고 접힌 지도를 펼쳐 든 오리지널 레트로 여행 가이드.
// 잉크 선 + 포인트색 두 가지로만 그린다. 표정 4종: welcome / searching / celebrate / trouble.

export type Mood = 'welcome' | 'searching' | 'celebrate' | 'trouble'

function Face({ mood }: { mood: Mood }) {
  const ink = 'var(--ink)'
  if (mood === 'welcome')
    return (
      <g stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round">
        <path d="M49 55 q3 -4 6 0" />
        <path d="M65 55 q3 -4 6 0" />
        <path d="M51 63 q9 8 18 0" />
      </g>
    )
  if (mood === 'searching')
    return (
      <g stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round">
        <circle cx="54" cy="55" r="1.8" fill={ink} />
        <circle cx="70" cy="55" r="1.8" fill={ink} />
        <path d="M56 66 h8" />
      </g>
    )
  if (mood === 'celebrate')
    return (
      <g stroke={ink} strokeWidth="2.6" strokeLinecap="round">
        <path d="M48 56 q4 -5 8 0" fill="none" />
        <path d="M64 56 q4 -5 8 0" fill="none" />
        <path d="M50 62 q10 12 20 0 z" fill="var(--accent)" />
      </g>
    )
  return (
    <g stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round">
      <path d="M48 50 l6 2" />
      <path d="M72 50 l-6 2" />
      <circle cx="52" cy="56" r="1.8" fill={ink} />
      <circle cx="68" cy="56" r="1.8" fill={ink} />
      <path d="M52 66 q4 -3 8 0 q4 3 8 0" />
      <path d="M80 44 q3 5 0 7 q-3 -2 0 -7 z" fill="var(--accent)" strokeWidth="1.6" />
    </g>
  )
}

export function MascotFigure({ mood = 'welcome', size = 72 }: { mood?: Mood; size?: number }) {
  const ink = 'var(--ink)'
  const paper = 'var(--surface)'
  const accent = 'var(--accent)'
  return (
    <svg
      className={`mascot-fig mood-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="여행 가이드 포트"
    >
      {mood === 'celebrate' && (
        <g fill={accent}>
          <path d="M14 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          <path d="M102 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
          <circle cx="100" cy="52" r="2.5" />
        </g>
      )}
      {/* 몸 */}
      <path d="M32 118 C32 94 45 84 60 84 C75 84 88 94 88 118" fill={paper} stroke={ink} strokeWidth="3" />
      <path d="M60 86 l-6 10 6 6 6 -6 z" fill={accent} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      {/* 얼굴 */}
      <circle cx="60" cy="58" r="23" fill={paper} stroke={ink} strokeWidth="3" />
      <Face mood={mood} />
      {/* 모자: 둥근 크라운 + 챙 + 띠 */}
      <path d="M40 42 C40 20 80 20 80 42 Z" fill={accent} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M41 37 h38" stroke={paper} strokeWidth="3.5" />
      <path d="M30 43 Q60 35 90 43 Q60 50 30 43 Z" fill={accent} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      {/* 펼쳐 든 접힌 지도 */}
      <g className="mascot-map">
        <path
          d="M26 90 L43 84 L60 90 L77 84 L94 90 L94 114 L77 108 L60 114 L43 108 L26 114 Z"
          fill={paper}
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M43 84 V108 M60 90 V114 M77 84 V108" stroke={ink} strokeWidth="1.8" />
        <path d="M31 106 q10 -12 22 -4 t26 -6 q6 -2 9 -6" fill="none" stroke={accent} strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" />
        <path d="M84 92 l5 5 m0 -5 l-5 5" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="26" cy="100" r="5" fill={paper} stroke={ink} strokeWidth="2.6" />
        <circle cx="94" cy="100" r="5" fill={paper} stroke={ink} strokeWidth="2.6" />
      </g>
    </svg>
  )
}

export default function Mascot({ mood = 'welcome', text, size = 64 }: { mood?: Mood; text: string; size?: number }) {
  return (
    <div className={`mascot mascot-${mood}`} role="status" aria-live="polite">
      <MascotFigure mood={mood} size={size} />
      <p className="bubble">{text}</p>
    </div>
  )
}
