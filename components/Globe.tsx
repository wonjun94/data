'use client'

// 기존 '테마 여행 지구본'(d3-geo + topojson 캔버스 지구본)을 React 컴포넌트로 옮긴 것.
import { useEffect, useRef, useState } from 'react'
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'

export type GlobePin = { id: string; name: string; sub: string; lat: number; lon: number; color: string }

type Props = {
  pins: GlobePin[]
  selectedId: string | null
  focus: { lat: number; lon: number } | null
  onPick: (id: string) => void
}

type Rot = [number, number, number]
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export default function Globe({ pins, selectedId, focus, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const live = useRef({ pins, selectedId, onPick })
  live.current = { pins, selectedId, onPick }
  const api = useRef<{ flyTo: (lat: number, lon: number) => void; zoom: (f: number) => void; setSpin: (s: boolean) => void } | null>(null)
  const [spinning, setSpinning] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const proj = geoOrthographic().clipAngle(90).precision(0.4)
    const path = geoPath(proj, ctx)
    const grat = geoGraticule10()
    let land: any = null
    let borders: any = null
    let alive = true
    fetch('/world.json')
      .then((r) => r.json())
      .then((w) => {
        if (!alive) return
        land = feature(w, w.objects.land)
        borders = mesh(w, w.objects.countries, (a: any, b: any) => a !== b)
      })
      .catch(() => {})

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) setSpinning(false)
    let W = 0
    let scaleK = 1
    let rot: Rot = [-127, -25, 0]
    let spin = !reduce
    let pulse = 0
    let screen: { p: GlobePin; x: number; y: number }[] = []
    let fly: null | { from: Rot; dl: number; dp: number; t0: number; dur: number } = null
    let drag: null | { x: number; y: number; r: Rot } = null
    let moved = false

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(2, devicePixelRatio || 1)
      W = r.width
      canvas.width = W * dpr
      canvas.height = W * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      proj.translate([W / 2, W / 2])
    }

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }

    const draw = () => {
      if (!W) return
      const cs = getComputedStyle(document.documentElement)
      const v = (n: string) => cs.getPropertyValue(n).trim()
      proj.scale((W / 2) * 0.92 * scaleK).rotate(rot)
      const R = proj.scale()
      const c = W / 2
      ctx.clearRect(0, 0, W, W)
      const halo = ctx.createRadialGradient(c, c, R * 0.95, c, c, R * 1.08)
      halo.addColorStop(0, v('--halo'))
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(c, c, R * 1.08, 0, 2 * Math.PI)
      ctx.fill()
      const g = ctx.createRadialGradient(c - R * 0.35, c - R * 0.35, R * 0.1, c, c, R)
      g.addColorStop(0, v('--ocean'))
      g.addColorStop(1, v('--ocean-deep'))
      ctx.fillStyle = g
      ctx.beginPath()
      path({ type: 'Sphere' } as any)
      ctx.fill()
      ctx.beginPath()
      path(grat)
      ctx.strokeStyle = v('--grat')
      ctx.lineWidth = 1
      ctx.stroke()
      if (land) {
        ctx.beginPath()
        path(land)
        ctx.fillStyle = v('--land')
        ctx.fill()
        ctx.beginPath()
        path(borders)
        ctx.strokeStyle = v('--border')
        ctx.lineWidth = 0.6
        ctx.stroke()
      }

      const { pins, selectedId } = live.current
      const center = proj.invert!([c, c])!
      screen = []
      for (const p of pins) {
        if (geoDistance([p.lon, p.lat], center) > Math.PI / 2 - 0.02) continue
        const [x, y] = proj([p.lon, p.lat])!
        screen.push({ p, x, y })
      }
      screen.sort((a, b) => Number(a.p.id === selectedId) - Number(b.p.id === selectedId))
      const surface = v('--surface')
      for (const { p, x, y } of screen) {
        const sel = p.id === selectedId
        if (sel) {
          const pr = 8 + 10 * (pulse % 1)
          ctx.beginPath()
          ctx.arc(x, y, pr, 0, 2 * Math.PI)
          ctx.strokeStyle = p.color
          ctx.globalAlpha = 1 - (pulse % 1)
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.globalAlpha = 1
        }
        ctx.beginPath()
        ctx.arc(x, y, sel ? 7.5 : 5.5, 0, 2 * Math.PI)
        ctx.fillStyle = p.color
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = surface
        ctx.stroke()
        if (sel) {
          ctx.font = `600 13px ${v('--f-body')}`
          const tw = ctx.measureText(p.name).width
          const lx = x + 11 + tw + 14 > W - 4 ? x - 11 - tw - 14 : x + 11
          ctx.fillStyle = surface
          ctx.globalAlpha = 0.92
          roundRect(lx, y - 11, tw + 14, 22, 6)
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.fillStyle = v('--ink')
          ctx.fillText(p.name, lx + 7, y + 4.5)
        }
      }
    }

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      pulse += dt * 0.8
      if (fly) {
        const t = Math.min(1, (now - fly.t0) / fly.dur)
        const e = ease(t)
        rot = [fly.from[0] + fly.dl * e, fly.from[1] + fly.dp * e, 0]
        if (t >= 1) fly = null
      } else if (spin && !drag) rot[0] += dt * 6
      draw()
      raf = requestAnimationFrame(tick)
    }

    const hit = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      let best: (typeof screen)[number] | null = null
      let bd = 16 * 16
      for (const s of screen) {
        const dd = (s.x - x) ** 2 + (s.y - y) ** 2
        if (dd < bd) {
          bd = dd
          best = s
        }
      }
      return best
    }

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      drag = { x: e.clientX, y: e.clientY, r: [...rot] as Rot }
      moved = false
      fly = null
      canvas.classList.add('dragging')
    }
    const onMove = (e: PointerEvent) => {
      const tip = tipRef.current!
      if (drag) {
        const k = 70 / proj.scale()
        const dx = e.clientX - drag.x
        const dy = e.clientY - drag.y
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true
        rot = [drag.r[0] + dx * k * 1.1, Math.max(-85, Math.min(85, drag.r[1] - dy * k * 1.1)), 0]
        tip.hidden = true
        return
      }
      const h = hit(e)
      if (h) {
        tip.hidden = false
        tip.textContent = h.p.sub ? `${h.p.name} · ${h.p.sub}` : h.p.name
        tip.style.left = `${h.x}px`
        tip.style.top = `${h.y}px`
        canvas.style.cursor = 'pointer'
      } else {
        tip.hidden = true
        canvas.style.cursor = ''
      }
    }
    const onUp = (e: PointerEvent) => {
      canvas.classList.remove('dragging')
      if (!moved) {
        const h = hit(e)
        if (h) live.current.onPick(h.p.id)
      }
      drag = null
    }
    const onLeave = () => {
      tipRef.current!.hidden = true
    }
    const zoom = (f: number) => {
      scaleK = Math.max(0.7, Math.min(6, scaleK * f))
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12)
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    api.current = {
      flyTo(lat, lon) {
        const from = [...rot] as Rot
        let dl = -lon - from[0]
        dl = ((((dl + 540) % 360) + 360) % 360) - 180
        fly = { from, dl, dp: -lat * 0.85 - from[1], t0: performance.now(), dur: reduce ? 1 : 1100 }
        spin = false
        setSpinning(false)
      },
      zoom,
      setSpin(s) {
        spin = s
      },
    }

    raf = requestAnimationFrame((t) => {
      last = t
      tick(t)
    })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [])

  useEffect(() => {
    if (focus) api.current?.flyTo(focus.lat, focus.lon)
  }, [focus?.lat, focus?.lon])

  return (
    <div className="globe-box">
      <canvas ref={canvasRef} className="globe" aria-label="여행지가 표시된 회전 지구본" />
      <div ref={tipRef} className="globe-tip" hidden />
      <span className="globe-hint">드래그로 회전 · 휠로 확대</span>
      <div className="globe-ctl">
        <button type="button" aria-label="확대" onClick={() => api.current?.zoom(1.25)}>＋</button>
        <button type="button" aria-label="축소" onClick={() => api.current?.zoom(1 / 1.25)}>－</button>
        <button
          type="button"
          aria-label="자동 회전 켜기/끄기"
          aria-pressed={spinning}
          onClick={() => {
            const s = !spinning
            setSpinning(s)
            api.current?.setSpin(s)
          }}
        >
          ⟳
        </button>
      </div>
    </div>
  )
}
