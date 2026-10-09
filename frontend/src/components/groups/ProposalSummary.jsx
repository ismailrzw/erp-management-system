import { useState } from 'react';
import { Download, AlertCircle, Loader2 } from 'lucide-react';
import { downloadFile } from '../../api/downloadFile';

export function ProposalSummary({ proposal }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!proposal?.download_url) return;
    setBusy(true);
    setError('');
    try {
      await downloadFile(proposal.download_url, proposal.attachment?.original_filename || 'proposal.pdf');
    } catch (err) {
      setError(err.response?.data?.message || 'Proposal file is unavailable. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  if (!proposal) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No project proposal submitted for this group yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            fontSize: '12.5px',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div>
        <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
          Project Title
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
          {proposal.title || 'Untitled Proposal'}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
          Scope & Problem Statement
        </div>
        <div
          style={{
            fontSize: '13.5px',
            color: '#334155',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            backgroundColor: '#f8fafc',
            padding: '12px 14px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          {proposal.scope || proposal.problem_statement || 'Scope is described in the attached project document.'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748b' }}>
          {proposal.version && <span>Version: <b>v{proposal.version}</b></span>}
          {proposal.status && (
            <span
              style={{
                backgroundColor: proposal.status === 'approved' ? '#eafbf1' : '#f1f5f9',
                color: proposal.status === 'approved' ? '#16a34a' : '#475569',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {proposal.status.replaceAll('_', ' ')}
            </span>
          )}
        </div>

        {proposal.attachment && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={download}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{busy ? 'Downloading...' : `Download ${proposal.attachment.original_filename || 'Proposal'}`}</span>
          </button>
        )}
      </div>

      {proposal.feedback && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '6px',
            fontSize: '12.5px',
            color: '#b45309',
          }}
        >
          <b>Manager Feedback:</b> {proposal.feedback}
        </div>
      )}
    </div>
  );
}
