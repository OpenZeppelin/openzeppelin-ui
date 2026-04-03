import { useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useDemoSession, type DemoType } from './hooks/useDemoSession';
import NewLandingPage from './components/NewLandingPage';
import LearnHub from './components/learn/LearnHub';
import MultisigLearn from './components/learn/MultisigLearn';
import SessionsLearn from './components/learn/SessionsLearn';
import LandingPage from './components/LandingPage';
import DemoLauncher from './components/DemoLauncher';
import DemoShell from './components/DemoShell';
import FheBasicsDemo from './components/demos/FheBasicsDemo';
import SessionKeysDemo from './components/demos/SessionKeysDemo';
import MultisigDemo from './components/demos/MultisigDemo';
import WeightedMultisigDemo from './components/demos/WeightedMultisigDemo';

function ActiveDemo() {
  const { activeDemoId, activeDemoType } = useDemoSession();

  if (!activeDemoId || !activeDemoType) return null;

  switch (activeDemoType) {
    case 'fhe-basics':
      return <FheBasicsDemo key={activeDemoId} instanceId={activeDemoId} />;
    case 'session-keys':
      return <SessionKeysDemo key={activeDemoId} instanceId={activeDemoId} />;
    case 'multisig':
      return <MultisigDemo key={activeDemoId} instanceId={activeDemoId} />;
    case 'weighted-multisig':
      return <WeightedMultisigDemo key={activeDemoId} instanceId={activeDemoId} />;
  }
}

/** The /demo route always shows the launcher — users pick or resume from here. */
function DemoFlow() {
  return <DemoLauncher />;
}

/** Auto-starts a specific demo type when navigated to directly via URL. */
/** Auto-starts a specific demo type when navigated to directly via URL. */
function DemoEntry({ type }: { type: DemoType }) {
  const { isConnected, address } = useAccount();
  const { activeDemoId, activeDemoType, startDemo, exitDemo } = useDemoSession();
  const location = useLocation();
  const started = useRef(false);

  useEffect(() => {
    // Reset when unmounted/type changes
    started.current = false;
  }, [type]);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (started.current) return;
    // If a different demo is active, exit it
    if (activeDemoId && activeDemoType !== type) {
      exitDemo();
      return;
    }
    if (!activeDemoId) {
      started.current = true;
      startDemo(type, address);
    }
  }, [isConnected, address, activeDemoId, activeDemoType, type, startDemo, exitDemo]);

  if (!isConnected) return <LandingPage />;
  if (!activeDemoId) return null;

  return (
    <DemoShell>
      <ActiveDemo />
    </DemoShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<NewLandingPage />} />
      <Route path="/learn" element={<LearnHub />} />
      <Route path="/learn/multisig" element={<MultisigLearn />} />
      <Route path="/learn/sessions" element={<SessionsLearn />} />
      <Route path="/demo" element={<DemoFlow />} />
      <Route path="/demo/fhebasics" element={<DemoEntry type="fhe-basics" />} />
      <Route path="/demo/sessionkeys" element={<DemoEntry type="session-keys" />} />
      <Route path="/demo/multisig" element={<DemoEntry type="multisig" />} />
      <Route path="/demo/weightedmultisig" element={<DemoEntry type="weighted-multisig" />} />
    </Routes>
  );
}
