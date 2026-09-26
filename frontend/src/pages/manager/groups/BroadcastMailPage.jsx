import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Send,
  Loader2,
  Users,
  UserX,
  CheckSquare,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { managerGroupsApi } from '../../../api/managerGroupsApi';
import { studentsApi } from '../../../api/studentsApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Toast } from '../../../components/ui/Toast';

const QUICK_TEMPLATES = [
  {
    label: 'Milestone Deadline Reminder',
    subject: 'Important Reminder: Upcoming Milestone Deliverables Deadline',
    body: 'Dear Students,\n\nPlease ensure that your project repository, documentation, and sprint milestone deliverables are submitted before the deadline.\n\nLate submissions will be evaluated according to the penalty rubrics.\n\nBest regards,\nPBL Management',
  },
  {
    label: 'Rubrics Released',
    subject: 'Project Evaluation Rubrics & Guidelines Announced',
    body: 'Dear Students,\n\nThe evaluation rubrics for the upcoming project review iteration have been published in your student portal. Please review the criteria carefully to ensure all requirements are fulfilled.\n\nBest regards,\nPBL Management',
  },
  {
    label: 'Group Formation Reminder',
    subject: 'Action Required: Finalize FYP Group Formation',
    body: 'Dear Student,\n\nOur records indicate that you have not joined or formed a project group yet. Please complete your team formation or request to join an existing group before the deadline to ensure your course enrollment remains active.\n\nBest regards,\nPBL Management',
  },
  {
    label: 'Showcase Day Schedule',
    subject: 'Final Project Exhibition & Showcase Day Schedule',
    body: 'Dear Project Teams,\n\nThe final showcase and evaluation day has been scheduled. Please prepare your project booth, presentation slides, and running live demonstration for the evaluation panel.\n\nBest regards,\nPBL Management',
  },
];

