import { useState } from 'react'

import {
  createScheduleBlockFn,
  finishScheduleBlockFn,
  updateScheduleBlockFn,
} from './server-functions'

import type { ScheduleBlock } from './persistence'

type Fields = {
  endsAt: string
  privateLabel: string
  privateNotes: string
  startsAt: string
}

const blank: Fields = { endsAt: '', privateLabel: '', privateNotes: '', startsAt: '' }

export function ScheduleBlocksPage({
  initialBlocks,
  theaterId,
  theaterName,
}: {
  initialBlocks: ScheduleBlock[]
  theaterId: string
  theaterName: string
}) {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [editing, setEditing] = useState<ScheduleBlock | null>(null)
  const [fields, setFields] = useState<Fields>(blank)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const edit = (block: ScheduleBlock | null) => {
    setEditing(block)
    setFields(
      block
        ? { endsAt: local(block.endsAt), privateLabel: block.privateLabel, privateNotes: block.privateNotes ?? '', startsAt: local(block.startsAt) }
        : blank,
    )
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    const data = { commandId: crypto.randomUUID(), endsAt: new Date(fields.endsAt).toISOString(), privateLabel: fields.privateLabel, privateNotes: fields.privateNotes || null, startsAt: new Date(fields.startsAt).toISOString() }
    const result = editing
      ? await updateScheduleBlockFn({ data: { ...data, expectedVersion: editing.version, scheduleBlockId: editing.id } })
      : await createScheduleBlockFn({ data: { ...data, theaterId } })
    setSaving(false)
    if (!result.ok) return setMessage(result.error.message)
    setBlocks((current) => editing ? current.map((block) => block.id === result.data.id ? { ...block, ...result.data, createdByName: block.createdByName, history: block.history } : block) : [{ ...result.data, createdByName: 'You' }, ...current])
    edit(null)
    setMessage(editing ? 'Schedule Block updated.' : 'Schedule Block created.')
  }

  async function finish(block: ScheduleBlock, action: 'released' | 'cancelled') {
    setSaving(true)
    const result = await finishScheduleBlockFn({ data: { action, commandId: crypto.randomUUID(), expectedVersion: block.version, scheduleBlockId: block.id } })
    setSaving(false)
    if (!result.ok) return setMessage(result.error.message)
    setBlocks((current) => current.map((item) => item.id === block.id ? { ...item, ...result.data, createdByName: item.createdByName, history: item.history } : item))
    setMessage(`Schedule Block ${action}.`)
  }

  return <section className="page-wrap pb-12"><div className="island-shell rounded-lg px-6 py-6"><p className="text-sm font-bold">Primary Venue · {theaterName}</p><h1 className="mt-2 text-3xl font-extrabold">Schedule Blocks</h1><p className="mt-2">Reserve one-off operational time. Setup and turnover buffers are enforced, and no override can double-book the Primary Venue.</p><form className="mt-6 grid gap-3 rounded border p-4 md:grid-cols-2" onSubmit={save}><h2 className="md:col-span-2 text-xl font-extrabold">{editing ? 'Edit Schedule Block' : 'Create Schedule Block'}</h2><Input label="Private label" value={fields.privateLabel} onChange={(privateLabel) => setFields({ ...fields, privateLabel })}/><label className="grid gap-1 font-bold">Private notes (optional)<textarea className="rounded border p-2" value={fields.privateNotes} onChange={(event) => setFields({ ...fields, privateNotes: event.target.value })}/></label><Input label="Start" type="datetime-local" value={fields.startsAt} onChange={(startsAt) => setFields({ ...fields, startsAt })}/><Input label="End" type="datetime-local" value={fields.endsAt} onChange={(endsAt) => setFields({ ...fields, endsAt })}/><div className="flex gap-2 md:col-span-2"><button className="rounded bg-[var(--sea-ink)] px-4 py-2 font-bold text-white" disabled={saving} type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : 'Reserve time'}</button>{editing ? <button className="rounded border px-4 py-2 font-bold" onClick={() => edit(null)} type="button">Cancel edit</button> : null}</div></form>{message ? <p className="mt-3 font-semibold" role="status">{message}</p> : null}<div className="mt-6 grid gap-3">{blocks.length ? blocks.map((block) => <article className="rounded border p-4" key={block.id}><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-extrabold">{block.privateLabel}</h2><p>{new Date(block.startsAt).toLocaleString()} – {new Date(block.endsAt).toLocaleString()} · {block.state}</p>{block.privateNotes ? <p className="mt-2">{block.privateNotes}</p> : null}<p className="mt-2 text-xs">Created by {block.createdByName || 'an Operator'}.</p>{block.history.length ? <details className="mt-3 text-sm"><summary className="cursor-pointer font-bold">Change history</summary><ul className="mt-1 list-disc pl-5">{block.history.map((entry) => <li key={`${entry.action}-${entry.createdAt}`}>{entry.action} · version {entry.version} · {new Date(entry.createdAt).toLocaleString()}</li>)}</ul></details> : null}</div>{block.state === 'active' ? <div className="flex gap-2"><button className="rounded border px-3 py-2 font-bold" onClick={() => edit(block)} type="button">Edit</button><button className="rounded border px-3 py-2 font-bold" onClick={() => finish(block, 'released')} type="button">Release</button><button className="rounded border px-3 py-2 font-bold" onClick={() => finish(block, 'cancelled')} type="button">Cancel block</button></div> : null}</div></article>) : <p className="rounded border border-dashed p-5">No Schedule Blocks yet.</p>}</div></div></section>
}

function Input({ label, onChange, type = 'text', value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) { return <label className="grid gap-1 font-bold">{label}<input className="rounded border p-2" onChange={(event) => onChange(event.target.value)} required type={type} value={value}/></label> }
function local(value: string) { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
