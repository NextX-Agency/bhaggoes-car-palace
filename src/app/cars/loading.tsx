export default function LoadingInventory() {
  return <div className="container page-wrap inventory-page" aria-busy="true" aria-label="Loading vehicle inventory">
    <div className="inventory-loading-intro"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>
    <div className="inventory-layout">
      <aside className="filter-panel inventory-loading-filters"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></aside>
      <div className="inventory-skeleton-grid" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <article className="inventory-skeleton-card" key={index}><span className="skeleton inventory-skeleton-image" /><div><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div></article>)}</div>
    </div>
    <span className="sr-only" role="status">Loading inventory</span>
  </div>;
}
