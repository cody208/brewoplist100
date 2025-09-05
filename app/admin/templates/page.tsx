'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

type Template = { id:string, name:string, frequency:string, version:number, is_active:boolean }

export default function TemplatesPage(){
  const [templates,setTemplates]=useState<Template[]>([])
  const [name,setName]=useState(''); const [frequency,setFrequency]=useState('daily')

  async function load(){
    const {data}=await supabase.from('templates').select('*').order('created_at',{ascending:false})
    setTemplates(data||[])
  }
  useEffect(()=>{load()},[])

  async function createTemplate(){
    if(!name) return
    await supabase.from('templates').insert({name,frequency,version:1,is_active:true})
    setName(''); load()
  }

  return (<div className="space-y-6">
    <h1 className="text-2xl font-bold">Admin · Templates</h1>
    <div className="card space-y-3">
      <h2 className="section-title">Create Template</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <input className="input" placeholder="Template name" value={name} onChange={e=>setName(e.target.value)} />
        <select className="input" value={frequency} onChange={e=>setFrequency(e.target.value)}>
          <option value="daily">Daily</option><option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option><option value="adhoc">Ad-hoc</option>
        </select>
        <button className="btn btn-primary" onClick={createTemplate}>Create</button>
      </div>
    </div>

    <div className="card">
      <h2 className="section-title">Templates</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left"><th className="py-2">Name</th><th>Frequency</th><th>Version</th></tr></thead>
        <tbody>
          {templates.map(t=>(<tr key={t.id} className="border-t"><td className="py-2">{t.name}</td><td>{t.frequency}</td><td>{t.version}</td></tr>))}
          {!templates.length && <tr><td className="py-3" colSpan={3}>No templates yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>)
}
