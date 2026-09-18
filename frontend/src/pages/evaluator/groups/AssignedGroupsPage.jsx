import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle2, ChevronRight, FolderGit2 } from 'lucide-react';
import { evaluatorApi } from '../../../api/evaluatorApi';

export function AssignedGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    evaluatorApi.getAssignedGroups()
      .then(res => {
        if (res.data?.success) {
          setGroups(res.data.data.items || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
          Assigned Project Groups
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          Groups assigned to you for iteration scoring and supervision.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading groups...</div>
      ) : groups.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '48px',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <FolderGit2 size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            No Groups Assigned
          </h3>
          <p style={{ fontSize: '13px' }}>You have not been assigned to evaluate any project groups yet.</p>
        </div>
      ) : (
        <div className="table-responsive-container table-wide" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Group Name
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Course
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Department
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Members
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Evaluations
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                    {g.name}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13.5px', color: '#334155' }}>
                    {g.course}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13.5px', color: '#64748b' }}>
                    {g.dept}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13.5px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={15} color="#64748b" />
                      <span>{g.members_count} students</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={15} color={g.evaluations_completed === g.iterations_total && g.iterations_total > 0 ? '#16a34a' : '#d97706'} />
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
                        {g.evaluations_completed} / {g.iterations_total} Completed
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/evaluator/groups/${g.id}`)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>View & Evaluate</span>
                      <ChevronRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
