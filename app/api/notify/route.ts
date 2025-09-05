import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
export async function POST(req:NextRequest){
  const admin=supabaseAdmin(); const { runId } = await req.json()
  const { data: run } = await admin.from('runs').select('*, templates(name)').eq('id', runId).single()
  console.log('Notify stub → Run', runId, 'Template:', run?.templates?.name)
  return NextResponse.json({ ok:true })
}
