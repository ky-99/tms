import React from 'react';
import { Router, Route, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { Toaster } from 'react-hot-toast';
import { TaskProvider, ShortcutProvider } from '../../contexts';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { ErrorBoundary } from '../ui';
import Header from './Header';
import TasksPage from '../../pages/TasksPage';
import ViewsPage from '../../pages/ViewsPage';
import AnalyzePage from '../../pages/AnalyzePage';
import ExportPage from '../../pages/ExportPage';
import WorkSpacePage from '../../pages/WorkSpacePage';

const AppContent: React.FC = () => {
  const { theme } = useTheme();

  return (
    <>
      <TaskProvider>
        <Router hook={useHashLocation}>
          <ShortcutProvider>
            <div className="app">
              <Header />
              <main className="main-content">
                <Switch>
                  <Route path="/" component={TasksPage} />
                  <Route path="/tasks" component={TasksPage} />
                  <Route path="/tasks/:rootId" component={TasksPage} />
                  <Route path="/views" component={ViewsPage} />
                  <Route path="/analyze" component={AnalyzePage} />
                  <Route path="/export" component={ExportPage} />
                  <Route path="/workspace" component={WorkSpacePage} />
                </Switch>
              </main>
            </div>
          </ShortcutProvider>
        </Router>
      </TaskProvider>
      <Toaster
        position="top-right"
        containerStyle={{
          zIndex: 10001,
        }}
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1f2937' : '#fff',
            color: theme === 'dark' ? '#f9fafb' : '#363636',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: theme === 'dark' 
              ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
              : '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 10001,
          },
          success: {
            duration: 1500,
            iconTheme: {
              primary: '#10b981',
              secondary: theme === 'dark' ? '#1f2937' : '#fff',
            },
          },
          error: {
            duration: Infinity,
            iconTheme: {
              primary: '#ef4444',
              secondary: theme === 'dark' ? '#1f2937' : '#fff',
            },
          },
        }}
        reverseOrder={false}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;