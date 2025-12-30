import { findChildren } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type {
  BundledLanguage,
  BundledTheme,
  HighlighterGeneric,
  SpecialLanguage,
  StringLiteralUnion,
  ThemeRegistrationAny,
} from "shiki";

function getDecorations({
  doc,
  name,
  highlighter,
  defaultTheme,
  defaultLanguage,
}: {
  doc: ProsemirrorNode;
  name: string;
  highlighter: HighlighterGeneric<BundledLanguage, BundledTheme>;
  defaultTheme: ThemeRegistrationAny | StringLiteralUnion<string>;
  defaultLanguage: StringLiteralUnion<SpecialLanguage>;
}) {
  console.log("doc", doc);
  const decorations = findChildren(doc, (node) => {
    console.log("node node ", node);
    return node.type.name === name;
  }).reduce((acc, block) => {
    const nodeDecorations = getSingleNodeDecorations(
      block.node,
      block.pos,
      highlighter,
      defaultTheme,
      defaultLanguage
    );
    return acc.concat(nodeDecorations);
  }, [] as Decoration[]);

  return DecorationSet.create(doc, decorations);
}

function getSingleNodeDecorations(
  node: ProsemirrorNode,
  pos: number,
  highlighter: HighlighterGeneric<BundledLanguage, BundledTheme>,
  defaultTheme: ThemeRegistrationAny | StringLiteralUnion<string>,
  defaultLanguage: StringLiteralUnion<SpecialLanguage>
) {
  const decorations: Decoration[] = [];
  const language = node.attrs.language || defaultLanguage;
  const theme = node.attrs.theme || defaultTheme;
  let startPos = pos + 1; // 跳过开头的节点标记

  const lines = highlighter.codeToTokensBase(node.textContent, {
    lang: language,
    theme: theme as ThemeRegistrationAny,
  });

  lines.forEach((line) => {
    line.forEach((token) => {
      const endPos = startPos + token.content.length;
      if (token.color) {
        decorations.push(
          Decoration.inline(startPos, endPos, {
            style: `color: ${token.color}`,
          })
        );
      }
      startPos = endPos;
    });
    startPos += 1; // 换行符
  });
  return decorations;
}

export function ShikiLightPlugin({
  name,
  highlighter,
  defaultTheme,
  defaultLanguage,
}: {
  name: string;
  highlighter: HighlighterGeneric<BundledLanguage, BundledTheme>;
  defaultTheme: ThemeRegistrationAny | StringLiteralUnion<string>;
  defaultLanguage: StringLiteralUnion<SpecialLanguage>;
}) {
  const shikiLightPlugin: Plugin = new Plugin({
    key: new PluginKey("shiki"),

    state: {
      init: (_, { doc }) => {
        return getDecorations({
          doc,
          name,
          highlighter,
          defaultTheme,
          defaultLanguage,
        });
      },
      apply: (transaction, decorationSet, oldState, newState) => {
        // const oldNodeName = oldState.selection.$head.parent.type.name
        // const newNodeName = newState.selection.$head.parent.type.name
        // console.log('oldNodeName, newNodeName', newState, oldNodeName, newNodeName)
        // 1. 如果文档没变，且没有强制刷新，直接映射旧的 Decorations（性能最高）
        if (!transaction.docChanged) {
          return decorationSet.map(transaction.mapping, transaction.doc);
        }
        // // 2. 收集所有受影响的范围
        // const modifiedRanges: { from: number; to: number }[] = []
        // transaction.steps.forEach((step) => {
        //   // 获取每个步骤影响的起始和结束位置
        //   // modifiedRanges.push({ from: step.from, to: step.to })
        //   step.getMap().forEach((fromA, toA, fromB, toB) => {
        //     modifiedRanges.push({ from: fromB, to: toB })
        //   })
        // })

        // 3. 只针对受影响范围内的 shiki 节点进行重绘
        let newDecorationSet = decorationSet.map(
          transaction.mapping,
          transaction.doc
        );

        // modifiedRanges.forEach((range) => {
        //   // 在 newState.doc 中寻找落在该范围内的自定义节点
        //   console.log('newState.doc', range.from, range.to, newState.doc)
        //   newState.doc.nodesBetween(range.from, range.to, (node, pos) => {
        //     if (node.type.name === 'text') return
        //     // 先移除这个节点旧的高亮
        //     newDecorationSet = newDecorationSet.remove(
        //       newDecorationSet.find(pos, pos + node.nodeSize),
        //     )
        //     if (node.type.name === name) {
        //       // 先移除这个节点旧的高亮
        //       newDecorationSet = newDecorationSet.remove(
        //         newDecorationSet.find(pos, pos + node.nodeSize),
        //       )
        //       // 重新计算并添加这个节点的高亮
        //       const newSpecs = getSingleNodeDecorations(
        //         node,
        //         pos,
        //         highlighter,
        //         defaultTheme,
        //         defaultLanguage,
        //       )
        //       newDecorationSet = newDecorationSet.add(newState.doc, newSpecs)
        //     }
        //   })
        // })

        // 2. 遍历事务中的每个步骤映射
        transaction.mapping.maps.forEach((stepMap) => {
          stepMap.forEach((fromA, toA, fromB, toB) => {
            // 限制范围在当前文档大小内，防止越界报错
            const docSize = newState.doc.content.size;
            const start = Math.max(0, Math.min(fromB, docSize));
            const end = Math.max(0, Math.min(toB, docSize));

            newState.doc.nodesBetween(start, end, (node, pos) => {
              if (node.type.name === name) {
                const nodeEnd = pos + node.nodeSize;

                // 移除该节点范围内现有的所有装饰
                // 这里的 find 可能会返回旧的或者部分重合的，直接根据位置移除更安全
                const oldDecos = newDecorationSet.find(pos, nodeEnd);
                newDecorationSet = newDecorationSet.remove(oldDecos);

                // 重新计算该节点的高亮
                const newSpecs = getSingleNodeDecorations(
                  node,
                  pos,
                  highlighter,
                  defaultTheme,
                  defaultLanguage
                );
                newDecorationSet = newDecorationSet.add(newState.doc, newSpecs);
              }
            });
          });
        });

        return newDecorationSet;
      },
    },

    props: {
      decorations(state) {
        return shikiLightPlugin.getState(state);
      },
    },
  });

  return shikiLightPlugin;
}
