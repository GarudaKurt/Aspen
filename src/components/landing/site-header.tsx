import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const navigation = ["Browse", "Featured", "How it works"];

export function SiteHeader() {
  return (
    <header className="border-b border-[#d8d8d8]">
      <div className="mx-auto flex min-h-[78px] max-w-[1440px] items-center gap-8 px-6 sm:px-10 lg:px-[130px]">
        <Link
          href="#top"
          className="shrink-0 text-base font-semibold text-[#111111] sm:text-lg"
        >
          logo Here
        </Link>
        <nav
          aria-label="Primary navigation"
          className="mx-auto hidden items-center gap-8 md:flex"
        >
          {navigation.map((item, index) => (
            <Link
              key={item}
              href={
                index === 0
                  ? "#browse"
                  : `#${item.toLowerCase().replaceAll(" ", "-")}`
              }
              className={`relative px-1 py-2 text-base font-semibold text-[#111111] transition-colors hover:text-[#c5714e] ${index === 0 ? "after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:bg-[#c5714e]" : ""}`}
            >
              {item}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <Link
            href="#list-your-business"
            className="hidden text-base font-semibold text-[#3c6355] transition-colors hover:text-[#c5714e] sm:block"
          >
            List your business
          </Link>
          <Button
            variant="ghost"
            type="button"
            aria-label="Open menu"
            className="rounded-lg border border-[#e1e5e2] p-2 text-[#3c6355] transition-colors hover:bg-[#f5f7f5] md:hidden"
          >
            <Menu size={18} strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </header>
  );
}
