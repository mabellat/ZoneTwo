export function PageHeader({
  title,
  subtitle,
  kicker,
  action,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  action?: React.ReactNode;
}) {
  return (
    <header
      className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-6 sm:pt-12 pb-4 text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.5)]"
    >
      <div className="min-w-0">
        {kicker && (
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/90 mb-3">{kicker}</p>
        )}
        <h1 className="headline text-5xl sm:text-6xl lg:text-7xl break-words text-white">{title}</h1>
        {subtitle && <p className="serif-accent mt-3 text-xl sm:text-2xl text-white">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
