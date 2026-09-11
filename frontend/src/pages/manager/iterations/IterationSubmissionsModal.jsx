import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Preloader } from '../../../components/ui/Preloader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { DeadlineCountdown } from '../../../components/ui/DeadlineCountdown';
import { iterationsApi } from '../../../api/iterationsApi';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Search,
  FileDown,
  Building2,
  GraduationCap,
} from 'lucide-react';

const fmt = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  return d.toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtBytes = (b) => {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
};

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted (On-Time)' },
  { key: 'late', label: 'Late' },
  { key: 'not_submitted', label: 'Pending / Not Submitted' },
];

const tabStyle = (active) => ({
  padding: '5px 14px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
  backgroundColor: active ? '#eff6ff' : '#ffffff',
  color: active ? '#1d4ed8' : '#64748b',
  transition: 'all 0.15s ease',
});

export const IterationSubmissionsModal = ({ isOpen, onClose, iteration }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  const fetchSubmissions = useCallback(async () => {
    if (!iteration?._id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await iterationsApi.getSubmissions(iteration._id);
      const data = res.data || res;
      setSummary(data.summary || null);
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }, [iteration]);

  useEffect(() => {
    if (isOpen && iteration?._id) {
      fetchSubmissions();
      // Reset local filters on open
      setSearchQuery('');
      setStatusFilter('all');
      setSelectedCourse('');
      setSelectedDept('');
    }
  }, [isOpen, iteration, fetchSubmissions]);

  // Derive unique courses and departments from submissions
  const availableCourses = useMemo(() => {
    const set = new Set();
    submissions.forEach((s) => {
      if (s.course) set.add(s.course);
    });
    return Array.from(set).sort();
  }, [submissions]);

  const availableDepts = useMemo(() => {
    const set = new Set();
    submissions.forEach((s) => {
      if (s.dept) set.add(s.dept);
    });
    return Array.from(set).sort();
  }, [submissions]);

  // Filtered submissions list
  const filteredSubmissions = useMemo(() => {
    let list = submissions;

    // Status filter
    if (statusFilter === 'submitted') {
      list = list.filter((r) => r.submitted && !r.is_late);
    } else if (statusFilter === 'late') {
      list = list.filter((r) => r.is_late);
    } else if (statusFilter === 'not_submitted') {
      list = list.filter((r) => !r.submitted);
    }

    // Course filter
    if (selectedCourse) {
      list = list.filter((r) => r.course === selectedCourse);
    }

    // Department filter
    if (selectedDept) {
      list = list.filter((r) => r.dept === selectedDept);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.group_name?.toLowerCase().includes(q) ||
          r.project_title?.toLowerCase().includes(q) ||
          r.submitted_by?.toLowerCase().includes(q) ||
          r.course?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [submissions, statusFilter, selectedCourse, selectedDept, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    if (!submissions.length) return;
    const header = [
      'Group Name',
      'Project Title',
      'Course',
      'Department',
      'Status',
      'Submitted By',
      'Submitted At',
      'Late',
      'File Name',
      'Note',
    ];
    const rows = filteredSubmissions.map((r) => [
      r.group_name || '',
      r.project_title || '',
      r.course || '',
      r.dept || '',
      r.submitted ? (r.is_late ? 'Late' : 'On-Time') : 'Not Submitted',
      r.submitted_by || '',
      r.submitted_at ? fmt(r.submitted_at) : '',
      r.is_late ? 'Yes' : 'No',
      r.file_name || '',
      r.note || '',
    ]);
    const csvContent = [header, ...rows]
      .map((row) => row.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${iteration?.title || 'milestone'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalGroups = summary?.total_groups || 0;
  const submittedCount = summary?.submitted_count || 0;
  const lateCount = summary?.late_count || 0;
  const pendingCount = Math.max(0, totalGroups - submittedCount);
  const progressPct = totalGroups > 0 ? Math.round((submittedCount / totalGroups) * 100) : 0;
  const progressColor =
    progressPct === 100 ? '#16a34a' : progressPct > 0 ? '#2563eb' : '#dc2626';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Submissions Overview — ${iteration?.title || 'Milestone'}`}
      maxWidth="1050px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Milestone Header Metadata & Progress */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {iteration?.title}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: iteration?.course === 'All Courses' ? '#f3e8ff' : '#eff6ff',
                    color: iteration?.course === 'All Courses' ? '#7c3aed' : '#1d4ed8',
                    border: `1px solid ${iteration?.course === 'All Courses' ? '#ddd6fe' : '#bfdbfe'}`,
                  }}
                >
                  {iteration?.course}
                </span>
              </div>
              {iteration?.details && (
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
                  {iteration.details}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Deadline
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {iteration?.deadline}
                </div>
              </div>
              {iteration?.deadline && <DeadlineCountdown deadline={iteration.deadline} />}
            </div>
          </div>

          {/* Collective Progress Bar */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              <span style={{ color: '#334155' }}>
                Overall Submission Completion: <strong style={{ color: progressColor }}>{progressPct}%</strong> ({submittedCount}/{totalGroups} groups submitted)
              </span>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                <span style={{ color: '#16a34a' }}>✓ {submittedCount - lateCount} On-Time</span>
                {lateCount > 0 && <span style={{ color: '#d97706' }}>⚠ {lateCount} Late</span>}
                <span style={{ color: '#dc2626' }}>✗ {pendingCount} Pending</span>
              </div>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: '100%',
                  backgroundColor: progressColor,
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Cross-Course & Department Breakdown Cards */}
          {summary?.by_course && summary.by_course.length > 0 && (
            <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cross-Course & Department Breakdown
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px' }}>
                {summary.by_course.map((bc, idx) => {
                  const bcPct = bc.total_groups > 0 ? Math.round((bc.submitted_count / bc.total_groups) * 100) : 0;
                  const bcColor = bcPct === 100 ? '#16a34a' : bcPct > 0 ? '#2563eb' : '#dc2626';
                  return (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bc.course}>
                          {bc.course}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                          {bc.dept}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                        <span style={{ color: '#64748b' }}>
                          {bc.submitted_count}/{bc.total_groups} submitted ({bcPct}%)
                        </span>
                        {bc.late_count > 0 && (
                          <span style={{ color: '#d97706', fontWeight: 600 }}>{bc.late_count} late</span>
                        )}
                      </div>
                      <div style={{ width: '100%', height: '3px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${bcPct}%`, height: '100%', backgroundColor: bcColor, borderRadius: '2px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            padding: '10px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 200px', minWidth: '180px' }}>
            <Search size={14} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search group, project, or submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                color: '#1e293b',
              }}
            />
          </div>

          {/* Course filter (if > 1 available) */}
          {availableCourses.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GraduationCap size={14} style={{ color: '#64748b' }} />
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="">All Courses</option>
                {availableCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department filter */}
          {availableDepts.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={14} style={{ color: '#64748b' }} />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="">All Depts</option>
                {availableDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export CSV Button */}
          {submissions.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              <FileDown size={14} />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filterTabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={tabStyle(statusFilter === tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Submissions Table */}
        {loading ? (
          <Preloader label="Loading group submissions..." />
        ) : error ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
            {error}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <EmptyState
            title="No Submissions Found"
            description={
              statusFilter !== 'all' || searchQuery || selectedCourse || selectedDept
                ? 'No group submissions match the selected filters.'
                : 'No approved groups are registered for this milestone.'
            }
          />
        ) : (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              overflowX: 'auto',
              maxHeight: '440px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                    Group & Project
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                    Course / Dept
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                    Submitted By & Date
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                    Deliverable File
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((row) => (
                  <tr key={row.group_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* Group & Project */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#0f172a' }}>
                        {row.group_name}
                      </div>
                      {row.project_title && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.project_title}>
                          {row.project_title}
                        </div>
                      )}
                    </td>

                    {/* Course & Dept */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {row.course}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Dept: <strong>{row.dept}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '12px 14px' }}>
                      {row.submitted ? (
                        row.is_late ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                            }}
                          >
                            <AlertTriangle size={12} /> Late
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            <CheckCircle2 size={12} /> On-Time
                          </span>
                        )
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                          }}
                        >
                          <XCircle size={12} /> Not Submitted
                        </span>
                      )}
                    </td>

                    {/* Submitted By & Date */}
                    <td style={{ padding: '12px 14px' }}>
                      {row.submitted ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                            {row.submitted_by}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                            {fmt(row.submitted_at)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                      )}
                    </td>

                    {/* File / Actions */}
                    <td style={{ padding: '12px 14px' }}>
                      {row.submitted && row.file_url ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <a
                            href={row.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#2563eb',
                              textDecoration: 'none',
                            }}
                          >
                            <Download size={13} />
                            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.file_name}>
                              {row.file_name}
                            </span>
                            {row.file_size && (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                ({fmtBytes(row.file_size)})
                              </span>
                            )}
                          </a>
                          {row.note && (
                            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.note}>
                              &quot;{row.note}&quot;
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>No file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
