export function DataLoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="data-loading" aria-busy="true" aria-label="Loading business records">
      <div className="stat-strip">
        {[1, 2, 3, 4].map((item) => (
          <div className="card stat-tile" key={item}>
            <span className="skeleton skeleton-label" />
            <span className="skeleton skeleton-value" />
          </div>
        ))}
      </div>
      <section className="card card-pad">
        <span className="skeleton skeleton-section-title" />
        {Array.from({ length: rows }, (_, index) => (
          <span className="skeleton skeleton-row" key={index} />
        ))}
      </section>
    </div>
  );
}
