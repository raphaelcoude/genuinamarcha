import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setLoading(true); setError('')
    const { error } = await supabase.rpc('create_haras', { haras_name: name, haras_city: city || null, haras_state: state || null })
    setLoading(false)
    if (error) setError(error.message); else onDone()
  }

  return <main className="onboarding-page"><form className="onboarding-card" onSubmit={submit}>
    <span className="brand-mark large">GM</span><p className="eyebrow">PRIMEIROS PASSOS</p><h1>Vamos configurar seu haras</h1><p>Você será cadastrado como proprietário e administrador deste ambiente.</p>
    <label>Nome do haras<input value={name} onChange={e => setName(e.target.value)} required placeholder="Ex.: Haras Santa Fé"/></label>
    <div className="form-row"><label>Cidade<input value={city} onChange={e => setCity(e.target.value)}/></label><label>UF<input value={state} maxLength={2} onChange={e => setState(e.target.value.toUpperCase())}/></label></div>
    {error && <p className="form-message">{error}</p>}<button className="primary-button wide" disabled={loading}>{loading ? 'Criando…' : 'Criar meu haras'}</button>
  </form></main>
}
