import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function BackButton({ to, label = 'Back', className = '', style = {} }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="page-back-slot" style={style}>
      <button
        type="button"
        className={`btn-back ${className}`}
        onClick={handleClick}
        aria-label={label}
        title={label}
      >
        <ArrowLeft size={16} />
        <span className="btn-back-label">{label}</span>
      </button>
    </div>
  );
}

