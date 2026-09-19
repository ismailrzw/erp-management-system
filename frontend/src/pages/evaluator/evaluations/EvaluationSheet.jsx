import { useState, useEffect, useCallback } from 'react';
import {
  Lock, AlertCircle, CheckCircle2, Award, ChevronDown, ChevronRight,
  Plus, Trash2, Save, BookOpen, Pencil, Users, MessageSquare,
} from 'lucide-react';
import { evaluatorApi } from '../../../api/evaluatorApi';

// ── helpers ──────────────────────────────────────────────────────────────────

function ScorePicker({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {[0, 1, 2, 3, 4, 5].map((lvl) => {
        const selected = value === lvl;
        return (
          <button
            key={lvl}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(lvl)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              border: selected ? '2px solid var(--primary)' : '1px solid #cbd5e1',
              background: selected ? 'var(--primary)' : disabled ? '#f8fafc' : '#ffffff',
              color: selected ? '#ffffff' : '#334155',
              fontWeight: 700,
              fontSize: '13px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            {lvl}
          </button>
        );
      })}
    </div>
  );
}

function RubricRow({ index, rubric, score, onChange, disabled, accent }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '12px',
      alignItems: 'center',
      padding: '10px 12px',
      background: '#f8fafc',
      borderRadius: '6px',
      border: `1px solid ${accent === 'purple' ? '#e9d5ff' : '#dbeafe'}`,
      marginBottom: '8px',
    }}>
      <div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
          {index + 1}. {rubric.question}
        </span>
        <span style={{
          marginLeft: '8px',
          fontSize: '11px',
          fontWeight: 700,
          background: accent === 'purple' ? '#f5f3ff' : '#eff6ff',
          color: accent === 'purple' ? '#7c3aed' : '#1d4ed8',
          padding: '1px 6px',
          borderRadius: '10px',
        }}>
          {rubric.weight} pts
        </span>
      </div>
      <ScorePicker value={score} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── RubricBuilder ─────────────────────────────────────────────────────────────

