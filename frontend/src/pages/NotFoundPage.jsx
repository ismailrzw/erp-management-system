import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          fontSize: '72px',
          fontWeight: 700,
          color: '#0073aa',
          lineHeight: 1,
          marginBottom: '10px',
        }}
      >
        404
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
        Page Not Found
      </h2>
      <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', marginBottom: '24px' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/manager/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#0073aa',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '4px',
          fontWeight: 600,
          fontSize: '13.5px',
          textDecoration: 'none',
        }}
      >
        <Home size={16} />
        <span>Back to Dashboard</span>
      </Link>
    </div>
  );
};
