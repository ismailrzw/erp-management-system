import { useState } from 'react';
import { downloadFile } from '../../api/downloadFile';

export function ProposalSummary({ proposal }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true); setError('');
    try { await downloadFile(proposal.download_url, proposal.attachment?.original_filename); }
    catch (err) { setError(err.response?.data?.message || 'Proposal file is unavailable. Refresh and retry.'); }
    finally { setBusy(false); }
  };
  return <section className="workflow-card">
    <h3>Project Proposal and Scope</h3>
    <h4>{proposal?.title || 'Project title not provided'}</h4>
    <p className="preserve-lines">{proposal?.scope || proposal?.problem_statement || 'Scope is described in the attached proposal.'}</p>
    {proposal?.version && <p>Proposal version {proposal.version} · {proposal.status?.replaceAll('_', ' ')}</p>}
    {proposal?.attachment ? <button className="btn btn-secondary" disabled={busy} onClick={download}>{busy ? 'Downloading…' : `Download ${proposal.attachment.original_filename}`}</button> : <p>{proposal?.attachment_missing ? 'The proposal attachment needs correction.' : 'No proposal document attached yet.'}</p>}
    {proposal?.feedback && <p>Review feedback: {proposal.feedback}</p>}
    {error && <p role="alert" className="workflow-error">{error}</p>}
  </section>;
}
