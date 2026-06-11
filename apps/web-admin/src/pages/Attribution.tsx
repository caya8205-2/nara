import { ExternalLink, PackageCheck } from 'lucide-react'

const dependencies = [
  {
    name: 'OpenClaw',
    role: 'Agent runtime, tool orchestration, and messaging integration layer',
    url: 'https://github.com/openclaw',
  },
  {
    name: 'Fastify',
    role: 'Backend HTTP server framework',
    url: 'https://fastify.dev/',
  },
  {
    name: 'React',
    role: 'Web admin interface runtime',
    url: 'https://react.dev/',
  },
  {
    name: 'Vite',
    role: 'Frontend build tooling',
    url: 'https://vite.dev/',
  },
  {
    name: 'Tailwind CSS',
    role: 'Utility CSS styling system',
    url: 'https://tailwindcss.com/',
  },
  {
    name: 'PostgreSQL',
    role: 'Primary relational database',
    url: 'https://www.postgresql.org/',
  },
  {
    name: 'pgvector',
    role: 'Vector storage extension for PostgreSQL',
    url: 'https://github.com/pgvector/pgvector',
  },
  {
    name: 'Redis',
    role: 'Queue and cache infrastructure',
    url: 'https://redis.io/',
  },
  {
    name: 'BullMQ',
    role: 'Background job queue foundation',
    url: 'https://bullmq.io/',
  },
  {
    name: 'Drizzle ORM',
    role: 'TypeScript SQL query and schema layer',
    url: 'https://orm.drizzle.team/',
  },
]

export default function Attribution() {
  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-950">Open Source Attribution</h1>
          <p className="mt-1 text-sm text-slate-600">
            Major open source projects used to build and run Nara
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-950">Runtime and Tooling</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Keep this list visible in admin settings as the dependency surface grows.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {dependencies.map((dependency) => (
              <a
                key={dependency.name}
                href={dependency.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <PackageCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">{dependency.name}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{dependency.role}</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
