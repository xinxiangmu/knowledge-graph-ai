/**
 * 字符串相似度工具函数
 * 用于实体名称的模糊匹配
 */

/**
 * 计算 Levenshtein 距离（编辑距离）
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 编辑距离值
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // 创建二维数组
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  // 初始化边界条件
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  // 动态规划计算
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 删除
          dp[i][j - 1] + 1,     // 插入
          dp[i - 1][j - 1] + 1  // 替换
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * 计算字符串相似度（0-1之间，1表示完全相同）
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 相似度值
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}

/**
 * 模糊匹配实体名称
 * @param sourceName 源名称
 * @param targetNames 目标名称列表
 * @param threshold 相似度阈值（默认0.8）
 * @returns 匹配结果，包含最佳匹配和相似度
 */
export function fuzzyMatchEntityName(
  sourceName: string,
  targetNames: string[],
  threshold: number = 0.8
): { matched: boolean; bestMatch: string | null; similarity: number } {
  // 先尝试精确匹配
  const exactMatch = targetNames.find(
    name => normalizeName(name) === normalizeName(sourceName)
  );
  if (exactMatch) {
    return { matched: true, bestMatch: exactMatch, similarity: 1 };
  }

  // 模糊匹配
  let bestMatch: string | null = null;
  let bestSimilarity = 0;

  const normalizedSource = normalizeName(sourceName);

  for (const targetName of targetNames) {
    const normalizedTarget = normalizeName(targetName);
    const similarity = stringSimilarity(normalizedSource, normalizedTarget);

    if (similarity > bestSimilarity && similarity >= threshold) {
      bestSimilarity = similarity;
      bestMatch = targetName;
    }
  }

  return {
    matched: bestMatch !== null,
    bestMatch,
    similarity: bestSimilarity,
  };
}

/**
 * 标准化实体名称（去除空格、转小写等）
 * @param name 原始名称
 * @returns 标准化后的名称
 */
export function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, '')  // 去除所有空格
    .toLowerCase()         // 转小写
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ''); // 只保留中文、英文和数字
}

/**
 * 批量模糊匹配
 * @param sourceNames 源名称列表
 * @param targetNames 目标名称列表
 * @param threshold 相似度阈值
 * @returns 匹配结果映射
 */
export function batchFuzzyMatch(
  sourceNames: string[],
  targetNames: string[],
  threshold: number = 0.8
): Map<string, { matched: boolean; bestMatch: string | null; similarity: number }> {
  const result = new Map<string, { matched: boolean; bestMatch: string | null; similarity: number }>();

  for (const sourceName of sourceNames) {
    result.set(sourceName, fuzzyMatchEntityName(sourceName, targetNames, threshold));
  }

  return result;
}

/**
 * 检查两个实体是否可能是同一个实体（跨文档实体识别）
 * @param name1 实体名称1
 * @param name2 实体名称2
 * @param type1 实体类型1（可选）
 * @param type2 实体类型2（可选）
 * @param threshold 相似度阈值
 * @returns 是否可能是同一实体
 */
export function isSameEntity(
  name1: string,
  name2: string,
  type1?: string,
  type2?: string,
  threshold: number = 0.85
): boolean {
  // 如果类型不同且都有值，则不认为是同一实体
  if (type1 && type2 && type1 !== type2) {
    return false;
  }

  const similarity = stringSimilarity(normalizeName(name1), normalizeName(name2));
  return similarity >= threshold;
}
