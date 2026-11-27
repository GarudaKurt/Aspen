import type { LucideIcon } from "lucide-react";

const tones = {
  neutral: "bg-[#e8f5ef] text-[#3c6355]",
  warning: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-sky-50 text-sky-700",
  danger: "bg-red-50 text-red-700",
};

export type IconTone = keyof typeof tones;

export function IconTile({ icon: Icon, tone = "neutral", className = "" }: {
  icon: LucideIcon;
  tone?: IconTone;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-xl p-3 ${tones[tone]} ${className}`}>
      <Icon className="size-5" />
    </span>
  );
}
