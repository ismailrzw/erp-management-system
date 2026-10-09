import { useState, useEffect, useRef } from 'react';
import { Modal } from '../../ui/Modal';
import { studentGroupApi } from '../../../api/studentGroupApi';

export const EditGroupModal = ({ isOpen, onClose, group, onSuccess }) => {
  const initialized = useRef(false); const baseVersion = useRef(1);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) initialized.current = false;
    if (isOpen && !initialized.current) { initialized.current = true; baseVersion.current = group?.version || 1; setTitle(group?.project_title || ''); setScope(group?.scope || ''); setFile(null); setError(''); }
  }, [isOpen, group]);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    const body = new FormData();
    body.append('project_title', title.trim()); body.append('scope', scope.trim());
    body.append('expected_version', baseVersion.current);
    if (file) body.append('proposal', file);
    try {
      const result = await studentGroupApi.updateGroup(group.id, body);
      onSuccess?.(result.data); onClose();
    } catch (err) { setError(err.response?.data?.message || 'Could not save. Your existing proposal is preserved.'); }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title="Edit Project Proposal">
    <form onSubmit={save} className="workflow-form">
      <p>Group <strong>{group?.name}</strong> · the identifier cannot be changed.</p>
      <p>Changes require Supervisor review followed by Manager approval.</p>
      {error && <p role="alert" className="workflow-error">{error}</p>}
      <label>Project Title<input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={150} disabled={busy} /></label>
      <label>Project Scope<textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={5} maxLength={20000} disabled={busy} /></label>
      <label>Replace Proposal Document (optional)<input type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={busy} /></label>
      <div className="workflow-actions"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Proposal'}</button></div>
    </form>
  </Modal>;
};
