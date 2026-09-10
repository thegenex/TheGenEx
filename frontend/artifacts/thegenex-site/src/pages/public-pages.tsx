import { FormEvent, useState } from 'react';
import { ArrowRight, Bot, Check, Code2, Layers, Mail, type LucideIcon } from 'lucide-react';
import { Link } from 'wouter';
import { ButtonLink, IconBadge, SectionLabel, SiteShell } from '@/components/site-shell';
import { NetworkVisual } from '@/components/network-visual';
import { products, services, solutions } from '@/data/site';
import { trackEvent } from '@/lib/analytics';
import { submitLead } from '@/lib/api';
import { getSessionId, getVisitorId } from '@/lib/visitor';

const SERVICE_ICONS: Record<string, LucideIcon> = { Bot, Code2, Layers };

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <section className="mx-auto max-w-7xl px-5 pb-20 pt-36 lg:px-8 lg:pb-28"><SectionLabel>{eyebrow}</SectionLabel><h1 className="max-w-4xl font-display text-5xl font-medium tracking-[-.065em] text-balance sm:text-7xl">{title}</h1><p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{copy}</p></section>; }

export function HomePage() { return <SiteShell><main className="site-grid">
  <section className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-12 px-5 pb-20 pt-36 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:pt-40">
    <div className="reveal"><SectionLabel>AI automation / technology partner</SectionLabel><h1 className="max-w-3xl font-display text-[clamp(3.8rem,8vw,8rem)] font-medium leading-[.92] tracking-[-.08em]">Build smarter.<br /><span className="text-primary">Automate everything.</span></h1><p className="mt-8 max-w-xl text-lg leading-8 text-muted-foreground">We turn repetitive business workflows into intelligent systems, custom software, and reusable digital products.</p><div className="mt-9 flex flex-wrap gap-3"><ButtonLink href="/contact">Talk to theGenEx</ButtonLink><ButtonLink href="/services" secondary>Explore capabilities</ButtonLink></div><p className="mt-8 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Designed for teams who are done working around their systems.</p></div>
    <div className="reveal reveal-delay relative"><NetworkVisual /><div className="absolute -bottom-5 -right-3 rounded-lg border border-accent/30 bg-card px-4 py-3 shadow-2xl sm:right-5"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-accent">Core belief</p><p className="mt-1 text-sm">Good systems create momentum.</p></div></div>
  </section>
  <section className="mx-auto max-w-7xl border-t border-foreground/[.22] px-5 py-24 lg:px-8"><div className="grid gap-12 lg:grid-cols-[.65fr_1.35fr]"><div><SectionLabel>The shift</SectionLabel><h2 className="font-display text-4xl tracking-[-.06em] sm:text-5xl">Your best people should not be your workaround.</h2></div><div className="grid gap-6 sm:grid-cols-2"><div className="border-l border-primary/50 pl-5"><p className="font-mono text-xs text-primary">01 / FIND THE FRICTION</p><p className="mt-3 leading-7 text-muted-foreground">We look past symptoms to understand the decisions, dependencies, and handoffs underneath.</p></div><div className="border-l border-accent/50 pl-5"><p className="font-mono text-xs text-accent">02 / BUILD THE LEVER</p><p className="mt-3 leading-7 text-muted-foreground">We design a system your team can trust, use, and extend — not another tool to babysit.</p></div></div></div></section>
  <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8"><div className="flex items-end justify-between gap-6"><div><SectionLabel>What we build</SectionLabel><h2 className="font-display text-4xl tracking-[-.06em] sm:text-5xl">From recurring task<br />to reliable system.</h2></div><Link href="/services" className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-primary sm:flex" data-testid="link-home-services">All capabilities <ArrowRight size={14} /></Link></div><div className="mt-12 grid gap-4 lg:grid-cols-3">{services.map(item => <Link href="/services" key={item.id} onClick={() => trackEvent('service_click', { id: item.id })} className="group rounded-xl border border-foreground/20 bg-card/85 p-6 transition-all hover:-translate-y-1 hover:border-primary/50" data-testid={`card-service-${item.id}`}><div className="flex items-center justify-between"><IconBadge icon={SERVICE_ICONS[item.icon]} /><span className="font-mono text-xs text-primary">{item.number}</span></div><h3 className="mt-8 font-display text-2xl tracking-[-.04em]">{item.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.blurb}</p><span className="mt-8 inline-flex text-primary opacity-0 transition-opacity group-hover:opacity-100"><ArrowRight size={18} /></span></Link>)}</div></section>
  <section className="border-y border-foreground/[.22] bg-card/75"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8"><div><SectionLabel>Ready when you are</SectionLabel><h2 className="max-w-3xl font-display text-4xl tracking-[-.06em] sm:text-6xl">Bring us the messy part.</h2><p className="mt-5 max-w-xl text-muted-foreground">A process, a product idea, or a system that should work harder. We will help you find the first move.</p></div><ButtonLink href="/contact">Start a conversation</ButtonLink></div></section>
 </main></SiteShell>; }

