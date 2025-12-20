import crypto from 'crypto';
import { CodeCheckpoint, CheckpointStatus } from './types';

class CheckpointStore {
  private checkpoints: Map<string, CodeCheckpoint> = new Map();

  create(sessionId: string, data: Omit<CodeCheckpoint, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'sessionId'> & { status?: CheckpointStatus }): CodeCheckpoint {
    const checkpoint: CodeCheckpoint = {
      id: crypto.randomUUID(),
      sessionId,
      filePath: data.filePath,
      originalContent: data.originalContent,
      modifiedContent: data.modifiedContent,
      status: data.status || 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  }

  get(checkpointId: string): CodeCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  listBySession(sessionId: string): CodeCheckpoint[] {
    return Array.from(this.checkpoints.values()).filter(cp => cp.sessionId === sessionId);
  }

  updateStatus(checkpointId: string, status: CheckpointStatus): CodeCheckpoint | undefined {
    const cp = this.checkpoints.get(checkpointId);
    if (!cp) return undefined;
    cp.status = status;
    cp.updatedAt = Date.now();
    return cp;
  }

  clearSession(sessionId: string) {
    for (const [id, checkpoint] of this.checkpoints.entries()) {
      if (checkpoint.sessionId === sessionId) {
        this.checkpoints.delete(id);
      }
    }
  }
}

export const checkpointStore = new CheckpointStore();
