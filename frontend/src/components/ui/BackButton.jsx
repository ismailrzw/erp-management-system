import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function BackButton({ to, label }) {
  const navigate = useNavigate();
  return <button type="button" className="btn btn-back" onClick={() => navigate(to)}><ArrowLeft size={18} />{label}</button>;
}
