// Agent 记忆系统 (简化版 - 内存存储)
import { Memory } from './types';
import { randomUUID } from 'crypto';

// 使用内存存储替代 SQLite（避免 sql.js 兼容性问题）
class InMemoryDatabase {
  private memories: Map<string, Memory[]> = new Map();
  
  addMemory(memory: Memory): void {
    const sessionId = memory.sessionId;
    if (!this.memories.has(sessionId)) {
      this.memories.set(sessionId, []);
    }
    this.memories.get(sessionId)!.push(memory);
  }
  
  getMemories(sessionId: string, limit: number): Memory[] {
    const sessionMemories = this.memories.get(sessionId) || [];
    return sessionMemories.slice(-limit);
  }
  
  getMemoriesByType(sessionId: string, type: string, limit: number): Memory[] {
    const sessionMemories = this.memories.get(sessionId) || [];
    return sessionMemories
      .filter(m => m.type === type)
      .slice(-limit);
  }
  
  clearSession(sessionId: string): void {
    this.memories.delete(sessionId);
  }
}

const db = new InMemoryDatabase();

export class MemoryManager {
  // 添加记忆
  async addMemory(memory: Omit<Memory, 'id' | 'createdAt'>): Promise<Memory> {
    const id = randomUUID();
    const createdAt = new Date();
    
    const fullMemory: Memory = {
      id,
      ...memory,
      createdAt,
    };
    
    db.addMemory(fullMemory);
    
    return fullMemory;
  }
  
  // 获取会话的所有记忆
  async getMemories(sessionId: string, limit = 100): Promise<Memory[]> {
    return db.getMemories(sessionId, limit);
  }
  
  // 获取最近的对话记忆
  async getRecentConversations(sessionId: string, limit = 10): Promise<Memory[]> {
    return db.getMemoriesByType(sessionId, 'conversation', limit);
  }
  
  // 清除会话记忆
  async clearSession(sessionId: string): Promise<void> {
    db.clearSession(sessionId);
  }
  
  // 获取文件操作历史
  async getFileOperations(sessionId: string, filePath?: string): Promise<Memory[]> {
    const operations = db.getMemoriesByType(sessionId, 'file_operation', 1000);
    
    if (filePath) {
      return operations.filter(m => m.metadata?.path === filePath);
    }
    
    return operations;
  }
}

// 单例
export const memoryManager = new MemoryManager();
