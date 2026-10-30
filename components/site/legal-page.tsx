export type LegalSection = { id: string; title: string; body: React.ReactNode };

export function LegalPage({ eyebrow, title, updated, intro, sections }: { eyebrow: string; title: string; updated: string; intro: React.ReactNode; sections: LegalSection[] }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-24 sm:px-8 sm:pt-24 lg:grid-cols-[240px_1fr] lg:gap-16">
      <nav aria-label="On this page" className="hidden lg:block">
        <ol className="sticky top-32 flex flex-col gap-1 text-sm">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="flex min-h-9 items-baseline gap-3 rounded-md py-1 text-ink-600 transition-colors hover:text-ink-900">
                <span className="tabular text-xs text-ink-400">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article className="flex flex-col gap-12">
        <header className="flex flex-col gap-4 border-b border-line pb-8">
          <p className="eyebrow text-brass-700">{eyebrow}</p>
          <h1 className="font-display text-5xl text-ink-900">{title}</h1>
          <p className="text-sm text-ink-600">Last updated {updated}</p>
          <div className="measure text-lg text-ink-600">{intro}</div>
        </header>
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="flex scroll-mt-32 flex-col gap-4">
            <h2 className="flex items-baseline gap-4 font-display text-2xl text-ink-900">
              <span className="tabular text-base text-ink-400">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
            </h2>
            <div className="measure flex flex-col gap-4 text-base text-ink-600 [&_li]:pl-1 [&_strong]:text-ink-900 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6">
              {s.body}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
