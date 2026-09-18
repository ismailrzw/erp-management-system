import { useState } from 'react';
import { X, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { evaluatorApi } from '../../../api/evaluatorApi';

export function ExhibitionEvalForm({ group, onClose, onSuccess }) {
  const [totalMarks, setTotalMarks] = useState('');
  const [presentationScore, setPresentationScore] = useState(0);
  const [demoScore, setDemoScore] = useState(0);
  const [qnaScore, setQnaScore] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isLocked = group.evaluated;

  async function handleSubmit(e) {
    e.preventDefault();
    if (totalMarks === '' || Number(totalMarks) < 0) {
      setError('Please enter valid total marks.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await evaluatorApi.submitExhibitionEval({
        group_id: group.id,
        scores: {
          presentation: Number(presentationScore),
          demo: Number(demoScore),
          qna: Number(qnaScore),
        },
        total_marks: Number(totalMarks),
        comment: comment.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit exhibition evaluation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Exhibition Evaluation: {group.name}
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Course: {group.course}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
        >
          <X size={18} />
        </button>
      </div>

      {isLocked ? (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '20px',
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Lock size={20} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>Exhibition Evaluation Locked</div>
            <div style={{ fontSize: '12px' }}>Evaluation submitted and permanently locked.</div>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#166534',
        }}>
          🔒 Exhibition evaluations are locked immediately after submission.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Total Marks */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Total Exhibition Score / Marks (out of 100) *
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)}
            disabled={isLocked}
            placeholder="e.g. 85"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              fontWeight: 700,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Criteria breakdown */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '12px', textTransform: 'uppercase' }}>
            Criteria Scoring (0 - 5 scale)
          </h4>

          {/* Presentation */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1e293b', marginBottom: '4px' }}>
              <span>Presentation & Poster Design:</span>
              <strong>{presentationScore} / 5</strong>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={presentationScore}
              onChange={(e) => setPresentationScore(e.target.value)}
              disabled={isLocked}
              style={{ width: '100%' }}
            />
          </div>

          {/* Demo */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1e293b', marginBottom: '4px' }}>
              <span>Live Demonstration & Functionality:</span>
              <strong>{demoScore} / 5</strong>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={demoScore}
              onChange={(e) => setDemoScore(e.target.value)}
              disabled={isLocked}
              style={{ width: '100%' }}
            />
          </div>

          {/* QnA */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1e293b', marginBottom: '4px' }}>
              <span>Q&A & Defense:</span>
              <strong>{qnaScore} / 5</strong>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={qnaScore}
              onChange={(e) => setQnaScore(e.target.value)}
              disabled={isLocked}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Feedback Comment */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Evaluator Remarks / Feedback
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isLocked}
            placeholder="Comments on performance, strengths, or improvements..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#dc2626',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {!isLocked && (
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: saving ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{saving ? 'Submitting...' : 'Submit Exhibition Evaluation'}</span>
          </button>
        )}
      </form>
    </div>
  );
}
