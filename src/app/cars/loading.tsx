export default function LoadingInventory() {
  return <div className="container page-wrap inventory-page" aria-busy="true">
    <div className="inventory-head"><div><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line w-40" style={{ marginTop: 12, width: 120 }} /></div></div>
    <div className="inventory-layout">
      <div className="skeleton-filters" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <span className="skeleton" key={index} />)}</div>
      <div className="inventory-results">
        <div className="results-bar" aria-hidden="true"><span className="skeleton skeleton-line" style={{ width: 120 }} /><span className="skeleton" style={{ width: 180, height: 40 }} /></div>
        <div className="vehicle-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-card" key={index}><span className="skeleton" /><span className="skeleton skeleton-line w-40" /><span className="skeleton skeleton-line w-70" /><span className="skeleton skeleton-line w-50" /></div>)}</div>
      </div>
    </div>
    <span className="sr-only" role="status">Loading cars</span>
  </div>;
}
