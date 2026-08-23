import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { coursesApi } from '../../../api/coursesApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { Toast } from '../../../components/ui/Toast';

export const AddCoursePage = () => {
  const [formData, setFormData] = useState({
    name: '',
    dept: 'CS',
    min_group: 1,
    max_group: 4,
    deadline: '2026-12-31',
  });

  const [departments, setDepartments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCourse, setCreatedCourse] = useState(null);
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
        // Fallback to CS
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
    const minGroup = parseInt(formData.min_group, 10);
    const maxGroup = parseInt(formData.max_group, 10);

    if (!cleanName || !formData.dept) {
      setError('Please fill in Course Name and Department.');
      return;
    }

    if (minGroup < 1) {
      setError('Min group size must be at least 1.');
      return;
    }

    if (maxGroup < minGroup) {
      setError('Max group size must be greater than or equal to Min group size.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await coursesApi.create({
        name: cleanName,
        dept: formData.dept,
        min_group: minGroup,
        max_group: maxGroup,
        deadline: formData.deadline || undefined,
      });

      if (res.success && res.data) {
        setCreatedCourse(res.data);
        setToast({ message: 'Course created successfully!', type: 'success' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create course';
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
          onClick={() => navigate('/manager/courses/view')}
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
          <span>Back to Courses List</span>
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
          Add New Course
        </h1>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Configure a course with group size boundaries and project submission deadline.
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

      {createdCourse ? (
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
            Course Created!
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px' }}>
            <strong>{createdCourse.name}</strong> ({createdCourse.dept}) has been registered.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setCreatedCourse(null);
                setFormData({
                  name: '',
                  dept: departments[0]?.code || 'CS',
                  min_group: 1,
                  max_group: 4,
                  deadline: '2026-12-31',
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
              Add Another Course
            </button>
            <button
              type="button"
              onClick={() => navigate('/manager/courses/view')}
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
              View All Courses
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
                Course Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Final Year Project"
                required
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
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

            <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Min Group Size *
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.min_group}
                  onChange={(e) => setFormData({ ...formData, min_group: e.target.value })}
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Max Group Size *
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.max_group}
                  onChange={(e) => setFormData({ ...formData, max_group: e.target.value })}
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                Final Project Submission Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/manager/courses/view')}
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
                <BookOpen size={16} />
                <span>{isSubmitting ? 'Creating...' : 'Create Course'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
