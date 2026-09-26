import { useState, useEffect, useCallback } from 'react';
import { User, Mail, Building, Plus, X, Save, CheckCircle2, ShieldCheck, Tag, Info } from 'lucide-react';
import { teacherPortalApi } from '../../../api/teacherPortalApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';

const PREDEFINED_SUGGESTIONS = [
  'Machine Learning',
  'Deep Learning',
  'Computer Vision',
  'Natural Language Processing',
  'Web Applications',
  'Mobile Development',
  'Cloud Computing',
  'DevOps & CI/CD',
  'Cybersecurity',
  'Internet of Things (IoT)',
  'Blockchain',
  'Distributed Systems',
  'Data Science & Analytics',
  'Human-Computer Interaction',
];

export const TeacherProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await teacherPortalApi.getProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        setDomains(res.data.domains || []);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to load profile details',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAddDomain = (domainToAdd) => {
    const term = (domainToAdd || newDomain).trim();
    if (!term) return;
    if (domains.some((d) => d.toLowerCase() === term.toLowerCase())) {
      setToast({ message: `"${term}" is already in your domain list.`, type: 'error' });
      return;
    }
    setDomains([...domains, term]);
    setNewDomain('');
  };

  const handleRemoveDomain = (indexToRemove) => {
    setDomains(domains.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveDomains = async () => {
    setSaving(true);
    try {
      const res = await teacherPortalApi.updateDomains(domains);
      if (res.success) {
        setToast({ message: 'Expertise domains updated successfully!', type: 'success' });
      } else {
        setToast({ message: res.message || 'Failed to update domains', type: 'error' });
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Error updating domains',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Supervisor Profile & Expertise"
          subtitle="Manage your academic profile and supervision research domains."
          breadcrumbs={[
            { label: 'Home', to: '/teacher/dashboard' },
            { label: 'Profile' },
          ]}
        />
        <ContentLoader label="Loading profile..." />
      </div>
    );
  }

  const activeGroups = profile?.active_group_count ?? profile?.supervised_groups_count ?? 0;
  const maxGroups = 4;

  return (
    <div className="page-frame-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <PageHeader
        title="Supervisor Profile & Expertise"
        subtitle="Manage your academic profile and supervision research domains."
        breadcrumbs={[
          { label: 'Home', to: '/teacher/dashboard' },
          { label: 'Profile' },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Profile Details Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '20px',
              }}
            >
              {profile?.name?.charAt(0) || 'T'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {profile?.name || 'Faculty Member'}
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                <ShieldCheck size={13} />
                <span>University Teacher & FYP Supervisor</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px', color: '#334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={16} color="#64748b" />
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Email Address</span>
                <span style={{ fontWeight: 500 }}>{profile?.email || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={16} color="#64748b" />
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Department</span>
                <span style={{ fontWeight: 500 }}>{profile?.department || 'Computer Science'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} color="#64748b" />
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Supervision Load Capacity</span>
                <span style={{ fontWeight: 600, color: activeGroups >= maxGroups ? '#dc2626' : '#0073aa' }}>
                  {activeGroups} / {maxGroups} Groups Supervised
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '24px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '14px',
              fontSize: '12.5px',
              color: '#475569',
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
              <Info size={14} color="#0073aa" />
              <span>FYP Supervision Policy</span>
            </div>
            As a university supervisor, you guide student project teams year-round. Group requests can be accepted until your capacity limit of 4 groups is reached. Showcase day evaluators are assigned separately by the manager.
          </div>
        </div>

        {/* Expertise Domains Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Tag size={18} color="#0073aa" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Expertise & Research Domains
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Add domain keywords representing your research areas. Students browse these when selecting potential supervisors.
            </p>

            {/* Input to add tag */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddDomain();
              }}
              style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
            >
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="e.g. Artificial Intelligence, Cloud Computing..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button type="submit" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} />
                <span>Add</span>
              </button>
            </form>

            {/* Current Active Tags */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>
                Active Domains ({domains.length}):
              </span>
              {domains.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                  No domain tags added yet. Add some domains below.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {domains.map((dom, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#0f172a',
                        fontSize: '12.5px',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {dom}
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#94a3b8',
                        }}
                        title="Remove domain"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>
                Suggested Domains (click to add):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PREDEFINED_SUGGESTIONS.filter(
                  (s) => !domains.some((d) => d.toLowerCase() === s.toLowerCase())
                ).map((sugg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddDomain(sugg)}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '14px',
                      padding: '3px 9px',
                      fontSize: '11.5px',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0073aa';
                      e.currentTarget.style.color = '#0073aa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.color = '#475569';
                    }}
                  >
                    + {sugg}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleSaveDomains}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <CheckCircle2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{saving ? 'Saving...' : 'Save Domains'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
