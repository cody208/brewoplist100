import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  cookies().set({
    name: 'employee_session',
    value: '',
    maxAge: 0,
    path: '/',
  })
  return NextResponse.json({ ok: true })
}
async function employeeLogout(){
  await fetch('/api/employee-logout', { method: 'POST' })
  window.location.reload()
}
{/* <button className="btn" onClick={employeeLogout}>Sign out</button> */}
