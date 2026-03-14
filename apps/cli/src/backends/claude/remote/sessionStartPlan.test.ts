import { describe, expect, it, vi } from 'vitest';

import { resolveClaudeRemoteSessionStartPlan } from './sessionStartPlan';

describe('resolveClaudeRemoteSessionStartPlan', () => {
  it('keeps explicit session id and does not infer continue', () => {
    const result = resolveClaudeRemoteSessionStartPlan(
      {
        sessionId: 'session-1',
        transcriptPath: null,
        path: '/tmp/workspace',
        claudeConfigDir: null,
        claudeArgs: ['--continue'],
      },
      {
        checkSessionDetailed: () => 'valid',
        findLastSession: () => null,
        logDebug: vi.fn(),
        logPrefix: 'claudeRemote',
      },
    );

    expect(result).toEqual({ startFrom: 'session-1', shouldContinue: false });
  });

  it('uses --continue when there is no explicit session id', () => {
    const result = resolveClaudeRemoteSessionStartPlan(
      {
        sessionId: null,
        transcriptPath: null,
        path: '/tmp/workspace',
        claudeConfigDir: null,
        claudeArgs: ['--continue'],
      },
      {
        checkSessionDetailed: () => 'valid',
        findLastSession: () => null,
        logDebug: vi.fn(),
        logPrefix: 'claudeRemote',
      },
    );

    expect(result).toEqual({ startFrom: null, shouldContinue: true });
  });

  it('prefers explicit --resume id over --continue', () => {
    const result = resolveClaudeRemoteSessionStartPlan(
      {
        sessionId: null,
        transcriptPath: null,
        path: '/tmp/workspace',
        claudeConfigDir: null,
        claudeArgs: ['--continue', '--resume', 'resume-123'],
      },
      {
        checkSessionDetailed: () => 'valid',
        findLastSession: () => null,
        logDebug: vi.fn(),
        logPrefix: 'claudeRemoteAgentSdk',
      },
    );

    expect(result).toEqual({ startFrom: 'resume-123', shouldContinue: false });
  });

  it('resolves --resume without id to last known session', () => {
    const result = resolveClaudeRemoteSessionStartPlan(
      {
        sessionId: null,
        transcriptPath: null,
        path: '/tmp/workspace',
        claudeConfigDir: '/tmp/claude',
        claudeArgs: ['--resume'],
      },
      {
        checkSessionDetailed: () => 'valid',
        findLastSession: () => 'last-session-id',
        logDebug: vi.fn(),
        logPrefix: 'claudeRemoteAgentSdk',
      },
    );

    expect(result).toEqual({ startFrom: 'last-session-id', shouldContinue: false });
  });

  it('starts fresh session when transcript file is missing', () => {
    const logDebug = vi.fn();
    const result = resolveClaudeRemoteSessionStartPlan(
      {
        sessionId: 'session-no-file',
        transcriptPath: null,
        path: '/tmp/workspace',
        claudeConfigDir: null,
      },
      {
        checkSessionDetailed: () => 'file_missing',
        findLastSession: () => null,
        logDebug,
        logPrefix: 'claudeRemote',
      },
    );

    expect(result).toEqual({ startFrom: null, shouldContinue: false });
    expect(logDebug).toHaveBeenCalledWith(
      expect.stringContaining('starting fresh session'),
    );
  });

  it('attempts resume when transcript file exists but content is not yet valid', () => {
    const logDebug = vi.fn();
    const result = resolveClaudeRemoteSessionStartPlan(
      {
        sessionId: 'session-empty-file',
        transcriptPath: null,
        path: '/tmp/workspace',
        claudeConfigDir: null,
      },
      {
        checkSessionDetailed: () => 'invalid_content',
        findLastSession: () => null,
        logDebug,
        logPrefix: 'claudeRemote',
      },
    );

    expect(result).toEqual({ startFrom: 'session-empty-file', shouldContinue: false });
    expect(logDebug).toHaveBeenCalledWith(
      expect.stringContaining('attempting resume anyway'),
    );
  });
});
