import { Crown, Trash2, Mail } from 'lucide-react';

export const GroupMemberList = ({
  members = [],
  isLeader = false,
  currentUserId,
  onRemoveMember,
  isGroupApproved = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {members.map((m) => {
        const isCurrentLeader = m.is_leader;
        const isSelf = m.id === currentUserId;
        const canRemove = isLeader && !isCurrentLeader && !isGroupApproved;

        return (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: isCurrentLeader ? '#eff6ff' : '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: isCurrentLeader ? '#dbeafe' : '#f1f5f9',
                  color: isCurrentLeader ? '#1d4ed8' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                {isCurrentLeader ? <Crown size={16} /> : m.name ? m.name.charAt(0).toUpperCase() : 'S'}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                    {m.name} {isSelf ? '(You)' : ''}
                  </span>
                  {isCurrentLeader && (
                    <span
                      style={{
                        padding: '1px 6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        borderRadius: '10px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                      }}
                    >
                      👑 Leader
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Roll: <b>{m.roll || 'N/A'}</b> {m.section ? `• Sec ${m.section}` : ''} {m.email ? `• ${m.email}` : ''}
                </div>
              </div>
            </div>

            {canRemove && onRemoveMember && (
              <button
                type="button"
                onClick={() => onRemoveMember(m)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  color: '#dc2626',
                  backgroundColor: '#ffffff',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                title="Remove member from group"
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
