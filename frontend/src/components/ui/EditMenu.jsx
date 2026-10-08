import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function EditMenu({ children, label = 'Edit' }) {
  const [position, setPosition] = useState(null); const trigger = useRef(null); const menu = useRef(null);
  const close = () => { setPosition(null); trigger.current?.focus(); };
  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector('button:not(:disabled)')?.focus();
    const outside = event => { if (!trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) setPosition(null); };
    const dismiss = () => setPosition(null);
    document.addEventListener('pointerdown', outside); window.addEventListener('resize', dismiss); window.addEventListener('scroll', dismiss, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', dismiss); window.removeEventListener('scroll', dismiss, true); };
  }, [position]);
  const toggle = () => {
    if (position) { close(); return; }
    const bounds = trigger.current.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(bounds.right - 180, innerWidth - 188)), top: Math.min(bounds.bottom + 6, innerHeight - 160) });
  };
  return <span className="edit-menu"><button ref={trigger} type="button" className="btn btn-secondary btn-sm" aria-haspopup="menu" aria-expanded={Boolean(position)} onClick={toggle}>{label}</button>{position && createPortal(<div ref={menu} className="edit-menu-options" role="menu" aria-label={label} style={{ position: 'fixed', left: position.left, top: Math.max(8, position.top), right: 'auto', zIndex: 2000, maxHeight: 'calc(100vh - 24px)', overflowY: 'auto' }} onClick={event => { if (event.target.closest('button')) close(); }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); const buttons = Array.from(menu.current.querySelectorAll('button:not(:disabled)')); const index = buttons.indexOf(document.activeElement);
      buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  }}>{Children.toArray(children).map(child => isValidElement(child) && child.type === 'button' ? cloneElement(child, { role: 'menuitem' }) : child)}</div>, document.body)}</span>;
}
