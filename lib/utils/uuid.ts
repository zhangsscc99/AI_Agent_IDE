// UUID 生成工具函数
// 兼容所有浏览器环境

/**
 * 生成 UUID v4
 * 如果浏览器支持 crypto.randomUUID，则使用原生 API
 * 否则使用兼容方案
 */
export function generateUUID(): string {
  // 检查是否支持 crypto.randomUUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // 如果调用失败，使用 fallback
    }
  }
  
  // Fallback: 使用兼容方案生成 UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

