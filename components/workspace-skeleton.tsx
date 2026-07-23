export function WorkspaceSkeleton() {
  return (
    <div className="content skeleton-page" aria-busy="true" aria-label="Loading page">
      <div className="skeleton-heading">
        <span className="skeleton skeleton-kicker" />
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-copy" />
      </div>

      <div className="summary-grid skeleton-summary">
        {[1, 2, 3, 4].map((item) => (
          <div className="card card-pad" key={item}>
            <span className="skeleton skeleton-label" />
            <span className="skeleton skeleton-value" />
            <span className="skeleton skeleton-detail" />
          </div>
        ))}
      </div>

      <div className="grid-main skeleton-main">
        <section className="card card-pad">
          <span className="skeleton skeleton-section-title" />
          <span className="skeleton skeleton-wide" />
          <span className="skeleton skeleton-wide" />
          <span className="skeleton skeleton-medium" />
        </section>
        <section className="card card-pad">
          <span className="skeleton skeleton-section-title" />
          <span className="skeleton skeleton-row" />
          <span className="skeleton skeleton-row" />
          <span className="skeleton skeleton-row" />
        </section>
      </div>
    </div>
  );
}