export function ServicesPage() { return <SiteShell><main><PageIntro eyebrow="Capabilities / 01" title="The right layer of intelligence for the work you repeat." copy="We combine product thinking, software engineering, and practical AI to make operations clearer and more capable." /><section className="mx-auto max-w-7xl px-5 pb-28 lg:px-8"><div className="space-y-3">{services.map(item => <article key={item.id} className="group grid gap-5 border-t border-foreground/20 py-9 md:grid-cols-[80px_1fr_1fr]"><div className="flex items-center gap-3 md:flex-col md:items-start md:gap-4"><IconBadge icon={SERVICE_ICONS[item.icon]} /><span className="font-mono text-sm text-primary">{item.number}</span></div><h2 className="font-display text-3xl tracking-[-.05em] transition-colors group-hover:text-primary">{item.title}</h2><p className="max-w-md text-sm leading-7 text-muted-foreground">{item.detail}</p></article>)}</div></section><section className="bg-card/85"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><SectionLabel>How we work</SectionLabel><div className="grid gap-10 md:grid-cols-4">{['Listen closely', 'Map the system', 'Build the useful thing', 'Keep improving'].map((x, i) => <div key={x}><span className="font-mono text-xs text-accent">0{i + 1}</span><h3 className="mt-4 font-display text-xl">{x}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{['Understand the people and pressure points before reaching for a tool.', 'Make the invisible logic legible so the highest-leverage move is obvious.', 'Ship an intentional first version that earns adoption from day one.', 'Build a feedback loop so the system compounds instead of collecting dust.'][i]}</p></div>)}</div></div></section></main></SiteShell>; }

