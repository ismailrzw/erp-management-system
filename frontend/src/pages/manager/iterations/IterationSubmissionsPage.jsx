import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { iterationsApi } from '../../../api/iterationsApi';
import { coursesApi } from '../../../api/coursesApi';
import { IterationsTabBar } from './IterationsTabBar';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Download, Users, Calendar, FileText, Search, FileDown } from 'lucide-react';

const fmt = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  return d.toLocaleString('en-PK', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const fmtBytes = (b) => {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
};
const thS = { padding: '11px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdS = { padding: '14px 16px', verticalAlign: 'middle' };
const bdg = (bg, c, br) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 600, backgroundColor: bg, color: c, border: '1px solid ' + br });

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'not_submitted', label: 'Not Submitted' },
  { key: 'late', label: 'Late' },
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

export const IterationSubmissionsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [iterationsList, setIterationsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedIterationId, setSelectedIterationId] = useState(id || '');
  const [summary, setSummary] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Helper to load submissions for a given iteration ID without tearing down page
  const loadSubmissions = async (iterId) => {
    if (!iterId) {
      setSummary(null);
      setSubmissions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await iterationsApi.getSubmissions(iterId);
      const data = res.data || res;
      setSummary(data.summary || null);
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleIterationChange = (newId) => {
    setSelectedIterationId(newId);
    loadSubmissions(newId);
  };

  // Coordinated initial fetch: loads iterations, courses, and target iteration submissions in one smooth pass
  useEffect(() => {
    let isCurrent = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [iterRes, courseRes] = await Promise.all([
          iterationsApi.getAll(),
          coursesApi.list(),
        ]);
        if (!isCurrent) return;
        const iters = iterRes.data || iterRes || [];
        const crs = courseRes.data?.items || courseRes.data || courseRes || [];
        setIterationsList(iters);
        setCoursesList(crs);

        const targetId = id || (iters.length > 0 ? iters[0]._id : '');
        setSelectedIterationId(targetId);

        if (targetId) {
          const subRes = await iterationsApi.getSubmissions(targetId);
          if (!isCurrent) return;
          const data = subRes.data || subRes;
          setSummary(data.summary || null);
          setSubmissions(data.submissions || []);
        } else {
          setSummary(null);
          setSubmissions([]);
        }
      } catch (err) {
        if (isCurrent) {
          setError(err.response?.data?.message || err.message || 'Failed to load submissions.');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [id]);

  // Filter iterations by selected course
  const availableIterations = useMemo(() => {
    if (!selectedCourse) return iterationsList;
    return iterationsList.filter((it) => it.course === 'All Courses' || it.course === selectedCourse);
  }, [iterationsList, selectedCourse]);

  // Filter submission records
  const filtered = useMemo(() => {
    let result = submissions;

    // Course filter override if selected
    if (selectedCourse) {
      result = result.filter((r) => !r.course || r.course === 'All Courses' || r.course === selectedCourse);
    }

    // Status filter
    if (statusFilter === 'submitted') result = result.filter((r) => r.submitted && !r.is_late);
    else if (statusFilter === 'not_submitted') result = result.filter((r) => !r.submitted);
    else if (statusFilter === 'late') result = result.filter((r) => r.is_late);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.group_name?.toLowerCase().includes(q) ||
          r.project_title?.toLowerCase().includes(q) ||
          r.course?.toLowerCase().includes(q) ||
          r.submitted_by?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [submissions, selectedCourse, statusFilter, searchQuery]);

  // CSV export
  const handleExportCSV = () => {
    if (!submissions.length) return;
    const header = ['Group Name', 'Project Title', 'Course', 'Department', 'Status', 'Submitted By', 'Submitted At', 'Late', 'File Name', 'Note'];
    const rows = filtered.map((r) => [
      r.group_name || '',
      r.project_title || '',
      r.course || '',
      r.dept || '',
      r.submitted ? 'Submitted' : 'Not Submitted',
      r.submitted_by || '',
      r.submitted_at ? fmt(r.submitted_at) : '',
      r.is_late ? 'Yes' : 'No',
      r.file_name || '',
      r.note || '',
    ]);
    const csvContent = [header, ...rows].map((row) => row.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${summary?.iteration_title || selectedIterationId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPct = summary && summary.total_groups > 0
    ? Math.round((summary.submitted_count / summary.total_groups) * 100)
    : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Top Sub-Navigation Bar */}
      <IterationsTabBar />

      <PageHeader
        title={summary ? summary.iteration_title : 'Group Submissions'}
        subtitle={summary ? `${summary.course} · Deadline: ${summary.iteration_deadline}` : 'Group-wise submission status and progress'}
      >
        {submissions.length > 0 && (
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <FileDown size={15} />
            Export CSV
          </button>
        )}
      </PageHeader>

      {/* Top Filter Bar: Select Course & Milestone */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            Filter by Course
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => {
              const c = e.target.value;
              setSelectedCourse(c);
              const matching = iterationsList.filter((it) => !c || it.course === 'All Courses' || it.course === c);
              if (matching.length > 0) {
                handleIterationChange(matching[0]._id);
              } else {
                handleIterationChange('');
              }
            }}
            style={{ width: '100%', padding: '7px 32px 7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
          >
            <option value="">All Courses</option>
            {coursesList.map((crs) => (
              <option key={crs._id || crs.name} value={crs.name}>
                {crs.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 240px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            Select Milestone / Deliverable
          </label>
          <select
            value={selectedIterationId}
            onChange={(e) => handleIterationChange(e.target.value)}
            style={{ width: '100%', padding: '7px 32px 7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
          >
            {availableIterations.length === 0 ? (
              <option value="">No milestones available</option>
            ) : (
              availableIterations.map((it) => (
                <option key={it._id} value={it._id}>
                  {it.title} ({it.course})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loading ? (
        <ContentLoader label="Loading submissions..." />
      ) : error ? (
        <EmptyState title="Could not load submissions" description={error} actionLabel="Go Back to Milestones" onAction={() => navigate('/manager/iterations')} />
      ) : (
        <>
          {summary && (
            <>
              {/* Progress bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Submission Progress
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: progressPct === 100 ? '#16a34a' : '#1e293b' }}>
                    {progressPct}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressPct}%`,
                      height: '100%',
                      backgroundColor: progressPct === 100 ? '#16a34a' : progressPct > 50 ? '#2563eb' : '#d97706',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Stat Cards */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {[
                  ['Total Groups', summary.total_groups, '#1e293b'],
                  ['Submitted', summary.submitted_count, '#16a34a'],
                  ['Not Submitted', summary.total_groups - summary.submitted_count, '#dc2626'],
                  ['Late', summary.late_count, '#d97706'],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 24px', minWidth: '140px', flex: '1 1 140px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Search & Filter toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by group, course, or student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#1e293b',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
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
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={searchQuery || statusFilter !== 'all' ? 'No matching results' : 'No groups found'}
              description={searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filter.' : 'No approved groups are enrolled in this course yet.'}
            />
          ) : (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thS}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={13} />Group</span></th>
                    <th style={thS}>Course / Dept</th>
                    <th style={thS}>Status</th>
                    <th style={thS}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={13} />File</span></th>
                    <th style={thS}>Submitted By</th>
                    <th style={thS}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} />Submitted At</span></th>
                    <th style={thS}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.group_id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: row.submitted ? '#ffffff' : '#fafafa' }}>
                      <td style={tdS}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>{row.group_name}</div>
                        {row.project_title && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{row.project_title}</div>
                        )}
                      </td>
                      <td style={tdS}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{row.course || '-'}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Dept: <strong>{row.dept || '-'}</strong></span>
                        </div>
                      </td>
                      <td style={tdS}>
                        {row.submitted
                          ? row.is_late
                            ? <span style={bdg('#fef3c7', '#b45309', '#fde68a')}><AlertTriangle size={12} /> Late</span>
                            : <span style={bdg('#dcfce7', '#15803d', '#bbf7d0')}><CheckCircle2 size={12} /> On Time</span>
                          : <span style={bdg('#fee2e2', '#b91c1c', '#fecaca')}><XCircle size={12} /> Not Submitted</span>}
                      </td>
                      <td style={tdS}>
                        {row.file_url
                          ? (
                            <a href={row.file_url} target="_blank" rel="noreferrer" download={row.file_name} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#2563eb', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>
                              <Download size={13} />{row.file_name}
                              {row.file_size ? <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '11px' }}>({fmtBytes(row.file_size)})</span> : null}
                            </a>
                          )
                          : <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>}
                      </td>
                      <td style={tdS}><span style={{ fontSize: '13px', color: '#334155' }}>{row.submitted_by || '-'}</span></td>
                      <td style={tdS}><span style={{ fontSize: '13px', color: '#334155' }}>{fmt(row.submitted_at)}</span></td>
                      <td style={tdS}><span style={{ fontSize: '12.5px', color: '#475569', fontStyle: row.note ? 'normal' : 'italic' }}>{row.note || 'No note'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
