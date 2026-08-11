import { FormEvent, useState } from 'react'
import { organizationLogoUrl, supabase } from '../lib/supabase'
import type { Organization } from '../types'

export function HarasSettings({ organization, onSaved }: { organization: Organization; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(organization.name)
  const [city, setCity] = useState(organization.city ?? '')
  const [state, setState] = useState(organization.state ?? '')
  const [logo, setLogo] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const currentLogo = organizationLogoUrl(organization.logo_path)

  async function save(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setLoading(true); setMessage('')
    let logoPath = organization.logo_path ?? null
    if (logo) {
      if (logo.size > 2 * 1024 * 1024) { setMessage('A imagem deve ter no máximo 2 MB.'); setLoading(false); return }
      const extension = logo.name.split('.').pop()?.toLowerCase() || 'png'
      logoPath = `${organization.id}/logo.${extension}`
      const { error } = await supabase.storage.from('organization-logos').upload(logoPath, logo, { upsert: true, contentType: logo.type })
      if (error) { setMessage(error.message); setLoading(false); return }
    }
    const { error } = await supabase.from('organizations').update({ name, city: city || null, state: state || null, logo_path: logoPath }).eq('id', organization.id)
    if (error) setMessage(error.message); else { setMessage('Identidade do haras atualizada.'); await onSaved() }
    setLoading(false)
  }

  return <section className="content settings-page"><div className="page-heading"><div><p className="eyebrow">PERSONALIZAÇÃO</p><h1>Identidade do haras</h1><p>Estas informações aparecem no ambiente da sua equipe.</p></div></div>
    <form className="panel settings-card" onSubmit={save}><div className="logo-editor"><div className="logo-preview">{currentLogo ? <img src={currentLogo} alt={`Logo ${organization.name}`}/> : organization.name.slice(0,2).toUpperCase()}</div><label>Logomarca<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setLogo(e.target.files?.[0] ?? null)}/><small>Formato quadrado recomendado. PNG, JPG ou WebP, até 2 MB.</small></label></div>
      <label>Nome do haras<input value={name} required onChange={e => setName(e.target.value)}/></label><div className="form-row"><label>Cidade<input value={city} onChange={e => setCity(e.target.value)}/></label><label>UF<input value={state} maxLength={2} onChange={e => setState(e.target.value.toUpperCase())}/></label></div>
      {message && <p className="form-message success-message">{message}</p>}<button className="primary-button" disabled={loading}>{loading ? 'Salvando…' : 'Salvar identidade'}</button>
    </form></section>
}
