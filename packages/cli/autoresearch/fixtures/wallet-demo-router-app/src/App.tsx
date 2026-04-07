import { Navigate, Route, Routes } from 'react-router-dom';
import { useAccount } from 'wagmi';

import { DemoLauncher } from './components/DemoLauncher';
import { DemoShell } from './components/DemoShell';
import { LandingPage } from './components/LandingPage';

export function App() {
  const { isConnected } = useAccount();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={isConnected ? <DemoShell /> : <DemoLauncher />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
