'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'

const ThreeBackground = dynamic(() => import('@/components/ThreeBackground'), { ssr: false })
const FlowCanvas = dynamic(() => import('@/components/FlowCanvas'), { ssr: false })
const MobileFlow = dynamic(() => import('@/components/MobileFlow'), { ssr: false })
const Confetti = dynamic(() => import('@/components/Confetti'), { ssr: false })

type NodeState = 'idle' | 'active' | 'done'

interface FlowNode {
  id: string; x: number; y: number
  label: string; sub: string; icon: string; state: NodeState
}
interface FlowEdge {
  from: string; to: string; active: boolean; done: boolean
}

const FLOW_NODES: Omit<FlowNode, 'state'>[] = [
  { id: 'input',     x: 0.5,  y: 0.08, label: 'PROC_0x1A', sub: 'boot_seq/v2.init',  icon: '▶'  },
  { id: 'auth',      x: 0.25, y: 0.22, label: 'CIPHER_7F', sub: 'hash_256/verify',   icon: '0x' },
  { id: 'parser',    x: 0.75, y: 0.22, label: 'STREAM_3E', sub: 'tok_parse/nlp',     icon: '>_' },
  { id: 'memory',    x: 0.2,  y: 0.38, label: 'VAULT_9B',  sub: 'vec_store/512d',    icon: '▣'  },
  { id: 'llm',       x: 0.5,  y: 0.38, label: 'CORE_Ω',    sub: 'inf_engine/run',    icon: 'Ω'  },
  { id: 'tools',     x: 0.8,  y: 0.38, label: 'EXEC_4D',   sub: 'fn_call/bind',      icon: '⚙'  },
  { id: 'analyzer',  x: 0.3,  y: 0.55, label: 'SCAN_2E',   sub: 'sig_proc/eval',     icon: '◉'  },
  { id: 'composer',  x: 0.7,  y: 0.55, label: 'BUILD_6C',  sub: 'tmpl_gen/out',      icon: '◈'  },
  { id: 'formatter', x: 0.5,  y: 0.70, label: 'RENDER_8A', sub: 'pipe_rdr/fmt',      icon: '▤'  },
  { id: 'deliver',   x: 0.5,  y: 0.86, label: 'RELAY_FF',  sub: 'tx_send/final',     icon: '★'  },
]

const FLOW_EDGES = [
  { from: 'input', to: 'auth' }, { from: 'input', to: 'parser' },
  { from: 'auth', to: 'memory' }, { from: 'auth', to: 'llm' },
  { from: 'parser', to: 'llm' }, { from: 'parser', to: 'tools' },
  { from: 'memory', to: 'analyzer' }, { from: 'llm', to: 'analyzer' },
  { from: 'llm', to: 'composer' }, { from: 'tools', to: 'composer' },
  { from: 'analyzer', to: 'formatter' }, { from: 'composer', to: 'formatter' },
  { from: 'formatter', to: 'deliver' },
]

const SEQUENCE = [
  { node: 'input',     logs: ['[0x1A] Initializing boot sequence...', '[0x1A] Allocating secure memory space...', '[0x1A] Environment: PROD · runtime v2.0 ✓'] },
  { node: 'auth',      logs: ['[7F] Running cipher validation...', '[7F] SHA-256 integrity check passed...', '[7F] Session token verified ✓'] },
  { node: 'parser',    logs: ['[3E] Opening token stream...', '[3E] Context window: 8192 tokens loaded', '[3E] NLP pipeline armed ✓'] },
  { node: 'memory',    logs: ['[9B] Mounting vector store...', '[9B] Embedding dims: 512 · cosine_sim', '[9B] Knowledge base indexed ✓'] },
  { node: 'llm',       logs: ['[Ω] Connecting to inference core...', '[Ω] Parameters: temp=0.9 top_p=0.95', '[Ω] Model online · awaiting payload ✓'] },
  { node: 'tools',     logs: ['[4D] Binding 14 function hooks...', '[4D] Execution sandbox: isolated', '[4D] Tool registry complete ✓'] },
  { node: 'analyzer',  logs: ['[2E] Signal processing initiated...', '[2E] Evaluating 38 data vectors...', '[2E] Analysis score: 0.98 ✓'] },
  { node: 'composer',  logs: ['[6C] Loading generation template...', '[6C] Injecting contextual payload...', '[6C] Output package assembled ✓'] },
  { node: 'formatter', logs: ['[8A] Rendering pipeline open...', '[8A] Applying transforms: 12/12', '[8A] Quality gate: PASSED ✓'] },
  { node: 'deliver',   logs: ['[FF] Packaging final payload...', '[FF] Transmission sequence started...', '[FF] ██████████ 100% · DELIVERED ✓'] },
]

