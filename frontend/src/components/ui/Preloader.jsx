export const Preloader = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#ffffff',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', gap: '8px' }}>
        <div
          className="ball-scale-1"
          style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#0073aa' }}
        />
        <div
          className="ball-scale-2"
          style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#5faee3' }}
        />
        <div
          className="ball-scale-3"
          style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#54d98c' }}
        />
      </div>
    </div>
  );
};
