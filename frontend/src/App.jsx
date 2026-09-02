import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

// Auth Pages
import { SignInPage } from './pages/auth/SignInPage';

// Manager Pages
import { ManagerDashboard } from './pages/manager/ManagerDashboard';

// Students Management (Manager)
import { StudentListPage } from './pages/manager/students/StudentListPage';
import { AddStudentPage } from './pages/manager/students/AddStudentPage';
import { StudentTrashPage } from './pages/manager/students/StudentTrashPage';

// Departments Management (Manager)
import { DepartmentListPage } from './pages/manager/departments/DepartmentListPage';
import { AddDepartmentPage } from './pages/manager/departments/AddDepartmentPage';
import { DepartmentTrashPage } from './pages/manager/departments/DepartmentTrashPage';

// Courses Management (Manager)
import { CourseListPage } from './pages/manager/courses/CourseListPage';
import { AddCoursePage } from './pages/manager/courses/AddCoursePage';
import { CourseTrashPage } from './pages/manager/courses/CourseTrashPage';

// Teachers Management (Manager)
import { TeacherListPage } from './pages/manager/teachers/TeacherListPage';
import { AddTeacherPage } from './pages/manager/teachers/AddTeacherPage';
import { TeacherTrashPage } from './pages/manager/teachers/TeacherTrashPage';

// Groups Management (Manager)
import { ManageGroupsPage } from './pages/manager/groups/ManageGroupsPage';

// Manager Profile
import { ManagerProfilePage } from './pages/manager/profile/ManagerProfilePage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyGroupPage } from './pages/student/groups/MyGroupPage';
import { CreateGroupPage } from './pages/student/groups/CreateGroupPage';
import { BrowseGroupsPage } from './pages/student/groups/BrowseGroupsPage';
import { StudentProfilePage } from './pages/student/profile/StudentProfilePage';

// Fallback
import { NotFoundPage } from './pages/NotFoundPage';

const RootRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  const effectiveUser =
    user ||
    (() => {
      try {
        const stored = localStorage.getItem('pbl_user') || sessionStorage.getItem('pbl_user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();
  const effectiveToken =
    localStorage.getItem('pbl_token') || sessionStorage.getItem('pbl_token');
  const isAuthed = isAuthenticated || (!!effectiveToken && !!effectiveUser);

  if (!isAuthed) return <Navigate to="/login" replace />;
  if (effectiveUser?.role === 'student') return <Navigate to="/student/dashboard" replace />;
  return <Navigate to="/manager/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<SignInPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

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

            {/* Groups Management (Manager) */}
            <Route path="groups" element={<ManageGroupsPage />} />
            <Route path="groups/manage" element={<ManageGroupsPage />} />

            {/* Profile & Security */}
            <Route path="profile" element={<ManagerProfilePage />} />

            {/* Fallback for other subpages */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Protected Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="group/my" element={<MyGroupPage />} />
            <Route path="group/create" element={<CreateGroupPage />} />
            <Route path="group/browse" element={<BrowseGroupsPage />} />
            <Route path="profile" element={<StudentProfilePage />} />

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
