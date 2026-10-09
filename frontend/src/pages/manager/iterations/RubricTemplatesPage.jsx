import { EditMenu } from '../../../components/ui/EditMenu';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { iterationsApi } from '../../../api/iterationsApi';
import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { Toast } from '../../../components/ui/Toast';
import { Modal } from '../../../components/ui/Modal';
import { rubricTemplatesApi } from '../../../api/rubricTemplatesApi';
import { coursesApi } from '../../../api/coursesApi';
import { RubricBuilderModal } from './RubricBuilderModal';
import { IterationsTabBar } from './IterationsTabBar';
import { Plus, Trash2, FileText, ChevronDown, ChevronUp, Layers, AlertTriangle } from 'lucide-react';

export const RubricTemplatesPage = () => {
  const [query] = useSearchParams(); const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Modal state
  const [isBuilderOpen, setIsBuilderOpen] = useState(Boolean(query.get('iteration_id')));
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Delete modal state
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rubricTemplatesApi.getAll();
      setTemplates(res.data || []); setLoadError('');
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Templates could not be loaded.');
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
    <div className="page-frame-container iterations-page">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Top Sub-Navigation Bar */}
      <IterationsTabBar />

      <PageHeader
        title="Rubric Templates"
        subtitle="Create reusable rubric criteria templates. Assign them to iterations to save time."
      >
        <button
          type="button"
          onClick={handleCreate}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Create Template
        </button>
      </PageHeader>

      {loading ? (
        <ContentLoader label="Loading rubric templates..." />
      ) : loadError ? (<EmptyState title="Could not load rubrics" description={loadError} actionLabel="Retry" onAction={fetchTemplates} />) : templates.length === 0 ? (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--primary-light)',
                        border: '1px solid rgba(0, 115, 170, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Layers size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '1px 8px',
                            borderRadius: '12px',
                            backgroundColor: tpl.course === 'All Courses' ? '#f3e8ff' : '#f1f5f9',
                            color: tpl.course === 'All Courses' ? '#7c3aed' : '#64748b',
                            border: `1px solid ${tpl.course === 'All Courses' ? '#ddd6fe' : '#e2e8f0'}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tpl.course}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          <FileText size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                          {criteriaCount} criteria
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: totalWeight > 0 ? '#16a34a' : '#dc2626',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {totalWeight} Marks total
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <div onClick={event => event.stopPropagation()}><EditMenu><button type="button" onClick={() => handleEdit(tpl)}>Edit Rubric</button><button type="button" onClick={() => setTemplateToDelete(tpl)} className="danger">Delete Template</button></EditMenu></div>
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
                                color: 'var(--primary)',
                                backgroundColor: 'var(--primary-light)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                border: '1px solid rgba(0, 115, 170, 0.2)',
                              }}
                            >
                              Marks: {c.weight}
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
        onSave={async (template) => {
          if (query.get('iteration_id')) {
            await iterationsApi.update(query.get('iteration_id'), { rubric_template_id: template._id || template.id });
            navigate('/manager/iterations');
          }
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
              backgroundColor: 'var(--primary-light)',
              border: '1px solid rgba(0, 115, 170, 0.2)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '11.5px',
              color: 'var(--primary)',
            }}
          >
            ℹ️ Note: If any iteration is currently linked to this template, deletion will be blocked by the system to preserve rubric integrity.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setTemplateToDelete(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
              className="btn btn-danger"
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
