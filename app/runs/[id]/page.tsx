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
  const [val,setVal]=useState<any>('')          // current UI value
  const [saving,setSaving]=useState(false)

  // Load existing response so the UI reflects current answer
  useEffect(()=>{(async()=>{
    const { data } = await supabase
      .from('responses')
      .select('value_text,value_number,value_json')
      .eq('run_id', runId)
      .eq('item_id', item.id)
      .maybeSingle()

    if (data) {
      if (data.value_text != null) setVal(data.value_text)
      else if (data.value_number != null) setVal(data.value_number)
      else if (data.value_json != null) {
        // checkbox convention: { checked: boolean }
        if (item.type === 'checkbox' && typeof data.value_json?.checked === 'boolean') {
          setVal(!!data.value_json.checked)
        } else {
          setVal(data.value_json)
        }
      }
    }
  })()},[item.id, runId, item.type])

  async function upsertValue(v:any){
    setVal(v)
    setSaving(true)

    // Build upsert payload (only set one of the value_* columns)
    const payload:any = { run_id: runId, item_id: item.id, value_text: null, value_number: null, value_json: null }
    if (typeof v === 'number') payload.value_number = v
    else if (typeof v === 'string') payload.value_text = v
    else payload.value_json = v

    // Upsert on (run_id, item_id) — requires the unique index we added
    await supabase
      .from('responses')
      .upsert(payload, { onConflict: 'run_id,item_id' })

    setSaving(false)
  }

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{item.prompt}</div>

      {/* YES / NO with selected highlight */}
      {item.type==='yesno' && (
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={()=>upsertValue('Yes')}
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
            onClick={()=>upsertValue('No')}
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
            onChange={(e) => upsertValue({ checked: e.target.checked })}
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
          onBlur={()=>upsertValue(Number(val))}
        />
      )}

      {/* Text */}
      {item.type==='text' && (
        <input
          className="input"
          value={val}
          onChange={e=>setVal(e.target.value)}
          onBlur={()=>upsertValue(val)}
        />
      )}

      {/* Select (uses config.options JSON array) */}
      {item.type==='select' && (
        <select className="input" value={val} onChange={e=>upsertValue(e.target.value)}>
          <option value="">Select…</option>
          {(item.config?.options||[]).map((o:string)=>(
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
    </div>
  )
}
