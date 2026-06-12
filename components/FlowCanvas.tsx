'use client'
import { useEffect, useRef } from 'react'

export interface FlowNode {
  id: string; x: number; y: number
  label: string; sub: string; icon: string
  state: 'idle' | 'active' | 'done'
}
export interface FlowEdge {
  from: string; to: string; active: boolean; done: boolean
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; col: string }
interface Arc { x1: number; y1: number; x2: number; y2: number; life: number; segs: {x:number;y:number}[] }

const NW = 138, NH = 50, DEPTH = 8

export default function FlowCanvas({ nodes, edges }: { nodes: FlowNode[]; edges: FlowEdge[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const particlesRef = useRef<Particle[]>([])
  const arcsRef = useRef<Arc[]>([])
  const prevActiveRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => { canvas.width = canvas.offsetWidth * dpr; canvas.height = canvas.offsetHeight * dpr }
    resize()
    window.addEventListener('resize', resize)

    const nodeMap: Record<string, FlowNode> = {}
    nodes.forEach(n => { nodeMap[n.id] = n })

    // Spawn burst particles when node becomes active
    const newActive = new Set(nodes.filter(n => n.state === 'active').map(n => n.id))
    newActive.forEach(id => {
      if (!prevActiveRef.current.has(id)) {
        const n = nodeMap[id]
        if (!n) return
        const W = canvas.offsetWidth, H = canvas.offsetHeight
        for (let i = 0; i < 28; i++) {
          const ang = (Math.PI * 2 * i) / 28
          const spd = 1.5 + Math.random() * 3
          particlesRef.current.push({
            x: n.x * W, y: n.y * H,
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            life: 1, maxLife: 1,
            size: 2 + Math.random() * 3,
            col: ['#7ab840','#c8f080','#a0e060','#50c030'][Math.floor(Math.random()*4)]
          })
        }
      }
    })
    prevActiveRef.current = newActive

    let t = 0

    const draw = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, H)

      // ── GRID ──
      ctx.strokeStyle = 'rgba(20,50,10,0.18)'
      ctx.lineWidth = 0.5
      for (let gx = 0; gx < W; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke() }
      for (let gy = 0; gy < H; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke() }

      // ── EDGES ──
      edges.forEach(e => {
        const fn = nodeMap[e.from], tn = nodeMap[e.to]
        if (!fn || !tn) return
        const fx = fn.x * W, fy = fn.y * H, tx = tn.x * W, ty = tn.y * H
        const cpx = (fx + tx) / 2
        const cpy1 = fy + (ty - fy) * 0.55
        const cpy2 = ty - (ty - fy) * 0.25

        if (e.done) {
          // Glowing solid done line
          ctx.beginPath()
          ctx.moveTo(fx, fy); ctx.bezierCurveTo(cpx, cpy1, cpx, cpy2, tx, ty)
          ctx.strokeStyle = 'rgba(80,180,40,0.6)'; ctx.lineWidth = 2
          ctx.setLineDash([])
          ctx.shadowColor = '#5ab830'; ctx.shadowBlur = 10
          ctx.stroke(); ctx.shadowBlur = 0

          // Arrow
          const ang = Math.atan2(ty - cpy2, tx - cpx)
          ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang)
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-9,-4); ctx.lineTo(-9,4); ctx.closePath()
          ctx.fillStyle = '#5ab830'; ctx.fill(); ctx.restore()

        } else if (e.active) {
          // Electric arc effect — draw jagged line
          const segs = 12
          const pts: {x:number;y:number}[] = []
          for (let i = 0; i <= segs; i++) {
            const t2 = i / segs
            const mt = 1 - t2
            const bx = mt*mt*mt*fx + 3*mt*mt*t2*cpx + 3*mt*t2*t2*cpx + t2*t2*t2*tx
            const by = mt*mt*mt*fy + 3*mt*mt*t2*cpy1 + 3*mt*t2*t2*cpy2 + t2*t2*t2*ty
            const jitter = i > 0 && i < segs ? (Math.sin(t * 0.3 + i * 2.1) * 6 + Math.cos(t * 0.5 + i) * 4) : 0
            const nx2 = -(by - (i>0?pts[i-1].y:fy)), ny2 = (bx - (i>0?pts[i-1].x:fx))
            const len = Math.sqrt(nx2*nx2+ny2*ny2)||1
            pts.push({ x: bx + (nx2/len)*jitter, y: by + (ny2/len)*jitter })
          }

          // Outer glow
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
          pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
          ctx.strokeStyle = `rgba(122,184,64,${0.15 + 0.15*Math.sin(t*0.08)})`
          ctx.lineWidth = 8; ctx.setLineDash([]); ctx.shadowColor = '#7ab840'; ctx.shadowBlur = 20
          ctx.stroke(); ctx.shadowBlur = 0

          // Core bright line
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
          pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
          ctx.strokeStyle = `rgba(200,255,120,${0.8 + 0.2*Math.sin(t*0.12)})`
          ctx.lineWidth = 1.5; ctx.stroke()

          // Traveling energy ball
          const pct = (t * 0.012) % 1
          const idx = Math.floor(pct * (pts.length - 1))
          const ep = pts[Math.min(idx, pts.length - 1)]
          ctx.beginPath(); ctx.arc(ep.x, ep.y, 5, 0, Math.PI*2)
          ctx.fillStyle = '#ffffff'
          ctx.shadowColor = '#c8f080'; ctx.shadowBlur = 16
          ctx.fill(); ctx.shadowBlur = 0

          // Arrow
          const ang = Math.atan2(ty - cpy2, tx - cpx)
          ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang)
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-10,-5); ctx.lineTo(-10,5); ctx.closePath()
          ctx.fillStyle = '#a0e060'; ctx.shadowColor='#7ab840'; ctx.shadowBlur=8; ctx.fill()
          ctx.restore(); ctx.shadowBlur = 0

        } else {
          ctx.beginPath()
          ctx.moveTo(fx, fy); ctx.bezierCurveTo(cpx, cpy1, cpx, cpy2, tx, ty)
          ctx.strokeStyle = 'rgba(25,55,12,0.4)'; ctx.lineWidth = 1
          ctx.setLineDash([3, 7]); ctx.lineDashOffset = t * 0.2
          ctx.stroke(); ctx.setLineDash([])
        }
      })

      // ── PARTICLES ──
      particlesRef.current = particlesRef.current.filter(p => p.life > 0.02)
      particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.94; p.vy *= 0.94
        p.life -= 0.025
        const pr = Math.max(0.1, p.size * p.life)
        ctx.beginPath(); ctx.arc(p.x, p.y, pr, 0, Math.PI * 2)
        ctx.fillStyle = p.col; ctx.globalAlpha = p.life * 0.9
        ctx.shadowColor = p.col; ctx.shadowBlur = 8
        ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1
      })

      // ── NODES ──
      nodes.forEach(n => {
        const cx = n.x * W, cy = n.y * H
        const x = cx - NW/2, y = cy - NH/2
        const r = 10
        const isActive = n.state === 'active'
        const isDone = n.state === 'done'
        const isIdle = n.state === 'idle'
        const pulse = Math.sin(t * 0.09)

        // ── OUTER RING (active only) ──
        if (isActive) {
          const ringR = Math.max(NW, NH) * 0.68 + 4 * pulse
          ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI*2)
          ctx.strokeStyle = `rgba(122,184,64,${0.12 + 0.08*pulse})`
          ctx.lineWidth = 1; ctx.setLineDash([6,10]); ctx.lineDashOffset = -t*0.4
          ctx.stroke(); ctx.setLineDash([])

          ctx.beginPath(); ctx.arc(cx, cy, ringR * 0.78, 0, Math.PI*2)
          ctx.strokeStyle = `rgba(122,184,64,${0.07 + 0.05*pulse})`
          ctx.lineWidth = 0.5; ctx.stroke()
        }

        // ── DEPTH LAYERS (3D) ──
        for (let d = DEPTH; d >= 1; d--) {
          rr(ctx, x+d, y+d, NW, NH, r)
          const alpha = isIdle ? 0.06 : isDone ? 0.12 : 0.2 - d*0.018
          ctx.fillStyle = isActive ? `rgba(30,80,15,${alpha})` : `rgba(8,20,5,${alpha})`
          ctx.fill()
        }

        // ── RIGHT FACE ──
        ctx.beginPath()
        ctx.moveTo(x+NW, y+r); ctx.lineTo(x+NW+DEPTH, y+r-DEPTH+1)
        ctx.lineTo(x+NW+DEPTH, y+NH-r+DEPTH-1); ctx.lineTo(x+NW, y+NH-r)
        ctx.closePath()
        ctx.fillStyle = isActive ? 'rgba(50,120,20,0.55)' : isDone ? 'rgba(35,90,15,0.45)' : 'rgba(10,25,5,0.35)'
        ctx.fill()
        if (!isIdle) { ctx.strokeStyle='rgba(80,160,35,0.3)'; ctx.lineWidth=0.5; ctx.stroke() }

        // ── BOTTOM FACE ──
        ctx.beginPath()
        ctx.moveTo(x+r, y+NH); ctx.lineTo(x+r+DEPTH-1, y+NH+DEPTH-1)
        ctx.lineTo(x+NW-r+DEPTH-1, y+NH+DEPTH-1); ctx.lineTo(x+NW-r, y+NH)
        ctx.closePath()
        ctx.fillStyle = isActive ? 'rgba(40,100,15,0.45)' : isDone ? 'rgba(28,70,12,0.38)' : 'rgba(8,18,4,0.28)'
        ctx.fill()

        // ── MAIN FACE ──
        if (isActive) { ctx.shadowColor='#7ab840'; ctx.shadowBlur = 22 + 12*pulse }
        rr(ctx, x, y, NW, NH, r)
        if (isActive) {
          const g = ctx.createLinearGradient(x, y, x+NW, y+NH)
          g.addColorStop(0, 'rgba(42,100,20,0.98)'); g.addColorStop(0.5, 'rgba(28,72,14,0.98)'); g.addColorStop(1, 'rgba(18,50,10,0.98)')
          ctx.fillStyle = g; ctx.strokeStyle = `rgba(${150+80*pulse},${220+35*pulse},80,1)`; ctx.lineWidth = 2
        } else if (isDone) {
          const g = ctx.createLinearGradient(x, y, x, y+NH)
          g.addColorStop(0, 'rgba(22,60,12,0.95)'); g.addColorStop(1, 'rgba(12,35,7,0.95)')
          ctx.fillStyle = g; ctx.strokeStyle = '#3a7a20'; ctx.lineWidth = 1.2
        } else {
          ctx.fillStyle = 'rgba(6,14,4,0.85)'; ctx.strokeStyle = 'rgba(22,50,12,0.5)'; ctx.lineWidth = 0.8
        }
        ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0

        // ── SHEEN ──
        rr(ctx, x+2, y+2, NW-4, 12, 5)
        const sh = ctx.createLinearGradient(x, y, x, y+12)
        sh.addColorStop(0, isActive ? 'rgba(200,255,120,0.14)' : isDone ? 'rgba(130,210,60,0.09)' : 'rgba(60,120,30,0.04)')
        sh.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = sh; ctx.fill()

        // ── LEFT ACCENT BAR (active: animated) ──
        const barH = isActive ? NH * (0.4 + 0.3 * Math.abs(pulse)) : isDone ? NH * 0.9 : NH * 0.25
        const barY = cy - barH/2
        rr(ctx, x, barY, 3, barH, 1)
        ctx.fillStyle = isActive ? `rgba(${160+80*pulse},255,80,0.9)` : isDone ? 'rgba(80,180,40,0.7)' : 'rgba(30,70,15,0.3)'
        if (isActive) { ctx.shadowColor='#c8f080'; ctx.shadowBlur=10 }
        ctx.fill(); ctx.shadowBlur=0

        // ── ICON ──
        const iconX = x + 24, iconY = cy
        ctx.beginPath(); ctx.arc(iconX, iconY, 14, 0, Math.PI*2)
        const ig = ctx.createRadialGradient(iconX-3, iconY-3, 1, iconX, iconY, 14)
        ig.addColorStop(0, isActive ? 'rgba(70,150,28,0.95)' : isDone ? 'rgba(48,110,20,0.9)' : 'rgba(14,32,7,0.9)')
        ig.addColorStop(1, isActive ? 'rgba(25,65,12,0.9)' : 'rgba(7,18,4,0.9)')
        ctx.fillStyle = ig; ctx.fill()
        ctx.strokeStyle = isActive ? `rgba(${150+80*pulse},240,70,0.9)` : isDone ? 'rgba(70,160,35,0.7)' : 'rgba(28,60,14,0.4)'
        ctx.lineWidth = 1.2; ctx.stroke()

        // Glitch icon on active
        if (isActive && Math.random() < 0.04) {
          ctx.fillStyle = 'rgba(200,255,100,0.9)'
          ctx.font = 'bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'
          ctx.fillText(n.icon, iconX + (Math.random()-0.5)*3, iconY + (Math.random()-0.5)*2)
        } else {
          ctx.fillStyle = isActive ? '#d0f890' : isDone ? '#7ab840' : '#1e4010'
          ctx.font = 'bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'
          ctx.fillText(n.icon, iconX, iconY)
        }

        // ── LABEL (with glitch on active) ──
        const textX = x + 47, maxW = NW - 58
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
        if (isActive && Math.random() < 0.03) {
          ctx.fillStyle = `rgba(${180+Math.random()*75},255,100,0.9)`
          ctx.font = 'bold 10px monospace'
          ctx.fillText(trunc(ctx, n.label, maxW), textX + (Math.random()-0.5)*2, cy - 9)
        } else {
          ctx.fillStyle = isIdle ? '#1e4010' : isActive ? '#d8f8a0' : '#80b860'
          ctx.font = `${isActive?'bold ':''}10px "Courier New",monospace`
          ctx.fillText(trunc(ctx, n.label, maxW), textX, cy - 9)
        }

        ctx.fillStyle = isIdle ? '#0e2408' : isActive ? '#5a8a30' : '#2a5018'
        ctx.font = '9px "Courier New",monospace'
        ctx.fillText(trunc(ctx, n.sub, maxW), textX, cy + 8)

        // ── STATUS ──
        if (isDone) {
          ctx.fillStyle = '#5ab830'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'right'
          ctx.fillText('✓', x + NW - 8, cy)
        } else if (isActive) {
          const sa = (t * 0.11) % (Math.PI*2)
          ctx.beginPath(); ctx.arc(x+NW-12, cy, 7, sa, sa+Math.PI*1.5)
          ctx.strokeStyle = `rgba(${160+80*pulse},240,70,1)`; ctx.lineWidth=2
          ctx.shadowColor='#c8f080'; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0
          // Inner pulse dot
          ctx.beginPath(); ctx.arc(x+NW-12, cy, 2, 0, Math.PI*2)
          ctx.fillStyle=`rgba(200,255,120,${0.5+0.5*pulse})`; ctx.fill()
        }

        // ── CONNECTOR DOTS ──
        ;[[cx, y],[cx, y+NH]].forEach(([dx, dy]) => {
          ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI*2)
          const cg = ctx.createRadialGradient(dx, dy, 0, dx, dy, 4)
          cg.addColorStop(0, isIdle ? '#152a08' : '#90d040')
          cg.addColorStop(1, isIdle ? '#081408' : '#3a7020')
          ctx.fillStyle = cg
          if (!isIdle) { ctx.shadowColor='#7ab840'; ctx.shadowBlur=8 }
          ctx.fill(); ctx.shadowBlur=0
          ctx.strokeStyle = isIdle ? '#101e08' : '#5ab830'; ctx.lineWidth=1; ctx.stroke()
        })
      })

      ctx.restore()
      t++
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [nodes, edges])

  return <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />
}

function rr(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

function trunc(ctx: CanvasRenderingContext2D, text:string, maxW:number) {
  if (ctx.measureText(text).width <= maxW) return text
  let s = text
  while (s.length > 0 && ctx.measureText(s+'…').width > maxW) s = s.slice(0,-1)
  return s + '…'
}
