import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// Vercel has a read-only filesystem except /tmp — use /tmp in production
const FILE = process.env.VERCEL
  ? '/tmp/wishes.json'
  : join(process.cwd(), 'wishes.json')

function load() {
  if (!existsSync(FILE)) return []
  try { return JSON.parse(readFileSync(FILE, 'utf-8')) } catch { return [] }
}

export async function GET() {
  return NextResponse.json(load())
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const wishes = load()
  const entry = { name: name.trim(), time: new Date().toISOString(), id: Date.now() }
  wishes.push(entry)
  try { writeFileSync(FILE, JSON.stringify(wishes, null, 2)) } catch { /* read-only, ignore */ }
  return NextResponse.json(entry)
}
