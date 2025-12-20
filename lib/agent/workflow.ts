import crypto from 'crypto';
import {
  WorkflowRun,
  WorkflowStep,
  WorkflowStepStatus,
  WorkflowStepType,
} from './types';

interface CreateStepInput {
  title: string;
  description?: string;
  parentId?: string;
  type?: WorkflowStepType;
  status?: WorkflowStepStatus;
  metadata?: Record<string, any>;
}

class WorkflowManager {
  private workflows: Map<string, WorkflowRun> = new Map();

  startWorkflow(sessionId: string, summary: string): WorkflowStep {
    const run: WorkflowRun = {
      id: crypto.randomUUID(),
      sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [],
    };

    const rootStep: WorkflowStep = {
      id: crypto.randomUUID(),
      sessionId,
      title: '处理当前请求',
      description: summary,
      status: 'in_progress',
      type: 'task',
      startedAt: Date.now(),
    };

    run.steps.push(rootStep);
    this.workflows.set(sessionId, run);
    return rootStep;
  }

  getWorkflow(sessionId: string): WorkflowRun | undefined {
    return this.workflows.get(sessionId);
  }

  private getRun(sessionId: string): WorkflowRun | undefined {
    return this.workflows.get(sessionId);
  }

  private updateRunTimestamp(sessionId: string) {
    const run = this.getRun(sessionId);
    if (run) {
      run.updatedAt = Date.now();
    }
  }

  startStep(sessionId: string, input: CreateStepInput): WorkflowStep | null {
    const run = this.getRun(sessionId);
    if (!run) return null;

    const step: WorkflowStep = {
      id: crypto.randomUUID(),
      sessionId,
      title: input.title,
      description: input.description,
      status: input.status || 'in_progress',
      type: input.type || 'tool',
      parentId: input.parentId,
      metadata: input.metadata,
      startedAt: Date.now(),
    };

    run.steps.push(step);
    this.updateRunTimestamp(sessionId);
    return step;
  }

  completeStep(sessionId: string, stepId: string, metadata?: Record<string, any>) {
    const step = this.findStep(sessionId, stepId);
    if (!step) return;

    step.status = 'completed';
    step.completedAt = Date.now();
    step.metadata = { ...step.metadata, ...metadata };
    this.updateRunTimestamp(sessionId);
  }

  failStep(sessionId: string, stepId: string, errorMessage?: string) {
    const step = this.findStep(sessionId, stepId);
    if (!step) return;

    step.status = 'error';
    step.completedAt = Date.now();
    if (errorMessage) {
      step.metadata = { ...step.metadata, error: errorMessage };
    }
    this.updateRunTimestamp(sessionId);
  }

  updateStepStatus(
    sessionId: string,
    stepId: string,
    status: WorkflowStepStatus,
    metadata?: Record<string, any>
  ) {
    const step = this.findStep(sessionId, stepId);
    if (!step) return;

    step.status = status;
    step.completedAt = status === 'completed' || status === 'error'
      ? Date.now()
      : step.completedAt;
    step.metadata = { ...step.metadata, ...metadata };
    this.updateRunTimestamp(sessionId);
  }

  completeByCheckpoint(sessionId: string, checkpointId: string) {
    const step = this.findStepByCheckpoint(sessionId, checkpointId);
    if (!step) return;
    step.status = 'completed';
    step.completedAt = Date.now();
    this.updateRunTimestamp(sessionId);
  }

  rejectByCheckpoint(sessionId: string, checkpointId: string, reason?: string) {
    const step = this.findStepByCheckpoint(sessionId, checkpointId);
    if (!step) return;
    step.status = 'error';
    step.completedAt = Date.now();
    step.metadata = { ...step.metadata, rejectedReason: reason };
    this.updateRunTimestamp(sessionId);
  }

  findStep(sessionId: string, stepId: string): WorkflowStep | undefined {
    const run = this.getRun(sessionId);
    return run?.steps.find(step => step.id === stepId);
  }

  private findStepByCheckpoint(sessionId: string, checkpointId: string) {
    const run = this.getRun(sessionId);
    return run?.steps.find(step => step.metadata?.checkpointId === checkpointId);
  }

  clear(sessionId: string) {
    this.workflows.delete(sessionId);
  }
}

export const workflowManager = new WorkflowManager();
