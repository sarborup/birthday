'use client'
import { useEffect, useState } from 'react'

interface Wish { id: number; name: string; time: string }

export default function AdminPage() {
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/wishes')
      setWishes(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen bg-[#050a05] p-6 font-mono">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[#5a8a30] text-xs mb-1">// ADMIN PANEL</div>
            <h1 className="text-2xl font-bold text-[#c8e8a0]">Birthday Wishers</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#7ab840] text-sm">{wishes.length} wishes</span>
            <button onClick={load} className="text-xs text-[#5a8a30] border border-[#2a5020] px-3 py-1.5 rounded hover:border-[#5a8a30] transition-colors">
              Refresh
            </button>
            <a href="/" className="text-xs text-[#5a8a30] border border-[#2a5020] px-3 py-1.5 rounded hover:border-[#5a8a30] transition-colors">
              ← Back
            </a>
          </div>
        </div>

        {loading ? (
          <div className="text-[#3a6020] text-sm">Loading...</div>
        ) : wishes.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <div className="text-[#2a5020] text-sm">No wishes yet.</div>
            <div className="text-[#1a3a10] text-xs mt-1">Share the link and wait for people to deploy the flow!</div>
          </div>
        ) : (
          <div className="space-y-2">
            {[...wishes].reverse().map((w, i) => (
              <div key={w.id} className="glass rounded-lg px-5 py-3 flex items-center justify-between fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#1a3a10] border border-[#3a6a20] flex items-center justify-center text-xs text-[#7ab840]">
                    {w.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-[#c8e8a0] text-sm">{w.name}</span>
                </div>
                <span className="text-[#3a6020] text-xs">
                  {new Date(w.time).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
