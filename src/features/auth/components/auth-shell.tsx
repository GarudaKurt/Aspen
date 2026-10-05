import Link from "next/link";
import type { ReactNode } from "react";

import { AspenLogo } from "@/components/brand/aspen-logo";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-[#171817] sm:px-6 sm:py-12">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md text-xl font-bold tracking-tight text-[#111111] outline-none focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
        >
          <AspenLogo size={44} decorative className="size-11" />
          Aspen
        </Link>
        <section className="mt-8 w-full rounded-2xl border border-[#dfe8e2] bg-white p-5 shadow-sm sm:mt-10 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c5714e]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#69736d]">{description}</p>
          <div className="mt-6">{children}</div>
        </section>
        <p className="mt-6 text-center text-xs text-[#7d8781]">
          Aspen helps pet owners find trusted services near them.
        </p>
      </div>
    </main>
  );
}
