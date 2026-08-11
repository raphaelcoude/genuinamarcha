import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Auth } from './components/Auth'
import { Horses } from './components/Horses'
import { HarasSettings } from './components/HarasSettings'
import { Facilities, Finance, Health, Inventory, Tasks } from './components/Operations'
import { Onboarding } from './components/Onboarding'
import { PlatformAdmin } from './components/PlatformAdmin'
import { Team } from './components/Team'
import { isConfigured, organizationLogoUrl, supabase } from './lib/supabase'
import type { Horse, Membership } from './types'

type Page = 'overview' | 'horses' | 'facilities' | 'health' | 'inventory' | 'tasks' | 'finance' | 'team' | 'settings'
type AdminView = 'platform' | 'haras' | 'create-haras'

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [platformAdmin, setPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<Page>('overview')
  const [adminView, setAdminView] = useState<AdminView>('platform')
  const [menuOpen, setMenuOpen] = useState(false)
  const [horses, setHorses] = useState<Horse[]>([])

  async function loadMembership() {
    if (!supabase) return
    const { data: admin } = await supabase.from('platform_admins').select('user_id').maybeSingle()
    setPlatformAdmin(Boolean(admin))
    await supabase.rpc('accept_my_invites')
    const { data } = await supabase.from('memberships').select('role, organization:organizations(id,name,slug,city,state,logo_path)').eq('status', 'active').limit(1).maybeSingle()
    if (data) {
      const next = data as unknown as Membership
      setMembership(next)
      const { data: horseData } = await supabase.from('horses').select('*').eq('organization_id', next.organization.id).order('name')
      setHorses((horseData ?? []) as Horse[])
    } else { setMembership(null); setHorses([]) }
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
  const canOperate = ['owner', 'admin', 'manager', 'staff', 'vet'].includes(membership.role)
  const canFinance = ['owner', 'admin', 'manager', 'finance'].includes(membership.role)
  const harasLogo = organizationLogoUrl(membership.organization.logo_path)
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <button className="brand brand-button haras-brand" onClick={() => setPage('overview')}>{harasLogo ? <img src={harasLogo} alt={`Logo ${membership.organization.name}`}/> : <span className="brand-mark">{membership.organization.name.slice(0,2).toUpperCase()}</span>}<span><small>AMBIENTE DO HARAS</small><strong>{membership.organization.name}</strong></span></button>
      <nav aria-label="Navegação principal">
        <button className={`nav-link ${page === 'overview' ? 'active' : ''}`} onClick={() => { setPage('overview'); setMenuOpen(false) }}><span>⌂</span>Visão geral</button>
        <button className={`nav-link ${page === 'horses' ? 'active' : ''}`} onClick={() => { setPage('horses'); setMenuOpen(false) }}><span>♞</span>Cavalos</button>
        <button className={`nav-link ${page === 'facilities' ? 'active' : ''}`} onClick={() => { setPage('facilities'); setMenuOpen(false) }}><span>▦</span>Baias e piquetes</button>
        <button className={`nav-link ${page === 'health' ? 'active' : ''}`} onClick={() => { setPage('health'); setMenuOpen(false) }}><span>✚</span>Saúde e manejo</button>
        <button className={`nav-link ${page === 'inventory' ? 'active' : ''}`} onClick={() => { setPage('inventory'); setMenuOpen(false) }}><span>◇</span>Estoque</button>
        <button className={`nav-link ${page === 'tasks' ? 'active' : ''}`} onClick={() => { setPage('tasks'); setMenuOpen(false) }}><span>□</span>Agenda e tarefas</button>
        <button className={`nav-link ${page === 'finance' ? 'active' : ''}`} onClick={() => { setPage('finance'); setMenuOpen(false) }}><span>↗</span>Financeiro</button>
        {canEdit && <button className={`nav-link ${page === 'team' ? 'active' : ''}`} onClick={() => { setPage('team'); setMenuOpen(false) }}><span>◉</span>Equipe e acessos</button>}
        {canEdit && <button className={`nav-link ${page === 'settings' ? 'active' : ''}`} onClick={() => { setPage('settings'); setMenuOpen(false) }}><span>⚙</span>Personalização</button>}
      </nav>
      <div className="sidebar-footer"><div className="farm-avatar">{membership.organization.name.slice(0,2).toUpperCase()}</div><div><strong>{membership.organization.name}</strong><small>{membership.role === 'owner' ? 'Proprietário' : membership.role}</small></div></div>
    </aside>
    <main>
      <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">☰</button>{platformAdmin && <button className="back-platform-button" onClick={() => setAdminView('platform')}>← Painel da plataforma</button>}<div className="search"><span>⌕</span><input type="search" placeholder="Buscar no haras…"/></div><div className="user"><span className="user-avatar">{userName.slice(0,2).toUpperCase()}</span><span><strong>{userName}</strong><button className="signout" onClick={() => supabase?.auth.signOut()}>Sair</button></span></div></header>
      {page === 'horses' ? <Horses organization={membership.organization} canEdit={canEdit} onChanged={loadMembership}/> :
       page === 'facilities' ? <Facilities organization={membership.organization} canEdit={canOperate} horses={horses}/> :
       page === 'health' ? <Health organization={membership.organization} canEdit={canOperate} horses={horses}/> :
       page === 'inventory' ? <Inventory organization={membership.organization} canEdit={canOperate}/> :
       page === 'tasks' ? <Tasks organization={membership.organization} canEdit={canOperate} horses={horses}/> :
       page === 'finance' ? <Finance organization={membership.organization} canEdit={canFinance} horses={horses}/> :
       page === 'team' ? <Team organization={membership.organization} canEdit={canEdit}/> :
       page === 'settings' ? <HarasSettings organization={membership.organization} onSaved={loadMembership}/> :
       <Overview
         name={userName.split(' ')[0]}
         organizationId={membership.organization.id}
         horseCount={horses.filter((horse) => horse.status === 'active').length}
         onHorses={() => setPage('horses')}
       />}
    </main>
  </div>
}

function Overview({ name, organizationId, horseCount, onHorses }: { name: string; organizationId: string; horseCount: number; onHorses: () => void }) {
  const [stats,setStats]=useState({facilities:0,occupied:0,lowStock:0,pendingTasks:0,monthBalance:0})
  useEffect(()=>{if(!supabase)return;const monthStart=new Date();monthStart.setDate(1);void Promise.all([
    supabase.from('facilities').select('id,current_horse_id').eq('organization_id',organizationId).eq('active',true),
    supabase.from('inventory_items').select('current_stock,minimum_stock').eq('organization_id',organizationId),
    supabase.from('tasks').select('id').eq('organization_id',organizationId).in('status',['pending','scheduled']),
    supabase.from('financial_entries').select('amount,entry_type,status').eq('organization_id',organizationId).gte('due_date',monthStart.toISOString().slice(0,10)).neq('status','cancelled')
  ]).then(([f,i,t,m])=>setStats({facilities:f.data?.length??0,occupied:f.data?.filter(x=>x.current_horse_id).length??0,lowStock:i.data?.filter(x=>Number(x.current_stock)<=Number(x.minimum_stock)).length??0,pendingTasks:t.data?.length??0,monthBalance:m.data?.reduce((sum,x)=>sum+(x.entry_type==='income'?Number(x.amount):-Number(x.amount)),0)??0}))},[organizationId])
  return <section className="content"><div className="page-heading"><div><p className="eyebrow">VISÃO GERAL DO HARAS</p><h1>Bom dia, {name}.</h1><p>Acompanhe o que acontece no seu haras hoje.</p></div><button className="primary-button" onClick={onHorses}>＋ Cadastrar animal</button></div>
    <div className="metrics"><article className="metric"><div className="metric-icon green">♞</div><div><span>Plantel ativo</span><strong>{horseCount}</strong><small>Animais em atividade</small></div></article><article className="metric"><div className="metric-icon gold">▦</div><div><span>Ocupação dos espaços</span><strong>{stats.occupied} <em>/ {stats.facilities}</em></strong><small>Baias e piquetes ocupados</small></div></article><article className="metric"><div className="metric-icon blue">◇</div><div><span>Estoque em atenção</span><strong>{stats.lowStock}</strong><small>Itens no limite ou abaixo</small></div></article><article className="metric"><div className="metric-icon rose">↗</div><div><span>Saldo previsto no mês</span><strong>{stats.monthBalance.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong><small>{stats.pendingTasks} tarefas pendentes</small></div></article></div>
    <div className="dashboard-grid"><section className="panel welcome-panel"><p className="section-tag">CLIENTE-PILOTO</p><h2>Operação do haras em um só lugar</h2><p>Cadastre a rotina real do haras durante os testes. As observações do dia a dia vão orientar os próximos ajustes do produto.</p><button className="secondary-button compact" onClick={onHorses}>Abrir plantel →</button></section><aside className="panel"><p className="section-tag">MÓDULOS ATIVOS</p><h2>Gestão completa</h2><ul className="roadmap-list"><li><b>01</b>Plantel e genealogia</li><li><b>02</b>Baias, saúde e manejo</li><li><b>03</b>Estoque, alimentação e tarefas</li><li><b>04</b>Financeiro e equipe</li></ul></aside></div>
  </section>
}
