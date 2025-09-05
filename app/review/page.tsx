'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'

type Run={id:string,template_id:string,status:string,completed_at:string|null}
type Template={id:string,name:string}

export default function ReviewInbox(){
  const [runs,setRuns]=useState<(Run & {template?:Template})[]>([])
  useEffect(()=>{(async()=>{
    const {data:r}=await supabase.from('runs').select('id,template_id,status,completed_at').order('completed_at',{ascending:false}).limit(30)
    if(!r) return
    const tIds=[...new Set(r.map(x=>x.template_id))]
    const {data:t}=await supabase.from('templates').select('id,name').in('id',tIds)
    const map=new Map((t||[]).map(x=>[x.id,x]))
    setRuns(r.map(x=>({...x,template:map.get(x.template_id)})))
  })()},[])
  return (<div className="space-y-6">
    <h1 className="text-2xl font-bold">Review · Submissions</h1>
    <div className="card">
      <table className="w-full text-sm">
        <thead><tr className="text-left"><th className="py-2">Run</th><th>Template</th><th>Status</th><th>Completed</th><th></th></tr></thead>
        <tbody>
          {runs.map(r=>(<tr key={r.id} className="border-t">
            <td className="py-2">{r.id.slice(0,8)}</td><td>{r.template?.name||'-'}</td><td>{r.status}</td>
            <td>{r.completed_at?new Date(r.completed_at).toLocaleString():'-'}</td>
            <td><Link className="btn" href={`/runs/${r.id}/review`}>Open</Link></td>
          </tr>))}
          {!runs.length && <tr><td className="py-3" colSpan={5}>No submissions yet.</td></tr>}
        </tbody>
      </table>
    </div></div>)
}
