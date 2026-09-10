import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { iterationsApi } from '../../../api/iterationsApi';
import { Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

const EMPTY_RUBRIC = () => ({
  question: '',
  weight: 0,
  levels: { '0': '', '1': '', '2': '', '3': '', '4': '', '5': '' },
});

export const RubricBuilderModal = ({ isOpen, onClose, iteration, onSave }) => {
  const [rubrics, setRubrics] = useState([EMPTY_RUBRIC()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (iteration?.rubrics && iteration.rubrics.length > 0) {
      setRubrics(iteration.rubrics.map(r => ({
        ...r,
        levels: r.levels || { '0': '', '1': '', '2': '', '3': '', '4': '', '5': '' }
      })));
    } else {
      setRubrics([EMPTY_RUBRIC()]);
    }
    setError('');
  }, [iteration, isOpen]);

  const totalWeight = rubrics.reduce((sum, r) => sum + Number(r.weight || 0), 0);
  const isValidTotal = totalWeight === 100;

  const updateRubric = (index, field, value) => {
    setRubrics(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const updateLevel = (rIndex, levelKey, value) => {
    setRubrics(prev => prev.map((r, i) => {
      if (i !== rIndex) return r;
      return { ...r, levels: { ...r.levels, [levelKey]: value } };
    }));
  };

  const handleAddCriterion = () => {
    setRubrics(prev => [...prev, EMPTY_RUBRIC()]);
  };

  const handleRemoveCriterion = (index) => {
    if (rubrics.length <= 1) return;
    setRubrics(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!isValidTotal) {
      setError(`Rubric weights must sum to exactly 100%. Current sum: ${totalWeight}%.`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await iterationsApi.setRubrics(iteration._id, rubrics);
      onSave();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save rubrics.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Build Rubric — ${iteration?.title || ''}`} maxWidth="720px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Real-time weight total indicator banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: isValidTotal ? '#f0fdf4' : totalWeight > 100 ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${isValidTotal ? '#bbf7d0' : totalWeight > 100 ? '#fecaca' : '#fde68a'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isValidTotal ? (
              <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
            ) : (
              <AlertTriangle size={20} style={{ color: totalWeight > 100 ? '#dc2626' : '#d97706' }} />
            )}
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: isValidTotal ? '#15803d' : totalWeight > 100 ? '#b91c1c' : '#b45309' }}>
              Total Weight: {totalWeight}% / 100%
            </span>
          </div>
          <span style={{ fontSize: '12.5px', color: isValidTotal ? '#16a34a' : '#64748b', fontWeight: 500 }}>
            {isValidTotal ? '✓ Valid (100%)' : totalWeight > 100 ? 'Exceeds 100%' : 'Must equal 100%'}
          </span>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Rubric Criteria List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
          {rubrics.map((r, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                    Criterion {index + 1} Question / Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Problem Statement Clarity"
                    value={r.question}
                    onChange={(e) => updateRubric(index, 'question', e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div style={{ width: '110px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                    Weight (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={r.weight}
                    onChange={(e) => updateRubric(index, 'weight', e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                {rubrics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(index)}
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

              {/* Level Descriptors Grid (0-5) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Level Descriptors (0 - 5 Score Scale)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['0', '1', '2', '3', '4', '5'].map((levelKey) => (
                    <div key={levelKey}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Level {levelKey}</span>
                      <input
                        type="text"
                        placeholder={`Descriptor for level ${levelKey}`}
                        value={r.levels?.[levelKey] || ''}
                        onChange={(e) => updateLevel(index, levelKey, e.target.value)}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
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
            {saving ? 'Saving...' : 'Save Rubrics'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
