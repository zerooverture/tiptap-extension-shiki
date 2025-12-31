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

/**
 * 为整个文档计算语法高亮装饰
 * 该函数遍历文档中的所有自定义节点，为每个节点生成相应的装饰样式
 *
 * @param doc - ProseMirror文档节点
 * @param name - 插件名称，用于识别目标节点类型
 * @param highlighter - Shiki语法高亮器实例
 * @param defaultTheme - 默认主题
 * @param defaultLanguage - 默认编程语言
 * @returns 装饰器集合，用于渲染语法高亮
 */
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
  // 查找文档中所有指定类型的节点（shiki代码块）
  const decorations = findChildren(doc, (node) => {
    return node.type.name === name;
  }).reduce((acc, block) => {
    // 为每个代码块生成装饰
    const nodeDecorations = getSingleNodeDecorations(
      block.node,
      block.pos,
      highlighter,
      defaultTheme,
      defaultLanguage
    );
    return acc.concat(nodeDecorations);
  }, [] as Decoration[]);

  // 创建装饰器集合
  return DecorationSet.create(doc, decorations);
}

/**
 * 为单个代码块节点生成语法高亮装饰
 * 使用Shiki对代码进行分词，然后为每个token生成相应的装饰样式
 *
 * @param node - 代码块节点
 * @param pos - 节点在文档中的位置
 * @param highlighter - Shiki语法高亮器
 * @param defaultTheme - 默认主题
 * @param defaultLanguage - 默认语言
 * @returns 该节点的所有装饰器数组
 */
function getSingleNodeDecorations(
  node: ProsemirrorNode,
  pos: number,
  highlighter: HighlighterGeneric<BundledLanguage, BundledTheme>,
  defaultTheme: ThemeRegistrationAny | StringLiteralUnion<string>,
  defaultLanguage: StringLiteralUnion<SpecialLanguage>
) {
  const decorations: Decoration[] = [];

  // 获取代码块的语言和主题属性，如果没有则使用默认值
  const language = node.attrs.language || defaultLanguage;
  const theme = node.attrs.theme || defaultTheme;

  // 计算文本内容的起始位置（跳过节点标记）
  let startPos = pos + 1;

  // 使用Shiki对代码进行分词，返回每个token的颜色信息
  const lines = highlighter.codeToTokensBase(node.textContent, {
    lang: language,
    theme: theme as ThemeRegistrationAny,
  });

  // 遍历每一行的token，为有颜色的token创建装饰
  lines.forEach((line) => {
    line.forEach((token) => {
      const endPos = startPos + token.content.length;

      // 如果token有颜色信息，创建内联装饰器设置文本颜色
      if (token.color) {
        decorations.push(
          Decoration.inline(startPos, endPos, {
            style: `color: ${token.color}`,
          })
        );
      }

      // 更新下一个token的起始位置
      startPos = endPos;
    });

    // 处理换行符（每个line之间的分隔符）
    startPos += 1;
  });

  return decorations;
}

/**
 * 创建Shiki轻量级语法高亮插件
 * 该插件负责在ProseMirror编辑器中为代码块提供实时的语法高亮显示
 * 通过ProseMirror的装饰器系统实现高性能的语法高亮渲染
 *
 * @param name - 插件名称
 * @param highlighter - Shiki语法高亮器实例
 * @param defaultTheme - 默认主题
 * @param defaultLanguage - 默认编程语言
 * @returns ProseMirror插件实例
 */
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

    // 插件状态管理
    state: {
      /**
       * 初始化装饰器
       * 在插件首次加载时为整个文档计算初始的语法高亮装饰
       */
      init: (_, { doc }) => {
        return getDecorations({
          doc,
          name,
          highlighter,
          defaultTheme,
          defaultLanguage,
        });
      },

      /**
       * 应用事务变化
       * 当文档发生变化时，智能更新受影响的代码块的语法高亮
       * 实现了性能优化：只重新计算变化范围内的装饰
       */
      apply: (transaction, decorationSet, oldState, newState) => {
        // 1. 如果文档内容没有变化，直接映射现有装饰（最高性能）
        if (!transaction.docChanged) {
          return decorationSet.map(transaction.mapping, transaction.doc);
        }

        // 2. 重新计算受影响的装饰器
        let newDecorationSet = decorationSet.map(
          transaction.mapping,
          transaction.doc
        );

        // 3. 遍历事务中的每个步骤映射，精确更新受影响的节点
        transaction.mapping.maps.forEach((stepMap) => {
          stepMap.forEach((fromA, toA, fromB, toB) => {
            // 限制计算范围在文档边界内，避免越界错误
            const docSize = newState.doc.content.size;
            const start = Math.max(0, Math.min(fromB, docSize));
            const end = Math.max(0, Math.min(toB, docSize));

            // 检查范围内的节点是否为代码块类型
            newState.doc.nodesBetween(start, end, (node, pos) => {
              if (node.type.name === "text") return;
              // 先移除这个节点旧的高亮
              const nodeEnd = pos + node.nodeSize;
              // 移除该节点范围内现有的所有装饰
              const oldDecos = newDecorationSet.find(pos, nodeEnd);
              newDecorationSet = newDecorationSet.remove(oldDecos);

              if (node.type.name === name) {
                // 重新计算该节点的语法高亮装饰
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

    // 插件属性：将装饰器提供给编辑器视图
    props: {
      decorations(state) {
        return shikiLightPlugin.getState(state);
      },
    },
  });

  return shikiLightPlugin;
}
