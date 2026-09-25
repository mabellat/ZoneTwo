import { InfoTooltip } from "@/components/ui/InfoTooltip";

export function SectionHeading({
  kicker,
  title,
  tooltip,
  action,
  className = "",
}: {
  kicker?: string;
  title: string;
  tooltip?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 mb-5 ${className}`}>
      <div>
        {kicker && <p className="eyebrow mb-2">{kicker}</p>}
        <div className="flex items-start gap-2">
          <h2 className="section-title">{title}</h2>
          {tooltip && (
            <InfoTooltip
              content={tooltip}
              label={`About ${title}`}
              side="bottom"
              align="start"
              className="mt-1"
            />
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
