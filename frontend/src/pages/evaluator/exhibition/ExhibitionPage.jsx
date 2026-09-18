import { useState, useEffect } from 'react';
import { Award, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { evaluatorApi } from '../../../api/evaluatorApi';
import { ExhibitionEvalForm } from './ExhibitionEvalForm';

export function ExhibitionPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);

  function loadExhibitionData() {
    setLoading(true);
    evaluatorApi.getExhibitionGroups()
      .then(res => {
        if (res.data?.success) {
          setGroups(res.data.data.items || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadExhibitionData();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
          Exhibition Evaluation
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          Evaluate project presentations and final demonstrations for assigned groups.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading exhibition groups...</div>
      ) : groups.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '48px',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <Award size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            No Exhibition Groups Assigned
          </h3>
          <p style={{ fontSize: '13px' }}>You have not been assigned to evaluate any exhibition presentations.</p>
        </div>
      ) : (
        <div className={selectedGroup ? 'dashboard-dual-grid' : ''} style={selectedGroup ? {} : { display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* Groups List */}
          <div className="table-responsive-container" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', minWidth: '120px' }}>Group</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', minWidth: '120px' }}>Course</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', minWidth: '100px' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', textAlign: 'right', minWidth: '90px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const isSelected = selectedGroup?.id === g.id;
                  return (
                    <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#eff6ff' : '#ffffff' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                        {g.name}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '13px', color: '#475569' }}>
                        {g.course}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {g.evaluated ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}>
                            <CheckCircle2 size={13} />
                            <span>Evaluated</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#fef3c7',
                            color: '#b45309',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}>
                            <Clock size={13} />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedGroup(g)}
                          className="btn btn-primary btn-sm"
                          style={{ background: isSelected ? 'var(--primary-hover)' : undefined }}
                        >
                          <span>{g.evaluated ? 'View Score' : 'Evaluate'}</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Evaluation Form Panel */}
          {selectedGroup && (
            <div>
              <ExhibitionEvalForm
                group={selectedGroup}
                onClose={() => setSelectedGroup(null)}
                onSuccess={() => {
                  loadExhibitionData();
                  setSelectedGroup(prev => ({ ...prev, evaluated: true }));
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
