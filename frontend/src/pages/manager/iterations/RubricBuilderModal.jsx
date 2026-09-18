import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { iterationsApi } from '../../../api/iterationsApi';
import { rubricTemplatesApi } from '../../../api/rubricTemplatesApi';
import { Plus, Trash2, CheckCircle2, AlertTriangle, Copy, ChevronDown, ChevronUp } from 'lucide-react';

const DEFAULT_LEVELS = {
  '0': 'Not submitted / Unsatisfactory',
  '1': 'Minimal effort / Major deficiencies',
  '2': 'Basic attempt / Needs improvement',
  '3': 'Satisfactory / Meets expectations',
  '4': 'Good quality / Minor gaps',
  '5': 'Exemplary / Fully comprehensive',
};

const EMPTY_RUBRIC = () => ({
  question: '',
  weight: 5,
  levels: { ...DEFAULT_LEVELS },
});

export const RubricBuilderModal = ({
  isOpen,
  onClose,
  iteration = null,       // If provided, operates in "iteration mode"
  template = null,        // If provided, operates in "template mode" (editing existing template)
  templateMode = false,   // If true + no template, creates a new template
  courses = [],           // Available courses for template scoping
  onSave,
  onSuccess,
}) => {
  const [rubrics, setRubrics] = useState([EMPTY_RUBRIC()]);
  const [templateName, setTemplateName] = useState('');
  const [templateCourse, setTemplateCourse] = useState('All Courses');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openLevels, setOpenLevels] = useState({});

  // Available templates for "Load from Template" feature
  const [availableTemplates, setAvailableTemplates] = useState([]);

  const isTemplateOperation = templateMode || !!template;

  useEffect(() => {
    if (!isOpen) return;

    if (template) {
      // Editing an existing template
      setTemplateName(template.name || '');
      setTemplateCourse(template.course || 'All Courses');
      setRubrics(
        (template.criteria || []).map((r) => ({
          ...r,
          weight: Number(r.weight || 0),
          levels: { ...DEFAULT_LEVELS, ...(r.levels || {}) },
        }))
      );
    } else if (iteration?.rubrics && iteration.rubrics.length > 0) {
      setRubrics(
        iteration.rubrics.map((r) => ({
          ...r,
          weight: Number(r.weight || 0),
          levels: { ...DEFAULT_LEVELS, ...(r.levels || {}) },
        }))
      );
    } else {
      setRubrics([EMPTY_RUBRIC()]);
      setTemplateName('');
      setTemplateCourse('All Courses');
    }
    setError('');
    setOpenLevels({});

    // Fetch saved templates for "Load from Template"
    if (!isTemplateOperation) {
      rubricTemplatesApi
        .getAll()
        .then((res) => setAvailableTemplates(res.data || []))
        .catch(() => setAvailableTemplates([]));
    }
  }, [iteration, template, isOpen, isTemplateOperation]);

  const totalWeight = rubrics.reduce((sum, r) => sum + Number(r.weight || 0), 0);
  const hasValidCriteria = rubrics.length > 0 && rubrics.every((r) => (r.question || '').trim().length > 0);
  const isValidTotal = totalWeight > 0 && hasValidCriteria;

  const updateRubric = (index, field, value) => {
    setRubrics((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const updateLevel = (rIndex, levelKey, value) => {
    setRubrics((prev) =>
      prev.map((r, i) => {
        if (i !== rIndex) return r;
        return { ...r, levels: { ...r.levels, [levelKey]: value } };
      })
    );
  };

  const handleAddCriterion = () => {
    setRubrics((prev) => [...prev, EMPTY_RUBRIC()]);
  };

  const handleRemoveCriterion = (index) => {
    if (rubrics.length <= 1) return;
    setRubrics((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleLevels = (index) => {
    setOpenLevels((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleLoadCustomTemplate = (tplId) => {
    const tpl = availableTemplates.find((t) => t._id === tplId);
    if (!tpl || !tpl.criteria) return;
    setRubrics(
      tpl.criteria.map((r) => ({
        ...r,
        weight: Number(r.weight || 0),
        levels: { ...DEFAULT_LEVELS, ...(r.levels || {}) },
      }))
    );
  };

  const handleSave = async () => {
    if (totalWeight <= 0) {
      setError('Total rubric marks must be greater than 0.');
      return;
    }

    if (!hasValidCriteria) {
      setError('Please provide a name/question for all criteria.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isTemplateOperation) {
        if (!templateName.trim()) {
          setError('Template name is required.');
          setSaving(false);
          return;
        }
        const payload = {
          name: templateName.trim(),
          course: templateCourse,
          criteria: rubrics,
        };
        if (template?._id) {
          await rubricTemplatesApi.update(template._id, payload);
        } else {
          await rubricTemplatesApi.create(payload);
        }
      } else {
        await iterationsApi.setRubrics(iteration._id, rubrics);
      }
      const callback = onSave || onSuccess;
      if (typeof callback === 'function') {
        callback();
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save rubrics.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const modalTitle = isTemplateOperation
    ? template
      ? `Edit Template — ${template.name}`
      : 'Create Rubric Template'
    : `Build Rubric — ${iteration?.title || ''}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="780px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>



        {/* Template details (name & course scope) */}
        {isTemplateOperation && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                Template Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SRS Phase 1 — Problem Statement & Scope"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div style={{ width: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                Scope
              </label>
              <select
                value={templateCourse}
                onChange={(e) => setTemplateCourse(e.target.value)}
                style={{ width: '100%', padding: '7px 32px 7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="All Courses">All Courses</option>
                {courses.map((c) => (
                  <option key={c._id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Saved Templates Selector (only in iteration mode) */}
        {!isTemplateOperation && availableTemplates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Copy size={16} style={{ color: '#64748b', flexShrink: 0 }} />
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Saved Templates:
            </span>
            <select
              onChange={(e) => e.target.value && handleLoadCustomTemplate(e.target.value)}
              style={{ flex: 1, padding: '6px 32px 6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
              defaultValue=""
            >
              <option value="">— Select a saved template —</option>
              {availableTemplates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.criteria?.length || 0} criteria) — {t.course}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dynamic Total Marks Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: isValidTotal ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${isValidTotal ? '#bbf7d0' : '#fde68a'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isValidTotal ? (
              <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
            ) : (
              <AlertTriangle size={20} style={{ color: '#d97706' }} />
            )}
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: isValidTotal ? '#15803d' : '#b45309',
              }}
            >
              Total Marks: {totalWeight} Marks
            </span>
          </div>
          <span style={{ fontSize: '12.5px', color: isValidTotal ? '#16a34a' : '#64748b', fontWeight: 600 }}>
            {isValidTotal ? `✓ Dynamic Total (${rubrics.length} Criteria)` : 'Assign marks to criteria'}
          </span>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Rubric Criteria List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
          {rubrics.map((r, index) => {
            const isLevelsExpanded = !!openLevels[index];
            const marksVal = Number(r.weight || 0);

            return (
              <div
                key={index}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                      Criterion {index + 1} Name / Task Topic
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Project Proposal & Background"
                      value={r.question}
                      onChange={(e) => updateRubric(index, 'question', e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ width: '120px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                      Marks
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={r.weight}
                      onChange={(e) => updateRubric(index, 'weight', e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#2563eb' }}
                    />
                  </div>

                  {rubrics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(index)}
                      title="Delete Criterion"
                      style={{
                        marginTop: '18px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Collapsible Score Scale Descriptors */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
                      Score Scale: <strong>Level 0 (0 pts)</strong> → <strong>Level 5 ({marksVal} pts)</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleLevels(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isLevelsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isLevelsExpanded ? 'Hide Level Descriptors' : 'Customize 0–5 Descriptors'}
                    </button>
                  </div>

                  {isLevelsExpanded && (
                    <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {['0', '1', '2', '3', '4', '5'].map((levelKey) => (
                        <div key={levelKey}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Level {levelKey}</span>
                          <input
                            type="text"
                            placeholder={`Descriptor for level ${levelKey}`}
                            value={r.levels?.[levelKey] || ''}
                            onChange={(e) => updateLevel(index, levelKey, e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAddCriterion}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px dashed #2563eb',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Add Criterion
        </button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isValidTotal}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isValidTotal ? '#2563eb' : '#94a3b8',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isValidTotal && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving...' : isTemplateOperation ? 'Save Template' : 'Save Rubrics'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
