# Phase 3-5 实现计划

## Phase 3: Tiptap 编辑器 + 文档内高亮标注 + 点击查看建议

### 思路
用 Tiptap 富文本编辑器替换当前纯文本展示。审校完成后，在文档中用彩色高亮标记出有问题的文字，点击高亮区域弹出建议卡片（浮窗）。

### 改动

**1. 安装 Tiptap 依赖**
```
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-highlight @tiptap/pm
```
不使用 `@tiptap/extension-highlight` 内置的，而是自定义一个 `ReviewMark` 扩展（Mark），支持按 suggestion ID 标记，并通过 `data-*` 属性区分 error/warning/suggestion 类型。

**2. 新建 `src/components/editor/review-editor.tsx`**
- Tiptap 编辑器组件，接收 `rawText` 设置内容
- 审校完成后，根据 `suggestions` 数组中的 `offset + length` 在文档中添加 Mark（高亮标注）
- error = 红色底色、warning = 黄色底色、suggestion = 蓝色底色
- 点击高亮文字 → 设置 `activeSuggestionId` 状态

**3. 新建 `src/components/editor/suggestion-popover.tsx`**
- 浮窗组件，定位在被点击的高亮文字附近
- 显示：原文 → 建议、修改理由、类型 badge
- 包含「接受」「拒绝」按钮（Phase 4 功能，先预留）

**4. 新建 `src/extensions/review-mark.ts`**
- 自定义 Tiptap Mark 扩展
- attributes: `suggestionId`, `type` (error/warning/suggestion)
- 渲染为 `<span>` 标签带对应 CSS class

**5. 修改 `page.tsx`**
- 文档加载后显示 `ReviewEditor` 替代 `FileInfoCard`
- 审校结果区域改为左右布局：左边编辑器（带高亮），右边建议列表
- 点击左边高亮 → 右边对应建议卡片滚动到可见并高亮
- 点击右边建议卡片 → 左边对应高亮滚动到可见

---

## Phase 4: 接受/拒绝建议 + 批量操作

### 改动

**1. 修改 `suggestion-popover.tsx` 和建议列表卡片**
- 「接受」按钮：用 suggestion 文本替换编辑器中 original 文本，移除该高亮标记，更新 status 为 accepted
- 「拒绝」按钮：移除高亮标记，更新 status 为 rejected，卡片变灰
- 「忽略」按钮：同拒绝

**2. 在结果区域顶部加批量操作栏**
- 「全部接受」：一键应用所有 pending 建议
- 「全部拒绝」：一键忽略所有 pending 建议
- 显示进度：已处理 X / 共 Y 条

**3. 修改 review-store**
- 新增 `acceptSuggestion(id)` / `rejectSuggestion(id)` 方法（调用 updateSuggestionStatus）
- 新增 `acceptAll()` / `rejectAll()` 方法

**4. 修改 document-store**
- 新增 `updateText(newText)` 方法，接受建议后同步更新 rawText

---

## Phase 5: 导出 .txt / .docx

### 改动

**1. 安装 docx 导出依赖**
```
npm install docx file-saver
npm install -D @types/file-saver
```

**2. 新建 `src/lib/export/export-txt.ts`**
- 从编辑器获取纯文本内容，下载为 .txt

**3. 新建 `src/lib/export/export-docx.ts`**
- 使用 `docx` 库生成 .docx 文件
- 保留段落结构

**4. 在页面添加导出按钮**
- 审校完成后，顶部操作栏显示「导出 TXT」「导出 DOCX」按钮
- 导出的是应用了「已接受」建议后的最终文本