const WISH_POOL = [
  'Your vision turned ideas into reality — we are proof of that',
  'You taught us that great leaders build people, not just products',
  'Every line of code we write carries your belief in us',
  'You saw the future before anyone else — and built it anyway',
  'The way you lead with heart is something we truly admire',
  'You pushed us to dream bigger than we thought possible',
  'Your trust in AI was ahead of its time — and it paid off',
  'Working under your leadership is a masterclass in excellence',
  'You made this team feel like a family — thank you for that',
  'Your calm under pressure is the strength we all lean on',
  'The culture you built here is something money cannot buy',
  'You never stopped believing — even when the road was hard',
  'Every milestone we hit has your fingerprints on it',
  'You inspire us to be better professionals and better people',
  'Your dedication to innovation keeps us always moving forward',
  'We are here today because you took a chance on all of us',
  'Your passion for technology is contagious — in the best way',
  'The best thing about this company is the vision behind it — yours',
  'You lead not by rank but by example — every single day',
  'May this birthday mark the beginning of your best chapter yet',
  'May your year be as extraordinary as the team you have built',
  'May every dream you have this year turn into your next success',
  'Wishing you a year full of joy, health, and well-deserved wins',
  'May this year bring you peace, pride, and endless blessings',
  'May happiness find you as easily as you inspire it in others',
  'Many more years of success, impact, and brilliant leadership',
  'May your birthday remind you how much you mean to all of us',
]

function pickLines(name: string): string[] {
  // Seed shuffle with username so same person gets same lines
  let seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return Math.abs(seed) / 0x7fffffff }
  const shuffled = [...WISH_POOL].sort(() => rng() - 0.5)
  return shuffled.slice(0, 3)
}

