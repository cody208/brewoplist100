'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

type Template = { id: string; name: string }
type Section = { id: string; name: string; sort_order: number }
type Item = {
  id: string
  prompt: string
  type: string
  sort_order: number
  section: Section | null
}
type ResponseRow = {
  id: string
  value_text: string | null
  value_number: number | null
  value_json: any | null
  created_at: string
  item: Item | null
}
type Run = {
  id: string
  template_id: string
  template: Template | null
  status: 'submitted' | 'approved' | 'in_progress'
  created_at: string
  responses: ResponseRow[]
}

export default function ReviewPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Filters
  const [status, setStatus] = useState<'all' | Run['status']>('all')
  const [from, setFrom] = useState<string>('') // YYYY-MM-DD
  const [to, setTo] = useState<string>('')     // YYYY-MM-DD
  const [templateId, setTemplateId] = useState<'all' | string>('all')

  async function load() {
    setLoading(true)

    // Load runs (with joined template + responses → items → sections)
    const { data: runsData, error: runsErr } = await supabase
      .from('runs')
      .select(`
        id,
        template_id,
        template:templates ( id, name ),
        status,
        created_at,
        responses (
          id,
          value_text,
          value_number,
          value_json,
          created_at,
          item:items (
            id,
            prompt,
            type,
            sort_order,
            section:sections ( id, name, sort_order )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(300)

    if (runsErr) {
      console.error(runsErr)
      setRuns([])
    } else {
      setRuns((runsData as any) || [])
    }

    // Load templates for filter dropdown
    const { data: tplData, error: tplErr } = await supabase
      .from('templates')
      .select('id,name')
      .order('name', { ascending: true })

    if (!tplErr) setTemplates(tplData || [])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Apply filters client-side
  const filteredRuns = useMemo(() => {
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : null
    const toTs   = to   ? new Date(to   + 'T23:59:59').getTime() : null
    return runs.filter(r => {
      const t = new Date(r.created_at).getTime()
      if (status !== 'all' && r.status !== status) return false
      if (templateId !== 'all' && r.template_id !== templateId) return false
      if (fromTs && t < fromTs) return false
      if (toTs && t > toTs) return false
      return true
    })
  }, [runs, status, from, to, templateId])

  function toggle(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }

  async function approve(id: string) {
    await supabase.from('runs').update({ status: 'approved' }).eq('id', id)
    load()
  }
  async function reopen(id: string) {
    await supabase.from('runs').update({ status: 'in_progress' }).eq('id', id)
    load()
  }

  // CSV export of filtered runs
  function downloadCSV() {
    const rows: string[][] = []
    rows.push([
      'template_name',
      'run_id',
      'run_created_at',
      'run_status',
      'section',
      'item_prompt',
      'item_type',
      'response_value',
      'response_created_at',
    ])

    for (const run of filteredRuns) {
      const tplName = run.template?.name ?? ''
      for (const r of run.responses || []) {
        const sectionName = r.item?.section?.name ?? ''
        const prompt = r.item?.prompt ?? ''
        const type = r.item?.type ?? ''
        let value = ''
        if (type === 'yesno') value = r.value_text ?? ''
        else if (type === 'number') value = (r.value_number ?? '').toString()
        else if (type === 'checkbox') value = r.value_json?.checked ? 'Checked' : 'Unchecked'
        else if (type === 'select') value = r.value_text ?? JSON.stringify(r.value_json ?? '')
        else value = r.value_text ?? JSON.stringify(r.value_json ?? r.value_number ?? '')
        rows.push([
          tplName,
          run.id,
          new Date(run.created_at).toISOString(),
          run.status,
          sectionName,
          prompt,
          type,
          value,
          new Date(r.created_at).toISOString(),
        ])
      }
    }

    const csv = rows
      .map(cols =>
        cols.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    a.download = `brewops-review-${ts}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function clearFilters() {
    setStatus('all')
    setFrom('')
    setTo('')
    setTemplateId('all')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Review</h1>

      {/* Filters */}
      <div className="card">
        <div className="grid md:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Template</label>
            <select className="input" value={templateId} onChange={e=>setTemplateId(e.target.value)}>
              <option value="all">All templates</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">From</label>
            <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">To</label>
            <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <button className="btn" onClick={clearFilters}>Clear</button>
            <button className="btn btn-primary" onClick={downloadCSV}>Export CSV</button>
          </div>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {!loading && filteredRuns.length === 0 && (
        <p className="text-sm text-gray-600">No runs match the current filters.</p>
      )}

      {filteredRuns.map((run) => (
        <RunRow
          key={run.id}
          run={run}
          expanded={!!expanded[run.id]}
          onToggle={() => toggle(run.id)}
          onApprove={() => approve(run.id)}
          onReopen={() => reopen(run.id)}
        />
      ))}
    </div>
  )
}

function RunRow({
  run,
  expanded,
  onToggle,
  onApprove,
  onReopen,
}: {
  run: Run
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReopen: () => void
}) {
  const grouped = useMemo(() => {
    const bySection: Record<string, { section: Section | null; rows: ResponseRow[] }> = {}
    for (const r of run.responses || []) {
      const sect = r.item?.section || null
      const key = sect?.id || 'no-section'
      if (!bySection[key]) bySection[key] = { section: sect, rows: [] }
      bySection[key].rows.push(r)
    }
    const groups = Object.values(bySection)
    groups.sort((a, b) => (a.section?.sort_order ?? 9999) - (b.section?.sort_order ?? 9999))
    for (const g of groups) g.rows.sort((a, b) => (a.item?.sort_order ?? 9999) - (b.item?.sort_order ?? 9999))
    return groups
  }, [run.responses])

  const count = run.responses?.length || 0
  const statusColor =
    run.status === 'approved'
      ? 'text-green-700'
      : run.status === 'submitted'
      ? 'text-blue-700'
      : 'text-gray-700'

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="font-semibold">
            {run.template?.name ? `${run.template.name} — ` : ''}Run {run.id.slice(0, 8)}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(run.created_at).toLocaleString()} •{' '}
            <span className={statusColor}>{run.status}</span> • {count} responses
          </div>
        </div>
        <div className="flex items-center gap-2">
          {run.status !== 'approved' ? (
            <button className="btn btn-primary" onClick={onApprove}>Approve</button>
          ) : (
            <button className="btn" onClick={onReopen}>Reopen</button>
          )}
          <button className="btn" onClick={onToggle}>
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          {grouped.map((g, idx) => (
            <div key={g.section?.id || `sec-${idx}`} className="space-y-2">
              <h3 className="font-medium">{g.section?.name || 'General'}</h3>
              <ul className="space-y-1">
                {g.rows.map((r) => (
                  <li key={r.id} className="rounded border p-2">
                    <div className="text-sm">
                      <span className="font-medium">{r.item?.prompt || 'Item'}</span>
                      {': '}
                      <ValueText
                        type={r.item?.type || 'text'}
                        value_text={r.value_text}
                        value_number={r.value_number}
                        value_json={r.value_json}
                      />
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {r.item?.type || 'text'} • {new Date(r.created_at).toLocaleTimeString()}
                    </div>
                  </li>
                ))}
                {g.rows.length === 0 && (
                  <li className="text-sm text-gray-500">No responses in this section.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ValueText({
  type,
  value_text,
  value_number,
  value_json,
}: {
  type: string
  value_text: string | null
  value_number: number | null
  value_json: any
}) {
  if (type === 'yesno') {
    if (value_text === 'Yes' || value_text === 'No') return <span>{value_text}</span>
  }
  if (type === 'number') {
    if (typeof value_number === 'number') return <span>{value_number}</span>
  }
  if (type === 'checkbox') {
    const checked = !!value_json?.checked
    return <span>{checked ? 'Checked' : 'Unchecked'}</span>
  }
  if (type === 'select') {
    if (typeof value_text === 'string' && value_text) return <span>{value_text}</span>
    if (value_json && typeof value_json === 'object') return <span>{JSON.stringify(value_json)}</span>
  }
  if (value_text) return <span>{value_text}</span>
  if (typeof value_number === 'number') return <span>{value_number}</span>
  if (value_json != null) return <span>{JSON.stringify(value_json)}</span>
  return <span className="text-gray-500">—</span>
}
