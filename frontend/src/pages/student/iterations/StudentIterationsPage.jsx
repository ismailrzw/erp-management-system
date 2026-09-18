import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Preloader } from '../../../components/ui/Preloader';
import { Toast } from '../../../components/ui/Toast';
import { DeadlineCountdown } from '../../../components/ui/DeadlineCountdown';
import { studentIterationsApi } from '../../../api/studentIterationsApi';
import { Calendar, CheckCircle2, Clock, ChevronRight, FileText, AlertCircle, Users } from 'lucide-react';

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'overdue', label: 'Overdue' },
];

const tabStyle = (active) => ({
  padding: '5px 14px',
  borderRadius: '20px',
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
  border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
  backgroundColor: active ? '#eff6ff' : '#ffffff',
  color: active ? '#1d4ed8' : '#64748b',
  transition: 'all 0.15s ease',
});

export const StudentIterationsPage = () => {
  const [iterations, setIterations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [hasGroup, setHasGroup] = useState(true); // assume true until API says otherwise
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  const fetchIterations = async () => {
    setLoading(true);
    try {
      const res = await studentIterationsApi.getAll();
      setIterations(res.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch iterations.';
      // Detect "no group" state from error
      if (err.response?.status === 403 || msg.toLowerCase().includes('approved group')) {
        setHasGroup(false);
      }
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIterations();
  }, []);

  // Apply status filter
  const filteredIterations = useMemo(() => {
    const now = new Date();
    return iterations.filter((item) => {
      if (statusFilter === 'all') return true;
      const dl = new Date(item.deadline);
      if (statusFilter === 'pending') return !item.has_submitted && dl >= now;
      if (statusFilter === 'submitted') return item.has_submitted;
      if (statusFilter === 'overdue') return !item.has_submitted && dl < now;
      return true;
    });
  }, [iterations, statusFilter]);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <PageHeader
        title="Project Iterations"
        subtitle="Track course milestones, review evaluation rubrics, and submit group project files."
      />

      {/* No-Group Warning Banner */}
      {!hasGroup && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
              You are not in an approved project group
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#b45309' }}>
              You must be part of an approved group to submit iteration deliverables.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/group/browse')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #fde68a',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Users size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Browse Groups
          </button>
        </div>
      )}

      {/* Status filter tabs */}
      {iterations.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              style={tabStyle(statusFilter === tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Preloader label="Loading iterations..." />
      ) : filteredIterations.length === 0 ? (
        <EmptyState
          title={statusFilter !== 'all' ? 'No matching iterations' : 'No Iterations Available'}
          description={
            statusFilter !== 'all'
              ? `No ${statusFilter} iterations found. Try a different filter.`
              : 'There are currently no iteration milestones published for your enrolled course.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredIterations.map((item) => {
            const hasSubmitted = item.has_submitted;
            const isLate = item.submission?.is_late;
            const rubricCount = item.rubrics?.length || 0;
            const isOverdue = !hasSubmitted && new Date(item.deadline) < new Date();

            return (
              <div
                key={item._id}
                onClick={() => navigate(`/student/iterations/${item._id}`)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: `1px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}`,
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = '#bfdbfe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.borderColor = isOverdue ? '#fecaca' : '#e2e8f0';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: hasSubmitted ? (isLate ? '#fffbeb' : '#f0fdf4') : isOverdue ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${hasSubmitted ? (isLate ? '#fde68a' : '#bbf7d0') : isOverdue ? '#fecaca' : '#e2e8f0'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {hasSubmitted ? (
                      isLate ? <Clock size={22} style={{ color: '#d97706' }} /> : <CheckCircle2 size={22} style={{ color: '#16a34a' }} />
                    ) : isOverdue ? (
                      <AlertCircle size={22} style={{ color: '#dc2626' }} />
                    ) : (
                      <FileText size={22} style={{ color: '#64748b' }} />
                    )}
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                      {item.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Course badge */}
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          padding: '1px 8px',
                          borderRadius: '12px',
                          backgroundColor: item.course === 'All Courses' ? '#f3e8ff' : '#f1f5f9',
                          color: item.course === 'All Courses' ? '#7c3aed' : '#64748b',
                          border: `1px solid ${item.course === 'All Courses' ? '#ddd6fe' : '#e2e8f0'}`,
                        }}
                      >
                        {item.course}
                      </span>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', color: '#64748b' }}>
                        <Calendar size={13} />
                        <span>{item.deadline}</span>
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
                        backgroundColor: isOverdue ? '#fef2f2' : '#f1f5f9',
                        color: isOverdue ? '#b91c1c' : '#64748b',
                        border: `1px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}`,
                      }}
                    >
                      {isOverdue ? 'OVERDUE' : 'Not Submitted'}
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
