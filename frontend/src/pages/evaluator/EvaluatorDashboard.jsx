import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';

export function EvaluatorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    assigned_groups: 0,
    pending_evaluations: 0,
    completed_evaluations: 0,
    meetings_logged: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    evaluatorApi.getDashboard()
      .then(res => {
        if (res.data?.success) {
          setStats(res.data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      title: 'Assigned Groups',
      value: stats.assigned_groups,
      icon: Users,
      color: '#2563eb',
      bgColor: '#eff6ff',
      link: '/evaluator/groups',
      linkText: 'View Groups',
    },
    {
      title: 'Pending Evaluations',
      value: stats.pending_evaluations,
      icon: Clock,
      color: '#d97706',
      bgColor: '#fffbe finished',
      link: '/evaluator/groups',
      linkText: 'Evaluate Now',
    },
    {
      title: 'Completed Evaluations',
      value: stats.completed_evaluations,
      icon: CheckCircle2,
      color: '#16a34a',
      bgColor: '#f0fdf4',
      link: '/evaluator/groups',
      linkText: 'View Details',
    },
    {
      title: 'Meetings Logged',
      value: stats.meetings_logged,
      icon: Calendar,
      color: '#9333ea',
      bgColor: '#faf5ff',
      link: '/evaluator/meetings',
      linkText: 'Meeting Log',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
          Evaluator Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          Welcome back! Here is an overview of your assigned groups and evaluation tasks.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading dashboard...</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          {cards.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div key={idx} style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>{c.title}</span>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                      {c.value}
                    </div>
                  </div>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: c.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={22} color={c.color} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(c.link)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: c.color,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <span>{c.linkText}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
