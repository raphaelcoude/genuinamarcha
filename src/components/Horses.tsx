import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Horse, HorseInput, Organization } from '../types'

const emptyHorse: HorseInput = { name: '', registration_number: null, sex: 'female', breed: 'Mangalarga Marchador', birth_date: null, coat: null, sire_name: null, dam_name: null, status: 'active' }

export function Horses({ organization, canEdit }: { organization: Organization, canEdit: boolean }) {
  const [horses, setHorses] = useState<Horse[]>([])
  const [form, setForm] = useState<HorseInput>(emptyHorse)
  const [editing, setEditing] = useState<Horse | null>(null)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    if (!supabase) return
    const { data, error } = await supabase.from('horses').select('*').eq('organization_id', organization.id).order('name')
    if (error) setMessage(error.message); else setHorses(data ?? [])
  }
  useEffect(() => { void load() }, [organization.id])

  function startEdit(horse: Horse) { setEditing(horse); setForm({ name: horse.name, registration_number: horse.registration_number, sex: horse.sex, breed: horse.breed, birth_date: horse.birth_date, coat: horse.coat, sire_name: horse.sire_name, dam_name: horse.dam_name, status: horse.status }); setOpen(true) }
  function startNew() { setEditing(null); setForm(emptyHorse); setOpen(true) }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    const query = editing ? supabase.from('horses').update(form).eq('id', editing.id) : supabase.from('horses').insert({ ...form, organization_id: organization.id })
    const { error } = await query
    if (error) setMessage(error.message); else { setOpen(false); setMessage(''); await load() }
  }
  async function remove(horse: Horse) {
    if (!supabase || !confirm(`Excluir ${horse.name}? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('horses').delete().eq('id', horse.id)
    if (error) setMessage(error.message); else await load()
  }

  return <section className="content horses-page">
    <div className="page-heading"><div><p className="eyebrow">PLANTEL</p><h1>Cavalos</h1><p>{horses.length} animais cadastrados neste haras.</p></div>{canEdit && <button className="primary-button" onClick={startNew}>＋ Cadastrar animal</button>}</div>
    {message && <p className="form-message">{message}</p>}
    <div className="panel table-panel"><div className="table-tools"><input type="search" placeholder="Buscar no plantel…"/><span>{organization.name}</span></div>
      <div className="responsive-table"><table><thead><tr><th>Animal</th><th>Sexo</th><th>Raça</th><th>Pelagem</th><th>Registro</th><th>Situação</th><th></th></tr></thead><tbody>
        {horses.map(h => <tr key={h.id}><td><strong>{h.name}</strong><small>{h.sire_name && `Pai: ${h.sire_name}`}</small></td><td>{h.sex === 'male' ? 'Macho' : h.sex === 'female' ? 'Fêmea' : 'Castrado'}</td><td>{h.breed}</td><td>{h.coat || '—'}</td><td>{h.registration_number || '—'}</td><td><span className={`status ${h.status}`}>{h.status === 'active' ? 'Ativo' : h.status}</span></td><td>{canEdit && <div className="row-actions"><button onClick={() => startEdit(h)}>Editar</button><button className="danger" onClick={() => remove(h)}>Excluir</button></div>}</td></tr>)}
        {!horses.length && <tr><td colSpan={7} className="empty-state">Nenhum animal cadastrado. Comece adicionando o primeiro cavalo.</td></tr>}
      </tbody></table></div></div>
    {open && <div className="modal"><form className="modal-card horse-form" onSubmit={save}><button type="button" className="modal-close" onClick={() => setOpen(false)}>×</button><p className="eyebrow">PLANTEL</p><h2>{editing ? 'Editar animal' : 'Cadastrar animal'}</h2>
      <div className="form-row"><label>Nome<input value={form.name} required onChange={e => setForm({...form,name:e.target.value})}/></label><label>Nº de registro<input value={form.registration_number ?? ''} onChange={e => setForm({...form,registration_number:e.target.value || null})}/></label></div>
      <div className="form-row"><label>Sexo<select value={form.sex} onChange={e => setForm({...form,sex:e.target.value as HorseInput['sex']})}><option value="female">Fêmea</option><option value="male">Macho</option><option value="gelding">Castrado</option></select></label><label>Nascimento<input type="date" value={form.birth_date ?? ''} onChange={e => setForm({...form,birth_date:e.target.value || null})}/></label></div>
      <div className="form-row"><label>Raça<input value={form.breed} required onChange={e => setForm({...form,breed:e.target.value})}/></label><label>Pelagem<input value={form.coat ?? ''} onChange={e => setForm({...form,coat:e.target.value || null})}/></label></div>
      <div className="form-row"><label>Pai<input value={form.sire_name ?? ''} onChange={e => setForm({...form,sire_name:e.target.value || null})}/></label><label>Mãe<input value={form.dam_name ?? ''} onChange={e => setForm({...form,dam_name:e.target.value || null})}/></label></div>
      <label>Situação<select value={form.status} onChange={e => setForm({...form,status:e.target.value as HorseInput['status']})}><option value="active">Ativo</option><option value="sold">Vendido</option><option value="transferred">Transferido</option><option value="deceased">Falecido</option></select></label>
      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button">Salvar animal</button></div>
    </form></div>}
  </section>
}
