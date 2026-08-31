import { useState } from 'react';
import { ChevronDown, Edit2, Trash2, Calendar, Sparkles } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

export const AccordionItem = ({
  announcement,
  onEdit,
  onDelete,
  defaultOpen = false,
  isRecent = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const rawContent = (announcement.content || '').trim();
  // Short snippet preview for collapsed state (up to 120 chars)
  const snippet = rawContent.length > 120 ? `${rawContent.slice(0, 120)}...` : rawContent;

  return (
    <div
      style={{
        border: isOpen ? '1px solid #93c5fd' : '1px solid #e2e8f0',
        borderRadius: '8px',
        marginBottom: '12px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxShadow: isOpen ? '0 2px 8px rgba(0, 115, 170, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header / Clickable Area */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: isOpen ? '#f0f7ff' : '#ffffff',
          userSelect: 'none',
          gap: '12px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14.5px' }}>
              {announcement.title}
            </span>
            {isRecent && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                }}
              >
                <Sparkles size={11} />
                Recent
              </span>
            )}
          </div>

          {/* Date & Metadata */}
          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Calendar size={12} color="#94a3b8" />
            <span>{formatDate(announcement.date || announcement.created_at)}</span>
            {announcement.posted_by && (
              <>
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>•</span>
                <span style={{ color: '#64748b' }}>By Manager</span>
              </>
            )}
          </div>

          {/* Collapsed Snippet Preview */}
          {!isOpen && snippet && (
            <div
              style={{
                fontSize: '13px',
                color: '#64748b',
                marginTop: '6px',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {snippet}
            </div>
          )}
        </div>

        {/* Expand / Collapse Icon */}
        <div
          style={{
            color: isOpen ? '#0073aa' : '#94a3b8',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            paddingTop: '2px',
          }}
        >
          <ChevronDown size={18} />
        </div>
      </div>

      {/* Expanded Content Area */}
      {isOpen && (
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #e0f2fe',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              color: '#334155',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              backgroundColor: '#f8fafc',
              padding: '12px 14px',
              borderRadius: '6px',
              border: '1px solid #f1f5f9',
              marginBottom: '14px',
            }}
          >
            {rawContent || (
              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                No description or content provided for this announcement.
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(announcement);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                <Edit2 size={13} color="#0073aa" />
                <span>Edit</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(announcement);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '5px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
