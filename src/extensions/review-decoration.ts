import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Suggestion } from "@/types/review";

export const reviewDecorationKey = new PluginKey("reviewDecoration");

/**
 * 构建纯文本偏移 → ProseMirror docPos 的映射数组。
 *
 * map[textOffset] = docPos
 * 长度为 getText().length + 1（包含末尾位置）。
 */
function buildTextPosMap(doc: PMNode): number[] {
  const map: number[] = [];
  let isFirstBlock = true;

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.isBlock && node !== doc) {
      if (!isFirstBlock) {
        // 段落之间的 \n：docPos 指向新段落内容开始
        map.push(pos + 1);
      }
      isFirstBlock = false;
      return true;
    }
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        map.push(pos + i);
      }
      return false;
    }
    // hardBreak 等其他内联节点：不贡献到 getText()
    return false;
  });

  // 末尾位置
  map.push(doc.content.size);
  return map;
}

/**
 * 根据 suggestions 数组构建 Decoration 列表
 */
function buildDecorations(
  doc: PMNode,
  suggestions: Suggestion[]
): Decoration[] {
  const posMap = buildTextPosMap(doc);
  const decorations: Decoration[] = [];

  for (const s of suggestions) {
    if (s.status !== "pending") continue;
    if (s.offset < 0 || s.offset >= posMap.length) continue;
    if (s.offset + s.length < 0 || s.offset + s.length >= posMap.length)
      continue;

    const from = posMap[s.offset];
    const to = posMap[s.offset + s.length];
    if (from === undefined || to === undefined || from >= to) continue;

    decorations.push(
      Decoration.inline(from, to, {
        class: `review-decoration review-decoration-${s.type}`,
        nodeName: "span",
        "data-suggestion-id": s.id,
        "data-type": s.type,
      })
    );
  }

  return decorations;
}

/**
 * Tiptap Extension：用 ProseMirror Decoration 管理审校高亮
 *
 * 使用方式：
 * - 更新高亮：editor.view.dispatch(editor.state.tr.setMeta(reviewDecorationKey, { suggestions }))
 * - 点击高亮：监听 window 上的 "review:click-suggestion" 自定义事件
 */
export const ReviewDecoration = Extension.create({
  name: "reviewDecoration",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: reviewDecorationKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, decorationSet) {
            // 检查是否有更新 suggestions 的 meta
            const meta = tr.getMeta(reviewDecorationKey);
            if (meta?.suggestions) {
              const decs = buildDecorations(tr.doc, meta.suggestions);
              return DecorationSet.create(tr.doc, decs);
            }

            // 文档变化时自动映射装饰位置
            if (tr.docChanged) {
              return decorationSet.map(tr.mapping, tr.doc);
            }

            return decorationSet;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleDOMEvents: {
            click(_view, event) {
              const target = event.target as HTMLElement;
              const span = target.closest(
                "[data-suggestion-id]"
              ) as HTMLElement;
              if (span) {
                const id = span.getAttribute("data-suggestion-id");
                if (id) {
                  window.dispatchEvent(
                    new CustomEvent("review:click-suggestion", {
                      detail: {
                        id,
                        rect: span.getBoundingClientRect(),
                      },
                    })
                  );
                }
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
