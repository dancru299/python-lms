export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1 w-full overflow-hidden bg-slate-200">
        <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 w-28 animate-pulse rounded-full bg-slate-200" />
            ))}
          </div>

          <div className="mt-6 h-10 w-72 max-w-full animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="mt-2 h-4 w-3/5 animate-pulse rounded-full bg-slate-100" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-4 h-9 w-20 animate-pulse rounded-xl bg-slate-200" />
              <div className="mt-5 h-4 w-full animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
