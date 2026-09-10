import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { teachersApi } from '../../../api/teachersApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { Toast } from '../../../components/ui/Toast';

export const AddTeacherPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dept: 'CS',
    type: 'Internal Faculty',
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

    try {
      setIsSubmitting(true);
      const res = await teachersApi.create({
        name: cleanName,
        email: cleanEmail,
        dept: formData.dept,
        type: formData.type,
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
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => navigate('/manager/teachers/view')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '13px',
            padding: 0,
            marginBottom: '10px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Teachers List</span>
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
          Add New Teacher / Evaluator
        </h1>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Create an evaluator account. An initial login password will be generated.
        </div>
      </div>

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
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            Evaluator Created!
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
                  type: 'Internal Faculty',
                });
              }}
              style={{
                padding: '9px 18px',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add Another Teacher
            </button>
            <button
              type="button"
              onClick={() => navigate('/manager/teachers/view')}
              style={{
                padding: '9px 18px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              View All Teachers
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '6px',
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
                placeholder="e.g. sarah.ahmed@superior.edu.pk"
                required
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Department *
                </label>
                <select
                  value={formData.dept}
                  onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
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

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Faculty Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
                >
                  <option value="Internal Faculty">Internal Faculty</option>
                  <option value="External Industry">External Industry</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/manager/teachers/view')}
                style={{
                  padding: '9px 16px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: '#0073aa',
                  color: '#ffffff',
                  borderRadius: '4px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                <GraduationCap size={16} />
                <span>{isSubmitting ? 'Creating...' : 'Create Teacher'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
