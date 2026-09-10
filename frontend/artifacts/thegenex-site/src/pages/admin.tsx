import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, BarChart3, FileText, Inbox, LayoutDashboard, LogOut, Menu, Search, Settings2, Users, type LucideIcon } from 'lucide-react';
import { Link } from 'wouter';
import {
  IS_MOCK_MODE,
  getDashboardAnalytics,
  getDashboardOverview,
  listLeads,
  requestAdminOtp,
  updateLeadStatus,
  verifyAdminOtp,
  type DashboardAnalytics,
  type DashboardOverview,
  type Lead,
} from '@/lib/api';
import { clearAdminSession, getAdminSession, saveAdminSession } from '@/lib/admin-auth';

const side = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Leads', icon: Users },
  { label: 'Pages', icon: FileText },
];

const LEAD_STATUSES = ['New', 'Contacted', 'In Progress', 'Converted', 'Closed'];

export function AdminPage() {
  const [session, setSession] = useState(() => getAdminSession());

  if (!session) {
    return <AdminLogin onSignedIn={(s) => setSession(s)} />;
  }

  return <AdminWorkspace token={session.token} email={session.email} onSignOut={() => { clearAdminSession(); setSession(null); }} />;
}

// ---- Login (email + one-time code) -----------------------------------------

function AdminLogin({ onSignedIn }: { onSignedIn: (session: { token: string; email: string; expiresAt: number }) => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await requestAdminOtp(email.trim());
    setBusy(false);
    if (result.success) {
      setStep('code');
      setNotice('If that email is registered, a sign-in code has been sent.');
    } else {
      setError(result.error.message);
    }
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await verifyAdminOtp(email.trim(), code.trim());
    setBusy(false);
    if (result.success) {
      saveAdminSession(result.data.token, result.data.email, result.data.expiresInMs);
      onSignedIn({ token: result.data.token, email: result.data.email, expiresAt: Date.now() + result.data.expiresInMs });
    } else {
      setError(result.error.message);
    }
  };

  return <div className="grid min-h-[100dvh] place-items-center bg-[#0a1014] px-5 text-foreground">
    <div className="w-full max-w-sm rounded-xl border border-foreground/10 bg-[#0d151a] p-8">
      <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-[-.04em]" data-testid="link-admin-logo">
        <span className="h-5 w-5 rounded-full border border-primary" /><span>theGenEx<span className="text-primary">.</span></span>
      </Link>
      <p className="mt-8 font-mono text-[10px] uppercase tracking-[.18em] text-primary">Admin sign-in</p>
      <h1 className="mt-2 font-display text-2xl tracking-[-.04em]">
        {step === 'email' ? 'Sign in to the workspace.' : 'Enter your code.'}
      </h1>

      {IS_MOCK_MODE && <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 p-3 text-xs leading-5 text-accent">
        Development mode: no backend is configured (VITE_API_URL is unset), so sign-in and dashboard data are mocked.
      </p>}

      {step === 'email'
        ? <form onSubmit={submitEmail} className="mt-6 space-y-4">
            <label className="block text-sm text-muted-foreground">Admin email
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
                className="mt-2 w-full rounded-md border border-foreground/10 bg-background px-3 py-3 text-foreground outline-none focus:border-primary"
                data-testid="input-admin-email" />
            </label>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-5 py-3 font-mono text-[11px] uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-send-code">
              {busy ? 'Sending...' : 'Send sign-in code'} <ArrowRight size={14} />
            </button>
          </form>
        : <form onSubmit={submitCode} className="mt-6 space-y-4">
            {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
            <label className="block text-sm text-muted-foreground">6-digit code
              <input required inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus
                className="mt-2 w-full rounded-md border border-foreground/10 bg-background px-3 py-3 text-center font-mono text-lg tracking-[.3em] text-foreground outline-none focus:border-primary"
                data-testid="input-admin-code" />
            </label>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-5 py-3 font-mono text-[11px] uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-verify-code">
              {busy ? 'Verifying...' : 'Verify & sign in'} <ArrowRight size={14} />
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} className="w-full font-mono text-[10px] uppercase tracking-[.13em] text-muted-foreground hover:text-primary" data-testid="button-back-to-email">
              Use a different email
            </button>
          </form>}

      <Link href="/" className="mt-8 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground" data-testid="link-admin-exit-login">
        <LogOut size={14} />Back to site
      </Link>
    </div>
  </div>;
}

// ---- Authenticated workspace -----------------------------------------------