export const BroadcastMailPage = () => {
  const [target, setTarget] = useState('all_groups'); // 'all_groups' | 'specific_groups' | 'ungrouped'
  const [groups, setGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [ungroupedCount, setUngroupedCount] = useState(0);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [successReport, setSuccessReport] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [gRes, uRes] = await Promise.all([
          managerGroupsApi.getGroups({ limit: 100 }),
          studentsApi.getUngrouped(),
        ]);
        if (isMounted) {
          if (gRes.success && gRes.data) {
            setGroups(gRes.data.items || []);
          }
          if (uRes.success && uRes.data) {
            const items = Array.isArray(uRes.data)
              ? uRes.data
              : Array.isArray(uRes.data.items)
                ? uRes.data.items
                : [];
            setUngroupedCount(uRes.data.total ?? items.length);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleGroup = (groupId) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSelectAll = () => {
    const filteredIds = filteredGroups.map((g) => g.id);
    const allSelected = filteredIds.every((id) => selectedGroupIds.includes(id));
    if (allSelected) {
      setSelectedGroupIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedGroupIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleApplyTemplate = (tpl) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
    if (tpl.label.includes('Group Formation')) {
      setTarget('ungrouped');
    }
    setToast({ message: `Template "${tpl.label}" loaded!`, type: 'info' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setToast({ message: 'Email subject is required.', type: 'error' });
      return;
    }
    if (!body.trim()) {
      setToast({ message: 'Email message content is required.', type: 'error' });
      return;
    }
    if (target === 'specific_groups' && selectedGroupIds.length === 0) {
      setToast({ message: 'Please select at least one group to send email to.', type: 'error' });
      return;
    }

    try {
      setIsSending(true);
      const payload = {
        target,
        subject: subject.trim(),
        body: body.trim(),
        group_ids: target === 'specific_groups' ? selectedGroupIds : undefined,
      };
      const res = await managerGroupsApi.sendMail(payload);
      if (res.success) {
        setSuccessReport({
          sent_count: res.data?.sent_count ?? res.data?.emails_dispatched ?? 0,
          target,
          subject: subject.trim(),
        });
        setToast({ message: res.message || 'Emails broadcasted successfully!', type: 'success' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch emails';
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (!groupSearch.trim()) return true;
    const term = groupSearch.toLowerCase();
    return (
      (g.name && g.name.toLowerCase().includes(term)) ||
      (g.project_title && g.project_title.toLowerCase().includes(term)) ||
      (g.leader_name && g.leader_name.toLowerCase().includes(term)) ||
      (g.course && g.course.toLowerCase().includes(term))
    );
  });

  return (
    <div className="page-frame-container" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => navigate('/manager/groups')}
          className="btn btn-back"
          style={{ marginBottom: '10px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to All Groups</span>
        </button>

        <PageHeader
          title="Broadcast Email to Project Teams"
          subtitle="Send official notifications, milestone reminders, and announcements directly to student inboxes."
          breadcrumbs={[
            { label: 'Home', to: '/manager/dashboard' },
            { label: 'Manage Groups', to: '/manager/groups' },
            { label: 'Broadcast Mail' },
          ]}
        />
      </div>

      {successReport ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          }}
        >
          <CheckCircle2 size={54} color="#16a34a" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>
            Broadcast Dispatched Successfully!
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px 0' }}>
            Your email notification has been dispatched to <b>{successReport.sent_count} recipient(s)</b>.
          </p>

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '16px 20px',
              maxWidth: '480px',
              margin: '0 auto 24px',
              textAlign: 'left',
              fontSize: '13px',
              color: '#334155',
            }}
          >
            <div>Subject: <b>{successReport.subject}</b></div>
            <div style={{ marginTop: '6px' }}>Target: <b>{successReport.target === 'all_groups' ? 'All Formed Groups' : successReport.target === 'specific_groups' ? 'Specific Selected Groups' : 'Ungrouped Students'}</b></div>
            <div style={{ marginTop: '6px' }}>Dispatched Emails: <b style={{ color: '#16a34a' }}>{successReport.sent_count} Students</b></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setSuccessReport(null);
                setSubject('');
                setBody('');
                setSelectedGroupIds([]);
              }}
              className="btn btn-secondary"
            >
              Send Another Broadcast
            </button>
            <button
              type="button"
              onClick={() => navigate('/manager/groups')}
              className="btn btn-primary"
            >
              Return to Groups List
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSend}>
          {/* 1. Target Audience Selection Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '22px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
              1. Select Target Audience <span style={{ color: '#dc2626' }}>*</span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {/* Option A: All Groups */}
              <div
                onClick={() => setTarget('all_groups')}
                style={{
                  border: target === 'all_groups' ? '2px solid #0073aa' : '1px solid #cbd5e1',
                  backgroundColor: target === 'all_groups' ? '#f0f9ff' : '#ffffff',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: target === 'all_groups' ? '#0073aa' : '#f1f5f9',
                    color: target === 'all_groups' ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                    All Formed Groups
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Broadcast to all members across all {groups.length} active project groups.
                  </div>
                </div>
              </div>

              {/* Option B: Specific Groups */}
              <div
                onClick={() => setTarget('specific_groups')}
                style={{
                  border: target === 'specific_groups' ? '2px solid #0073aa' : '1px solid #cbd5e1',
                  backgroundColor: target === 'specific_groups' ? '#f0f9ff' : '#ffffff',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: target === 'specific_groups' ? '#0073aa' : '#f1f5f9',
                    color: target === 'specific_groups' ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckSquare size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                    Specific Groups
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Select specific project groups from an interactive checklist.
                  </div>
                </div>
              </div>

              {/* Option C: Ungrouped Students */}
              <div
                onClick={() => setTarget('ungrouped')}
                style={{
                  border: target === 'ungrouped' ? '2px solid #d97706' : '1px solid #cbd5e1',
                  backgroundColor: target === 'ungrouped' ? '#fffbeb' : '#ffffff',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: target === 'ungrouped' ? '#d97706' : '#f1f5f9',
                    color: target === 'ungrouped' ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <UserX size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                    Ungrouped Students ({ungroupedCount})
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Target reminder directly to students not yet enrolled in any team.
                  </div>
                </div>
              </div>
            </div>

            {/* Specific Group Selector Multi-Select List */}
            {target === 'specific_groups' && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Filter groups by name, course, leader..."
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12.5px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                      Selected: <b>{selectedGroupIds.length}</b> of {groups.length} groups
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                    >
                      {filteredGroups.length > 0 && filteredGroups.every((g) => selectedGroupIds.includes(g.id))
                        ? 'Deselect Filtered'
                        : 'Select All Filtered'}
                    </button>
                  </div>
                </div>

                {filteredGroups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                    No groups match the search filter.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredGroups.map((g) => {
                      const isSelected = selectedGroupIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: isSelected ? '#0073aa' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#334155',
                            border: isSelected ? '1px solid #0073aa' : '1px solid #cbd5e1',
                            fontSize: '12.5px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.1s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleGroup(g.id)}
                            style={{ display: 'none' }}
                          />
                          <CheckSquare size={14} color={isSelected ? '#ffffff' : '#94a3b8'} />
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 600 }}>{g.name}</span>
                            <span style={{ opacity: 0.8, fontSize: '11px', marginLeft: '6px' }}>({g.course || 'FYP'})</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Quick Templates */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '16px 20px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              <Sparkles size={14} color="#0073aa" />
              <span>Quick Template Presets (click to load):</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {QUICK_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0073aa';
                    e.currentTarget.style.color = '#0073aa';
                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.color = '#334155';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                >
                  + {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Email Content Composition */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '22px',
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Email Subject <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Action Required: Sprint 1 Milestone Deliverables & Rubrics Deadline"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Email Message Content <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email announcement or reminder message here. Students will receive this notification directly in their inbox..."
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
              />
            </div>
          </div>

          {/* Bottom Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '30px' }}>
            <button
              type="button"
              onClick={() => navigate('/manager/groups')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="btn btn-primary btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>{isSending ? 'Sending Broadcast...' : 'Send Broadcast Email'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
