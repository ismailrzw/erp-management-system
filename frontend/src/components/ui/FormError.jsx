/**
 * FormError — inline form error banner.
 * Replaces 5+ identical red-banner patterns across page forms.
 */
export const FormError = ({ message }) => {
  if (!message) return null;
  return (
    <div className="form-error-banner" role="alert">
      {message}
    </div>
  );
};

/**
 * FormSuccess — inline form success banner.
 */
export const FormSuccess = ({ message }) => {
  if (!message) return null;
  return (
    <div className="form-success-banner" role="status">
      {message}
    </div>
  );
};

/**
 * FormInfo — inline form info/warning banner.
 */
export const FormInfo = ({ message }) => {
  if (!message) return null;
  return (
    <div className="form-info-banner" role="note">
      {message}
    </div>
  );
};
