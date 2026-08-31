import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const AppShell = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f3f3' }}>
      <Navbar
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <Sidebar isCollapsed={isSidebarCollapsed} />

      <main
        style={{
          marginLeft: isSidebarCollapsed ? '64px' : '235px',
          marginTop: '60px',
          padding: '24px 30px',
          minHeight: 'calc(100vh - 60px)',
          transition: 'margin-left 0.2s ease',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
};
