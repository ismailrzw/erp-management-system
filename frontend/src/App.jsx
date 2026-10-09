import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

// Auth Pages
import { SignInPage } from './pages/auth/SignInPage';
import { SetPasswordPage } from './pages/auth/SetPasswordPage';

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

// Evaluators Management (Manager)
import { EvaluatorListPage } from './pages/manager/evaluators/EvaluatorListPage';
import { AddEvaluatorPage } from './pages/manager/evaluators/AddEvaluatorPage';
import { EvaluatorTrashPage } from './pages/manager/evaluators/EvaluatorTrashPage';

// Groups Management (Manager)
import { ManageGroupsPage } from './pages/manager/groups/ManageGroupsPage';
import { BroadcastMailPage } from './pages/manager/groups/BroadcastMailPage';
import { ProjectDetailWorkspace } from './pages/manager/groups/ProjectDetailWorkspace';

// Manager Profile
import { ManagerProfilePage } from './pages/manager/profile/ManagerProfilePage';

// Manager Iterations (Sprint 3)
import { IterationsManagePage } from './pages/manager/iterations/IterationsManagePage';
import { IterationSubmissionsPage } from './pages/manager/iterations/IterationSubmissionsPage';
import { RubricTemplatesPage } from './pages/manager/iterations/RubricTemplatesPage';

// Teacher Portal Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherGroupListPage } from './pages/teacher/groups/TeacherGroupListPage';
import { TeacherGroupDetailPage } from './pages/teacher/groups/TeacherGroupDetailPage';
import { TeacherStudentDirectoryPage } from './pages/teacher/students/TeacherStudentDirectoryPage';
import { TeacherProfilePage } from './pages/teacher/profile/TeacherProfilePage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyGroupPage } from './pages/student/groups/MyGroupPage';
import { CreateGroupPage } from './pages/student/groups/CreateGroupPage';
import { BrowseGroupsPage } from './pages/student/groups/BrowseGroupsPage';
import { StudentProfilePage } from './pages/student/profile/StudentProfilePage';

// Student Iterations (Sprint 3)
import { StudentIterationsPage } from './pages/student/iterations/StudentIterationsPage';
import { IterationDetailPage } from './pages/student/iterations/IterationDetailPage';

// Evaluator Pages (Sprint 4)
import { EvaluatorDashboard } from './pages/evaluator/EvaluatorDashboard';
import { AssignedGroupsPage } from './pages/evaluator/groups/AssignedGroupsPage';
import { GroupEvalDetail } from './pages/evaluator/groups/GroupEvalDetail';
import { MeetingsPage } from './pages/evaluator/meetings/MeetingsPage';

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
  if (effectiveUser?.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  if (effectiveUser?.role === 'evaluator') return <Navigate to="/evaluator/dashboard" replace />;
  return <Navigate to="/manager/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<SignInPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />

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
            <Route path="announcements" element={<AnnouncementsPage />} />

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

            {/* Teachers / Supervisors Management CRUD */}
            <Route path="teachers" element={<TeacherListPage />} />
            <Route path="teachers/view" element={<TeacherListPage />} />
            <Route path="teachers/add" element={<AddTeacherPage />} />
            <Route path="teachers/trash" element={<TeacherTrashPage />} />

            {/* Evaluators Management CRUD */}
            <Route path="evaluators" element={<EvaluatorListPage />} />
            <Route path="evaluators/view" element={<EvaluatorListPage />} />
            <Route path="evaluators/add" element={<AddEvaluatorPage />} />
            <Route path="evaluators/trash" element={<EvaluatorTrashPage />} />

            {/* Groups Management (Manager) */}
            <Route path="groups" element={<ManageGroupsPage />} />
            <Route path="groups/view" element={<ManageGroupsPage />} />
            <Route path="groups/manage" element={<ManageGroupsPage />} />
            <Route path="groups/:groupId" element={<ProjectDetailWorkspace />} />
            <Route path="groups/broadcast" element={<BroadcastMailPage />} />
            <Route path="groups/send-mail" element={<BroadcastMailPage />} />
            <Route path="groups/ungrouped" element={<Navigate to="/manager/groups?tab=ungrouped" replace />} />
            <Route path="ungrouped-students" element={<Navigate to="/manager/groups?tab=ungrouped" replace />} />

            {/* Iterations Management (Manager) */}
            <Route path="iterations" element={<IterationsManagePage />} />
            <Route path="iterations/submissions" element={<IterationSubmissionsPage />} />
            <Route path="iterations/:id/submissions" element={<IterationSubmissionsPage />} />
            <Route path="rubric-templates" element={<RubricTemplatesPage />} />

            {/* Profile & Settings */}
            <Route path="settings" element={<ManagerProfilePage />} />
            <Route path="profile" element={<ManagerProfilePage />} />

            {/* Fallback for other subpages */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Protected Teacher Routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="groups" element={<TeacherGroupListPage />} />
            <Route path="groups/:groupId" element={<TeacherGroupDetailPage />} />
            <Route path="students" element={<TeacherStudentDirectoryPage />} />
            <Route path="profile" element={<TeacherProfilePage />} />
            <Route path="settings" element={<TeacherProfilePage />} />

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
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="group/my" element={<MyGroupPage />} />
            <Route path="group/create" element={<CreateGroupPage />} />
            <Route path="group/browse" element={<BrowseGroupsPage />} />
            <Route path="settings" element={<StudentProfilePage />} />
            <Route path="profile" element={<StudentProfilePage />} />

            {/* Iterations (Student) */}
            <Route path="iterations" element={<StudentIterationsPage />} />
            <Route path="iterations/:id" element={<IterationDetailPage />} />

            {/* Fallback for other subpages */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Protected Evaluator Routes (Sprint 4) */}
          <Route
            path="/evaluator"
            element={
              <ProtectedRoute allowedRoles={['evaluator']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<EvaluatorDashboard />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="groups" element={<AssignedGroupsPage />} />
            <Route path="groups/:groupId" element={<GroupEvalDetail />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="settings" element={<ManagerProfilePage />} />
            <Route path="profile" element={<ManagerProfilePage />} />

            {/* Fallback for other subpages */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="/announcements" element={<ProtectedRoute allowedRoles={['pbl_manager', 'student', 'teacher', 'evaluator', 'hod', 'hodic', 'dean']}><AppShell /></ProtectedRoute>}>
            <Route index element={<AnnouncementsPage />} />
          </Route>

          {/* Global Fallback 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
