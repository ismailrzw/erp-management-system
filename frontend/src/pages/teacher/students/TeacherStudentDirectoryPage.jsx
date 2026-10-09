import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Mail, Users, ArrowRight, Award } from 'lucide-react';
import { teacherPortalApi } from '../../../api/teacherPortalApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';

export const TeacherStudentDirectoryPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const navigate = useNavigate();

  const fetchStudents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const res = await teacherPortalApi.getStudents(params);
      if (res.success && res.data) {
        setStudents(res.data.items || res.data || []);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to load student directory',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  if (loading && !refreshing) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Supervised Students"
          subtitle="Directory of all students across your active supervised FYP project groups."
          breadcrumbs={[
            { label: 'Home', to: '/teacher/dashboard' },
            { label: 'Students' },
          ]}
        />
        <ContentLoader label="Loading student directory..." />
      </div>
    );
  }

  return (
    <div className="page-frame-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <PageHeader
        title="Supervised Students"
        subtitle="Directory of all students across your active supervised FYP project groups."
        breadcrumbs={[
          { label: 'Home', to: '/teacher/dashboard' },
          { label: 'Students' },
        ]}
      >
        <button
          type="button"
          onClick={() => fetchStudents(true)}
          disabled={refreshing}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, email, or group..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '11px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
        </div>
      </div>

      {/* Table / List */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
            Total Students: <b>{students.length}</b>
          </span>
        </div>

        {students.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>
              No students found
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              Students will appear here once their FYP groups are supervised by you.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Student</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Roll Number</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Group / Project</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Course & Section</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr
                    key={st.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{st.name}</span>
                            {st.is_leader && (
                              <span
                                style={{
                                  backgroundColor: '#fef3c7',
                                  color: '#b45309',
                                  fontSize: '10.5px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Award size={10} />
                                Lead
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {st.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 500, color: '#334155' }}>
                      {st.roll || '—'}
                    </td>
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {st.group_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                        {st.project_title || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', color: '#334155' }}>
                      <div>{st.course || 'FYP'}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Section {st.section || '—'}</div>
                    </td>
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        {st.email && (
                          <a
                            href={`mailto:${st.email}`}
                            title={`Send email to ${st.name}`}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px', color: '#64748b' }}
                          >
                            <Mail size={14} />
                          </a>
                        )}
                        {st.group_id && (
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/groups/${st.group_id}`)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                          >
                            <span>Group</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
