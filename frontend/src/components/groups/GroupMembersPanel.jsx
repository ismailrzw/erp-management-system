import { Users, Crown, GraduationCap, Mail } from 'lucide-react';

export const GroupMembersPanel = ({ members = [], supervisorName = '', supervisorEmail = '', maxMembers = 4 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Group Members Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={17} color="#0073aa" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Group Members
            </h3>
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: '#eef6fb',
              color: '#0073aa',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {members.length} / {maxMembers}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No members listed for this group.
            </div>
          ) : (
            members.map((member) => {
              const isLeader = Boolean(member.is_leader);
              const initial = member.name ? member.name.charAt(0).toUpperCase() : 'S';

              return (
                <div
                  key={member.id || member._id || member.roll}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: isLeader ? '#f0f9ff' : '#f8fafc',
                    border: isLeader ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: isLeader ? '#0073aa' : '#cbd5e1',
                      color: isLeader ? '#ffffff' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {initial}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', wordBreak: 'break-word' }}>
                        {member.name}
                      </span>
                      {isLeader && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                          }}
                        >
                          <Crown size={10} />
                          Leader
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
                      Roll: <b>{member.roll || '—'}</b>
                    </div>

                    {member.email && (
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#64748b',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          wordBreak: 'break-all',
                        }}
                      >
                        <Mail size={11} style={{ flexShrink: 0 }} />
                        <span>{member.email}</span>
                      </div>
                    )}

                    {(member.dept || member.section) && (
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        {member.dept && <span>Dept: <b>{member.dept}</b></span>}
                        {member.section && <span> • Sec: <b>{member.section}</b></span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Project Supervisor Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <GraduationCap size={17} color="#0073aa" />
          <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
            Project Supervisor
          </h3>
        </div>

        {supervisorName ? (
          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
              {supervisorName}
            </div>
            {supervisorEmail && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={12} />
                <span>{supervisorEmail}</span>
              </div>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', backgroundColor: '#eafbf1', color: '#16a34a', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
              <span>Assigned & Active</span>
            </div>
          </div>
        ) : (
          <div style={{ padding: '10px 12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fef3c7', fontSize: '12.5px', color: '#b45309' }}>
            Awaiting Supervisor invitation / acceptance
          </div>
        )}
      </div>
    </div>
  );
};
