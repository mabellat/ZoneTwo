"use client";

type Props = {
  photoUrl?: string | null;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "w-9 h-9 text-sm",
  md: "w-11 h-11 text-base",
  lg: "w-16 h-16 text-xl",
};

export function UserAvatar({ photoUrl, label, size = "sm", className = "" }: Props) {
  const initial = label.charAt(0).toUpperCase();
  const dim = sizes[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${dim} rounded-full object-cover shrink-0 bg-[var(--bg-subtle)] ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-[var(--signal)] text-white flex items-center justify-center font-semibold shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}