export function SolutionsPage() { return <SiteShell><main><PageIntro eyebrow="Solutions / 02" title="Systems that make the next action obvious." copy="Every business has a different shape. We start with the work, not a pre-packaged stack." /><section className="mx-auto max-w-7xl px-5 pb-28 lg:px-8"><div className="grid gap-4 md:grid-cols-2">{solutions.map((item, i) => <article key={item.label} className={`min-h-[280px] rounded-xl border p-7 ${i % 2 === 0 ? 'border-primary/25 bg-primary/[.035]' : 'border-accent/25 bg-accent/[.035]'}`}><span className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">{item.label}</span><h2 className="mt-20 max-w-sm font-display text-3xl tracking-[-.05em]">{item.title}</h2><p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{item.copy}</p></article>)}</div></section><section className="mx-auto max-w-7xl px-5 pb-28 lg:px-8"><div className="grid gap-12 lg:grid-cols-2 lg:items-center"><NetworkVisual compact /><div><SectionLabel>Built around your reality</SectionLabel><h2 className="font-display text-4xl tracking-[-.06em]">No transformation theatre. Just useful change.</h2><p className="mt-5 leading-7 text-muted-foreground">We leave room for the nuance that makes your business yours. Our work is specific enough to matter and flexible enough to last.</p><ButtonLink href="/contact" secondary>Discuss a system</ButtonLink></div></div></section></main></SiteShell>; }

export function ProductsPage() { return <SiteShell><main><PageIntro eyebrow="Products / 03" title="The beginning of a product is a pattern worth repeating." copy="When a workflow works, it can become a product. We help you find the shape, prove the value, and build the foundation." /><section className="mx-auto max-w-7xl px-5 pb-28 lg:px-8"><div className="space-y-4">{products.map((item, i) => <article key={item.title} className="grid min-h-[260px] items-end gap-8 overflow-hidden rounded-xl border border-foreground/20 bg-card p-7 md:grid-cols-[1fr_1fr]"><div><span className={`font-mono text-[10px] uppercase tracking-[.16em] ${item.accent === 'violet' ? 'text-accent' : 'text-primary'}`}>{item.category}</span><h2 className="mt-5 font-display text-4xl tracking-[-.06em]">{item.title}</h2><p className="mt-4 max-w-md leading-7 text-muted-foreground">{item.copy}</p></div><div className="relative h-40 overflow-hidden rounded-lg border border-foreground/20 bg-background"><div className={`absolute inset-8 rounded-full border ${item.accent === 'violet' ? 'border-accent/50' : item.accent === 'orange' ? 'border-orange-300/50' : 'border-primary/50'}`} /><div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_25px_hsl(var(--primary))]" /><div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 49%, hsl(var(--foreground)/.12) 50%, transparent 51%), linear-gradient(transparent 49%, hsl(var(--foreground)/.12) 50%, transparent 51%)', backgroundSize: '32px 32px' }} /></div></article>)}</div><p className="mt-5 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">All product concepts shown here are illustrative / demo work.</p></section></main></SiteShell>; }

export function AboutPage() { return <SiteShell><main><PageIntro eyebrow="About / 04" title="A technology partner for the work that does not fit in a template." copy="theGenEx exists to help ambitious teams turn operational complexity into an advantage they can feel." /><section className="mx-auto grid max-w-7xl gap-12 px-5 pb-28 lg:grid-cols-[1fr_1fr] lg:px-8"><div className="rounded-xl border border-primary/25 bg-primary/[.035] p-8"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">A clear point of view</p><p className="mt-16 font-display text-3xl leading-tight tracking-[-.05em]">Technology should reduce the distance between a good idea and the moment it starts working.</p></div><div className="space-y-6 text-muted-foreground"><p className="text-lg leading-8 text-foreground">We are a small, focused technology partner building intelligent systems for teams who want more leverage from the way they work.</p><p className="leading-7">That means asking better questions before writing code, choosing the simplest architecture that can carry the ambition, and treating every interface as part of the system.</p><p className="leading-7">No invented logos. No inflated promises. Just thoughtful engineering, clear communication, and work that earns its place in the business.</p></div></section><section className="border-y border-foreground/20 bg-card/75"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><SectionLabel>Principles</SectionLabel><div className="grid gap-8 md:grid-cols-3">{['Clarity over ceremony', 'Useful over impressive', 'Long-term over loud'].map((x, i) => <div key={x}><h3 className="font-display text-2xl tracking-[-.04em]">{x}</h3><p className="mt-4 text-sm leading-6 text-muted-foreground">{['Make the system legible to the people who rely on it.', 'Build what changes the work, not what looks good in a pitch.', 'Create foundations that make the next decision easier.'][i]}</p></div>)}</div></div></section></main></SiteShell>; }

const REQUIREMENT_OPTIONS = ['AI automation', 'AI agent', 'WhatsApp automation', 'Custom software', 'SaaS / digital product', 'CRM / ERP system', 'Not sure yet'];

export function ContactPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return; // guard against duplicate submissions while a request is in flight

    const form = e.currentTarget;
    const data = new FormData(form);
    const get = (key: string) => String(data.get(key) ?? '').trim();

    const name = get('name');
    const email = get('email');
    const requirement = get('requirement');
    const nextErrors: Record<string, string> = {};
    if (!name) nextErrors.name = 'Name is required.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Enter a valid email address.';
    if (!requirement) nextErrors.requirement = 'Let us know what you want to build.';
    if (get('message').length > 5000) nextErrors.message = 'Message is too long.';

    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    trackEvent('contact_form_submit', { requirement }, '/contact');
    try {
      const visitorId = getVisitorId();
      const { sessionId } = getSessionId();
      const result = await submitLead({
        name,
        email,
        requirement,
        company: get('company'),
        phone: get('phone'),
        budget: get('budget'),
        message: get('message'),
        source_page: '/contact',
        visitor_id: visitorId,
        session_id: sessionId,
        website: get('website'), // honeypot — real users never fill this
      });
      if (result.success) {
        trackEvent('contact_form_success', undefined, '/contact');
        setSent(true);
        form.reset();
      } else {
        trackEvent('contact_form_error', { code: result.error.code }, '/contact');
        if (result.error.fields) setErrors(result.error.fields);
        setFormError(result.error.message || 'Something went wrong. Please try again or email us directly at infothegenex@gmail.com.');
      }
    } catch {
      trackEvent('contact_form_error', { code: 'NETWORK_ERROR' }, '/contact');
      setFormError('Something went wrong. Please try again or email us directly at infothegenex@gmail.com.');
    } finally {
      setBusy(false);
    }
  };

  return <SiteShell><main className="mx-auto grid max-w-7xl gap-14 px-5 pb-28 pt-36 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
    <div>
      <SectionLabel>Contact / Start here</SectionLabel>
      <h1 className="font-display text-6xl tracking-[-.07em] sm:text-8xl">Bring us the messy part.</h1>
      <p className="mt-7 max-w-md text-lg leading-8 text-muted-foreground">Tell us what is slowing the business down, what you want to build, or what you cannot stop thinking about.</p>
      <div className="mt-10 flex items-center gap-3 text-sm"><Mail size={16} className="text-primary" /><a href="mailto:infothegenex@gmail.com" onClick={() => trackEvent('email_click', { location: 'contact_page' })} className="hover:text-primary" data-testid="link-contact-email">infothegenex@gmail.com</a></div>
    </div>
    <form onSubmit={submit} onFocus={() => trackEvent('contact_form_open', undefined, '/contact')} noValidate className="rounded-xl border border-foreground/20 bg-card/85 p-6 sm:p-9">
      {sent ? <div className="flex min-h-[420px] flex-col items-start justify-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Check /></span>
        <h2 className="mt-6 font-display text-4xl tracking-[-.05em]">Message received.</h2>
        <p className="mt-3 max-w-sm leading-7 text-muted-foreground">Thanks! Your enquiry has been received. We will review it and get back to you.</p>
        <button type="button" onClick={() => setSent(false)} className="mt-7 font-mono text-[10px] uppercase tracking-[.15em] text-primary" data-testid="button-send-another">Send another</button>
      </div> : <>
        {/* Honeypot: hidden from real users, off-screen (not display:none, which some bots skip). */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website<input tabIndex={-1} autoComplete="off" name="website" /></label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm text-muted-foreground">Name<input required maxLength={100} name="name" className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-3 text-foreground outline-none focus:border-primary" data-testid="input-name" />{errors.name && <span className="mt-1 block text-xs text-destructive">{errors.name}</span>}</label>
          <label className="text-sm text-muted-foreground">Work email<input required type="email" maxLength={254} name="email" className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-3 text-foreground outline-none focus:border-primary" data-testid="input-email" />{errors.email && <span className="mt-1 block text-xs text-destructive">{errors.email}</span>}</label>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm text-muted-foreground">Company <span className="text-muted-foreground/60">(optional)</span><input maxLength={150} name="company" className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-3 text-foreground outline-none focus:border-primary" data-testid="input-company" /></label>
          <label className="text-sm text-muted-foreground">Phone <span className="text-muted-foreground/60">(optional)</span><input maxLength={30} name="phone" className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-3 text-foreground outline-none focus:border-primary" data-testid="input-phone" /></label>
        </div>
        <label className="mt-5 block text-sm text-muted-foreground">What do you want to build?<select required name="requirement" defaultValue="" className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-3 text-foreground outline-none focus:border-primary" data-testid="select-requirement"><option value="" disabled>Select one</option>{REQUIREMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>{errors.requirement && <span className="mt-1 block text-xs text-destructive">{errors.requirement}</span>}</label>
        <label className="mt-5 block text-sm text-muted-foreground">Budget <span className="text-muted-foreground/60">(optional)</span><input maxLength={60} name="budget" placeholder="e.g. $5k–15k" className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-3 text-foreground outline-none focus:border-primary" data-testid="input-budget" /></label>
        <label className="mt-5 block text-sm text-muted-foreground">Anything else? <span className="text-muted-foreground/60">(optional)</span><textarea maxLength={5000} name="message" rows={5} className="mt-2 w-full resize-none rounded-md border border-foreground/20 bg-background px-3 py-3 text-foreground outline-none focus:border-primary" data-testid="input-message" />{errors.message && <span className="mt-1 block text-xs text-destructive">{errors.message}</span>}</label>
        {formError && <p className="mt-4 text-sm text-destructive" data-testid="text-form-error" role="alert">{formError}</p>}
        <button disabled={busy} type="submit" className="mt-7 flex items-center gap-3 rounded-full bg-primary px-5 py-3 font-mono text-[11px] uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-submit-contact">{busy ? 'Sending...' : 'Send inquiry'} <ArrowRight size={14} /></button>
      </>}
    </form>
  </main></SiteShell>;
}

export function LegalPage({ type }: { type: 'privacy' | 'terms' }) { const privacy = type === 'privacy'; return <SiteShell><main className="mx-auto max-w-3xl px-5 pb-28 pt-36 lg:px-8"><SectionLabel>theGenEx / {privacy ? 'Privacy' : 'Terms'}</SectionLabel><h1 className="font-display text-6xl tracking-[-.07em]">{privacy ? 'Privacy, plainly.' : 'Terms of use.'}</h1><p className="mt-5 text-sm text-muted-foreground">Last updated March 2025</p><div className="prose prose-invert mt-14 max-w-none prose-headings:font-display prose-headings:tracking-[-.04em] prose-p:text-muted-foreground prose-li:text-muted-foreground">{privacy ? <><h2>What we collect</h2><p>When you contact theGenEx, we may receive the information you choose to share, such as your name, email address, and project context.</p><h2>How we use it</h2><p>We use that information to respond to your inquiry and understand whether we can be useful. We do not sell personal information.</p><h2>Questions</h2><p>For questions about this notice, email infothegenex@gmail.com.</p></> : <><h2>Using this site</h2><p>This site provides information about theGenEx and illustrative examples of our approach. Content is for general information and may change as our practice evolves.</p><h2>Illustrative work</h2><p>Product concepts and demo work are clearly labeled and should not be read as client claims, testimonials, or performance guarantees.</p><h2>Contact</h2><p>Questions about these terms can be sent to infothegenex@gmail.com.</p></>}</div></main></SiteShell>; }