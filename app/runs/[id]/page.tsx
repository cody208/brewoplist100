'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

type Section={id:string,name:string,sort_order:number}
type Item={id:string,section_id:string,prompt:string,type:string,required:boolean,config:any,sort_order:number}

export default function RunPage(){
  const { id } = useParams<{id:string}>()
  const [sections,setSections]=useState<Section[]>([])
  const [items,setItems]=useState<Item[]>([])

  useEffect(()=>{(async()=>{
    const { data: run } = await supabase.from('runs').select('template_id').eq('id', id).single()
    if (!run) return
    const { data: s } = await supabase.from('sections').select('*').eq('template_id', run.template_id).order('sort_order')
    const { data: i } = await supabase.from('items').select('*').in('section_id', (s||[]).map((x:any)=>x.id)).order('sort_order')
    setSections(s||[]); setItems(i||[])
  })()},[id])

  async function submit(){
    await supabase.from('runs').update({status:'submitted',completed_at:new Date().toISOString()}).eq('id',id)
    await fetch('/api/notify',{method:'POST',body:JSON.stringify({runId:id})})
    alert('Submitted!')
  }

  const grouped = sections.map(sec=>({...sec, items: items.filter(i=>i.section_id===sec.id)}))

  return (<div className="space-y-6">
    <h1 className="text-2xl font-bold">Run {String(id).slice(0,8)}</h1>
    {grouped.map(sec=> (<div key={sec.id} className="card space-y-3">
      <h2 className="section-title">{sec.name}</h2>
      {sec.items.map(item=>(<Field key={item.id} item={item} runId={String(id)} />))}
    </div>))}
    <button className="btn btn-primary" onClick={submit}>Submit run</button>
  </div>)
}

function Field({item, runId}:{item:Item, runId:string}){
  const [val,setVal]=useState<any>('')
  async function save(v:any){
    setVal(v)
    const payload:any={ run_id: runId, item_id: item.id }
    if (typeof v === 'number') payload.value_number = v
    else if (typeof v === 'string') payload.value_text = v
    else payload.value_json = v
    await supabase.from('responses').insert(payload)
  }
  return (<div className="space-y-1">
    <div className="text-sm font-medium">{item.prompt}</div>
    {item.type==='yesno' && (<div className="flex gap-2">
      <button className="btn" onClick={()=>save('Yes')}>Yes</button>
      <button className="btn" onClick={()=>save('No')}>No</button>
    </div>)}
    {item.type==='number' && (<input className="input" type="number" value={val} onChange={e=>setVal(Number(e.target.value))} onBlur={()=>save(Number(val))} />)}
    {item.type==='text' && (<input className="input" value={val} onChange={e=>setVal(e.target.value)} onBlur={()=>save(val)} />)}
    {item.type==='select' && (<select className="input" value={val} onChange={e=>save(e.target.value)}>
      <option value="">Select…</option>{(item.config?.options||[]).map((o:string)=>(<option key={o} value={o}>{o}</option>))}
    </select>)}
  </div>)
}
{item.type==='checkbox' && (
  <label className="inline-flex items-center gap-2">
    <input
      type="checkbox"
      className="h-4 w-4"
      checked={!!val}
      onChange={async (e) => {
        const checked = e.target.checked
        setVal(checked)
        const payload:any = { run_id: runId, item_id: item.id, value_json: { checked } }
        await supabase.from('responses').insert(payload)
      }}
    />
    <span>Checked</span>
  </label>
)}

