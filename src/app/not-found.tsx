import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#111111]">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5714e]">404</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-4 text-sm leading-6 text-[#6b7172]">The page you are looking for may have moved or no longer exists.</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-[#3c6355] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2f5044]">
          Back to home
        </Link>
      </div>
    </main>
  );
}

