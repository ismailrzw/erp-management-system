import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Preloader } from '../../../components/ui/Preloader';
import { Toast } from '../../../components/ui/Toast';
import { Modal } from '../../../components/ui/Modal';
import { rubricTemplatesApi } from '../../../api/rubricTemplatesApi';
import { coursesApi } from '../../../api/coursesApi';
import { RubricBuilderModal } from './RubricBuilderModal';
import { Plus, Edit2, Trash2, FileText, ChevronDown, ChevronUp, Layers, AlertTriangle } from 'lucide-react';

export const RubricTemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Modal state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Delete modal state
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rubricTemplatesApi.getAll();
      setTemplates(res.data || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to fetch templates.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await coursesApi.list();
      const courseList = res.data?.items || res.data || [];
      setCourses(courseList);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchCourses();
  }, [fetchTemplates, fetchCourses]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsBuilderOpen(true);
  };

  const handleEdit = (tpl) => {
    setEditingTemplate(tpl);
    setIsBuilderOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    setDeleteLoading(true);
    try {
      await rubricTemplatesApi.delete(templateToDelete._id);
      setToast({ type: 'success', message: 'Template deleted.' });
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete template.';
      setToast({ type: 'error', message: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <PageHeader
        title="Rubric Templates"
        subtitle="Create reusable rubric criteria templates. Assign them to iterations to save time."
      >
        <button
          type="button"
          onClick={handleCreate}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13.5px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Create Template
        </button>
      </PageHeader>

      {loading ? (
        <Preloader label="Loading rubric templates..." />
      ) : templates.length === 0 ? (
        <EmptyState
          title="No Rubric Templates"
          description="Create your first rubric template to reuse across multiple iterations."
          actionLabel="Create Template"
          onAction={handleCreate}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {templates.map((tpl) => {
            const isExpanded = expandedId === tpl._id;
            const criteriaCount = tpl.criteria?.length || 0;
            const totalWeight = (tpl.criteria || []).reduce((s, c) => s + Number(c.weight || 0), 0);

            return (
              <div
                key={tpl._id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.2s ease',
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : tpl._id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Layers size={20} style={{ color: '#2563eb' }} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{tpl.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '1px 8px',
                            borderRadius: '12px',
                            backgroundColor: tpl.course === 'All Courses' ? '#f3e8ff' : '#f1f5f9',
                            color: tpl.course === 'All Courses' ? '#7c3aed' : '#64748b',
                            border: `1px solid ${tpl.course === 'All Courses' ? '#ddd6fe' : '#e2e8f0'}`,
                          }}
                        >
                          {tpl.course}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          <FileText size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                          {criteriaCount} criteria
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: totalWeight === 100 ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {totalWeight}% total
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEdit(tpl); }}
                      title="Edit Template"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTemplateToDelete(tpl); }}
                      title="Delete Template"
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? <ChevronUp size={18} style={{ color: '#94a3b8' }} /> : <ChevronDown size={18} style={{ color: '#94a3b8' }} />}
                  </div>
                </div>

                {/* Expanded Criteria Details */}
                {isExpanded && tpl.criteria && tpl.criteria.length > 0 && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 20px', backgroundColor: '#fafbfc' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {tpl.criteria.map((c, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                              {idx + 1}. {c.question}
                            </span>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#1d4ed8',
                                backgroundColor: '#eff6ff',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              Weight: {c.weight}%
                            </span>
                          </div>
                          {c.levels && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                              {Object.entries(c.levels).map(([lvl, desc]) => (
                                <div key={lvl} style={{ backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Level {lvl}</span>
                                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b', lineHeight: 1.3 }}>
                                    {desc || '—'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rubric Builder Modal in template mode */}
      <RubricBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        template={editingTemplate}
        templateMode={!editingTemplate}
        courses={courses}
        onSave={() => {
          setToast({ type: 'success', message: editingTemplate ? 'Template updated.' : 'Template created.' });
          fetchTemplates();
        }}
      />

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={!!templateToDelete}
        onClose={() => !deleteLoading && setTemplateToDelete(null)}
        title="Delete Rubric Template"
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Are you sure you want to delete this template?
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                This template will be permanently removed.
              </div>
            </div>
          </div>

          {templateToDelete && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '12px 14px',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ fontWeight: 600, color: '#1e293b' }}>
                {templateToDelete.name}
              </div>
              <div style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '12px' }}>
                <span>Scope: <strong>{templateToDelete.course || 'All Courses'}</strong></span>
                <span>Criteria: <strong>{templateToDelete.criteria?.length || 0}</strong></span>
              </div>
            </div>
          )}

          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '11.5px',
              color: '#1e40af',
            }}
          >
            ℹ️ Note: If any iteration is currently linked to this template, deletion will be blocked by the system to preserve rubric integrity.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setTemplateToDelete(null)}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '4px',
                cursor: deleteLoading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={14} />
              <span>{deleteLoading ? 'Deleting...' : 'Delete Template'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
