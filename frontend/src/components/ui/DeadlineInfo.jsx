export function DeadlineInfo({ value }) {
  const text = value ? new Date(value).toLocaleString() : 'Deadline not configured';
  return <><span className="deadline-info-desktop">{text}</span><details className="deadline-info-mobile"><summary aria-label="Show deadline date and time" className="btn btn-ghost btn-sm">ⓘ</summary><div>{text}</div></details></>;
}
