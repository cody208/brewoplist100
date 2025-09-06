import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const id = cookies().get('employee_session')?.value || null
  return NextResponse.json({ employee_id: id })
}

