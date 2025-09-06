'use client'

import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

type Template = { id: string; name: string; is_active: boolean }
type Section  = { id: string; template_id: string; name: string; sort_order: number }
type Item     = { id: string; section_id: string; prompt: string; type: string; required: boolean; sort_order: number; config: any }

const ITEM_TYPES = ['yesno','number','text','select','checkbox'] as const

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>()
  const [tpl, setTpl] = useState<Template | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // new section form
  const [secName, setSecName] = useState('')
  const [secOrder, setSecOrder] = useState<number>(1)

  // new item form
  const [targetSection, setTargetSection] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState<(typeof ITEM_TYPES)[number]>('yesno')
  const [required, setRequired] = useState(false)
  const [order, setOrder] = useState<number>(1)
  const [config, setConfig] = useState<string>('{}')

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: s }, { data: i }] = await Promise.all([
      supabase.from('templates').select('*').eq('id', id).single(),
      supabase.from('sections').select('*').eq('template_id', id).order('sort_order'),
      supabase.from('items').select('*').order('sort_order')
    ])
    setTpl(t || null)
    setSections((s || []).filter((x: any) => x.template_id === id))
    setItems((i || []).filter((x: any) => (s || []).some((sec: any) => sec.id === x.section_id)))
    setTargetSection((s && s[0]?.id) || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const itemsBySection = useMemo(() => {
    const map: Record<string, Item[]> = {}
    for (const s of sections) map[s.id] = []
    for (const it of items) { (map[it.section_id] ||= []).push(it) }
    return map
  }, [sections, items])

  async function saveSection() {
    if (!secName.trim()) return alert('Enter a section name')
    const { error } = await supabase.from('sections').insert({
      template_id: id, name: secName.trim(), sort_order: Number(secOrder) || 1
    })
    if (error) return alert(error.message)
    setSecName(''); setSecOrder(1)
    load()
  }

  async function deleteSection(sectionId: string) {
    if (!confirm('Delete this section and its items?')) return
    await supabase.from('sections').delete().eq('id', sectionId)
    load()
  }

  async function saveItem() {
    if (!targetSection) return alert('Choose a section')
    if (!prompt.trim()) return alert('Enter a prompt')
    let cfg: any = {}
    try { cfg = JSON.parse(config || '{}') } catch { return alert('Config must be valid JSON') }
    const { error } = await supabase.from('items').insert({
      section_id: targetSection,
      prompt: prompt.trim(),
      type,
      required,
      sort_order: Number(order) || 1,
      config: cfg
    })
    if (error) return alert(error.message)
    setPrompt(''); setOrder(1); setRequired(false); setType('yesno'); setConfig('{}')
    load()
  }

  async function deleteItem(itemId: string) {
    await supabase.from('items').delete().eq('id', itemId)
    load()
  }

  if (loading) return <p>Loading…</p>
  if (!tpl) return <p>Template not found.</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Template</h1>

      <div className="card space-y-2">
        <div className="text-lg font-semibold">{tpl.name}</div>
        <div className="text-sm text-gray-600">ID: {tpl.id}</div>
        <div className="text-sm">{tpl.is_active ? 'Active' : 'Inactive'}</div>
      </div>

      {/* Add section */}
      <div className="card space-y-3">
        <h2 className="section-title">Add section</h2>
        <div className="grid sm:grid-cols-3 gap-2">
          <input className="input" placeholder="Section name" value={secName} onChange={(e)=>setSecName(e.target.value)} />
          <input className="input" type="number" placeholder="Sort order" value={secOrder} onChange={(e)=>setSecOrder(Number(e.target.value))} />
          <button className="btn btn-primary" onClick={saveSection}>Add Section</button>
        </div>
      </div>

      {/* Add item */}
      <div className="card space-y-3">
        <h2 className="section-title">Add item</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          <select className="input" value={targetSection} onChange={(e)=>setTargetSection(e.target.value)}>
            <option value="">Select section…</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={type} onChange={(e)=>setType(e.target.value as any)}>
            {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="input sm:col-span-2" placeholder="Prompt (question text)" value={prompt} onChange={(e)=>setPrompt(e.target.value)} />
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={required} onChange={(e)=>setRequired(e.target.checked)} />
            <span className="text-sm">Required</span>
          </div>
          <input className="input" type="number" placeholder="Sort order" value={order} onChange={(e)=>setOrder(Number(e.target.value))} />
          <input className="input sm:col-span-2" placeholder='Config JSON (e.g. {"options":["AM","PM"]} for select)' value={config} onChange={(e)=>setConfig(e.target.value)} />
          <button className="btn btn-primary sm:col-span-2" onClick={saveItem}>Add Item</button>
        </div>
      </div>

      {/* Existing sections + items */}
      {sections.map(sec => (
        <div key={sec.id} className="card space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{sec.sort_order}. {sec.name}</h3>
            <button className="btn" onClick={() => deleteSection(sec.id)}>Delete section</button>
          </div>
          <ul className="space-y-2">
            {(itemsBySection[sec.id] || []).map(it => (
              <li key={it.id} className="flex items-center justify-between border rounded-md p-2">
                <div className="text-sm">
                  <div className="font-medium">{it.prompt}</div>
                  <div className="text-xs text-gray-500">type: {it.type} · order: {it.sort_order} · required: {String(it.required)}</div>
                  {it.type === 'select' && (
                    <div className="text-xs text-gray-500">
                      options: {Array.isArray(it.config?.options) ? it.config.options.join(', ') : '—'}
                    </div>
                  )}
                </div>
                <button className="btn" onClick={() => deleteItem(it.id)}>Delete</button>
              </li>
            ))}
            {!(itemsBySection[sec.id] || []).length && (
              <li className="text-sm text-gray-500">No items yet.</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  )
}
