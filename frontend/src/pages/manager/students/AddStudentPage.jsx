import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, CheckCircle2, AlertCircle, Upload, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import { studentsApi } from '../../../api/studentsApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { coursesApi } from '../../../api/coursesApi';
import { teachersApi } from '../../../api/teachersApi';
import { Toast } from '../../../components/ui/Toast';
import { Modal } from '../../../components/ui/Modal';

export const AddStudentPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    roll: '',
    dept: 'CS',
    section: 'A',
    session: 'Fall 2025',
    course: 'Final Year Project',
    teacher: 'Dr. Sarah Ahmed',
    recovery_email: '',
  });

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importReport, setImportReport] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const loadRefs = async () => {
      try {
        const [dRes, cRes, tRes] = await Promise.all([
          departmentsApi.list({ limit: 100 }),
          coursesApi.list({ limit: 100 }),
          teachersApi.list({ limit: 100 }),
        ]);

        if (isMounted) {
          if (dRes.success && dRes.data) {
            const dItems = dRes.data.items || dRes.data || [];
            setDepartments(dItems);
            if (dItems.length > 0) {
              setFormData((prev) => ({ ...prev, dept: prev.dept || dItems[0].code }));
            }
          }
          if (cRes.success && cRes.data) {
            const cItems = cRes.data.items || cRes.data || [];
            setCourses(cItems);
            if (cItems.length > 0) {
              setFormData((prev) => ({ ...prev, course: prev.course || cItems[0].name }));
            }
          }
          if (tRes.success && tRes.data) {
            const tItems = tRes.data.items || tRes.data || [];
            setTeachers(tItems);
            if (tItems.length > 0) {
              setFormData((prev) => ({ ...prev, teacher: prev.teacher || tItems[0].name }));
            }
          }
        }
      } catch {
        // Dropdowns will default to user entry
      }
    };
    loadRefs();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanRoll = formData.roll.trim().replace(/\s+/g, '');
    const cleanDept = formData.dept.trim() || 'CS';

    if (!formData.name.trim() || !cleanRoll) {
      setFormError('Name and Roll Number are required.');
      return;
    }

    if (cleanDept.length < 2 || cleanDept.length > 10) {
      setFormError('Department code must be between 2 and 10 characters (e.g. CS, SE, EE).');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        roll: cleanRoll,
        dept: cleanDept,
        section: formData.section.trim() || 'A',
        session: formData.session.trim() || 'Fall 2025',
        course: formData.course.trim() || 'Final Year Project',
        teacher: formData.teacher.trim() || 'Dr. Sarah Ahmed',
        recovery_email: formData.recovery_email.trim() || undefined,
      };

      const res = await studentsApi.create(payload);
      if (res.success && res.data) {
        setCreatedStudent(res.data);
        setToast({ message: 'Student account created successfully!', type: 'success' });
      }
    } catch (err) {
      const errPayload = err.response?.data;
      let msg = errPayload?.message || err.message || 'Failed to create student';
      if (errPayload?.errors) {
        const errorList = Object.entries(errPayload.errors).map(
          ([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
        );
        msg = `${msg} — ${errorList.join(' | ')}`;
      }
      setFormError(msg);
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'Name,Roll,Department,Section,Session,Course,Teacher,Recovery Email\n' +
      'Muhammad Ali,2024-CS-101,CS,A,Fall 2025,Final Year Project,Dr. Sarah Ahmed,ali@example.com\n' +
      'Fatima Zahra,2024-CS-102,CS,B,Fall 2025,Final Year Project,Dr. Sarah Ahmed,fatima@example.com\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setToast({ message: 'Please select a CSV or XLSX file', type: 'error' });
      return;
    }
    try {
      setImportLoading(true);
      const res = await studentsApi.bulkImport(importFile);
      if (res.success && res.data) {
        setImportReport(res.data);
        const { imported, skipped } = res.data;
        setToast({
          message: `Import complete: ${imported} imported, ${skipped} skipped.`,
          type: imported > 0 ? 'success' : 'info',
        });
      } else {
        setToast({ message: res.message || 'Bulk import processed', type: 'success' });
        setIsImportModalOpen(false);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to import students file';
      setToast({
        message: errMsg,
        type: 'error',
      });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => navigate('/manager/students/view')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '13px',
            padding: 0,
            marginBottom: '10px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Students List</span>
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
          Add New Student
        </h1>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Create an individual student account or bulk import students via spreadsheet.
        </div>
        <div style={{ marginTop: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => { setImportReport(null); setImportFile(null); setIsImportModalOpen(true); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 16px',
              backgroundColor: '#0073aa',
              border: 'none',
              color: '#ffffff',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Upload size={15} />
            <span>Bulk Import Students</span>
          </button>
        </div>

        {/* Bulk Import Modal */}
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Bulk Import Students"
          maxWidth="560px"
        >
          {importReport ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 8px' }} />
                <h3 style={{ margin: 0, fontSize: '17px', color: '#1e293b' }}>Import Finished</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#16a34a' }}>{importReport.imported}</div>
                  <div style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 500 }}>Successfully Imported</div>
                </div>
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#d97706' }}>{importReport.skipped}</div>
                  <div style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 500 }}>Skipped (Existing / Error)</div>
                </div>
              </div>

              {importReport.errors && importReport.errors.length > 0 && (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Skipped Items Details:
                  </div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#f8fafc', padding: '8px 12px' }}>
                    {importReport.errors.map((err, idx) => (
                      <div key={idx} style={{ fontSize: '12px', color: '#dc2626', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                        <span>•</span>
                        <span>
                          {err.row ? `Row ${err.row}: ` : ''}
                          {err.roll ? `[${err.roll}] ` : ''}
                          {err.error || JSON.stringify(err)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setImportReport(null); setImportFile(null); }}
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
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={() => { setIsImportModalOpen(false); navigate('/manager/students/view'); }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: '#0073aa',
                    color: '#ffffff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  View All Students
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleImportSubmit}>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '14px' }}>
                Upload a <strong>CSV</strong> or <strong>Excel (.xlsx)</strong> file containing student records. Existing roll numbers in the database will be skipped automatically, while new students will be imported.
              </div>

              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '12.5px', color: '#475569' }}>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Required Columns:</div>
                <code>Name, Roll, Department, Section, Session, Course, Teacher, Recovery Email</code>
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      color: '#0073aa',
                      background: 'none',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <Download size={13} />
                    <span>Download Sample CSV Template</span>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Select CSV / XLSX File *
                </label>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
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
                  type="submit"
                  disabled={importLoading || !importFile}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: '#0073aa',
                    color: '#ffffff',
                    borderRadius: '4px',
                    cursor: importLoading || !importFile ? 'not-allowed' : 'pointer',
                    opacity: importLoading || !importFile ? 0.7 : 1,
                  }}
                >
                  {importLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                  <span>{importLoading ? 'Importing...' : 'Upload and Import'}</span>
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>

      {formError && (
        <div
          style={{
            backgroundColor: '#fdecea',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '13.5px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </div>
      )}

      {createdStudent ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            Student Created Successfully!
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px' }}>
            The student account is now active. Please note down their auto-generated credentials:
          </p>

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '16px 20px',
              maxWidth: '450px',
              margin: '0 auto 24px',
              textAlign: 'left',
              fontSize: '13.5px',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <strong>Name:</strong> {createdStudent.name}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Roll No:</strong> {createdStudent.roll}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>System Email:</strong> <code style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '3px' }}>{createdStudent.email}</code>
            </div>
            {createdStudent.initial_password && (
              <div>
                <strong>Initial Password:</strong> <code style={{ backgroundColor: '#fef08a', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>{createdStudent.initial_password}</code>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setCreatedStudent(null);
                setFormError('');
                setFormData({
                  name: '',
                  roll: '',
                  dept: departments[0]?.code || 'CS',
                  section: 'A',
                  session: 'Fall 2025',
                  course: courses[0]?.name || 'Final Year Project',
                  teacher: teachers[0]?.name || 'Dr. Sarah Ahmed',
                  recovery_email: '',
                });
              }}
              style={{
                padding: '9px 18px',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add Another Student
            </button>
            <button
              type="button"
              onClick={() => navigate('/manager/students/view')}
              style={{
                padding: '9px 18px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              View All Students
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            padding: '24px 28px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Muhammad Ismail Rana"
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Roll Number (No spaces) *
                </label>
                <input
                  type="text"
                  value={formData.roll}
                  onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
                  placeholder="e.g. BSEF23F-551"
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Department Code *
                </label>
                <select
                  value={formData.dept}
                  onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
                >
                  {departments.length === 0 ? (
                    <>
                      <option value="CS">CS - Computer Science</option>
                      <option value="SE">SE - Software Engineering</option>
                      <option value="EE">EE - Electrical Engineering</option>
                      <option value="BBA">BBA - Business Administration</option>
                    </>
                  ) : (
                    departments.map((d) => (
                      <option key={d.id || d._id || d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Section *
                </label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g. A"
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Academic Session *
                </label>
                <input
                  type="text"
                  value={formData.session}
                  onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                  placeholder="e.g. Fall 2025"
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Course *
                </label>
                <select
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
                >
                  {courses.length === 0 ? (
                    <>
                      <option value="Final Year Project">Final Year Project</option>
                      <option value="Software Architecture PBL">Software Architecture PBL</option>
                    </>
                  ) : (
                    courses.map((c) => (
                      <option key={c.id || c._id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                  Assigned Teacher / Evaluator *
                </label>
                <select
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  required
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
                >
                  {teachers.length === 0 ? (
                    <>
                      <option value="Dr. Sarah Ahmed">Dr. Sarah Ahmed (Internal Faculty)</option>
                      <option value="Prof. Ali Raza">Prof. Ali Raza (Internal Faculty)</option>
                      <option value="Mr. Kashif Mehmood">Mr. Kashif Mehmood (External Industry)</option>
                    </>
                  ) : (
                    teachers.map((t) => (
                      <option key={t.id || t._id || t.email} value={t.name}>
                        {t.name} ({t.dept || 'Faculty'})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                Recovery Email Address (Optional)
              </label>
              <input
                type="email"
                value={formData.recovery_email}
                onChange={(e) => setFormData({ ...formData, recovery_email: e.target.value })}
                placeholder="e.g. personal.email@gmail.com"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '9px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/manager/students/view')}
                style={{
                  padding: '9px 16px',
                  fontSize: '13.5px',
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
                type="submit"
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: '#0073aa',
                  color: '#ffffff',
                  borderRadius: '4px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                <UserPlus size={16} />
                <span>{isSubmitting ? 'Creating Student...' : 'Create Student'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
