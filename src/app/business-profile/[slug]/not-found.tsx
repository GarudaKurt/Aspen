import Link from "next/link";
export default function BusinessNotFound() {
  return <main className="mx-auto max-w-xl space-y-4 p-8 text-center"><h1 className="text-xl font-semibold">Business unavailable</h1>
    <p className="text-slate-500">This business is not currently listed.</p><Link href="/#all-businesses" className="text-[#3c6355] underline">Explore available businesses</Link></main>;
}
