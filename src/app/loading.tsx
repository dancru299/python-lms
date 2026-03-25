export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_45%,_#f8fafc_100%)]">
      <div className="h-1 w-full overflow-hidden bg-slate-200">
        <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-5 h-10 w-80 max-w-full animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="h-5 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-4 h-9 w-20 animate-pulse rounded-xl bg-slate-200" />
                <div className="mt-5 h-4 w-full animate-pulse rounded-full bg-slate-100" />
                <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
