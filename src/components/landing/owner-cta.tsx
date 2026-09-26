import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function OwnerCta() {
  return (
    <section
      id="list-your-business"
      className="px-6 pb-10 sm:px-10 lg:px-[130px]"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 rounded-2xl bg-[#3c6355] px-8 py-10 text-white sm:px-12 lg:flex-row lg:items-center lg:justify-between lg:px-14">
        <div>
          <h2 className="max-w-[420px] text-3xl font-bold leading-tight sm:text-4xl">
            Own a clinic or pet shop
          </h2>
          <p className="mt-4 max-w-[460px] text-sm leading-5 text-white/90 sm:text-base">
            List your business on Pawspot and reach pet owners searching nearby
            right now. Free to start, upgrade anytime.
          </p>
        </div>
        <Link
          href="/list-your-business"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#d6794f] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[#c56d46]"
        >
          List your business <ArrowRight size={19} />
        </Link>
      </div>
    </section>
  );
}
