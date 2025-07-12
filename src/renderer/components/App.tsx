import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { TaskProvider, ErrorProvider, ShortcutProvider } from '../contexts';
import { ErrorBoundary, ToastContainer } from './ui';
import Header from './Header';
import HomePage from '../pages/HomePage';
import TasksPage from '../pages/TasksPage';
import AnalyzePage from '../pages/AnalyzePage';
import ExportPage from '../pages/ExportPage';
import WorkSpacePage from '../pages/WorkSpacePage';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <TaskProvider>
          <Router>
            <ShortcutProvider>
              <div className="app">
                <Header />
                <main className="main-content">
                  <div className="container">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/tasks/:rootId" element={<TasksPage />} />
                      <Route path="/analyze" element={<AnalyzePage />} />
                      <Route path="/export" element={<ExportPage />} />
                      <Route path="/workspace" element={<WorkSpacePage />} />
                    </Routes>
                  </div>
                </main>
                <ToastContainer />
              </div>
            </ShortcutProvider>
          </Router>
        </TaskProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
};

export default App;