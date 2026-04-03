import type { TaskStatus } from './schema';

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'skipped'],
  in_progress: ['completed', 'failed', 'skipped'],
  completed: [],
  failed: ['in_progress', 'skipped'],
  skipped: ['in_progress'],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function getValidNextStatuses(current: TaskStatus): TaskStatus[] {
  return [...VALID_TRANSITIONS[current]];
}

export function assertValidTransition(from: TaskStatus, to: TaskStatus, taskId: string): void {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid task status transition for "${taskId}": ${from} → ${to}. ` +
        `Valid transitions from "${from}": ${VALID_TRANSITIONS[from].join(', ') || 'none'}.`
    );
  }
}
