'use client'
import { useEffect, useRef, useState } from 'react'

export interface FlowNode {
  id: string
  label: string
  sub: string
  icon: string
  state: 'idle' | 'active' | 'done'
}

interface Props {
  nodes: FlowNode[]
  currentStep: number
}

export default function MobileFlow({ nodes, currentStep }: Props) {
  const activeRef = useRef<HTMLDivElement>(null)
  const [tick, setTick] = useState(0)
  const [glitch, setGlitch] = useState<Record<string, boolean>>({})

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentStep])

  // Glitch effect on newly active node
  useEffect(() => {
    const activeNode = nodes.find(n => n.state === 'active')
    if (!activeNode) return
    let count = 0
    const iv = setInterval(() => {
      setGlitch(g => ({ ...g, [activeNode.id]: count % 2 === 0 }))
      count++
      if (count > 14) clearInterval(iv)
    }, 60)
    return () => clearInterval(iv)
  }, [currentStep, nodes])

  // Tick for animations
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60)
    return () => clearInterval(iv)
  }, [])

  const pulse = Math.sin(tick * 0.18)

  return (
    <div className="flex flex-col items-center w-full px-3 py-1 gap-0">
      {nodes.map((node, i) => {
        const isActive = node.state === 'active'
        const isDone = node.state === 'done'
        const isIdle = node.state === 'idle'
        const isGlitching = isActive && glitch[node.id]
        const borderColor = isActive
          ? `rgba(${Math.round(122 + 60 * pulse)},${Math.round(184 + 40 * pulse)},64,1)`
          : isDone ? '#3a7a20' : 'rgba(20,40,10,0.3)'

        return (
          <div key={node.id} className="flex flex-col items-center w-full max-w-sm">

            {/* Node card */}
            <div
              ref={isActive ? activeRef : null}
              className="w-full rounded-xl relative overflow-hidden"
              style={{
                padding: '10px 12px',
                background: isActive
                  ? `rgba(${Math.round(22+8*pulse)},${Math.round(58+12*pulse)},${Math.round(10+4*pulse)},0.98)`
                  : isDone
                  ? 'rgba(10,26,6,0.92)'
                  : 'rgba(5,12,3,0.6)',
                border: `1.5px solid ${borderColor}`,
                boxShadow: isActive
                  ? `0 0 ${18+10*pulse}px rgba(122,184,64,${0.3+0.15*pulse}), 0 0 ${36+18*pulse}px rgba(122,184,64,${0.12+0.08*pulse}), inset 0 0 20px rgba(50,120,20,0.08)`
                  : isDone
                  ? '0 0 8px rgba(80,150,35,0.15)'
                  : 'none',
                opacity: isIdle ? 0.3 : 1,
                transform: isActive ? `scale(${1.015 + 0.008 * pulse})` : 'scale(1)',
                transition: isActive ? 'none' : 'all 0.4s ease',
              }}
            >
              {/* Active: electric top border sweep */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                  background: `linear-gradient(90deg, transparent, rgba(${Math.round(160+80*pulse)},255,80,0.9), transparent)`,
                  transform: `translateX(${((tick * 3) % 300) - 100}%)`,
                }} />
              )}

              {/* Scanline overlay on active */}
              {isActive && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
                  pointerEvents: 'none',
                }} />
              )}

              <div className="flex items-center gap-3 relative">
                {/* Left accent bar */}
                <div style={{
                  position: 'absolute', left: -12, top: '50%',
                  transform: 'translateY(-50%)',
                  width: '3px',
                  height: isActive ? `${60 + 30 * pulse}%` : isDone ? '80%' : '20%',
                  background: isActive
                    ? `rgba(${Math.round(150+80*pulse)},255,80,0.9)`
                    : isDone ? 'rgba(80,180,40,0.6)' : 'rgba(30,60,15,0.3)',
                  borderRadius: '2px',
                  transition: 'height 0.3s',
                  boxShadow: isActive ? '0 0 6px rgba(200,255,100,0.6)' : 'none',
                }} />

                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono relative"
                  style={{
                    background: isActive
                      ? `radial-gradient(circle at 35% 35%, rgba(60,140,25,0.95), rgba(20,58,10,0.95))`
                      : isDone
                      ? 'rgba(18,50,10,0.92)'
                      : 'rgba(8,18,4,0.85)',
                    border: `1px solid ${isActive ? `rgba(${Math.round(140+80*pulse)},240,70,0.8)` : isDone ? '#3a6020' : '#0e2008'}`,
                    color: isGlitching ? '#ffffff' : isActive ? '#d0f890' : isDone ? '#7ab840' : '#1a3810',
                    boxShadow: isActive ? `0 0 ${8+6*pulse}px rgba(122,184,64,0.5)` : 'none',
                    transform: isGlitching ? `translate(${Math.random()*3-1.5}px, ${Math.random()*2-1}px)` : 'none',
                  }}
                >
                  {node.icon}
                  {isActive && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '6px',
                      background: `radial-gradient(circle at 50% 0%, rgba(200,255,120,${0.08+0.06*pulse}), transparent 70%)`,
                    }} />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-bold font-mono truncate"
                    style={{
                      color: isGlitching
                        ? `rgba(${Math.round(200+55*Math.random())},255,100,0.95)`
                        : isActive ? '#d8f8a0' : isDone ? '#80b050' : '#1e3a0e',
                      transform: isGlitching ? `translateX(${(Math.random()-0.5)*3}px)` : 'none',
                      textShadow: isActive ? `0 0 ${6+4*pulse}px rgba(180,255,80,0.5)` : 'none',
                    }}
                  >
                    {node.label}
                  </div>
                  <div
                    className="font-mono truncate mt-0.5"
                    style={{
                      color: isActive ? '#4a7a28' : isDone ? '#2a4a14' : '#101808',
                      fontSize: '10px',
                    }}
                  >
                    {node.sub}
                  </div>

                  {/* Active: glitchy status text */}
                  {isActive && (
                    <div style={{
                      fontSize: '9px', fontFamily: 'monospace',
                      color: `rgba(${Math.round(100+80*pulse)},${Math.round(200+55*pulse)},60,0.8)`,
                      marginTop: '2px',
                    }}>
                      {['PROCESSING...', 'EXEC_RUN...', 'LOADING...', 'COMPUTING...'][tick % 4]}
                    </div>
                  )}
                </div>

                {/* Status icon */}
                <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                  {isDone && (
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: 'rgba(18,50,10,0.9)',
                      border: '1.5px solid #3a7020',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5ab830" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  {isActive && (
                    <svg
                      width="20" height="20" viewBox="0 0 24 24" fill="none"
                      style={{ transform: `rotate(${tick * 6}deg)` }}
                    >
                      <circle cx="12" cy="12" r="9" stroke="rgba(122,184,64,0.15)" strokeWidth="2.5" />
                      <path d="M12 3a9 9 0 0 1 9 9" stroke={`rgba(${Math.round(160+80*pulse)},240,70,1)`} strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  )}
                  {isIdle && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#0e1e08' }} />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {isActive && (
                <div className="mt-2 relative" style={{ height: '3px', background: 'rgba(10,22,5,0.8)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%',
                    borderRadius: '2px',
                    background: `linear-gradient(90deg, transparent, rgba(${Math.round(130+80*pulse)},240,70,0.9), transparent)`,
                    transform: `translateX(${((tick * 2.5) % 300) - 50}%)`,
                  }} />
                </div>
              )}
            </div>

            {/* Connector */}
            {i < nodes.length - 1 && (
              <div className="flex flex-col items-center" style={{ margin: '1px 0' }}>
                <div style={{
                  width: '1.5px', height: '14px',
                  background: isDone
                    ? `linear-gradient(180deg, rgba(${Math.round(80+40*pulse)},180,40,0.8), rgba(45,100,22,0.5))`
                    : 'rgba(20,40,10,0.25)',
                  boxShadow: isDone ? '0 0 4px rgba(80,160,35,0.4)' : 'none',
                  transition: 'all 0.5s',
                }} />
                {/* Arrow */}
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: isDone
                    ? `5px solid rgba(${Math.round(60+30*pulse)},140,30,0.7)`
                    : '5px solid rgba(18,36,9,0.2)',
                  filter: isDone ? 'drop-shadow(0 0 2px rgba(80,160,35,0.5))' : 'none',
                  transition: 'all 0.5s',
                }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
