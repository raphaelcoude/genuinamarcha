import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Auth } from './components/Auth'
import { Horses } from './components/Horses'
import { HarasSettings } from './components/HarasSettings'
import { Onboarding } from './components/Onboarding'
import { PlatformAdmin } from './components/PlatformAdmin'
import { isConfigured, organizationLogoUrl, supabase } from './lib/supabase'
import type { Membership } from './types'

type Page = 'overview' | 'horses' | 'settings'
type AdminView = 'platform' | 'haras' | 'create-haras'

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [platformAdmin, setPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<Page>('overview')
  const [adminView, setAdminView] = useState<AdminView>('platform')
  const [menuOpen, setMenuOpen] = useState(false)

  async function loadMembership() {
    if (!supabase) return
    const { data: admin } = await supabase.from('platform_admins').select('user_id').maybeSingle()
    setPlatformAdmin(Boolean(admin))
    const { data } = await supabase.from('memberships').select('role, organization:organizations(id,name,slug,city,state,logo_path)').eq('status', 'active').limit(1).maybeSingle()
    if (data) setMembership(data as unknown as Membership); else setMembership(null)
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); if (data.session) await loadMembership(); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (next) void loadMembership(); else setMembership(null) })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <main className="setup-page"><div className="setup-card"><span className="brand-mark large">GM</span><p className="eyebrow">CONFIGURAÇÃO NECESSÁRIA</p><h1>Conecte o banco do Genuína</h1><p>A aplicação está pronta. Copie <code>.env.example</code> para <code>.env.local</code> e informe as duas chaves públicas do projeto Supabase.</p><p>Depois, aplique a migração disponível na pasta <code>supabase/migrations</code>.</p></div></main>
  if (loading) return <div className="loading-screen"><span className="brand-mark large">GM</span><p>Carregando seu haras…</p></div>
  if (!session) return <Auth />
  const userName = session.user.user_metadata.full_name || session.user.email || 'Usuário'
  if (platformAdmin && adminView === 'platform') return <PlatformAdmin userName={userName} hasHaras={Boolean(membership)} onOpenHaras={() => setAdminView('haras')} onCreateHaras={() => setAdminView('create-haras')}/>
  if (platformAdmin && adminView === 'create-haras') return <div className="admin-onboarding"><button className="back-to-platform" onClick={() => setAdminView('platform')}>← Voltar ao painel da plataforma</button><Onboarding onDone={async () => { await loadMembership(); setAdminView('haras') }}/></div>
  if (!membership) return <Onboarding onDone={loadMembership} />

  const canEdit = ['owner', 'admin', 'manager'].includes(membership.role)
  const harasLogo = organizationLogoUrl(membership.organization.logo_path)
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <button className="brand brand-button haras-brand" onClick={() => setPage('overview')}>{harasLogo ? <img src={harasLogo} alt={`Logo ${membership.organization.name}`}/> : <span className="brand-mark">{membership.organization.name.slice(0,2).toUpperCase()}</span>}<span><small>AMBIENTE DO HARAS</small><strong>{membership.organization.name}</strong></span></button>
      <nav aria-label="Navegação principal">
        <button className={`nav-link ${page === 'overview' ? 'active' : ''}`} onClick={() => { setPage('overview'); setMenuOpen(false) }}><span>⌂</span>Visão geral</button>
        <button className={`nav-link ${page === 'horses' ? 'active' : ''}`} onClick={() => { setPage('horses'); setMenuOpen(false) }}><span>♞</span>Cavalos</button>
        <button className="nav-link" disabled><span>▦</span>Baias <small>em breve</small></button>
        <button className="nav-link" disabled><span>◇</span>Estoque <small>em breve</small></button>
        <button className="nav-link" disabled><span>✚</span>Saúde e manejo</button>
        <button className="nav-link" disabled><span>↗</span>Financeiro</button>
        {canEdit && <button className={`nav-link ${page === 'settings' ? 'active' : ''}`} onClick={() => { setPage('settings'); setMenuOpen(false) }}><span>⚙</span>Personalização</button>}
      </nav>
      <div className="sidebar-footer"><div className="farm-avatar">{membership.organization.name.slice(0,2).toUpperCase()}</div><div><strong>{membership.organization.name}</strong><small>{membership.role === 'owner' ? 'Proprietário' : membership.role}</small></div></div>
    </aside>
    <main>
      <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">☰</button>{platformAdmin && <button className="back-platform-button" onClick={() => setAdminView('platform')}>← Painel da plataforma</button>}<div className="search"><span>⌕</span><input type="search" placeholder="Buscar no haras…"/></div><div className="user"><span className="user-avatar">{userName.slice(0,2).toUpperCase()}</span><span><strong>{userName}</strong><button className="signout" onClick={() => supabase?.auth.signOut()}>Sair</button></span></div></header>
      {page === 'horses' ? <Horses organization={membership.organization} canEdit={canEdit}/> : page === 'settings' ? <HarasSettings organization={membership.organization} onSaved={loadMembership}/> : <Overview name={userName.split(' ')[0]} onHorses={() => setPage('horses')}/>} 
    </main>
  </div>
}

function Overview({ name, onHorses }: { name: string, onHorses: () => void }) {
  return <section className="content"><div className="page-heading"><div><p className="eyebrow">VISÃO GERAL DO HARAS</p><h1>Bom dia, {name}.</h1><p>Acompanhe o que acontece no seu haras hoje.</p></div><button className="primary-button" onClick={onHorses}>＋ Cadastrar animal</button></div>
    <div className="metrics"><article className="metric"><div className="metric-icon green">♞</div><div><span>Plantel ativo</span><strong>—</strong><small>Dados reais no módulo Cavalos</small></div></article><article className="metric"><div className="metric-icon gold">▦</div><div><span>Ocupação das baias</span><strong>—</strong><small>Módulo em preparação</small></div></article><article className="metric"><div className="metric-icon blue">◇</div><div><span>Estoque em atenção</span><strong>—</strong><small>Módulo em preparação</small></div></article><article className="metric"><div className="metric-icon rose">↗</div><div><span>Custos no mês</span><strong>—</strong><small>Módulo em preparação</small></div></article></div>
    <div className="dashboard-grid"><section className="panel welcome-panel"><p className="section-tag">COMECE POR AQUI</p><h2>Monte o plantel do seu haras</h2><p>Cadastre os animais com registro, filiação, raça, sexo e pelagem. Cada informação fica protegida dentro do ambiente do seu haras.</p><button className="secondary-button compact" onClick={onHorses}>Ir para Cavalos →</button></section><aside className="panel"><p className="section-tag">PRÓXIMAS ETAPAS</p><h2>Gestão completa</h2><ul className="roadmap-list"><li><b>01</b>Baias e ocupações</li><li><b>02</b>Saúde e manejo</li><li><b>03</b>Estoque e alimentação</li><li><b>04</b>Financeiro e relatórios</li></ul></aside></div>
  </section>
}
