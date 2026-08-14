// frontend/src/pages/dashboard/components/UserAvatar.tsx
import { UserRound } from "lucide-react";

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "lg",
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "h-20 w-20 text-2xl lg:h-24 lg:w-24 lg:text-3xl"
      : size === "md"
        ? "h-12 w-12 text-base"
        : "h-8 w-8 text-xs";

  const ringClass =
    size === "lg"
      ? "ring-4 ring-[var(--color-brand-soft)]"
      : "ring-2 ring-[var(--color-brand-soft)]";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Profile photo of ${name ?? "user"}`}
        className={`${sizeClass} shrink-0 rounded-full object-cover ${ringClass}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${ringClass} flex shrink-0 items-center justify-center rounded-full font-semibold`}
      style={{ background: "var(--color-brand-soft)", color: "var(--color-brand)" }}
      role="img"
      aria-label={`Profile of ${name ?? "user"}`}
    >
      {name ? getInitials(name) : <UserRound size={size === "lg" ? 36 : 20} aria-hidden="true" />}
    </div>
  );
}
