'use client'
import { useEffect, useRef } from 'react'

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cols = ['#7ab840', '#c8e8a0', '#a0d060', '#5ab0ff', '#d0a040', '#f08060', '#c080ff']
    const P = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      w: 6 + Math.random() * 8,
      h: 10 + Math.random() * 12,
      col: cols[Math.floor(Math.random() * cols.length)],
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 5,
      ang: Math.random() * 360,
      sp: (Math.random() - 0.5) * 8,
      al: 1,
    }))

    let frame = 0
    let animId: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      P.forEach(p => {
        ctx.save()
        ctx.globalAlpha = p.al
        ctx.translate(p.x, p.y)
        ctx.rotate((p.ang * Math.PI) / 180)
        ctx.fillStyle = p.col
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
        p.x += p.vx
        p.y += p.vy
        p.ang += p.sp
        p.vy += 0.05
        if (frame > 150) p.al -= 0.005
      })
      frame++
      if (frame < 400) animId = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  )
}
