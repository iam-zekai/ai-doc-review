/** 规则类别 */
export type RuleCategory = "basic" | "style" | "professional" | "compliance";

/** 规则模板 */
export interface ReviewRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  promptText: string;
}

/** 场景包 */
export interface ScenePack {
  id: string;
  name: string;
  description: string;
  icon: string;
  ruleIds: string[];
}

/** 内置规则库 */
export const RULE_TEMPLATES: ReviewRuleTemplate[] = [
  // ── 基础类 ──
  {
    id: "typo",
    name: "错别字检查",
    description: "找出拼写错误和错别字",
    category: "basic",
    promptText: "找出所有拼写错误和错别字，给出正确写法",
  },
  {
    id: "punctuation",
    name: "标点规范",
    description: "检查中英文标点使用规范",
    category: "basic",
    promptText:
      "检查中英文标点符号使用是否规范，如中文环境使用全角标点、英文环境使用半角标点",
  },
  {
    id: "grammar",
    name: "语法检查",
    description: "检查病句、语序不当等语法问题",
    category: "basic",
    promptText: "检查病句、主谓不一致、语序不当等语法问题",
  },
  {
    id: "logic",
    name: "逻辑审查",
    description: "检查逻辑不通、表达不清的地方",
    category: "basic",
    promptText: "检查文档中逻辑不通、表达不清的地方，给出改进建议",
  },

  // ── 风格类 ──
  {
    id: "tone",
    name: "语气优化",
    description: "优化为更友好、专业的语气",
    category: "style",
    promptText: "将生硬的表达优化为更友好、专业的语气",
  },
  {
    id: "conciseness",
    name: "简洁优化",
    description: "删除冗余表达，让文档更简洁",
    category: "style",
    promptText: "删除冗余表达，让文档更简洁有力",
  },
  {
    id: "formality",
    name: "正式度调整",
    description: "调整口语化表达为书面语",
    category: "style",
    promptText: "将口语化、网络用语等非正式表达改为规范的书面语",
  },
  {
    id: "consistency",
    name: "术语一致性",
    description: "统一文档中术语、称谓的表达",
    category: "style",
    promptText:
      "检查并统一文档中术语、称谓、数字格式等的表达方式",
  },

  // ── 专业类 ──
  {
    id: "academic_citation",
    name: "引用规范",
    description: "检查学术引用格式",
    category: "professional",
    promptText: "检查引用、参考文献格式是否符合学术规范",
  },
  {
    id: "technical_accuracy",
    name: "技术准确性",
    description: "检查技术术语和概念表述",
    category: "professional",
    promptText:
      "检查技术术语、概念、API 名称等表述是否准确",
  },
  {
    id: "data_consistency",
    name: "数据一致性",
    description: "检查数据、日期前后是否一致",
    category: "professional",
    promptText:
      "检查文档中的数据、日期、数字前后是否一致，有无矛盾",
  },
  {
    id: "marketing_appeal",
    name: "营销感染力",
    description: "增强文案的吸引力和说服力",
    category: "professional",
    promptText:
      "优化文案的吸引力、感染力和说服力，但不夸大事实",
  },

  // ── 合规类 ──
  {
    id: "sensitive_words",
    name: "敏感词检查",
    description: "检查政治、宗教等敏感表达",
    category: "compliance",
    promptText:
      "检查文档中是否包含政治敏感、宗教、歧视等不当表达",
  },
  {
    id: "official_standard",
    name: "公文规范",
    description: "符合公文、政务文件规范",
    category: "compliance",
    promptText:
      "检查是否符合公文写作规范，如称谓、格式、用语等",
  },
  {
    id: "legal_risk",
    name: "法律风险",
    description: "识别可能的法律风险表述",
    category: "compliance",
    promptText:
      "识别可能引发法律纠纷的表述，如虚假承诺、侵权内容等",
  },
];

/** 内置场景包 */
export const SCENE_PACKS: ScenePack[] = [
  {
    id: "daily",
    name: "日常通用",
    description: "适合日常邮件、报告、总结等通用文档",
    icon: "📝",
    ruleIds: ["typo", "punctuation", "grammar", "logic", "conciseness"],
  },
  {
    id: "official",
    name: "公文政务",
    description: "适合政府公文、政务报告、正式通知",
    icon: "🏛️",
    ruleIds: [
      "typo",
      "grammar",
      "official_standard",
      "sensitive_words",
      "formality",
    ],
  },
  {
    id: "academic",
    name: "学术论文",
    description: "适合学术论文、研究报告、文献综述",
    icon: "🎓",
    ruleIds: [
      "typo",
      "grammar",
      "logic",
      "academic_citation",
      "consistency",
    ],
  },
  {
    id: "technical",
    name: "技术文档",
    description: "适合技术文档、API 文档、开发手册",
    icon: "💻",
    ruleIds: [
      "typo",
      "technical_accuracy",
      "data_consistency",
      "conciseness",
      "consistency",
    ],
  },
  {
    id: "marketing",
    name: "营销文案",
    description: "适合广告文案、产品介绍、宣传材料",
    icon: "📢",
    ruleIds: [
      "typo",
      "grammar",
      "marketing_appeal",
      "tone",
      "legal_risk",
    ],
  },
];

/** 类别显示名称 */
export const CATEGORY_LABELS: Record<RuleCategory, string> = {
  basic: "基础规则",
  style: "风格优化",
  professional: "专业场景",
  compliance: "合规检查",
};

/** 根据 ID 获取规则模板 */
export function getRuleTemplate(
  id: string
): ReviewRuleTemplate | undefined {
  return RULE_TEMPLATES.find((r) => r.id === id);
}

/** 根据 ID 获取场景包 */
export function getScenePack(id: string): ScenePack | undefined {
  return SCENE_PACKS.find((p) => p.id === id);
}

/** 获取某个类别下的所有规则 */
export function getRulesByCategory(
  category: RuleCategory
): ReviewRuleTemplate[] {
  return RULE_TEMPLATES.filter((r) => r.category === category);
}
