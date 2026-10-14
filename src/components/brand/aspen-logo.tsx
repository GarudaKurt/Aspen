import Image from "next/image";

type AspenLogoProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
};

export function AspenLogo({
  size = 60,
  className,
  decorative = false,
}: AspenLogoProps) {
  return (
    <Image
      src="/img/logo/logo.png?v=transparent"
      alt={decorative ? "" : "Aspen"}
      width={size}
      height={size}
      aria-hidden={decorative ? true : undefined}
      unoptimized
      className={`bg-transparent object-contain ${className ?? ""}`}
    />
  );
}
