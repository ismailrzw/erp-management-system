import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

// Auth Pages
import { SignInPage } from './pages/auth/SignInPage';

// Manager Pages
import { ManagerDashboard } from './pages/manager/ManagerDashboard';

// Students Management
import { StudentListPage } from './pages/manager/students/StudentListPage';
import { AddStudentPage } from './pages/manager/students/AddStudentPage';
import { StudentTrashPage } from './pages/manager/students/StudentTrashPage';

// Departments Management
import { DepartmentListPage } from './pages/manager/departments/DepartmentListPage';
import { AddDepartmentPage } from './pages/manager/departments/AddDepartmentPage';
import { DepartmentTrashPage } from './pages/manager/departments/DepartmentTrashPage';

// Courses Management
import { CourseListPage } from './pages/manager/courses/CourseListPage';
import { AddCoursePage } from './pages/manager/courses/AddCoursePage';
import { CourseTrashPage } from './pages/manager/courses/CourseTrashPage';

// Teachers Management
import { TeacherListPage } from './pages/manager/teachers/TeacherListPage';
import { AddTeacherPage } from './pages/manager/teachers/AddTeacherPage';
import { TeacherTrashPage } from './pages/manager/teachers/TeacherTrashPage';

// Fallback
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<SignInPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/manager/dashboard" replace />} />

          {/* Protected Manager Routes */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['pbl_manager']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ManagerDashboard />} />

            {/* Students Management CRUD */}
            <Route path="students" element={<StudentListPage />} />
            <Route path="students/view" element={<StudentListPage />} />
            <Route path="students/add" element={<AddStudentPage />} />
            <Route path="students/trash" element={<StudentTrashPage />} />

            {/* Departments Management CRUD */}
            <Route path="departments" element={<DepartmentListPage />} />
            <Route path="departments/view" element={<DepartmentListPage />} />
            <Route path="departments/add" element={<AddDepartmentPage />} />
            <Route path="departments/trash" element={<DepartmentTrashPage />} />

            {/* Courses Management CRUD */}
            <Route path="courses" element={<CourseListPage />} />
            <Route path="courses/view" element={<CourseListPage />} />
            <Route path="courses/add" element={<AddCoursePage />} />
            <Route path="courses/trash" element={<CourseTrashPage />} />

            {/* Teachers / Evaluators Management CRUD */}
            <Route path="teachers" element={<TeacherListPage />} />
            <Route path="teachers/view" element={<TeacherListPage />} />
            <Route path="teachers/add" element={<AddTeacherPage />} />
            <Route path="teachers/trash" element={<TeacherTrashPage />} />

            {/* Fallback for other subpages */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Global Fallback 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
