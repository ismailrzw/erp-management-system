import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { iterationsApi } from '../../../api/iterationsApi';
import { Award, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ManagerStudentGradingModal = ({
  isOpen,
  onClose,
  student,
  iterationId,
  iterationTitle,
  rubrics = [],
  onSuccess,
}) => {
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize scores and feedback when modal opens or student changes
  useEffect(() => {
    if (!isOpen || !student) {
      setScores({});
      setFeedback('');
      setError('');
      return;
    }

    const initialScores = {};
    if (student.evaluation?.scores) {
      rubrics.forEach((r, idx) => {
        const key = String(r.id ?? idx + 1);
        initialScores[key] = student.evaluation.scores[key] !== undefined ? Number(student.evaluation.scores[key]) : 0;
      });
      setFeedback(student.evaluation.feedback || '');
    } else {
      // Default to 0 for all criteria
      rubrics.forEach((r, idx) => {
        const key = String(r.id ?? idx + 1);
        initialScores[key] = 0;
      });
      setFeedback(
        student.is_defaulter || !student.group_id
          ? 'Failed to form or register any group by the milestone cutoff deadline.'
          : ''
      );
    }
    setScores(initialScores);
    setError('');
  }, [isOpen, student, rubrics]);

  // Compute live weighted score
  const { totalWeighted, maxPossible, percentage } = useMemo(() => {
    let weighted = 0.0;
    let maxPts = 0;
    rubrics.forEach((r, idx) => {
      const key = String(r.id ?? idx + 1);
      const weight = Number(r.weight) || 0;
      maxPts += weight;
      const score = Number(scores[key]) || 0;
      weighted += (score / 5.0) * weight;
    });
    const total = Math.round(weighted * 100) / 100;
    const pct = maxPts > 0 ? Math.round((total / maxPts) * 1000) / 10 : 0;
    return { totalWeighted: total, maxPossible: maxPts, percentage: pct };
  }, [scores, rubrics]);

  const handleScoreChange = (rubricKey, val) => {
    setScores((prev) => ({
      ...prev,
      [rubricKey]: Number(val),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!student) return;
    if (!rubrics.length) {
      setError('Cannot grade student without evaluation rubrics.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        student_id: student.id || student._id,
        scores,
        feedback: feedback.trim(),
        is_defaulter: Boolean(student.is_defaulter ?? !student.group_id),
      };

      await iterationsApi.gradeStudent(iterationId, payload);
      if (typeof onSuccess === 'function') {
        onSuccess(`Evaluation successfully recorded for ${student.name || student.roll}.`);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save evaluation.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mark Student: ${student.name || student.roll}`}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Student & Milestone Meta Card */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              {student.name} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>({student.roll})</span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
              {student.dept || 'General'} {student.section ? `• Sec ${student.section}` : ''} • {student.email}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11.5px',
                fontWeight: 600,
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
              }}
            >
              Formation Defaulter
            </span>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
              {iterationTitle || 'Milestone Evaluation'}
            </div>
          </div>
        </div>

        {/* Rubrics Checklist */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
              Rubric Assessment Criteria
            </label>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {rubrics.length} Criteria ({maxPossible} Total Points)
            </span>
          </div>

          {rubrics.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '13px' }}>
              No rubrics configured for this milestone. Please add rubrics first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
              {rubrics.map((r, idx) => {
                const key = String(r.id ?? idx + 1);
                const currentScore = scores[key] !== undefined ? scores[key] : 0;
                const weight = Number(r.weight) || 0;
                const levels = r.levels || {};
                const currentDesc = levels[String(currentScore)] || levels[currentScore] || '';

                return (
                  <div
                    key={key}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                        {idx + 1}. {r.question}
                      </span>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {weight} pts
                      </span>
                    </div>

                    {/* Level Selector Pills 0 to 5 */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[0, 1, 2, 3, 4, 5].map((lvl) => {
                        const selected = currentScore === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleScoreChange(key, lvl)}
                            style={{
                              flex: '1 1 45px',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: selected ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                              backgroundColor: selected ? 'var(--primary-light)' : '#f8fafc',
                              color: selected ? 'var(--primary)' : '#475569',
                              fontSize: '12px',
                              fontWeight: selected ? 700 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              textAlign: 'center',
                            }}
                          >
                            Lvl {lvl}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Level Description Preview */}
                    {currentDesc && (
                      <div
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '6px',
                          borderLeft: '3px solid var(--primary)',
                          fontSize: '12px',
                          color: '#475569',
                          lineHeight: 1.4,
                        }}
                      >
                        <strong>Level {currentScore}:</strong> {currentDesc}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Score Summary Banner */}
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
            <Award size={20} />
            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Total Calculated Marks</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
              {totalWeighted}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>
              / {maxPossible} pts ({percentage}%)
            </span>
          </div>
        </div>

        {/* Manager Remarks / Defaulter Feedback Textarea */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Manager Evaluation Feedback / Penalty Notes
          </label>
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback provided to the student explaining the rubric evaluation and consequences..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || rubrics.length === 0}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle2 size={16} />
            <span>{saving ? 'Saving...' : student.evaluation ? 'Update Grade' : 'Submit Grade'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
