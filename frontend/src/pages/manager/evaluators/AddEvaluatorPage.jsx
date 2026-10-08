import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { evaluatorsApi } from '../../../api/evaluatorsApi';
import { departmentsApi } from '../../../api/departmentsApi';

export const AddEvaluatorPage = () => {
  const navigate = useNavigate(); const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', evaluator_type: 'internal', dept: '', domainsInput: '', company_name: '', post: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [created, setCreated] = useState(null);
  const load = () => departmentsApi.list().then((r) => { setDepartments(r.data?.items || []); setError(''); }).catch(() => setError('Departments could not be loaded. Retry before registering Internal Faculty.'));
  useEffect(() => { load(); }, []);
  const set = (key, value) => setForm({ ...form, [key]: value });
  const internal = form.evaluator_type === 'internal';
  const save = async (event) => {
    event.preventDefault(); setError('');
    if (internal && (!/^[^@\s]+@bnu\.edu\.pk$/i.test(form.email.trim()) || !form.dept || !form.domainsInput.trim())) { setError('Internal Faculty requires an exact @bnu.edu.pk email, Department and Expertise.'); return; }
    setBusy(true);
    try { const result = await evaluatorsApi.create({ name: form.name.trim(), email: form.email.trim().toLowerCase(), evaluator_type: form.evaluator_type, dept: internal ? form.dept : '', domains: internal ? form.domainsInput.split(',').map((v) => v.trim()).filter(Boolean) : [], company_name: internal ? '' : form.company_name.trim(), post: internal ? '' : form.post.trim() }); setCreated(result.data); }
    catch (err) { setError(err.response?.data?.message || 'Evaluator could not be created. Your form is preserved.'); }
    finally { setBusy(false); }
  };
  const resend = async () => { setBusy(true); try { const result = await evaluatorsApi.resendActivation(created.id); setError(result.data.email_sent ? '' : 'Activation delivery failed. Retry later.'); } catch { setError('Activation could not be sent. Retry later.'); } finally { setBusy(false); } };
  return <main className="page-frame-container"><button className="btn btn-back" onClick={() => navigate('/manager/evaluators')}><ArrowLeft size={18} />Back to Evaluators</button><h1>Add Evaluator</h1>
    {error && <p role="alert" className="workflow-error">{error} {!departments.length && <button className="btn btn-secondary btn-sm" onClick={load}>Retry Lists</button>}</p>}
    {created ? <section className="workflow-card"><h2>Evaluator Created</h2><p>{created.name} · {created.email}</p>{created.activation_required ? <><p>{created.activation_email_sent ? 'Activation email sent. The evaluator must verify ownership through the setup link.' : 'Account saved; activation delivery failed. Resend the setup link.'}</p><button className="btn btn-secondary" disabled={busy} onClick={resend}>Resend Activation</button></> : <p>Initial password: <code>{created.initial_password}</code></p>}<button className="btn btn-primary" onClick={() => navigate('/manager/evaluators')}>View Evaluators</button></section> : <form className="workflow-card workflow-form" onSubmit={save}>
      <label>Evaluator Type<select value={form.evaluator_type} onChange={(e) => set('evaluator_type', e.target.value)} disabled={busy}><option value="internal">Internal Faculty</option><option value="external">External Industry Expert</option></select></label>
      <label>Full Name<input value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} maxLength={120} disabled={busy} /></label>
      <label>Email Address<input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required disabled={busy} placeholder={internal ? 'faculty@bnu.edu.pk' : 'name@company.com'} /></label>
      {internal ? <><label>Relevant Department<select value={form.dept} onChange={(e) => set('dept', e.target.value)} required disabled={busy}><option value="">Select Department</option>{departments.map((d) => <option key={d.id} value={d.code}>{d.name}</option>)}</select></label>{!departments.length && <p>Create a Department before adding Internal Faculty.</p>}<label>Expertise (comma-separated)<input required value={form.domainsInput} onChange={(e) => set('domainsInput', e.target.value)} disabled={busy} /></label></> : <><label>Company Name<input required maxLength={200} value={form.company_name} onChange={(e) => set('company_name', e.target.value)} disabled={busy} /></label><label>Relevant Post / Job Title<input required maxLength={200} value={form.post} onChange={(e) => set('post', e.target.value)} disabled={busy} /></label></>}
      <div className="workflow-actions"><button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create Evaluator'}</button></div>
    </form>}
  </main>;
};
