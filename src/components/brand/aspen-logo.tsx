"use client";

type AspenLogoProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
};

export function AspenLogo({
  size = 40,
  className,
  decorative = false,
}: AspenLogoProps) {
  return (
    <img
      src="/img/logo/logo.svg"
      alt={decorative ? "" : "Aspen"}
      width={size}
      height={size}
      aria-hidden={decorative ? true : undefined}
      className={className}
    />
  );
}
