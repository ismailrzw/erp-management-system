export const ContentLoader = ({ label = 'Loading...', minHeight = '320px' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        padding: '40px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <div
          className="ball-scale-1"
          style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2563eb' }}
        />
        <div
          className="ball-scale-2"
          style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#60a5fa' }}
        />
        <div
          className="ball-scale-3"
          style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#93c5fd' }}
        />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>{label}</span>
    </div>
  );
};
