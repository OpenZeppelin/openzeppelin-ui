import React, { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { SettingsPage } from './pages/SettingsPage';
import { TaskList } from './components/TaskList';

export function App() {
  const [page, setPage] = useState('login');

  return (
    <div>
      <nav>
        <button onClick={() => setPage('login')}>Login</button>
        <button onClick={() => setPage('settings')}>Settings</button>
        <button onClick={() => setPage('tasks')}>Tasks</button>
      </nav>
      {page === 'login' && <LoginForm />}
      {page === 'settings' && <SettingsPage />}
      {page === 'tasks' && <TaskList />}
    </div>
  );
}
