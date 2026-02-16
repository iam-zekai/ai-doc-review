import { SCENE_PACKS, type ScenePack } from "@/lib/review/rule-store";

interface DetectionRule {
  scenePackId: string;
  keywords: string[];
  threshold: number;
}

const DETECTION_RULES: DetectionRule[] = [
  {
    scenePackId: "official",
    keywords: [
      "尊敬的",
      "通知",
      "关于",
      "批复",
      "决定",
      "印发",
      "各部门",
      "各单位",
      "文件",
    ],
    threshold: 2,
  },
  {
    scenePackId: "academic",
    keywords: [
      "摘要",
      "参考文献",
      "引用",
      "Abstract",
      "论文",
      "研究",
      "文献",
      "假设",
      "结论",
      "实验",
    ],
    threshold: 2,
  },
  {
    scenePackId: "technical",
    keywords: [
      "```",
      "API",
      "函数",
      "接口",
      "import ",
      "class ",
      "const ",
      "function ",
      "代码",
    ],
    threshold: 2,
  },
  {
    scenePackId: "marketing",
    keywords: [
      "立即",
      "限时",
      "优惠",
      "购买",
      "活动",
      "抢购",
      "折扣",
      "免费",
      "特价",
    ],
    threshold: 2,
  },
];

export interface DetectionResult {
  scenePackId: string;
  scenePack: ScenePack;
}

/**
 * 分析文档文本，基于关键词匹配推荐场景包。
 * 只扫描前 2000 字以提高性能。
 * 返回 null 表示未检测到特定类型（回退 daily）。
 */
export function detectScenePack(text: string): DetectionResult | null {
  const sample = text.slice(0, 2000);

  let bestMatch: { scenePackId: string; count: number } | null = null;

  for (const rule of DETECTION_RULES) {
    const count = rule.keywords.filter((kw) => sample.includes(kw)).length;

    if (count >= rule.threshold) {
      if (!bestMatch || count > bestMatch.count) {
        bestMatch = { scenePackId: rule.scenePackId, count };
      }
    }
  }

  if (!bestMatch) return null;

  const scenePack = SCENE_PACKS.find((p) => p.id === bestMatch!.scenePackId);
  if (!scenePack) return null;

  return { scenePackId: bestMatch.scenePackId, scenePack };
}
