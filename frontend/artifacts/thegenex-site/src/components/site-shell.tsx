import { useState, type ReactNode } from 'react';
import { ArrowUpRight, Menu, X, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { trackEvent } from '@/lib/analytics';

/** A glowing icon badge used on capability/service cards, in the site's teal/violet visual language. */
export function IconBadge({ icon: Icon, accent = 'primary' }: { icon: LucideIcon; accent?: 'primary' | 'accent' }) {
  const varName = accent === 'accent' ? '--accent' : '--primary';
  return (
    <span
      className={`grid h-12 w-12 place-items-center rounded-lg border ${accent === 'accent' ? 'border-accent/40 text-accent' : 'border-primary/40 text-primary'}`}
      style={{
        boxShadow: `0 0 24px hsl(var(${varName}) / .18)`,
        background: `radial-gradient(circle at 30% 20%, hsl(var(${varName}) / .16), transparent 70%)`,
      }}
    >
      <Icon size={22} />
    </span>
  );
}

const nav = [
  { href: '/services', label: 'Services' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
];

export function Logo() {
  return <Link href="/" className="group flex items-center gap-2.5" data-testid="link-logo">
    <span className="relative grid h-7 w-7 place-items-center rounded-full border border-primary/70 text-primary">
      <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary))]" />
      <span className="absolute inset-[5px] rounded-full border border-primary/30" />
    </span>
    <span className="font-display text-[17px] font-semibold tracking-[-.04em] text-foreground">theGenEx<span className="text-primary">.</span></span>
  </Link>;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const go = (label: string) => { trackEvent('nav_click', { label }); setOpen(false); };
  return <header className="fixed inset-x-0 top-0 z-40 border-b border-foreground/[.16] bg-background/80 backdrop-blur-xl">
    <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
      <Logo />
      <nav className="hidden items-center gap-8 md:flex">
        {nav.map(item => <Link key={item.href} href={item.href} onClick={() => go(item.label)} className={`font-mono text-[11px] uppercase tracking-[.16em] transition-colors hover:text-primary ${location === item.href ? 'text-primary' : 'text-muted-foreground'}`} data-testid={`link-nav-${item.label.toLowerCase()}`}>{item.label}</Link>)}
      </nav>
      <div className="flex items-center gap-4">
        <Link href="/contact" onClick={() => go('Start a conversation')} className="hidden items-center gap-2 rounded-full border border-primary/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[.13em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:flex" data-testid="link-header-contact">Start a conversation <ArrowUpRight size={13} /></Link>
        <button className="grid h-10 w-10 place-items-center rounded-full border border-foreground/20 text-muted-foreground md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" data-testid="button-mobile-menu">{open ? <X size={18} /> : <Menu size={18} />}</button>
      </div>
    </div>
    {open && <div className="border-t border-foreground/[.16] bg-background px-5 py-6 md:hidden">
      {nav.map(item => <Link key={item.href} href={item.href} onClick={() => go(item.label)} className="block border-b border-foreground/[.16] py-4 font-display text-2xl" data-testid={`link-mobile-${item.label.toLowerCase()}`}>{item.label}</Link>)}
      <Link href="/contact" onClick={() => go('Start a conversation')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 font-mono text-[11px] uppercase tracking-[.12em] text-primary-foreground" data-testid="link-mobile-contact">Start a conversation <ArrowUpRight size={14} /></Link>
    </div>}
  </header>;
}

export function Footer() {
  return <footer className="border-t border-foreground/[.22] bg-background">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
      <div><Logo /><p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">AI automation, custom software, and digital products for teams building what is next.</p></div>
      <div><p className="mb-4 font-mono text-[10px] uppercase tracking-[.16em] text-primary">Explore</p>{nav.slice(0, 3).map(item => <Link key={item.href} href={item.href} className="block py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground" data-testid={`link-footer-${item.label.toLowerCase()}`}>{item.label}</Link>)}</div>
      <div><p className="mb-4 font-mono text-[10px] uppercase tracking-[.16em] text-primary">Company</p><Link href="/about" className="block py-1.5 text-sm text-muted-foreground hover:text-foreground">About</Link><Link href="/contact" className="block py-1.5 text-sm text-muted-foreground hover:text-foreground">Contact</Link><Link href="/admin" className="block py-1.5 text-sm text-muted-foreground hover:text-foreground">Admin preview</Link></div>
      <div><p className="mb-4 font-mono text-[10px] uppercase tracking-[.16em] text-primary">Reach us</p><a href="mailto:infothegenex@gmail.com" onClick={() => trackEvent('email_click', { location: 'footer' })} className="break-all text-sm text-foreground hover:text-primary" data-testid="link-footer-email">infothegenex@gmail.com</a></div>
    </div>
    <div className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-foreground/[.16] px-5 py-5 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© {new Date().getFullYear()} theGenEx</span><span className="flex gap-4"><Link href="/privacy" data-testid="link-privacy">Privacy</Link><Link href="/terms" data-testid="link-terms">Terms</Link></span></div>
  </footer>;
}

export function SiteShell({ children }: { children: ReactNode }) { return <div className="noise min-h-[100dvh] overflow-hidden"><Header />{children}<Footer /></div>; }
export function SectionLabel({ children }: { children: ReactNode }) { return <div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.2em] text-primary"><span className="h-px w-8 bg-primary" />{children}</div>; }
export function ButtonLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) { return <Link href={href} onClick={() => trackEvent('cta_click', { href, label: String(children) })} className={`group inline-flex items-center gap-3 rounded-full px-5 py-3 font-mono text-[11px] uppercase tracking-[.13em] transition-all ${secondary ? 'border border-foreground/25 text-foreground hover:border-primary/60 hover:text-primary' : 'bg-primary text-primary-foreground hover:shadow-[0_0_28px_hsl(var(--primary)/.22)]'}`} data-testid={`link-cta-${href.replace('/', '') || 'home'}`}>{children}<ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>; }