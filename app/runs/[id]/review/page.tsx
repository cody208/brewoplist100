'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

export default function ReviewRun(){
  const { id } = useParams<{id:string}>()
  const [templateName,setTemplateName]=useState('')
  const [responses,setResponses]=useState<any[]>([])

  useEffect(()=>{(async()=>{
    const {data:run}=await supabase.from('runs').select('template_id').eq('id',id).single()
    if(!run) return
    const {data:t}=await supabase.from('templates').select('name').eq('id',run.template_id).single()
    setTemplateName(t?.name||'')
    const {data:r}=await supabase.from('responses').select('*').eq('run_id',id)
    setResponses(r||[])
  })()},[id])

  async function approve(){
    await supabase.from('runs').update({status:'approved'}).eq('id',id)
    await fetch('/api/notify',{method:'POST',body:JSON.stringify({runId:id})})
    alert('Approved & emailed (stubbed)')
  }

  return (<div className="space-y-6">
    <h1 className="text-2xl font-bold">Review · {templateName}</h1>
    <div className="card space-y-2">
      {responses.map((r,idx)=>(<div key={r.id||idx} className="text-sm border-b py-2">
        <div className="font-medium">Item {idx+1}</div>
        <div>{r.value_text ?? r.value_number ?? JSON.stringify(r.value_json)}</div>
      </div>))}
      {!responses.length && <p className="text-sm text-gray-600">No responses yet.</p>}
    </div>
    <button className="btn btn-primary" onClick={approve}>Approve & Email</button>
  </div>)
}
