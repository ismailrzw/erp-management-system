import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { evaluatorsApi } from '../../../api/evaluatorsApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { Toast } from '../../../components/ui/Toast';
import { PageHeader } from '../../../components/ui/PageHeader';
import { BackButton } from '../../../components/ui/BackButton';
import { OptionCardGroup } from '../../../components/ui/OptionCardGroup';

export const AddEvaluatorPage = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    evaluator_type: 'internal', // 'internal' | 'external'
    dept: '',
    domainsInput: '',
    company_name: '',
    post: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEvaluator, setCreatedEvaluator] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [loadingDepts, setLoadingDepts] = useState(false);

  const loadDepartments = useCallback(async () => {
    try {
      setLoadingDepts(true);
      const res = await departmentsApi.list({ deleted: false, limit: 100 });
      if (res.success && res.data) {
        const items = res.data.items || res.data || [];
        setDepartments(items);
        if (items.length > 0) {
          setFormData((prev) => (prev.dept ? prev : { ...prev, dept: items[0].code }));
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const isInternal = formData.evaluator_type === 'internal';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setError('Please fill in Full Name and Email Address.');
      return;
    }

    if (isInternal) {
      if (!/^[^@\s]+@bnu\.edu\.pk$/i.test(cleanEmail)) {
        setError('Internal Faculty requires an institutional @bnu.edu.pk email address.');
        return;
      }
      if (!formData.dept) {
        setError('Please select a department for Internal Faculty.');
        return;
      }
      if (!formData.domainsInput.trim()) {
        setError('Please provide at least one domain of expertise.');
        return;
      }
    } else {
      if (!formData.company_name.trim() || !formData.post.trim()) {
        setError('Please provide the Company Name and Job Title for External Industry Expert.');
        return;
      }
    }

    const payload = {
      name: cleanName,
      email: cleanEmail,
      evaluator_type: formData.evaluator_type,
      dept: isInternal ? formData.dept : '',
      domains: isInternal
        ? formData.domainsInput.split(',').map((v) => v.trim()).filter(Boolean)
        : [],
      company_name: isInternal ? '' : formData.company_name.trim(),
      post: isInternal ? '' : formData.post.trim(),
    };

    try {
      setIsSubmitting(true);
      const res = await evaluatorsApi.create(payload);

      if (res.success && res.data) {
        setCreatedEvaluator(res.data);
        setToast({ message: 'Evaluator registered successfully!', type: 'success' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create evaluator';
      setError(msg);
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendActivation = async () => {
    if (!createdEvaluator?.id) return;
    setIsSubmitting(true);
    try {
      const res = await evaluatorsApi.resendActivation(createdEvaluator.id);
      if (res.data?.email_sent) {
        setToast({ message: 'Activation email resent successfully!', type: 'success' });
      } else {
        setError('Activation delivery failed. Please retry.');
      }
    } catch {
      setError('Failed to resend activation email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const evaluatorTypeOptions = [
    {
      value: 'internal',
      label: 'Internal Faculty',
      icon: GraduationCap,
      description: 'University professors or lecturers with institutional @bnu.edu.pk email',
    },
    {
      value: 'external',
      label: 'External Industry Expert',
      icon: Briefcase,
      description: 'Corporate professionals, industry panelists, and external domain consultants',
    },
  ];

  return (
    <div className="page-frame-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <BackButton to="/manager/evaluators" label="Back to Evaluators" />

      <PageHeader
        title="Add New Evaluator"
        subtitle="Register project evaluators for final year and milestone assessments."
        breadcrumbs={[
          { label: 'Home', to: '/manager/dashboard' },
          { label: 'Evaluators', to: '/manager/evaluators' },
          { label: 'Add New Evaluator' },
        ]}
      />

      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        {error && (
          <div
            style={{
              backgroundColor: '#fdecea',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
            {!departments.length && isInternal && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadDepartments}
                disabled={loadingDepts}
              >
                <RefreshCw size={13} className={loadingDepts ? 'animate-spin' : ''} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {createdEvaluator ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '32px 24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              textAlign: 'center',
            }}
          >
            <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              Evaluator Registered Successfully!
            </h2>
            <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '22px' }}>
              Account for <strong>{createdEvaluator.name}</strong> ({createdEvaluator.email}) has been configured.
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '16px 20px',
                maxWidth: '460px',
                margin: '0 auto 24px',
                textAlign: 'left',
                fontSize: '13.5px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <strong>Evaluator Type:</strong>{' '}
                <span style={{ textTransform: 'capitalize' }}>
                  {createdEvaluator.evaluator_type === 'internal' ? 'Internal Faculty' : 'External Industry Expert'}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Email:</strong> <code>{createdEvaluator.email}</code>
              </div>
              {createdEvaluator.initial_password && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Initial Password:</strong>{' '}
                  <code style={{ backgroundColor: '#fef08a', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>
                    {createdEvaluator.initial_password}
                  </code>
                </div>
              )}
              {createdEvaluator.activation_required && (
                <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '6px' }}>
                  {createdEvaluator.activation_email_sent
                    ? 'An activation link has been sent to the evaluator\'s email address.'
                    : 'Account created, but email delivery could not complete.'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {createdEvaluator.activation_required && !createdEvaluator.activation_email_sent && (
                <button
                  type="button"
                  onClick={handleResendActivation}
                  disabled={isSubmitting}
                  className="btn btn-secondary"
                >
                  <Mail size={15} />
                  <span>Resend Activation Email</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCreatedEvaluator(null);
                  setFormData({
                    name: '',
                    email: '',
                    evaluator_type: 'internal',
                    dept: departments[0]?.code || '',
                    domainsInput: '',
                    company_name: '',
                    post: '',
                  });
                }}
                className="btn btn-primary"
              >
                Add Another Evaluator
              </button>
              <button
                type="button"
                onClick={() => navigate('/manager/evaluators')}
                className="btn btn-secondary"
              >
                View All Evaluators
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <form onSubmit={handleSubmit}>
              {/* Evaluator Type Selection using OptionCardGroup */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Evaluator Type <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <OptionCardGroup
                  options={evaluatorTypeOptions}
                  value={formData.evaluator_type}
                  onChange={(val) => setFormData({ ...formData, evaluator_type: val })}
                  disabled={isSubmitting}
                />
              </div>

              {/* Full Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Full Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isInternal ? 'e.g. Dr. Usman Tariq' : 'e.g. Sarah Khan'}
                  required
                  minLength={2}
                  maxLength={120}
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  disabled={isSubmitting}
                />
              </div>

              {/* Email Address */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Email Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={isInternal ? 'faculty@bnu.edu.pk' : 'evaluator@company.com'}
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  disabled={isSubmitting}
                />
                {isInternal && (
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Must be a valid university faculty email ending in <code>@bnu.edu.pk</code>.
                  </div>
                )}
              </div>

              {/* Conditional Fields: Internal vs External */}
              {isInternal ? (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Department <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={formData.dept}
                      onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '9px 34px 9px 12px',
                        fontSize: '13.5px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                      disabled={isSubmitting || departments.length === 0}
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id || d._id || d.code} value={d.code}>
                          {d.code} — {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Expertise & Domains (Comma-separated) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.domainsInput}
                      onChange={(e) => setFormData({ ...formData, domainsInput: e.target.value })}
                      placeholder="e.g. Artificial Intelligence, Cloud Systems, HCI"
                      required
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '9px 12px',
                        fontSize: '13.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Company / Organization Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="e.g. Systems Limited, DevSinc, Arbisoft"
                      required
                      maxLength={200}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '9px 12px',
                        fontSize: '13.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Job Title / Role <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.post}
                      onChange={(e) => setFormData({ ...formData, post: e.target.value })}
                      placeholder="e.g. Principal Software Architect, VP Engineering"
                      required
                      maxLength={200}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '9px 12px',
                        fontSize: '13.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/manager/evaluators')}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  <UserCheck size={16} />
                  <span>{isSubmitting ? 'Creating...' : 'Create Evaluator'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
