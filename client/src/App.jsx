import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

// Shell Components
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { TaskDetailsDrawer } from './components/TaskDetailsDrawer';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateBoardModal } from './components/CreateBoardModal';
import { ConflictModal } from './components/ConflictModal';
import { EdgeCaseModal } from './components/EdgeCaseModal';
import { ToastContainer } from './components/ToastContainer';

// Application Pages
import { OverviewPage } from './pages/OverviewPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { ProjectsKanbanPage } from './pages/ProjectsKanbanPage';
import { ActivityPage } from './pages/ActivityPage';
import { TeamPage } from './pages/TeamPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { BranchesPage } from './pages/BranchesPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function AppLayout({ children }) {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopNavbar />
        <div style={{ flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
      <TaskDetailsDrawer />
      <CreateTaskModal />
      <CreateBoardModal />
      <ConflictModal />
      <EdgeCaseModal />
      <ToastContainer />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated Workspace Pages */}
          <Route path="/" element={<AppLayout><OverviewPage /></AppLayout>} />
          <Route path="/overview" element={<AppLayout><OverviewPage /></AppLayout>} />
          <Route path="/my-tasks" element={<AppLayout><MyTasksPage /></AppLayout>} />
          <Route path="/projects" element={<AppLayout><ProjectsKanbanPage /></AppLayout>} />
          <Route path="/activity" element={<AppLayout><ActivityPage /></AppLayout>} />
          <Route path="/team" element={<AppLayout><TeamPage /></AppLayout>} />
          <Route path="/organizations" element={<AppLayout><OrganizationsPage /></AppLayout>} />
          <Route path="/branches" element={<AppLayout><BranchesPage /></AppLayout>} />
          <Route path="/users-management" element={<AppLayout><UserManagementPage /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
          <Route path="/help" element={<AppLayout><HelpPage /></AppLayout>} />
          <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