function BirthdayReveal({ userName }: { userName: string }) {
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'done' | 'error'>('idle')
  const wishLines = pickLines(userName)

  const handleShare = async () => {
    setShareState('sharing')
    const url = window.location.href
    const text = `🎂 Happy Birthday Khurshid Alam!\nWishing our company owner a very Happy Birthday! — from ${userName}\n\n${url}`

    // 1. Try native Web Share API (works on all modern mobile browsers)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: '🎂 Happy Birthday Khurshid Alam!', text })
        setShareState('done')
        setTimeout(() => setShareState('idle'), 3000)
        return
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') { setShareState('idle'); return }
        // fall through to clipboard
      }
    }

    // 2. Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(text)
      setShareState('done')
      setTimeout(() => setShareState('idle'), 3000)
    } catch {
      setShareState('error')
      setTimeout(() => setShareState('idle'), 3000)
    }
  }

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center justify-start sm:justify-center px-3 py-4 gap-4">

      {/* ── THE CARD (this gets screenshotted) ── */}
      <div

        className="w-full max-w-lg boom-in rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #071208 0%, #0a1a08 40%, #071510 100%)', border: '1px solid rgba(122,184,64,0.25)' }}
      >
        {/* Top status bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(26,58,16,0.6)]" style={{ background: 'rgba(5,10,5,0.8)' }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#7ab840]" />
            <span className="text-[#3a6a20] text-xs font-mono">Pixelstreet Agent</span>
          </div>
          <span className="text-[#2a5018] text-xs font-mono">[ relay:output ] ✓</span>
        </div>

        {/* Main content */}
        <div className="px-5 py-6 text-center">
          {/* Decorative top line */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#3a6a20]" />
            <span className="text-[#3a6020] text-xs font-mono">★</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#3a6a20]" />
          </div>

          {/* Main title */}
          <div
            className="text-5xl sm:text-7xl font-bold mb-1"
            style={{
              fontFamily: 'Georgia, serif',
              background: 'linear-gradient(135deg, #7ab840, #c8f080, #a0d860, #7ab840)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s linear infinite',
            }}
          >
            Happy Birthday
          </div>

          {/* Name */}
          <div className="text-2xl sm:text-4xl font-bold text-[#c8f0a0] mt-1 mb-1" style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 30px rgba(122,184,64,0.4)' }}>
            Khurshid Alam
          </div>
          <div className="text-[#3a6820] text-xs font-mono tracking-widest mb-5">
            ── COMPANY OWNER & VISIONARY LEADER ──
          </div>

          {/* Message lines */}
          <div className="rounded-xl p-4 mb-4 text-left space-y-2" style={{ background: 'rgba(5,15,3,0.7)', border: '1px solid rgba(40,80,20,0.4)' }}>
            {[
              { text: 'Deployed by:', val: userName, highlight: true },
              ...wishLines.map(w => ({ text: w, val: '', highlight: false })),
              { text: 'Many more years of success & happiness 🎂', val: '', highlight: true },
            ].map((l, i) => (
              <div key={i} className="flex gap-2 text-xs sm:text-sm font-mono leading-6">
                <span className="text-[#2a5018] flex-shrink-0">&gt;</span>
                <span className={l.highlight ? 'text-[#a8d870] font-bold' : 'text-[#6a9a50]'}>
                  {l.text}{l.val && <span className="text-[#7ab840] font-bold"> {l.val}</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
            {['VISIONARY', 'LEADER', 'HAPPY BIRTHDAY', 'OUR BOSS', userName.toUpperCase()].map(t => (
              <span key={t} style={{ background: 'rgba(10,25,5,0.8)', border: '1px solid rgba(50,100,25,0.6)' }}
                className="px-3 py-1 rounded-full text-xs font-mono text-[#4ab820]">
                {t}
              </span>
            ))}
          </div>

          {/* Decorative bottom */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#2a5018]" />
            <span className="text-[#2a4a18] text-xs font-mono">birthday-agent-v2.0</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#2a5018]" />
          </div>
        </div>
      </div>

      {/* ── SHARE BUTTON ── */}
      <div className="w-full max-w-lg">
        <button
          onClick={handleShare}
          disabled={shareState === 'sharing'}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-mono font-bold text-sm tracking-wide transition-all duration-300 relative overflow-hidden group"
          style={{
            background: shareState === 'error' ? 'rgba(60,15,10,0.9)' : shareState === 'done' ? 'rgba(20,70,10,0.9)' : 'rgba(30,80,15,0.9)',
            border: `2px solid ${shareState === 'error' ? '#a03020' : shareState === 'done' ? '#5ab830' : '#7ab840'}`,
            color: '#c8f080',
            boxShadow: shareState === 'sharing' ? 'none' : '0 0 24px rgba(122,184,64,0.3)',
          }}
        >
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" style={{background:'rgba(122,184,64,0.1)'}} />
          {shareState === 'sharing' && <svg className="w-5 h-5 spinner flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>}
          {shareState === 'done' && <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#5ab830" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
          {shareState === 'error' && <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#f07060" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          {shareState === 'idle' && <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>}
          <span className="relative z-10">
            {shareState === 'sharing' ? 'Opening share...' :
             shareState === 'error' ? 'Failed — tap to retry' :
             shareState === 'done' ? 'Link copied & shared! 🎉' :
             'Share in the group'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'running' | 'done'>('idle')
  const [userName, setUserName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [nodes, setNodes] = useState<FlowNode[]>(FLOW_NODES.map(n => ({ ...n, state: 'idle' })))
  const [edges, setEdges] = useState<FlowEdge[]>(FLOW_EDGES.map(e => ({ ...e, active: false, done: false })))
  const [logs, setLogs] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [confetti, setConfetti] = useState(false)
  const [showBoom, setShowBoom] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-60), msg])
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const activateStep = useCallback((stepIdx: number) => {
    if (stepIdx >= SEQUENCE.length) {
      setTimeout(() => { setShowBoom(true); setConfetti(true); setPhase('done') }, 800)
      return
    }
    const step = SEQUENCE[stepIdx]
    const nodeId = step.node

    setNodes(prev => prev.map(n => ({ ...n, state: n.id === nodeId ? 'active' : n.state })))
    setEdges(prev => prev.map(e => ({ ...e, active: e.to === nodeId && !e.done })))

    step.logs.forEach((msg, i) => setTimeout(() => addLog(msg), i * 380))

    const duration = 1400 + step.logs.length * 380
    setTimeout(() => {
      setNodes(prev => prev.map(n => ({ ...n, state: n.id === nodeId ? 'done' : n.state })))
      setEdges(prev => prev.map(e => ({ ...e, active: false, done: e.done || e.to === nodeId })))
      setCurrentStep(stepIdx + 1)
      setTimeout(() => activateStep(stepIdx + 1), 350)
    }, duration)
  }, [addLog])

  const handleDeploy = () => { if (nameInput.trim()) { setUserName(nameInput.trim()); setPhase('confirm') } }

  const handleConfirm = async () => {
    try {
      await fetch('/api/wishes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: userName }) })
    } catch {}
    setPhase('running')
    addLog('[system] Deploy initiated by: ' + userName)
    addLog('[system] Flow: agent-v2.0 · nodes: 10 · edges: 13')
    setTimeout(() => activateStep(0), 600)
  }

  const progress = Math.min(Math.round((currentStep / SEQUENCE.length) * 100), 100)

  return (
    <div className="fixed inset-0 bg-[#050a05] overflow-hidden flex flex-col">
      <div className="scanline" />
      <Confetti active={confetti} />

      {/* 3D Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <ThreeBackground />
      </div>
      <div className="absolute inset-0 z-0 pointer-events-none" style={{background:'linear-gradient(to bottom, rgba(5,10,5,0.6), transparent, rgba(5,10,5,0.8))'}} />

      {/* ── HEADER ── */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-[rgba(26,58,16,0.6)] glass" style={{ height: '40px' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7ab840] animate-pulse" />
          <span className="text-[#5a8a30] text-xs font-mono">Pixelstreet Agent</span>
          <span className="hidden sm:inline text-[#2a5020] text-xs">v2.0.0</span>
        </div>
        {phase === 'running' && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-1 items-center">
              {SEQUENCE.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                  i < currentStep ? 'bg-[#5ab830] w-3' : i === currentStep ? 'bg-[#7ab840] w-4 animate-pulse' : 'bg-[#1a3a10] w-2'
                }`} />
              ))}
            </div>
            <span className="text-[#7ab840] text-xs font-mono">{progress}%</span>
          </div>
        )}
        <a href="/admin" className="text-xs font-mono text-[#2a5020] px-2 py-1 rounded border border-[#1a3010] hover:border-[#3a6020] transition-colors">Admin</a>
      </header>

      {/* ── MAIN CONTENT (fills remaining height) ── */}
      <main className="relative z-10 flex-1 overflow-hidden flex items-center justify-center">

        {/* ══ IDLE ══ */}
        {phase === 'idle' && (
          <div className="w-full max-w-sm mx-auto px-4 flex flex-col items-center gap-5">
            <div className="text-center">
              <div className="text-[#2a5020] text-xs font-mono mb-2 tracking-widest">// CLASSIFIED · ACCESS LEVEL: AUTHORIZED</div>
              <h1 className="text-4xl sm:text-5xl font-bold shimmer-text" style={{ fontFamily: 'monospace' }}>AI FLOW ENGINE</h1>
              <p className="text-[#3a6020] text-xs font-mono mt-2">A special sequence has been prepared</p>
            </div>

            <div className="glass rounded-xl p-5 w-full">
              <div className="text-[#5a8a30] text-xs font-mono mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7ab840] animate-pulse" />
                SECURE SESSION INITIALIZED
              </div>
              <div className="text-[#4a7030] text-xs font-mono mb-2">$ identify yourself to proceed</div>
              <input
                className="w-full bg-[#0a1a08] border border-[#2a5020] rounded-lg px-3 py-3 text-[#c8e8a0] font-mono text-sm outline-none focus:border-[#5a9a30] transition-colors mb-3 placeholder:text-[#1a3010]"
                placeholder="enter_identity..."
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && nameInput.trim() && handleDeploy()}
                autoFocus
              />
              <button
                onClick={handleDeploy}
                disabled={!nameInput.trim()}
                className="w-full py-3 rounded-lg font-mono text-sm font-bold tracking-widest bg-[#1a3a10] border border-[#3a6a20] text-[#7ab840] hover:bg-[#2a5a18] hover:border-[#7ab840] hover:shadow-[0_0_20px_rgba(122,184,64,0.3)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                INITIALIZE →
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#1e3a0e] font-mono flex-wrap justify-center">
              {['PROC', 'CIPHER', 'CORE', 'BUILD', 'RELAY'].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded border border-[#1a3010] text-[#2a5020]">{s}</span>
                  {i < arr.length - 1 && <span className="text-[#0f2008]">→</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ══ CONFIRM ══ */}
        {phase === 'confirm' && (
          <div className="w-full max-w-sm mx-auto px-4">
            <div className="glass rounded-xl p-5 w-full text-center boom-in">
              <div className="flex justify-center mb-4">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{border:'2px solid rgba(122,184,64,0.4)'}}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{border:'1px solid rgba(122,184,64,0.6)'}}>
                      <div className="w-2 h-2 rounded-full bg-[#7ab840] animate-pulse" />
                    </div>
                  </div>
                  <div className="ripple-ring" />
                </div>
              </div>

              <div className="text-[#5a8a30] text-xs font-mono mb-2 tracking-widest">// IDENTITY VERIFIED</div>
              <div className="text-xl text-[#c8e8a0] mb-1 font-mono">
                Access granted, <span className="text-[#7ab840]">{userName}</span>
              </div>
              <div className="text-[#3a6020] text-xs font-mono mb-4">
                Something has been prepared.<br />
                <span className="text-[#5a8a40]">Execute the flow to find out what it is.</span>
              </div>

              <div className="bg-[#0a1a08] rounded-lg p-3 mb-4 text-left space-y-1.5 border border-[#1a3a10]">
                {[
                  ['autonomous_nodes', '10 active'],
                  ['edge_connections', '13 wired'],
                  ['output_type', '██████ [ENCRYPTED]'],
                  ['status', 'READY TO EXECUTE'],
                ].map(([k, v]) => (
                  <div key={k} className="text-xs font-mono text-[#3a6020] flex gap-2">
                    <span>&gt;</span>
                    <span>{k}:</span>
                    <span className={k === 'output_type' ? 'text-[#7ab840] animate-pulse' : k === 'status' ? 'text-[#7ab840]' : 'text-[#5a8a30]'}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="text-[#2a4a18] text-xs font-mono mb-4">
                — Result reveals itself only after completion —
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-lg font-mono text-sm font-bold tracking-widest bg-[#2a5a18] border-2 border-[#7ab840] text-[#c8e8a0] hover:bg-[#3a7a20] hover:shadow-[0_0_30px_rgba(122,184,64,0.5)] transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" style={{background:'rgba(122,184,64,0.05)'}} />
                <span className="relative z-10">⚡ EXECUTE FLOW</span>
              </button>
            </div>
          </div>
        )}

        {/* ══ RUNNING ══ */}
        {phase === 'running' && !showBoom && (
          <>
            {/* ─── MOBILE layout (hidden on lg+) ─── */}
            <div className="lg:hidden w-full h-full flex flex-col gap-0 overflow-hidden">

              {/* Top: progress bar + current log line */}
              <div className="flex-shrink-0 px-3 pt-2 pb-1">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-[#3a6020]">EXECUTING FLOW</span>
                  <span className="text-[#7ab840]">{progress}%</span>
                </div>
                <div className="h-1 bg-[#0a1a08] rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#7ab840] rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, boxShadow: '0 0 6px rgba(122,184,64,0.5)' }} />
                </div>
                {/* Latest log line */}
                {logs.length > 0 && (
                  <div className={`text-xs font-mono truncate px-1 ${
                    logs[logs.length - 1].includes('✓') ? 'text-[#5ab840]' : 'text-[#3a6020]'
                  }`}>
                    {logs[logs.length - 1]}
                  </div>
                )}
              </div>

              {/* Middle: scrollable node cards */}
              <div className="flex-1 overflow-y-auto">
                <MobileFlow
                  nodes={nodes.map(n => ({ id: n.id, label: n.label, sub: n.sub, icon: n.icon, state: n.state }))}
                  currentStep={currentStep}
                />
              </div>

              {/* Bottom: last 3 terminal lines */}
              <div className="flex-shrink-0 glass mx-2 mb-2 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1 h-1 rounded-full bg-[#7ab840] animate-pulse" />
                  <span className="text-[#3a6020] text-xs font-mono">TERMINAL</span>
                </div>
                <div ref={logRef} className="space-y-0.5">
                  {logs.slice(-3).map((log, i) => (
                    <div key={i} className={`text-xs font-mono leading-5 ${
                      log.includes('✓') ? 'text-[#5ab840]' :
                      log.includes('[system]') ? 'text-[#60a090]' : 'text-[#3a6020]'
                    }`}>{log}</div>
                  ))}
                  <div className="flex items-center gap-1 text-[#2a4a18] text-xs font-mono">
                    <span>&gt;</span><span className="terminal-cursor" />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── DESKTOP layout (hidden below lg) ─── */}
            <div className="hidden lg:flex w-full h-full flex-row gap-2 p-2">

              {/* Flow canvas */}
              <div className="flex-1 glass rounded-xl overflow-hidden relative" style={{ minHeight: 0 }}>
                <div className="absolute top-2 left-3 flex items-center gap-2 z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7ab840] animate-pulse" />
                  <span className="text-[#5a8a30] text-xs font-mono">FLOW EDITOR — LIVE EXECUTION</span>
                </div>
                <div className="absolute top-2 right-3 text-xs font-mono text-[#3a5a20] z-10">{userName}</div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0a1a08] z-10">
                  <div className="h-full bg-[#7ab840] transition-all duration-500"
                    style={{ width: `${progress}%`, boxShadow: '0 0 6px rgba(122,184,64,0.6)' }} />
                </div>
                <div className="w-full h-full pt-8 pb-1">
                  <FlowCanvas nodes={nodes} edges={edges} />
                </div>
              </div>

              {/* Side panel */}
              <div className="w-64 flex flex-col gap-2 flex-shrink-0">
                <div className="glass rounded-xl p-3">
                  <div className="text-[#4a7a28] text-xs font-mono mb-2">// NODE STATUS</div>
                  <div className="flex flex-col gap-1">
                    {SEQUENCE.map((s, i) => (
                      <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded transition-all text-xs font-mono
                        ${i < currentStep ? 'text-[#5ab830]' :
                          i === currentStep ? 'text-[#c8e8a0] border border-[#2a5a18] bg-[#0d2008]' :
                          'text-[#1a3010]'}`}>
                        <span>{i < currentStep ? '✓' : i === currentStep ? '▶' : '·'}</span>
                        <span>{s.node.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-xl p-3 flex-1 flex flex-col min-h-0">
                  <div className="text-[#4a7a28] text-xs font-mono mb-1.5 flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-1 h-1 rounded-full bg-[#7ab840] animate-pulse" />
                    TERMINAL
                  </div>
                  <div ref={logRef} className="flex-1 overflow-y-auto min-h-0">
                    {logs.map((log, i) => (
                      <div key={i} className={`text-xs font-mono py-0.5 leading-5 ${
                        log.includes('✓') ? 'text-[#5ab840]' :
                        log.includes('[system]') ? 'text-[#60a090]' : 'text-[#3a6020]'
                      }`}>{log}</div>
                    ))}
                    <div className="flex items-center gap-1 text-[#2a4a18] text-xs font-mono">
                      <span>&gt;</span><span className="terminal-cursor" />
                    </div>
                  </div>
                </div>

                <div className="glass rounded-xl p-3 flex-shrink-0">
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[#3a6020]">PROGRESS</span>
                    <span className="text-[#7ab840]">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0a1a08] rounded-full overflow-hidden">
                    <div className="h-full bg-[#7ab840] rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, boxShadow: '0 0 6px rgba(122,184,64,0.5)' }} />
                  </div>
                  <div className="mt-1 text-xs font-mono text-[#2a4010]">
                    {Math.min(currentStep + 1, SEQUENCE.length)} / {SEQUENCE.length} nodes
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ BIRTHDAY REVEAL ══ */}
        {showBoom && <BirthdayReveal userName={userName} />}
      </main>
    </div>
  )
}
