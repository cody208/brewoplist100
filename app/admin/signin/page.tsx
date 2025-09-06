'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminSignin(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [loading,setLoading]=useState(false)

  async function signIn(){
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return alert(error.message)
    window.location.href = '/admin/templates'
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Admin / Manager Sign-In</h1>
      <input className="input w-full" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="input w-full" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="btn btn-primary w-full" disabled={!email || !password || loading} onClick={signIn}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </div>
  )
}
