import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Preloader } from '../../../components/ui/Preloader';
import { Toast } from '../../../components/ui/Toast';
import { DeadlineCountdown } from '../../../components/ui/DeadlineCountdown';
import { studentIterationsApi } from '../../../api/studentIterationsApi';
import { Calendar, CheckCircle2, Clock, ChevronRight, FileText } from 'lucide-react';

export const StudentIterationsPage = () => {
  const [iterations, setIterations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const fetchIterations = async () => {
    setLoading(true);
    try {
      const res = await studentIterationsApi.getAll();
      setIterations(res.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch iterations.';
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIterations();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <PageHeader
        title="Project Iterations"
        subtitle="Track course milestones, review evaluation rubrics, and submit group project files."
      />

      {loading ? (
        <Preloader label="Loading iterations..." />
      ) : iterations.length === 0 ? (
        <EmptyState
          title="No Iterations Available"
          description="There are currently no iteration milestones published for your enrolled course."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {iterations.map((item) => {
            const hasSubmitted = item.has_submitted;
            const isLate = item.submission?.is_late;
            const rubricCount = item.rubrics?.length || 0;

            return (
              <div
                key={item._id}
                onClick={() => navigate(`/student/iterations/${item._id}`)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: hasSubmitted ? (isLate ? '#fffbeb' : '#f0fdf4') : '#f8fafc',
                      border: `1px solid ${hasSubmitted ? (isLate ? '#fde68a' : '#bbf7d0') : '#e2e8f0'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {hasSubmitted ? (
                      isLate ? <Clock size={22} style={{ color: '#d97706' }} /> : <CheckCircle2 size={22} style={{ color: '#16a34a' }} />
                    ) : (
                      <FileText size={22} style={{ color: '#64748b' }} />
                    )}
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                      {item.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', color: '#64748b' }}>
                        <Calendar size={13} />
                        <span>Deadline: {item.deadline}</span>
                      </div>
                      <DeadlineCountdown deadline={item.deadline} />
                      <span style={{ fontSize: '12px', color: '#64748b' }}>• {rubricCount} Rubric Criteria</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {hasSubmitted ? (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: isLate ? '#fffbeb' : '#f0fdf4',
                        color: isLate ? '#b45309' : '#15803d',
                        border: `1px solid ${isLate ? '#fde68a' : '#bbf7d0'}`,
                      }}
                    >
                      {isLate ? 'Submitted (LATE)' : 'Submitted'}
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      Not Submitted
                    </span>
                  )}
                  <ChevronRight size={18} style={{ color: '#94a3b8' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
