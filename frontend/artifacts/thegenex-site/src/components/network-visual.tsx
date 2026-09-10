export function NetworkVisual({ compact = false }: { compact?: boolean }) {
  return <div className={`relative overflow-hidden rounded-2xl border border-primary/20 bg-[#0b151a] ${compact ? 'h-64' : 'h-[430px]'}`}>
    <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(var(--primary)/.14), transparent 45%), linear-gradient(hsl(var(--foreground)/.045) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)/.045) 1px, transparent 1px)', backgroundSize: '100% 100%, 42px 42px, 42px 42px' }} />
    <svg viewBox="0 0 600 430" className="relative h-full w-full" fill="none" aria-label="Abstract system network visualization">
      <path d="M80 330L184 218L296 272L410 135L532 202M184 218L245 80L410 135M296 272L360 370L532 202" stroke="hsl(var(--primary)/.35)" strokeWidth="1" />
      <path d="M80 330L184 218L296 272L410 135L532 202" stroke="hsl(var(--primary)/.8)" strokeWidth="2" strokeDasharray="3 12" />
      {[['80','330'],['184','218'],['296','272'],['410','135'],['532','202'],['245','80'],['360','370']].map(([cx, cy], i) => <g key={i}><circle cx={cx} cy={cy} r={i === 3 ? 19 : 10} fill="hsl(var(--background))" stroke={i === 3 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} strokeWidth="2" /><circle cx={cx} cy={cy} r="3" fill={i === 3 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} /></g>)}
      <circle cx="410" cy="135" r="34" stroke="hsl(var(--accent)/.25)" /><circle cx="410" cy="135" r="48" stroke="hsl(var(--accent)/.1)" />
    </svg>
    <div className="absolute bottom-5 left-5 rounded border border-primary/20 bg-background/75 px-3 py-2 backdrop-blur"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-primary">System map / live concept</p><p className="mt-1 text-xs text-muted-foreground">Inputs → intelligence → action</p></div>
  </div>;
}