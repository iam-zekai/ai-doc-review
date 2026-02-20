# AI Doc Review - AI 智能文档审校与改写

一款基于多模型 AI 的中文文档审校与改写工具。上传文档或粘贴文本，AI 自动识别错别字、病句、冗余表达等问题，以分句为单位给出改写建议，支持一键接受或忽略。

## 功能特性

### 多模型 AI 审校

通过 [OpenRouter](https://openrouter.ai/) 统一接入多家主流大模型：

| 模型 | 特点 |
|------|------|
| Claude Sonnet 4 | 默认推荐，速度与质量平衡 |
| Claude Opus 4 | 最高准确率 |
| GPT-4.1 / o4-mini | OpenAI 最新模型 |
| Gemini 2.5 Pro / Flash | Google 大上下文模型 |
| Qwen 3 235B | 通义千问，中文表现优秀 |
| DeepSeek R1 | 深度思考推理模型 |
| Kimi K2.5 | Moonshot 最新模型 |

### 5 种审校规则

- **错别字检查** - 识别拼写错误和错用字词
- **语气优化** - 将生硬表达转为更流畅专业的语言
- **逻辑审查** - 检查逻辑不通和表述不清
- **简洁优化** - 去除冗余啰嗦，让表达更有力
- **自定义规则** - 输入任意审校要求

支持多规则叠加使用。

### 智能高亮与建议管理

- 基于 ProseMirror Decoration 的内联高亮，按严重程度颜色区分（红/黄/蓝）
- 点击高亮文本弹出浮窗，展示修改建议
- 右侧建议列表，Diff 视图对比原文与改写（只标记实际修改部分）
- 单条接受/忽略，或批量全部接受/全部忽略
- 建议自动定位到最小修改范围，不会整段选中

### 大文档分块处理

- 智能按段落边界分块，支持配置分块大小（1000/2000/5000/10000 字）
- 多块并行请求 AI，大幅提升处理速度
- 自动合并分块结果，去重并修正偏移量

### 文档导入导出

- **导入**：支持 `.txt`、`.docx` 文件上传，或直接粘贴文本
- **导出**：审校完成后导出为 TXT 或 DOCX 格式

### 其他特性

- 所有设置（API Key、模型偏好、分块大小）本地存储，刷新不丢失
- AI 原始响应可展开查看，便于调试
- 自动修正 AI 返回的不准确偏移量
- 截断 JSON 自动修复，兼容不同模型的输出格式差异

## 快速开始

### 前置要求

- Node.js 18+
- [OpenRouter API Key](https://openrouter.ai/keys)（免费注册，按用量计费）

### 安装运行

```bash
# 克隆项目
git clone https://github.com/iam-zekai/ai-doc-review.git
cd ai-doc-review

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，在设置中填入 OpenRouter API Key 即可开始使用。

### 构建部署

```bash
npm run build
npm run start
```

也可以直接部署到 [Vercel](https://vercel.com/)。

## 使用方法

1. **上传文档** - 拖拽上传 `.txt` / `.docx` 文件，或直接粘贴文本
2. **选择规则** - 勾选需要的审校规则（可多选）
3. **选择模型** - 在设置中选择 AI 模型（默认 Claude Sonnet 4）
4. **开始审校** - 点击审校按钮，等待 AI 分析
5. **查看建议** - 文档中高亮标注问题，右侧展示改写建议
6. **处理建议** - 逐条接受或忽略，也可批量操作
7. **导出结果** - 将修改后的文档导出为 TXT 或 DOCX

## 技术栈

- **框架**：Next.js 14 (App Router)
- **编辑器**：Tiptap 3 (ProseMirror)
- **UI 组件**：Radix UI + Tailwind CSS
- **状态管理**：Zustand（localStorage 持久化）
- **AI 接入**：Vercel AI SDK + OpenRouter
- **文件处理**：Mammoth（DOCX 解析）、docx（DOCX 生成）

## 项目结构

```
src/
├── app/
│   ├── page.tsx                  # 主页面
│   └── api/review/route.ts      # AI 审校 API
├── components/
│   ├── editor/                   # 编辑器 + 建议展示
│   ├── upload/                   # 文件上传
│   ├── review/                   # 规则选择
│   └── layout/                   # 头部 + 设置弹窗
├── extensions/
│   └── review-decoration.ts      # ProseMirror 高亮插件
├── lib/
│   ├── review/                   # 分块、Prompt、解析、合并
│   ├── export/                   # TXT/DOCX 导出
│   ├── parsers/                  # 文件解析
│   └── ai/                       # OpenRouter 客户端
├── stores/                       # Zustand 状态管理
└── types/                        # TypeScript 类型定义
```

## License

MIT
