import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ArrowLeft, CheckCircle2, AlertCircle, Building, Briefcase } from 'lucide-react';
import { evaluatorsApi } from '../../../api/evaluatorsApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { Toast } from '../../../components/ui/Toast';

export const AddEvaluatorPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dept: 'CS',
    evaluator_type: 'internal',
    domainsInput: '',
  });

  const [departments, setDepartments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEvaluator, setCreatedEvaluator] = useState(null);
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

    if (!cleanName || !cleanEmail || !formData.dept || !formData.evaluator_type) {
      setError('Please fill in Name, Email, Department, and Evaluator Type.');
      return;
    }

    const parsedDomains = formData.domainsInput
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      const res = await evaluatorsApi.create({
        name: cleanName,
        email: cleanEmail,
        dept: formData.dept,
        evaluator_type: formData.evaluator_type,
        domains: parsedDomains,
      });

      if (res.success && res.data) {
        setCreatedEvaluator(res.data);
        setToast({ message: 'Evaluator registered successfully!', type: 'success' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to register evaluator';
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
          onClick={() => navigate('/manager/evaluators')}
          className="btn btn-back"
          style={{ marginBottom: '10px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Evaluators List</span>
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
          Add Exhibition Day Evaluator
        </h1>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Register an internal faculty evaluator or external industry expert for Project Showcase Day evaluations.
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

      {createdEvaluator ? (
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
            Evaluator Account Created!
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px' }}>
            Account for <strong>{createdEvaluator.name}</strong> ({createdEvaluator.evaluator_type === 'external' ? 'External Industry' : 'Internal Faculty'}) is ready:
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
              <strong>Email:</strong> <code>{createdEvaluator.email}</code>
            </div>
            {createdEvaluator.initial_password && (
              <div>
                <strong>Initial Password:</strong> <code style={{ backgroundColor: '#fef08a', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>{createdEvaluator.initial_password}</code>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setCreatedEvaluator(null);
                setFormData({
                  name: '',
                  email: '',
                  dept: departments[0]?.code || 'CS',
                  evaluator_type: 'internal',
                  domainsInput: '',
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
            {/* Evaluator Type Selection Cards */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Evaluator Type *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  onClick={() => setFormData({ ...formData, evaluator_type: 'internal' })}
                  style={{
                    border: formData.evaluator_type === 'internal' ? '2px solid #0073aa' : '1px solid #cbd5e1',
                    backgroundColor: formData.evaluator_type === 'internal' ? '#eaf5fb' : '#ffffff',
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Building size={20} color={formData.evaluator_type === 'internal' ? '#0073aa' : '#64748b'} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                      Internal Faculty
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      University instructor evaluating projects outside their course
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, evaluator_type: 'external' })}
                  style={{
                    border: formData.evaluator_type === 'external' ? '2px solid #b45309' : '1px solid #cbd5e1',
                    backgroundColor: formData.evaluator_type === 'external' ? '#fef3c7' : '#ffffff',
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Briefcase size={20} color={formData.evaluator_type === 'external' ? '#b45309' : '#64748b'} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                      External Industry Expert
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Guest industry professional invited for final grading
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Mr. Kashif Mehmood or Dr. Usman Farooq"
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
                placeholder="e.g. kashif@techcorp.com or usman@bnu.edu.pk"
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
                Evaluation Specialization Domains (Comma-separated)
              </label>
              <input
                type="text"
                value={formData.domainsInput}
                onChange={(e) => setFormData({ ...formData, domainsInput: e.target.value })}
                placeholder="e.g. Industry Best Practices, UI/UX, Scalability"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/manager/evaluators')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                <Award size={16} />
                <span>{isSubmitting ? 'Registering...' : 'Register Evaluator'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
