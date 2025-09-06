'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

type Section = { id: string, name: string, sort_order: number }
type Item    = { id: string, section_id: string, prompt: string, type: string, required: boolean, config: any, sort_order: number }

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
    await fetch('/api/notify',{method:'POST',body:JSON.stringify({runId:String(id)})})
    alert('Submitted!')
  }

  const grouped = sections.map(sec=>({...sec, items: items.filter(i=>i.section_id===sec.id)}))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Run {String(id).slice(0,8)}</h1>
      {grouped.map(sec=> (
        <div key={sec.id} className="card space-y-3">
          <h2 className="section-title">{sec.name}</h2>
          {sec.items.map(item=> (<Field key={item.id} item={item} runId={String(id)} />))}
        </div>
      ))}
      <button className="btn btn-primary" onClick={submit}>Submit run</button>
    </div>
  )
}

function Field({item, runId}:{item:Item, runId:string}){
  const [val,setVal]=useState<any>('')         // holds current selection/value for highlight
  const [saving,setSaving]=useState(false)

  async function save(v:any){
    setVal(v)
    setSaving(true)
    const payload:any = { run_id: runId, item_id: item.id }
    if (typeof v === 'number') payload.value_number = v
    else if (typeof v === 'string') payload.value_text = v
    else payload.value_json = v
    await supabase.from('responses').insert(payload)
    setSaving(false)
  }

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{item.prompt}</div>

      {/* YES / NO as radio-style buttons with highlight */}
      {item.type==='yesno' && (
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={()=>save('Yes')}
            className={[
              "px-4 py-2 rounded-md border transition",
              val === 'Yes'
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-green-700 border-green-600 hover:bg-green-50"
            ].join(" ")}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={()=>save('No')}
            className={[
              "px-4 py-2 rounded-md border transition",
              val === 'No'
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-red-700 border-red-600 hover:bg-red-50"
            ].join(" ")}
          >
            No
          </button>
          {saving && <span className="text-xs text-gray-500">saving…</span>}
        </div>
      )}

      {/* Checkbox */}
      {item.type==='checkbox' && (
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={!!val}
            onChange={async (e) => {
              const checked = e.target.checked
              setVal(checked)
              setSaving(true)
              const payload:any = { run_id: runId, item_id: item.id, value_json: { checked } }
              await supabase.from('responses').insert(payload)
              setSaving(false)
            }}
          />
          <span>Checked</span>
          {saving && <span className="text-xs text-gray-500">saving…</span>}
        </label>
      )}

      {/* Number */}
      {item.type==='number' && (
        <input
          className="input"
          type="number"
          value={val}
          onChange={e=>setVal(Number(e.target.value))}
          onBlur={()=>save(Number(val))}
        />
      )}

      {/* Text */}
      {item.type==='text' && (
        <input
          className="input"
          value={val}
          onChange={e=>setVal(e.target.value)}
          onBlur={()=>save(val)}
        />
      )}

      {/* Select (uses config.options JSON array) */}
      {item.type==='select' && (
        <select className="input" value={val} onChange={e=>save(e.target.value)}>
          <option value="">Select…</option>
          {(item.config?.options||[]).map((o:string)=>(
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
    </div>
  )
}
