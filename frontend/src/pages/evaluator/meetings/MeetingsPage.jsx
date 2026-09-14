import { useState, useEffect } from 'react';
import { Calendar, Plus, Users, Search } from 'lucide-react';
import { evaluatorApi } from '../../../api/evaluatorApi';
import { MeetingFormModal } from './MeetingFormModal';

export function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');

  function loadData() {
    setLoading(true);
    Promise.all([
      evaluatorApi.getMeetings(selectedGroupFilter),
      evaluatorApi.getAssignedGroups(),
    ])
      .then(([mRes, gRes]) => {
        if (mRes.data?.success) setMeetings(mRes.data.data.items || []);
        if (gRes.data?.success) setAssignedGroups(gRes.data.data.items || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [selectedGroupFilter]);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
            Supervision Meetings Log
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Track and log all supervision meetings conducted with your assigned project groups.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          <span>Log New Meeting</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Search size={16} color="#64748b" />
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: '#ffffff',
              minWidth: '240px',
            }}
          >
            <option value="">All Assigned Groups</option>
            {assignedGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.course})</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Total Logged: <strong>{meetings.length}</strong>
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading meetings...</div>
      ) : meetings.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '48px',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <Calendar size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            No Meetings Logged
          </h3>
          <p style={{ fontSize: '13px' }}>Click "Log New Meeting" above to record a supervision session.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {meetings.map((m) => {
            const grp = assignedGroups.find(g => g.id === m.group_id);
            return (
              <div key={m.id} style={{
                background: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {m.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#2563eb', fontWeight: 600, marginTop: '4px' }}>
                      <Users size={14} />
                      <span>{grp ? grp.name : `Group ID: ${m.group_id}`}</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    color: '#64748b',
                    background: '#f1f5f9',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Calendar size={13} />
                    {new Date(m.date).toLocaleDateString()}
                  </span>
                </div>

                {m.agenda && (
                  <div style={{ fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                    <strong>Agenda:</strong> {m.agenda}
                  </div>
                )}
                {m.minutes && (
                  <div style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <strong>Minutes / Action Items:</strong> {m.minutes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <MeetingFormModal
          assignedGroups={assignedGroups}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
