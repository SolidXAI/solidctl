

const SolidDashboardNotAvailable = () => {
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
          <i className="pi pi-chart-bar" style={{ fontSize: '2.5rem' }}></i>
        </div>
        
        <div className="flex flex-column gap-2">
          <h3 className="m-0" style={{ color: 'var(--text-color)', fontSize: '1.25rem', fontWeight: 600 }}>
            Dashboard Not Available
          </h3>
          <p className="m-0" style={{ color: 'var(--text-color-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            This dashboard has not been configured yet or does not exist. Please check the dashboard settings or contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SolidDashboardNotAvailable;