function RubricBuilder({ rubrics, onChange, disabled }) {
  function addCriterion() {
    const nextId = rubrics.length > 0 ? Math.max(...rubrics.map(r => Number(r.id) || 0)) + 1 : 1;
    onChange([...rubrics, { id: nextId, question: '', weight: 20 }]);
  }

  function update(idx, field, val) {
    const updated = rubrics.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    onChange(updated);
  }

  function remove(idx) {
    onChange(rubrics.filter((_, i) => i !== idx));
  }

  return (
    <div>
      {rubrics.map((r, idx) => (
        <div key={r.id} style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <input
            type="text"
            value={r.question}
            placeholder={`Criterion ${idx + 1} (e.g. Communication Skills)`}
            disabled={disabled}
            onChange={(e) => update(idx, 'question', e.target.value)}
            style={{
              flex: 1,
              padding: '7px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <input
            type="number"
            value={r.weight}
            min="1"
            max="100"
            disabled={disabled}
            onChange={(e) => update(idx, 'weight', Number(e.target.value))}
            style={{
              width: '64px',
              padding: '7px 8px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>pts</span>
          {!disabled && (
            <button type="button" onClick={() => remove(idx)} className="btn btn-ghost btn-sm" style={{ color: '#dc2626', padding: '4px 6px' }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={addCriterion} className="btn btn-ghost btn-sm" style={{ marginTop: '4px', color: '#7c3aed' }}>
          <Plus size={14} />
          <span>Add Criterion</span>
        </button>
      )}
    </div>
  );
}

// ── StudentCard ───────────────────────────────────────────────────────────────

function StudentCard({ member, managerRubrics, evaluatorRubrics, studentData, onUpdate, isLocked, isExpanded, onToggle }) {
  const mScores = studentData?.manager_scores || {};
  const eScores = studentData?.evaluator_scores || {};
  const remark  = studentData?.remark || '';

  const mFilled  = managerRubrics.length > 0 && managerRubrics.every(r => mScores[String(r.id)] !== null && mScores[String(r.id)] !== undefined);
  const eFilled  = evaluatorRubrics.length === 0 || evaluatorRubrics.every(r => eScores[String(r.id)] !== null && eScores[String(r.id)] !== undefined);
  const allDone  = mFilled && eFilled;

  const studentScore = studentData?.total_weighted_score;

  return (
    <div style={{
      border: `1px solid ${allDone || isLocked ? '#bbf7d0' : '#e2e8f0'}`,
      borderRadius: '10px',
      marginBottom: '12px',
      overflow: 'hidden',
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          background: isExpanded ? '#f0fdf4' : '#ffffff',
          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isExpanded ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '13px',
          }}>
            {member.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{member.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{member.roll || member.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLocked && studentScore !== undefined && (
            <span style={{
              background: '#eff6ff', color: '#1d4ed8',
              padding: '3px 10px', borderRadius: '12px',
              fontSize: '12px', fontWeight: 700,
            }}>
              Score: {studentScore}
            </span>
          )}
          {!isLocked && allDone && (
            <span style={{
              background: '#dcfce7', color: '#15803d',
              padding: '3px 10px', borderRadius: '12px',
              fontSize: '12px', fontWeight: 700,
            }}>
              Scored ✓
            </span>
          )}
          {!isLocked && !allDone && (
            <span style={{
              background: '#fef3c7', color: '#b45309',
              padding: '3px 8px', borderRadius: '12px',
              fontSize: '11px', fontWeight: 600,
            }}>
              Pending
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {managerRubrics.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Manager's Standard Rubrics
              </div>
              {managerRubrics.map((r, i) => (
                <RubricRow
                  key={r.id}
                  index={i}
                  rubric={r}
                  score={mScores[String(r.id)] ?? null}
                  onChange={(val) => onUpdate({ manager_scores: { ...mScores, [String(r.id)]: val } })}
                  disabled={isLocked}
                  accent="blue"
                />
              ))}
            </div>
          )}

          {evaluatorRubrics.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#7c3aed', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                My Custom Rubrics
              </div>
              {evaluatorRubrics.map((r, i) => (
                <RubricRow
                  key={r.id}
                  index={i}
                  rubric={r}
                  score={eScores[String(r.id)] ?? null}
                  onChange={(val) => onUpdate({ evaluator_scores: { ...eScores, [String(r.id)]: val } })}
                  disabled={isLocked}
                  accent="purple"
                />
              ))}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              <MessageSquare size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Individual Remark
            </label>
            <textarea
              rows={2}
              value={remark}
              disabled={isLocked}
              onChange={(e) => onUpdate({ remark: e.target.value })}
              placeholder="Add specific feedback for this student..."
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main EvaluationSheet ──────────────────────────────────────────────────────

export function EvaluationSheet({ groupId, iterationId, rubrics = [], existingEval = null, onSubmitSuccess, members = [] }) {
  const [evaluatorRubrics, setEvaluatorRubrics] = useState([]);
  const [draftRubrics, setDraftRubrics] = useState([]);
  const [rubricsDirty, setRubricsDirty] = useState(false);
  const [savingRubrics, setSavingRubrics] = useState(false);
  const [showRubricPanel, setShowRubricPanel] = useState(false);
  const [showManagerPanel, setShowManagerPanel] = useState(true);

  const [studentData, setStudentData] = useState({});
  const [groupRemark, setGroupRemark] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isLocked = !!existingEval;

  // Load evaluator's custom rubrics
  useEffect(() => {
    if (!groupId) return;
    evaluatorApi.getGroupRubrics(groupId)
      .then(res => {
        if (res.data?.success) {
          const loaded = res.data.data.rubrics || [];
          setEvaluatorRubrics(loaded);
          setDraftRubrics(loaded);
        }
      })
      .catch(() => {});
  }, [groupId]);

  // Determine active evaluator rubrics (locked: from snapshot, else: from API)
  const activeEvalRubrics = isLocked
    ? (existingEval.evaluator_rubric_snapshot || [])
    : evaluatorRubrics;

  // Initialise student data
  const initStudentData = useCallback(() => {
    if (isLocked && existingEval.student_evaluations?.length > 0) {
      const data = {};
      existingEval.student_evaluations.forEach(se => {
        data[se.student_id] = {
          manager_scores:          se.manager_scores || {},
          evaluator_scores:        se.evaluator_scores || {},
          remark:                  se.remark || '',
          total_weighted_score:    se.total_weighted_score,
        };
      });
      setStudentData(data);
      setGroupRemark(existingEval.group_remark || existingEval.comment || '');
    } else if (!isLocked && members.length > 0) {
      const data = {};
      members.forEach(m => {
        const mScores = {};
        rubrics.forEach(r => { mScores[String(r.id)] = null; });
        data[m.id] = { manager_scores: mScores, evaluator_scores: {}, remark: '' };
      });
      setStudentData(data);
      if (members.length > 0) setExpandedStudentId(members[0].id);
    }
  }, [isLocked, existingEval, members, rubrics]);

  useEffect(() => { initStudentData(); }, [initStudentData]);

  // Keep evaluator_scores keys in sync when evaluatorRubrics change
  useEffect(() => {
    if (isLocked) return;
    setStudentData(prev => {
      const updated = {};
      Object.entries(prev).forEach(([sid, sdata]) => {
        const eScores = {};
        evaluatorRubrics.forEach(r => {
          eScores[String(r.id)] = sdata.evaluator_scores?.[String(r.id)] ?? null;
        });
        updated[sid] = { ...sdata, evaluator_scores: eScores };
      });
      return updated;
    });
  }, [evaluatorRubrics, isLocked]);

  function updateStudent(studentId, patch) {
    setStudentData(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), ...patch },
    }));
  }

  // Rubric builder actions
  function handleDraftChange(newRubrics) {
    setDraftRubrics(newRubrics);
    setRubricsDirty(true);
  }

  async function handleSaveRubrics() {
    setSavingRubrics(true);
    try {
      const res = await evaluatorApi.saveGroupRubrics(groupId, draftRubrics);
      if (res.data?.success) {
        const saved = res.data.data.rubrics || draftRubrics;
        setEvaluatorRubrics(saved);
        setDraftRubrics(saved);
        setRubricsDirty(false);
      }
    } catch {
      /* silently keep dirty state */
    } finally {
      setSavingRubrics(false);
    }
  }

  // Validation
  function validate() {
    if (members.length === 0) return null;
    for (const m of members) {
      const sdata = studentData[m.id];
      if (!sdata) return `Missing scores for ${m.name}`;
      for (const r of rubrics) {
        const s = sdata.manager_scores?.[String(r.id)];
        if (s === null || s === undefined) return `Please score all Manager rubrics for ${m.name}`;
      }
      for (const r of evaluatorRubrics) {
        const s = sdata.evaluator_scores?.[String(r.id)];
        if (s === null || s === undefined) return `Please score all custom rubrics for ${m.name}`;
      }
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErr = validate();
    if (validationErr) { setError(validationErr); return; }

    setSaving(true);
    setError('');

    const studentEvaluations = members.map(m => ({
      student_id:       m.id,
      manager_scores:   studentData[m.id]?.manager_scores || {},
      evaluator_scores: studentData[m.id]?.evaluator_scores || {},
      remark:           studentData[m.id]?.remark || '',
    }));

    try {
      await evaluatorApi.submitEvaluation({
        group_id:                  groupId,
        iteration_id:              iterationId,
        scores:                    {},
        student_evaluations:       studentEvaluations,
        group_remark:              groupRemark.trim(),
        comment:                   groupRemark.trim(),
        evaluator_rubric_snapshot: evaluatorRubrics,
      });
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit evaluation.');
    } finally {
      setSaving(false);
    }
  }

  // ── Fallback: old group-level mode (no members) ───────────────────────────
  if (members.length === 0) {
    return <GroupLevelFallback
      groupId={groupId}
      iterationId={iterationId}
      rubrics={rubrics}
      existingEval={existingEval}
      onSubmitSuccess={onSubmitSuccess}
    />;
  }

  // ── Per-student mode ──────────────────────────────────────────────────────
  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>

      {/* Lock banner */}
      {isLocked && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px',
          padding: '14px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400e' }}>
            <Lock size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Evaluation Submitted & Locked</div>
              <div style={{ fontSize: '12px' }}>Scores are immutable and cannot be changed.</div>
            </div>
          </div>
          <div style={{
            background: '#ffffff', padding: '6px 16px', borderRadius: '20px',
            fontWeight: 700, fontSize: '15px', color: '#b45309',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Award size={18} />
            <span>Avg Score: {existingEval.total_weighted_score}</span>
          </div>
        </div>
      )}

      {!isLocked && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
          padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#166534',
        }}>
          <strong>Note:</strong> Once submitted, all scores are permanently locked.
        </div>
      )}

      {/* Manager Rubrics Reference Panel */}
      {rubrics.length > 0 && (
        <div style={{ marginBottom: '20px', border: '1px solid #dbeafe', borderRadius: '10px', overflow: 'hidden' }}>
          <div
            onClick={() => setShowManagerPanel(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', cursor: 'pointer',
              background: '#eff6ff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} color="#1d4ed8" />
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e40af' }}>
                Manager's Standard Rubrics
              </span>
              <span style={{ fontSize: '11px', color: '#3b82f6', background: '#dbeafe', padding: '1px 6px', borderRadius: '10px' }}>
                {rubrics.length} criteria · Read-only standard
              </span>
            </div>
            {showManagerPanel ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
          </div>
          {showManagerPanel && (
            <div style={{ padding: '14px 16px', background: '#f8fbff' }}>
              {rubrics.map((r, i) => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  padding: '8px 0',
                  borderBottom: i < rubrics.length - 1 ? '1px solid #e0ecff' : 'none',
                }}>
                  <span style={{ fontWeight: 700, color: '#3b82f6', minWidth: '20px' }}>{i + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>{r.question}</span>
                    <span style={{
                      marginLeft: '8px', fontSize: '11px', fontWeight: 700,
                      background: '#dbeafe', color: '#1d4ed8',
                      padding: '1px 6px', borderRadius: '10px',
                    }}>{r.weight} pts</span>
                    {r.levels && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {Object.entries(r.levels).map(([lvl, desc]) => (
                          <span key={lvl} style={{ fontSize: '10px', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                            {lvl}: {desc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evaluator Custom Rubrics Panel */}
      <div style={{ marginBottom: '20px', border: '1px solid #e9d5ff', borderRadius: '10px', overflow: 'hidden' }}>
        <div
          onClick={() => setShowRubricPanel(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', cursor: 'pointer', background: '#faf5ff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pencil size={16} color="#7c3aed" />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#6d28d9' }}>
              My Custom Rubrics for This Group
            </span>
            {!isLocked && (
              <span style={{ fontSize: '11px', color: '#7c3aed', background: '#ede9fe', padding: '1px 6px', borderRadius: '10px' }}>
                {draftRubrics.length} {draftRubrics.length === 1 ? 'criterion' : 'criteria'}
                {rubricsDirty ? ' · Unsaved' : ''}
              </span>
            )}
          </div>
          {showRubricPanel ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
        </div>
        {showRubricPanel && (
          <div style={{ padding: '14px 16px', background: '#fdf8ff' }}>
            {isLocked ? (
              activeEvalRubrics.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No custom rubrics were set for this evaluation.</div>
              ) : (
                activeEvalRubrics.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: i < activeEvalRubrics.length - 1 ? '1px solid #ede9fe' : 'none' }}>
                    <span style={{ fontWeight: 700, color: '#7c3aed', minWidth: '20px' }}>{i + 1}.</span>
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>{r.question}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: '10px', marginLeft: 'auto' }}>{r.weight} pts</span>
                  </div>
                ))
              )
            ) : (
              <>
                <RubricBuilder rubrics={draftRubrics} onChange={handleDraftChange} disabled={false} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ede9fe' }}>
                  <button
                    type="button"
                    onClick={handleSaveRubrics}
                    disabled={savingRubrics || !rubricsDirty}
                    className="btn btn-sm"
                    style={{
                      background: rubricsDirty ? '#7c3aed' : '#e2e8f0',
                      color: rubricsDirty ? '#ffffff' : '#94a3b8',
                      border: 'none',
                    }}
                  >
                    <Save size={13} />
                    <span>{savingRubrics ? 'Saving...' : 'Save My Rubrics'}</span>
                  </button>
                  {!rubricsDirty && (
                    <span style={{ fontSize: '12px', color: '#15803d' }}>✓ Saved</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Students Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Users size={16} color="#0f172a" />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Student Evaluations ({members.length})
          </h3>
        </div>
        {members.map(m => (
          <StudentCard
            key={m.id}
            member={m}
            managerRubrics={rubrics}
            evaluatorRubrics={isLocked ? activeEvalRubrics : evaluatorRubrics}
            studentData={studentData[m.id] || {}}
            onUpdate={(patch) => updateStudent(m.id, patch)}
            isLocked={isLocked}
            isExpanded={expandedStudentId === m.id}
            onToggle={() => setExpandedStudentId(prev => prev === m.id ? null : m.id)}
          />
        ))}
      </div>

      {/* Group Remark */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
          Group Remarks / Collective Feedback
        </label>
        <textarea
          rows={3}
          value={groupRemark}
          onChange={(e) => setGroupRemark(e.target.value)}
          disabled={isLocked}
          placeholder="Add overall feedback for the group as a whole..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626',
          fontSize: '13px', marginBottom: '16px',
          background: '#fef2f2', padding: '10px 14px', borderRadius: '6px',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!isLocked && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="btn btn-primary"
        >
          <CheckCircle2 size={16} />
          <span>{saving ? 'Submitting...' : `Submit Evaluations for ${members.length} Students (Locked After Submit)`}</span>
        </button>
      )}
    </div>
  );
}

// ── Fallback: group-level evaluation (no members data) ────────────────────────

function GroupLevelFallback({ groupId, iterationId, rubrics, existingEval, onSubmitSuccess }) {
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
    if (incomplete) { setError('Please score all criteria before submitting.'); return; }
    setSaving(true);
    setError('');
    const formattedScores = {};
    Object.entries(scores).forEach(([k, v]) => { formattedScores[k] = Number(v); });
    try {
      await evaluatorApi.submitEvaluation({ group_id: groupId, iteration_id: iterationId, scores: formattedScores, comment: comment.trim() });
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit evaluation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
      {isLocked ? (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400e' }}>
            <Lock size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Evaluation Submitted & Locked</div>
              <div style={{ fontSize: '12px' }}>Evaluations are immutable and cannot be updated.</div>
            </div>
          </div>
          <div style={{ background: '#ffffff', padding: '6px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '15px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={18} />
            <span>Score: {existingEval.total_weighted_score}</span>
          </div>
        </div>
      ) : (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#166534' }}>
          ⚠️ <strong>Note:</strong> Once submitted, scores are permanently locked. (No student list available — showing group-level evaluation.)
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {rubrics.length === 0 ? (
          <div style={{ padding: '20px', color: '#64748b' }}>No rubric criteria defined for this milestone.</div>
        ) : (
          rubrics.map((r, idx) => {
            const rId = String(r.id);
            const currentScore = scores[rId];
            return (
              <div key={r.id || idx} style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{idx + 1}. {r.question}</span>
                  <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px' }}>Weight: {r.weight} Marks</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                  {[0, 1, 2, 3, 4, 5].map((lvl) => {
                    const isSelected = currentScore === lvl;
                    const descriptor = r.levels?.[String(lvl)] || r.levels?.[lvl] || `Level ${lvl}`;
                    return (
                      <label key={lvl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderRadius: '6px', border: isSelected ? '2px solid var(--primary)' : '1px solid #cbd5e1', background: isSelected ? 'var(--primary-light)' : '#ffffff', cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked && !isSelected ? 0.4 : 1, textAlign: 'center' }}>
                        <input type="radio" name={`rubric-${rId}`} value={lvl} checked={isSelected} onChange={() => !isLocked && setScores(prev => ({ ...prev, [rId]: lvl }))} disabled={isLocked} style={{ marginBottom: '6px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? 'var(--primary)' : '#334155' }}>{lvl} / 5</span>
                        <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', lineHeight: '1.2' }}>{descriptor}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        <div style={{ marginTop: '24px', marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>General Feedback / Comments</label>
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} disabled={isLocked} placeholder="Add any specific feedback or rationale for the group..." style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '16px', background: '#fef2f2', padding: '10px 14px', borderRadius: '6px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {!isLocked && (
          <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: saving ? 'var(--primary-light)' : 'var(--primary)', color: saving ? 'var(--primary)' : '#ffffff', padding: '10px 24px', borderRadius: '6px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            <CheckCircle2 size={18} />
            <span>{saving ? 'Submitting...' : 'Submit Evaluation (Locked After Submit)'}</span>
          </button>
        )}
      </form>
    </div>
  );
}
