import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Preloader } from '../../../components/ui/Preloader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { iterationsApi } from '../../../api/iterationsApi';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Download, Users, Calendar, FileText } from 'lucide-react';

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

export const IterationSubmissionsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await iterationsApi.getSubmissions(id);
        const data = res.data || res;
        setSummary(data.summary || null);
        setSubmissions(data.submissions || []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load submissions.');
      } finally { setLoading(false); }
    })();
  }, [id]);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/manager/iterations')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px', padding: '4px 0' }}
      >
        <ArrowLeft size={15} /> Back to Iterations
      </button>

      <PageHeader
        title={summary ? summary.iteration_title : 'Submission Review'}
        subtitle={summary ? summary.course + ' \u00b7 Deadline: ' + summary.iteration_deadline : 'Group-wise submission status'}
      />

      {loading ? (
        <Preloader label="Loading submissions..." />
      ) : error ? (
        <EmptyState title="Could not load submissions" description={error} actionLabel="Go Back" onAction={() => navigate('/manager/iterations')} />
      ) : (
        <>
          {summary && (
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
          )}

          {submissions.length === 0 ? (
            <EmptyState title="No groups found" description="No approved groups are enrolled in this course yet." />
          ) : (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thS}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={13} />Group</span></th>
                    <th style={thS}>Status</th>
                    <th style={thS}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={13} />File</span></th>
                    <th style={thS}>Submitted By</th>
                    <th style={thS}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} />Submitted At</span></th>
                    <th style={thS}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((row) => (
                    <tr key={row.group_id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: row.submitted ? '#ffffff' : '#fafafa' }}>
                      <td style={tdS}><span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>{row.group_name}</span></td>
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
