
export const SolidDashboardFilterRequired = () => {
  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '400px', padding: '2rem' }}>
      <div className="flex flex-column align-items-center gap-3 text-center" style={{ maxWidth: '500px' }}>
        <div
          className="flex align-items-center justify-content-center border-circle"
          style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'var(--blue-50)',
            color: 'var(--blue-500)'
          }}
        >
          <i className="pi pi-filter" style={{ color: "var(--primary-color)", fontSize: '2.5rem' }} />
        </div>
        <div>
          <div className="flex flex-column gap-2">
            <h3 className="m-0" style={{ color: 'var(--text-color)', fontSize: '1.25rem', fontWeight: 600 }}>Filters Required</h3>
            <p className="m-0" style={{ color: 'var(--text-color-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Please select the required filters to render your dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}