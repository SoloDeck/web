import { Bot, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type BrandIconName = "ai" | "zalo" | "email";

const BRAND_ICON_PATHS: Record<BrandIconName, string> = {
  ai: "/brand-icons/ai.svg",
  zalo: "/brand-icons/logo_Zalo.webp",
  email: "/brand-icons/logo_Gmail.webp",
};

const FALLBACK_ICONS = {
  ai: Bot,
  zalo: MessageCircle,
  email: Mail,
} as const;

type BrandIconProps = {
  name: BrandIconName;
  label?: string;
  className?: string;
};

export function BrandIcon({ name, label, className }: BrandIconProps) {
  const [failed, setFailed] = useState(false);
  const FallbackIcon = FALLBACK_ICONS[name];

  if (failed) {
    return <FallbackIcon className={cn("size-4", className)} aria-hidden={!label} aria-label={label} />;
  }

  return (
    <img
      src={BRAND_ICON_PATHS[name]}
      alt={label ?? ""}
      aria-hidden={!label}
      className={cn("size-4 object-contain", className)}
      onError={() => setFailed(true)}
    />
  );
}
