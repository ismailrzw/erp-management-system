import { useState } from 'react';
import { ChevronDown, Edit2, Trash2, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

export const AccordionItem = ({ announcement, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        marginBottom: '10px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        transition: 'border-color 0.15s ease',
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: isOpen ? '#f8fafc' : '#ffffff',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, paddingRight: '12px' }}>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14.5px' }}>
            {announcement.title}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              marginTop: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Calendar size={13} />
            <span>{formatDate(announcement.date || announcement.created_at)}</span>
          </div>
        </div>
        <div
          style={{
            color: '#64748b',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <ChevronDown size={18} />
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            padding: '14px 16px 16px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              fontSize: '13.5px',
              color: '#475569',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              marginBottom: '14px',
            }}
          >
            {announcement.content || '(No content provided)'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(announcement)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(announcement)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#fdecea',
                  color: '#dc2626',
                  cursor: 'pointer',
                }}
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
