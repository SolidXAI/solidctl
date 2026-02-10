

export const SolidDashboardRenderError = () => {
  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '400px', padding: '2rem' }}>
      <div className="flex flex-column align-items-center gap-3 text-center" style={{ maxWidth: '500px' }}>
        <div
          className="flex align-items-center justify-content-center border-circle"
          style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'var(--red-50)',
            color: 'var(--red-500)'
          }}
        >
          <i className="pi pi-exclamation-triangle"
             style={{ fontSize: '2.5rem' }} />
        </div>
        <div className="flex flex-column gap-2">
          <h3 className="m-0" style={{ color: 'var(--text-color)', fontSize: '1.25rem', fontWeight: 600 }}>Error in Loading Dashboard</h3>

          <p className="m-0" style={{ color: 'var(--text-color-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Failed to load dashboard. Please try again.
          </p>
        </div>
      </div>
    </div>
  )
}