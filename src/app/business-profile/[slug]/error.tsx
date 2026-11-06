"use client";
import { Button } from "@/components/ui/button";
export default function BusinessError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl space-y-4 p-8 text-center"><h1 className="text-xl font-semibold">Unable to load this business</h1>
    <p className="text-slate-500">Please try again in a moment.</p><Button onClick={reset}>Try again</Button></main>;
}
