import { useState } from 'react';
import { Lock, AlertCircle, CheckCircle2, Award } from 'lucide-react';
import { evaluatorApi } from '../../../api/evaluatorApi';

export function EvaluationSheet({ groupId, iterationId, rubrics = [], existingEval = null, onSubmitSuccess }) {
  const [scores, setScores] = useState(() => {
    const initial = {};
    rubrics.forEach(r => {
      const idStr = String(r.id);
      initial[idStr] = existingEval?.scores?.[idStr] ?? existingEval?.scores?.[r.id] ?? null;
    });
    return initial;
  });

  const [comment, setComment] = useState(existingEval?.comment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isLocked = !!existingEval;

  async function handleSubmit(e) {
    e.preventDefault();
    const incomplete = rubrics.some(r => scores[String(r.id)] === null || scores[String(r.id)] === undefined);
    if (incomplete) {
      setError('Please score all criteria before submitting.');
      return;
    }

    setSaving(true);
    setError('');

    const formattedScores = {};
    Object.entries(scores).forEach(([k, v]) => {
      formattedScores[k] = Number(v);
    });

    try {
      await evaluatorApi.submitEvaluation({
        group_id: groupId,
        iteration_id: iterationId,
        scores: formattedScores,
        comment: comment.trim(),
      });
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit evaluation.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
      {isLocked ? (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400e' }}>
            <Lock size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Evaluation Submitted & Locked</div>
              <div style={{ fontSize: '12px' }}>Evaluations are immutable and cannot be updated.</div>
            </div>
          </div>
          <div style={{
            background: '#ffffff',
            padding: '6px 16px',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '15px',
            color: '#b45309',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Award size={18} />
            <span>Score: {existingEval.total_weighted_score}</span>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#166534',
        }}>
          ⚠️ <strong>Note:</strong> Once submitted, scores are permanently locked and cannot be edited.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {rubrics.length === 0 ? (
          <div style={{ padding: '20px', textStyle: 'center', color: '#64748b' }}>
            No rubric criteria defined for this milestone.
          </div>
        ) : (
          rubrics.map((r, idx) => {
            const rId = String(r.id);
            const currentScore = scores[rId];
            return (
              <div
                key={r.id || idx}
                style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                    {idx + 1}. {r.question}
                  </span>
                  <span style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                  }}>
                    Weight: {r.weight} Marks
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                  {[0, 1, 2, 3, 4, 5].map((lvl) => {
                    const isSelected = currentScore === lvl;
                    const descriptor = r.levels?.[String(lvl)] || r.levels?.[lvl] || `Level ${lvl}`;
                    return (
                      <label
                        key={lvl}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '10px 4px',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          opacity: isLocked && !isSelected ? 0.4 : 1,
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                        }}
                      >
                        <input
                          type="radio"
                          name={`rubric-${rId}`}
                          value={lvl}
                          checked={isSelected}
                          onChange={() => !isLocked && setScores(prev => ({ ...prev, [rId]: lvl }))}
                          disabled={isLocked}
                          style={{ marginBottom: '6px' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#1e40af' : '#334155' }}>
                          {lvl} / 5
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', lineHeight: '1.2' }}>
                          {descriptor}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        <div style={{ marginTop: '24px', marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            General Feedback / Comments
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isLocked}
            placeholder="Add any specific feedback or rationale for the group..."
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
            gap: '8px',
            color: '#dc2626',
            fontSize: '13px',
            marginBottom: '16px',
            background: '#fef2f2',
            padding: '10px 14px',
            borderRadius: '6px',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!isLocked && (
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: saving ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              padding: '10px 24px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{saving ? 'Submitting...' : 'Submit Evaluation (Locked After Submit)'}</span>
          </button>
        )}
      </form>
    </div>
  );
}
