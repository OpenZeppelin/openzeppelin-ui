import React, { createContext, useContext, useState, useCallback } from 'react';

export type DemoType = 'fhe-basics' | 'session-keys' | 'multisig' | 'weighted-multisig';

export type DemoStatus = 'in-progress' | 'completed';

export interface DemoSession {
  id: string;
  type: DemoType;
  accountAddress?: string;
  /** The EOA that created this session (connected wallet address) */
  ownerEOA: string;
  createdAt: number;
  completedAt?: number;
  label: string;
  status: DemoStatus;
  /** Human-readable hint of the current step, e.g. "Step 3: Decrypt Balance" */
  stepHint?: string;
  /** Completed milestone keys (persisted across resume) */
  milestones?: string[];
}

const SESSIONS_KEY = 'zama-demo-sessions';

function loadSessions(): DemoSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSessions(sessions: DemoSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function loadInstanceState<T>(id: string): T | null {
  try {
    const raw = sessionStorage.getItem(`zama-demo-${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveInstanceState<T>(id: string, state: T) {
  sessionStorage.setItem(`zama-demo-${id}`, JSON.stringify(state));
}

export function clearInstanceState(id: string) {
  sessionStorage.removeItem(`zama-demo-${id}`);
}

interface DemoSessionContextValue {
  sessions: DemoSession[];
  activeDemoId: string | null;
  activeDemoType: DemoType | null;
  startDemo: (type: DemoType, ownerEOA: string, label?: string) => string;
  resumeDemo: (id: string) => void;
  exitDemo: () => void;
  deleteSession: (id: string) => void;
  updateSession: (id: string, updates: Partial<Pick<DemoSession, 'accountAddress' | 'label' | 'status' | 'stepHint' | 'completedAt' | 'milestones'>>) => void;
}

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null);

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<DemoSession[]>(loadSessions);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeDemoId);
  const activeDemoType = activeSession?.type ?? null;

  const startDemo = useCallback((type: DemoType, ownerEOA: string, label?: string): string => {
    const id = crypto.randomUUID();
    const defaultLabels: Record<DemoType, string> = {
      'fhe-basics': 'FHE Basics',
      'session-keys': 'Session Keys',
      'multisig': 'Multisig',
      'weighted-multisig': 'Weighted Multisig',
    };
    const session: DemoSession = {
      id,
      type,
      ownerEOA: ownerEOA.toLowerCase(),
      createdAt: Date.now(),
      label: label ?? `${defaultLabels[type]} #${sessions.filter((s) => s.type === type).length + 1}`,
      status: 'in-progress',
      stepHint: 'Step 1: Create Account',
    };
    const updated = [...sessions, session];
    setSessions(updated);
    saveSessions(updated);
    setActiveDemoId(id);
    return id;
  }, [sessions]);

  const resumeDemo = useCallback((id: string) => {
    setActiveDemoId(id);
  }, []);

  const exitDemo = useCallback(() => {
    setActiveDemoId(null);
  }, []);

  const deleteSession = useCallback((id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    clearInstanceState(id);
    // Clean up persisted demo data
    localStorage.removeItem(`zama-demo-${id}-agent-key`);
    // Clear legacy sessionStorage keys
    sessionStorage.removeItem('zama-ui-agent-key');
    if (activeDemoId === id) setActiveDemoId(null);
  }, [sessions, activeDemoId]);

  const updateSession = useCallback((id: string, updates: Partial<Pick<DemoSession, 'accountAddress' | 'label' | 'status' | 'stepHint' | 'completedAt' | 'milestones'>>) => {
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveSessions(updated);
      return updated;
    });
  }, []);

  return (
    <DemoSessionContext.Provider
      value={{
        sessions,
        activeDemoId,
        activeDemoType,
        startDemo,
        resumeDemo,
        exitDemo,
        deleteSession,
        updateSession,
      }}
    >
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  const ctx = useContext(DemoSessionContext);
  if (!ctx) throw new Error('useDemoSession must be used within DemoSessionProvider');
  return ctx;
}
