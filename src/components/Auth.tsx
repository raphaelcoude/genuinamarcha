import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMessage('')
    try {
      if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) throw error
        setMessage('Enviamos as instruções de recuperação para seu e-mail.')
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) throw error
        setMessage('Cadastro recebido. Confira seu e-mail para confirmar o acesso.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.')
    } finally { setLoading(false) }
  }

  return <main className="auth-page">
    <section className="auth-brand">
      <div className="auth-brand-content"><span className="brand-mark large">GM</span><p className="eyebrow light">GESTÃO PARA QUEM VIVE O CAMPO</p><h1>Seu haras.<br/>No seu controle.</h1><p>Plantel, manejo, estoque e finanças reunidos em um só lugar.</p></div>
    </section>
    <section className="auth-form-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo"><span className="brand-mark">GM</span><span>Genuína <strong>Marcha</strong></span></div>
        <p className="eyebrow">ACESSO SEGURO</p>
        <h2>{mode === 'login' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Crie sua conta' : 'Recuperar acesso'}</h2>
        <p className="form-intro">{mode === 'login' ? 'Entre para gerenciar seu haras.' : mode === 'signup' ? 'Comece configurando seu acesso administrativo.' : 'Informe o e-mail cadastrado.'}</p>
        {mode === 'signup' && <label>Nome completo<input value={name} onChange={e => setName(e.target.value)} required autoComplete="name"/></label>}
        <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="voce@haras.com.br"/></label>
        {mode !== 'recovery' && <label>Senha<input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label>}
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="primary-button wide" disabled={loading}>{loading ? 'Aguarde…' : mode === 'login' ? 'Entrar no sistema' : mode === 'signup' ? 'Criar conta' : 'Enviar recuperação'}</button>
        <div className="auth-links">
          {mode === 'login' && <button type="button" onClick={() => setMode('recovery')}>Esqueci minha senha</button>}
          <button type="button" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Já tenho uma conta' : 'Criar nova conta'}</button>
        </div>
      </form>
    </section>
  </main>
}
