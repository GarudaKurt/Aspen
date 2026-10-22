export default function HelpLoading() {
  return (
    <main className="min-h-screen animate-pulse bg-[#fafcfb]">
      <div className="h-72 bg-[#eef6f1]" />
      <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-12 sm:px-8 lg:px-12">
        <div className="h-7 w-48 rounded bg-[#e3ece6]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-36 rounded-2xl bg-white shadow-sm" />)}
        </div>
        <div className="h-96 rounded-2xl bg-white shadow-sm" />
      </div>
    </main>
  );
}
