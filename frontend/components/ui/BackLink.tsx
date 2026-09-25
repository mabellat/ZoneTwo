import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({
  href,
  label = "Dashboard",
  className = "",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`btn-back ${className}`}>
      <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
      {label}
    </Link>
  );
}
