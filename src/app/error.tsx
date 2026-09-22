"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#111111]">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5714e]">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">We couldn&apos;t load this page.</h1>
        <p className="mt-4 text-sm leading-6 text-[#6b7172]">Please try again. If the problem continues, come back in a moment.</p>
        <button type="button" onClick={() => reset()} className="mt-8 rounded-full bg-[#3c6355] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2f5044]">
          Try again
        </button>
      </div>
    </main>
  );
}

