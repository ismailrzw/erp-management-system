import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { teachersApi } from '../../../api/teachersApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { Toast } from '../../../components/ui/Toast';
import { PageHeader } from '../../../components/ui/PageHeader';

export const AddTeacherPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dept: 'CS',
    domainsInput: '',
  });

  const [departments, setDepartments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTeacher, setCreatedTeacher] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const loadDepts = async () => {
      try {
        const res = await departmentsApi.list({ deleted: false, limit: 100 });
        if (isMounted && res.success && res.data) {
          const items = res.data.items || res.data || [];
          setDepartments(items);
          if (items.length > 0) {
            setFormData((prev) => ({ ...prev, dept: items[0].code }));
          }
        }
      } catch {
        // Fallback
      }
    };
    loadDepts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !formData.dept) {
      setError('Please fill in Name, Email, and Department.');
      return;
    }

    const parsedDomains = formData.domainsInput
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      const res = await teachersApi.create({
        name: cleanName,
        email: cleanEmail,
        dept: formData.dept,
        domains: parsedDomains,
      });

      if (res.success && res.data) {
        setCreatedTeacher(res.data);
        setToast({ message: 'Teacher created successfully!', type: 'success' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create teacher';
      setError(msg);
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-frame-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <PageHeader
        title="Add New Teacher / Supervisor"
        subtitle="Create a university faculty member account. An initial login password will be generated."
        breadcrumbs={[
          { label: 'Home', to: '/manager/dashboard' },
          { label: 'Teachers', to: '/manager/teachers/view' },
          { label: 'Add New Teacher' },
        ]}
      >
        <button
          type="button"
          onClick={() => navigate('/manager/teachers/view')}
          className="btn btn-secondary"
        >
          <ArrowLeft size={15} />
          <span>Back to Teachers List</span>
        </button>
      </PageHeader>

      <div style={{ maxWidth: '650px', margin: '0 auto' }}>

      {error && (
        <div
          style={{
            backgroundColor: '#fdecea',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '13.5px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {createdTeacher ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            Teacher / Supervisor Created!
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px' }}>
            Account for <strong>{createdTeacher.name}</strong> is active. Credentials:
          </p>

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '16px 20px',
              maxWidth: '450px',
              margin: '0 auto 24px',
              textAlign: 'left',
              fontSize: '13.5px',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <strong>Email:</strong> <code>{createdTeacher.email}</code>
            </div>
            {createdTeacher.initial_password && (
              <div>
                <strong>Initial Password:</strong> <code style={{ backgroundColor: '#fef08a', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>{createdTeacher.initial_password}</code>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setCreatedTeacher(null);
                setFormData({
                  name: '',
                  email: '',
                  dept: departments[0]?.code || 'CS',
                  domainsInput: '',
                });
              }}
              className="btn btn-primary"
            >
              Add Another Teacher
            </button>
            <button
              type="button"
              onClick={() => navigate('/manager/teachers/view')}
              className="btn btn-secondary"
            >
              View All Teachers
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
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Dr. Sarah Ahmed"
                required
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. sarah.ahmed@bnu.edu.pk"
                required
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Department *
              </label>
              <select
                value={formData.dept}
                onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                required
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 34px 9px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
              >
                {departments.length === 0 ? (
                  <option value="CS">CS - Computer Science</option>
                ) : (
                  departments.map((d) => (
                    <option key={d.id || d._id || d.code} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Expertise & Domains (Comma-separated)
              </label>
              <input
                type="text"
                value={formData.domainsInput}
                onChange={(e) => setFormData({ ...formData, domainsInput: e.target.value })}
                placeholder="e.g. Machine Learning, NLP, Data Science"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
              />
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Students can search and filter available supervisors by these expertise areas.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/manager/teachers/view')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                <GraduationCap size={16} />
                <span>{isSubmitting ? 'Creating...' : 'Create Teacher'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  );
};
