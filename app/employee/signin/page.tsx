'use client'
import { useState } from 'react'

export default function EmployeeSignin(){
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')

  async function signIn() {
    const res = await fetch('/api/employee-login', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase(), pin })
    })
    const j = await res.json()
    if (!j.ok) return alert(j.error || 'Invalid code or PIN')
    window.location.href = '/work'
  }

  function press(d:string){
    if (d === 'del') { setPin(p=>p.slice(0,-1)); return }
    if (pin.length < 4) setPin(p=>p + d)
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Employee Sign-In</h1>
      <input
        className="input w-full"
        placeholder="Employee Code (e.g. CODY)"
        value={code}
        onChange={(e)=>setCode(e.target.value)}
      />

      <div className="border rounded p-3">
        <div className="text-center text-xl tracking-widest mb-3">
          {pin.padEnd(4,'•')}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {'123456789'.split('').map(n=>(
            <button key={n} className="btn" onClick={()=>press(n)}>{n}</button>
          ))}
          <div />
          <button className="btn" onClick={()=>press('0')}>0</button>
          <button className="btn" onClick={()=>press('del')}>⌫</button>
        </div>
      </div>

      <button className="btn btn-primary w-full" disabled={code.trim()==='' || pin.length!==4} onClick={signIn}>
        Sign In
      </button>
    </div>
  )
}