function AdminWorkspace({ token, email, onSignOut }: { token: string; email: string; onSignOut: () => void }) {
  const [active, setActive] = useState('Overview');
  const [notice, setNotice] = useState('');
  const show = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200); };

  return <div className="min-h-[100dvh] bg-[#0a1014] text-foreground">
    <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-foreground/10 bg-[#0d151a] p-5 md:block">
      <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-[-.04em]" data-testid="link-admin-logo"><span className="h-5 w-5 rounded-full border border-primary" /><span>theGenEx<span className="text-primary">.</span></span></Link>
      <p className="mt-12 px-2 font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">Workspace</p>
      <nav className="mt-3 space-y-1">{side.map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => setActive(item.label)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm ${active === item.label ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'}`} data-testid={`button-admin-${item.label.toLowerCase()}`}><Icon size={16} />{item.label}</button>; })}</nav>
      <div className="absolute bottom-5 left-5 right-5 border-t border-foreground/10 pt-4"><button onClick={() => show('Settings live in the Google Sheet Settings tab for now.')} className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground" data-testid="button-admin-settings"><Settings2 size={16} />Settings</button><button onClick={onSignOut} className="mt-2 flex w-full items-center gap-3 px-3 py-2 text-sm text-muted-foreground" data-testid="button-admin-signout"><LogOut size={16} />Sign out</button></div>
    </aside>
    <div className="md:pl-60">
      <header className="flex h-[72px] items-center justify-between border-b border-foreground/10 px-5 lg:px-9">
        <div className="flex items-center gap-3"><button className="md:hidden" onClick={() => show('Use the desktop workspace for full navigation.')} aria-label="Open admin menu" data-testid="button-admin-menu"><Menu size={19} /></button><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Admin</p><p className="mt-1 text-sm text-muted-foreground">Signed in as {email}</p></div></div>
        <div className="flex items-center gap-3">{IS_MOCK_MODE && <span className="hidden font-mono text-[10px] text-accent sm:block">Mock data</span>}<span className="grid h-8 w-8 place-items-center rounded-full bg-accent/20 font-mono text-xs text-accent">{email.slice(0, 2).toUpperCase()}</span></div>
      </header>
      <main className="px-5 py-8 lg:px-9">
        <div className="mb-8 flex items-end justify-between"><div><h1 className="font-display text-3xl tracking-[-.05em]">{active}</h1><p className="mt-1 text-sm text-muted-foreground">A clear view of the work coming through the site.</p></div></div>
        {active === 'Overview' && <OverviewTab token={token} />}
        {active === 'Leads' && <LeadsTab token={token} />}
        {active === 'Pages' && <div className="grid gap-3 md:grid-cols-2">{['Home', 'Services', 'Solutions', 'Products', 'About', 'Contact'].map((x) => <div key={x} className="flex items-center justify-between rounded-lg border border-foreground/10 bg-card p-5"><div><p className="font-display text-lg">{x}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.12em] text-primary">Published</p></div><button onClick={() => show(`${x} page editing is not available in this workspace yet.`)} className="rounded-md border border-foreground/10 px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary" data-testid={`button-edit-page-${x.toLowerCase()}`}>Edit</button></div>)}</div>}
      </main>
    </div>
    {notice && <div className="fixed bottom-5 right-5 rounded-md border border-primary/40 bg-card px-4 py-3 text-sm shadow-xl" data-testid="status-admin-notice">{notice}</div>}
  </div>;
}

// ---- Overview tab ------------------------------------------------------------

function OverviewCardSkeleton() {
  return <div className="rounded-lg border border-foreground/10 bg-card p-5"><div className="h-4 w-24 animate-pulse rounded bg-foreground/10" /><div className="mt-5 h-8 w-16 animate-pulse rounded bg-foreground/10" /></div>;
}

function OverviewTab({ token }: { token: string }) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getDashboardOverview(token), getDashboardAnalytics(token, range)]).then(([ov, an]) => {
      if (cancelled) return;
      if (ov.success) setOverview(ov.data); else setError(ov.error.message);
      if (an.success) setAnalytics(an.data); else setError(an.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token, range]);

  const cards: Array<{ label: string; value: string; Icon: LucideIcon }> = overview ? [
    { label: 'Total visitors', value: String(overview.totalVisitors), Icon: Inbox },
    { label: "Today's visitors", value: String(overview.todayVisitors), Icon: Users },
    { label: 'Total leads', value: String(overview.totalLeads), Icon: BarChart3 },
    { label: 'Conversion rate', value: `${overview.conversionRate}%`, Icon: FileText },
  ] : [];

  const maxDaily = analytics ? Math.max(1, ...analytics.dailyPageViews.map(d => d.count)) : 1;

  return <>
    {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}
    <div className="mb-4 flex justify-end gap-2">
      {(['today', '7d', '30d', 'all'] as const).map(r => <button key={r} onClick={() => setRange(r)} className={`rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.1em] ${range === r ? 'border-primary text-primary' : 'border-foreground/10 text-muted-foreground'}`} data-testid={`button-range-${r}`}>{r}</button>)}
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {loading ? Array.from({ length: 4 }).map((_, i) => <OverviewCardSkeleton key={i} />) : cards.map(({ label, value, Icon }, i) => <div key={label} className="rounded-lg border border-foreground/10 bg-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon size={16} className={i === 3 ? 'text-accent' : 'text-primary'} /></div><p className="mt-5 font-display text-3xl" data-testid={`text-metric-${label.replace(/\s/g, '-').toLowerCase()}`}>{value}</p></div>)}
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <div className="rounded-lg border border-foreground/10 bg-card p-5">
        <div><h2 className="font-display text-lg">Page views</h2><p className="mt-1 text-xs text-muted-foreground">Daily page views ({range})</p></div>
        <div className="mt-7 flex h-40 items-end gap-1.5 px-1">
          {loading || !analytics ? <div className="h-full w-full animate-pulse rounded bg-foreground/5" /> : analytics.dailyPageViews.length === 0
            ? <p className="text-xs text-muted-foreground">No page views yet in this range.</p>
            : analytics.dailyPageViews.map((d) => <div key={d.date} title={`${d.date}: ${d.count}`} className="flex-1 rounded-t-sm bg-primary/70 transition-all hover:bg-primary" style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }} />)}
        </div>
      </div>
      <div className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="font-display text-lg">Popular pages</h2>
        <p className="mt-1 text-xs text-muted-foreground">By page views ({range})</p>
        <div className="mt-7 space-y-4">
          {loading || !analytics ? <div className="h-24 animate-pulse rounded bg-foreground/5" /> : analytics.popularPages.length === 0
            ? <p className="text-xs text-muted-foreground">No data yet.</p>
            : analytics.popularPages.slice(0, 6).map(p => {
                const max = analytics.popularPages[0]?.count || 1;
                return <div key={p.page}><div className="flex justify-between text-xs"><span className="truncate">{p.page}</span><span className="font-mono text-muted-foreground">{p.count}</span></div><div className="mt-2 h-1.5 rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary" style={{ width: `${(p.count / max) * 100}%` }} /></div></div>;
              })}
        </div>
      </div>
    </div>
  </>;
}

// ---- Leads tab -----------------------------------------------------------------

function LeadsTab({ token }: { token: string }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = () => {
    setError('');
    listLeads(token, { status: statusFilter || undefined, q: query || undefined }).then((res) => {
      if (res.success) setLeads(res.data.leads); else setError(res.error.message);
    });
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token, statusFilter]);

  const search = (e: FormEvent) => { e.preventDefault(); load(); };

  const changeStatus = async (lead: Lead, status: string) => {
    setUpdating(true);
    const res = await updateLeadStatus(token, lead.id, status);
    setUpdating(false);
    if (res.success) {
      setLeads((prev) => prev?.map((l) => (l.id === lead.id ? { ...l, status } : l)) ?? null);
      if (selected?.id === lead.id) setSelected({ ...lead, status });
    } else {
      setError(res.error.message);
    }
  };

  return <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
    <div className="rounded-lg border border-foreground/10 bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-foreground/10 p-5">
        <form onSubmit={search} className="flex flex-1 items-center gap-2 rounded-md border border-foreground/10 bg-background px-3 py-2">
          <Search size={14} className="text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, company..." className="w-full bg-transparent text-sm outline-none" data-testid="input-lead-search" />
        </form>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-foreground/10 bg-background px-3 py-2 text-xs" data-testid="select-status-filter">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {error && <p className="p-5 text-sm text-destructive" role="alert">{error}</p>}
      {!leads ? <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded bg-foreground/5" />)}</div>
        : leads.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No leads yet.</p>
        : <div className="divide-y divide-foreground/10">{leads.map((lead) => <button key={lead.id} onClick={() => setSelected(lead)} className={`grid w-full gap-3 p-5 text-left sm:grid-cols-[1.1fr_1fr_1fr_auto] sm:items-center ${selected?.id === lead.id ? 'bg-primary/5' : ''}`} data-testid={`row-lead-${lead.id}`}>
            <div><p className="text-sm">{lead.name}</p><p className="mt-1 text-xs text-muted-foreground">{lead.company || '—'}</p></div>
            <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
            <p className="truncate text-xs text-muted-foreground">{lead.requirement}</p>
            <span className="w-fit rounded-full bg-foreground/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{lead.status}</span>
          </button>)}</div>}
    </div>

    <div className="rounded-lg border border-foreground/10 bg-card p-6">
      {!selected ? <p className="text-sm text-muted-foreground">Select a lead to view details.</p> : <div data-testid="panel-lead-detail">
        <h2 className="font-display text-2xl tracking-[-.03em]">{selected.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{selected.company || 'No company given'}</p>
        <div className="mt-6 space-y-3 text-sm">
          <Row label="Email" value={selected.email} />
          <Row label="Phone" value={selected.phone || '—'} />
          <Row label="Requirement" value={selected.requirement} />
          <Row label="Budget" value={selected.budget || '—'} />
          <Row label="Message" value={selected.message || '—'} />
          <Row label="Source" value={selected.source_page || '—'} />
          <Row label="Submitted" value={new Date(selected.created_at).toLocaleString()} />
        </div>
        <label className="mt-6 block text-sm text-muted-foreground">Status
          <select disabled={updating} value={selected.status} onChange={(e) => changeStatus(selected, e.target.value)} className="mt-2 w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary" data-testid="select-lead-status">
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>}
    </div>
  </div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><p className="font-mono text-[10px] uppercase tracking-[.12em] text-primary">{label}</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{value}</p></div>;
}
