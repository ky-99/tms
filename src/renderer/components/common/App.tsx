import React from 'react';
import { Router, Route, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { Toaster } from 'react-hot-toast';
import { TaskProvider, ShortcutProvider } from '../../contexts';
import { ErrorBoundary } from '../ui';
import Header from './Header';
import HomePage from '../../pages/HomePage';
import TasksPage from '../../pages/TasksPage';
import ViewsPage from '../../pages/ViewsPage';
import AnalyzePage from '../../pages/AnalyzePage';
import ExportPage from '../../pages/ExportPage';
import WorkSpacePage from '../../pages/WorkSpacePage';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
        <TaskProvider>
            <Router hook={useHashLocation}>
              <ShortcutProvider>
                <div className="app">
                  <Header />
                  <main className="main-content">
                    <Switch>
                      <Route path="/" component={HomePage} />
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
            <Toaster
              position="top-right"
              containerStyle={{
                zIndex: 10001,
              }}
              toastOptions={{
                style: {
                  background: '#fff',
                  color: '#363636',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  padding: '12px 16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  zIndex: 10001,
                },
                success: {
                  duration: 1500, // 成功系は短く
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: Infinity, // エラー系は手動で閉じるまで表示
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
              reverseOrder={false}
            />
        </TaskProvider>
    </ErrorBoundary>
  );
};

export default App;