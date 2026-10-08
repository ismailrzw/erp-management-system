import { useCallback, useEffect, useState } from 'react';
import { InviteModal } from './InviteModal';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { supervisorsApi } from '../../../api/supervisorsApi';
import { useLiveRefresh } from '../../../hooks/useLiveRefresh';

export function GroupSetupPanel({ initialGroup }) {
  const [group, setGroup] = useState(initialGroup); const [inviteOpen, setInviteOpen] = useState(false);
  const [supervisors, setSupervisors] = useState([]); const [selected, setSelected] = useState('');
  const [message, setMessage] = useState(''); const [status, setStatus] = useState(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [g, s, r] = await Promise.all([studentGroupApi.getMyGroup(), supervisorsApi.listAvailable(), supervisorsApi.getMyRequest()]);
      if (g.data) setGroup(g.data); setSupervisors(s.data?.items || []); setStatus(r.data); setError('');
    } catch { setError('Setup status could not be refreshed. Your group is preserved.'); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]); useLiveRefresh(refresh);
  const request = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await supervisorsApi.createRequest({ evaluator_id: selected, request_message: message }); await refresh(); }
    catch (err) { setError(err.response?.data?.message || 'Supervisor request failed. Retry without recreating the group.'); }
    finally { setBusy(false); }
  };
  const count = group?.members?.length || group?.member_count || 1;
  const ready = count >= (group?.min_group || 2);
  return <section className="workflow-card" style={{ textAlign: 'left' }}>
    <h3>Complete Group Setup</h3><p>{count} confirmed members. Invitations do not add members until they accept.</p>
    {error && <p role="alert" className="workflow-error">{error} <button className="btn btn-secondary btn-sm" onClick={refresh}>Refresh</button></p>}
    <button className="btn btn-secondary" onClick={() => setInviteOpen(true)} disabled={count >= (group?.max_group || 4)}>Add Members</button>
    <InviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} group={group} onSuccess={refresh} />
    <h4>Supervisor Request</h4>
    {status?.status === 'pending' ? <p>Your request to {status.evaluator_name} is awaiting review.</p> : status?.status === 'accepted' ? <p>Supervisor accepted. The Manager will review the proposal next.</p> : <form className="workflow-form" onSubmit={request}>
      {!ready && <p>At least {group?.min_group || 2} accepted members are required before Supervisor review.</p>}
      {status?.status === 'rejected' && <p>Review feedback: {status.rejection_reason || 'Please revise your proposal.'}</p>}
      <label>Supervisor<select value={selected} onChange={(e) => setSelected(e.target.value)} required disabled={busy}><option value="">Select Supervisor</option>{supervisors.map((s) => <option key={s.id} value={s.id} disabled={!s.is_available}>{s.name} · {s.active_supervision_count}/4 groups</option>)}</select></label>
      {!supervisors.length && <p>No eligible Supervisors are available. Contact the Manager.</p>}
      <label>Extra Message (optional)<textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} /></label>
      <button className="btn btn-primary" disabled={!ready || !selected || busy}>{busy ? 'Sending…' : 'Send Proposal to Supervisor'}</button>
    </form>}
  </section>;
}
