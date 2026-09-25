import Link from "next/link";

export function TextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`link-subtle ${className}`}>
      {children}
    </Link>
  );
}
