import { claudeCheckSessionDetailed, type SessionCheckResult } from '@/backends/claude/utils/claudeCheckSession';
import { claudeFindLastSession } from '@/backends/claude/utils/claudeFindLastSession';

export type ClaudeRemoteSessionStartPlan = {
  startFrom: string | null;
  shouldContinue: boolean;
};

type ResolveClaudeRemoteSessionStartPlanDeps = {
  checkSessionDetailed: (sessionId: string, path: string, transcriptPath: string | null) => SessionCheckResult;
  findLastSession: (path: string, configDir: string | null) => string | null;
  logDebug: (message: string) => void;
  logPrefix: string;
};

export function resolveClaudeRemoteSessionStartPlan(
  opts: {
    sessionId: string | null;
    transcriptPath: string | null;
    path: string;
    claudeConfigDir: string | null;
    claudeArgs?: string[];
  },
  deps?: Partial<ResolveClaudeRemoteSessionStartPlanDeps>,
): ClaudeRemoteSessionStartPlan {
  const effectiveDeps: ResolveClaudeRemoteSessionStartPlanDeps = {
    checkSessionDetailed: deps?.checkSessionDetailed ?? claudeCheckSessionDetailed,
    findLastSession: deps?.findLastSession ?? claudeFindLastSession,
    logDebug: deps?.logDebug ?? (() => undefined),
    logPrefix: deps?.logPrefix ?? 'claudeRemote',
  };

  let startFrom = opts.sessionId;
  let shouldContinue = false;

  if (opts.sessionId) {
    const checkResult = effectiveDeps.checkSessionDetailed(opts.sessionId, opts.path, opts.transcriptPath);
    if (checkResult === 'file_missing') {
      // Transcript file was never created — the local Claude session never had a conversation.
      // Starting a fresh session instead of attempting resume, which would fail with
      // "No conversation found with session ID".
      effectiveDeps.logDebug(
        `[${effectiveDeps.logPrefix}] Session ${opts.sessionId} transcript file does not exist; starting fresh session`,
      );
      startFrom = null;
    } else if (checkResult === 'invalid_content') {
      // File exists but hasn't been fully written yet (fast local↔remote switching).
      // Attempt resume anyway — Claude Code may still be writing to it.
      effectiveDeps.logDebug(
        `[${effectiveDeps.logPrefix}] Session ${opts.sessionId} did not pass transcript validation yet; attempting resume anyway`,
      );
    }
  }

  if (!startFrom && opts.claudeArgs) {
    if (opts.claudeArgs.includes('--continue') || opts.claudeArgs.includes('-c')) {
      shouldContinue = true;
    }

    for (let i = 0; i < opts.claudeArgs.length; i++) {
      const arg = opts.claudeArgs[i];
      if (arg !== '--resume' && arg !== '-r') continue;

      const maybeValue = i + 1 < opts.claudeArgs.length ? opts.claudeArgs[i + 1] : undefined;
      if (maybeValue && !maybeValue.startsWith('-')) {
        startFrom = maybeValue;
        effectiveDeps.logDebug(`[${effectiveDeps.logPrefix}] Found ${arg} with session ID: ${startFrom}`);
      } else {
        const lastSession = effectiveDeps.findLastSession(opts.path, opts.claudeConfigDir);
        if (lastSession) {
          startFrom = lastSession;
          effectiveDeps.logDebug(
            `[${effectiveDeps.logPrefix}] Found ${arg} without id; using last session: ${startFrom}`,
          );
        } else {
          effectiveDeps.logDebug(
            `[${effectiveDeps.logPrefix}] Found ${arg} without id but no valid last session was found`,
          );
        }
      }

      shouldContinue = false;
      break;
    }
  }

  return { startFrom, shouldContinue };
}
