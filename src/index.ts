import CodeBlock from "@tiptap/extension-code-block";
import "./index.css";
import type {
  BundledLanguage,
  BundledTheme,
  HighlighterGeneric,
  SpecialLanguage,
  StringLiteralUnion,
  ThemeRegistrationAny,
} from "shiki";
import { ShikiLightPlugin } from "./ShikiLightPlugin.js";

const TiptapShiki = CodeBlock.extend<
  {
    defaultTheme: ThemeRegistrationAny | StringLiteralUnion<string>;
    defaultLanguage: StringLiteralUnion<SpecialLanguage>;
    highlighter?: HighlighterGeneric<BundledLanguage, BundledTheme>;
    getHighlighHTML?: boolean;
    renderToolbar?: (props: {
      toolbarDOM: HTMLElement;
      language: StringLiteralUnion<SpecialLanguage>;
      theme: ThemeRegistrationAny | StringLiteralUnion<string>;
      setLanguage: (lang: string) => void;
      setTheme: (theme: string) => void;
    }) => void;
  },
  { container: HTMLElement; shikiCode: HTMLElement; contentDOM: HTMLElement }
>({
  name: "tiptapShiki",
  addOptions() {
    return {
      ...this.parent?.(),
      defaultTheme: "dracula",
      defaultLanguage: "javascript",
      highlighter: undefined,
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;
        // 1. 确保是光标操作（非选区）
        if (!empty) return false;

        // 2. 检查当前是否在你的自定义插件节点中
        if ($from.parent.type.name !== this.name) return false;
        // 3. 检查光标是否在节点的最开始位置 (offset 为 0)
        const isAtStart = $from.parentOffset === 0;

        if (isAtStart) {
          this.editor.chain().setNode("paragraph").run();
          return true;
        }

        return false;
      },
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: this.options.defaultLanguage || "javascript",
        // 解析 HTML 时从 data-language 获取
        parseHTML: (element) => {
          console.log("element", element.getAttribute("data-language"));
          return element.getAttribute("data-language");
        },
        // 渲染 HTML 时存入 data-language
        renderHTML: (attributes) => {
          console.log("attributes", attributes.language);
          return { "data-language": attributes.language };
        },
      },
      theme: {
        default: this.options.defaultTheme || "dracula",
        // 解析 HTML 时从 data-language 获取
        parseHTML: (element) => element.getAttribute("data-theme"),
        // 渲染 HTML 时存入 data-language
        renderHTML: (attributes) => ({
          "data-theme": attributes.theme,
        }),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    if (this.options.getHighlighHTML && this.options.highlighter) {
      const language = node.attrs.language || this.options.defaultLanguage;
      const theme = node.attrs.theme || this.options.defaultTheme;
      const content = node.textContent;

      // 使用 shiki 将代码转换为带样式的 HTML
      const highlightedCode = this.options.highlighter.codeToHtml(content, {
        lang: language,
        theme: theme,
      });
      const container = document.createElement("div");
      container.innerHTML = highlightedCode;
      if (container.firstElementChild) return container.firstElementChild;
    }

    return ["pre", HTMLAttributes, ["code", 0]];
  },

  addNodeView() {
    console.log("addNodeView");
    return (props) => {
      if (!this.options.highlighter) throw new Error("highlighter is required");
      const { view, getPos, node } = props;

      const theme = this.options.highlighter.getTheme(
        node.attrs.theme || this.options.defaultTheme
      );

      const dom = document.createElement("div");
      dom.classList.add(
        "tiptap-shiki--container",
        "not-prose",
        "shiki",
        "dracula"
      );
      dom.style.backgroundColor = theme.bg;
      dom.style.color = theme.fg;

      let toolbarDOM: HTMLElement | undefined;
      if (
        this.options.renderToolbar &&
        typeof this.options.renderToolbar === "function"
      ) {
        toolbarDOM = document.createElement("div");
        toolbarDOM.classList.add("tiptap-shiki--toolbar");
        toolbarDOM.setAttribute("contenteditable", "false");
        const setNodeMarkup = (attr: Record<string, string>) => {
          if (typeof getPos !== "function") return;
          const pos = getPos();
          if (pos === undefined) return;
          const { tr } = view.state;
          const nowNode = view.state.doc.nodeAt(pos);

          tr.setNodeMarkup(pos, this.type, { ...nowNode?.attrs, ...attr });
          view.dispatch(tr);
        };

        const setLanguage = (language: string) => {
          setNodeMarkup({
            language, // 仅修改当前这一个块的语言
          });
        };

        const setTheme = (theme: string) => {
          setNodeMarkup({
            theme, // 仅修改当前这一个块的语言
          });
        };
        console.log("node.attrs", node.attrs);
        this.options.renderToolbar({
          language: node.attrs.language,
          theme: node.attrs.theme,
          toolbarDOM,
          setLanguage,
          setTheme,
        });

        // const button = document.createElement('button')
        // button.innerText = '测试刷新'
        // button.addEventListener('click', (e) => {
        //   if (typeof getPos !== 'function') return
        //   const pos = getPos()
        //   if (!pos) return
        //   e.stopPropagation()
        //   e.preventDefault()
        //
        //   const { tr } = view.state
        //   tr.setNodeMarkup(pos, this.type, {
        //     language: 'json', // 仅修改当前这一个块的语言
        //   })
        //   view.dispatch(tr)
        // })
        //
        // toolbar.appendChild(button)
        dom.appendChild(toolbarDOM);
      }

      const preDOM = document.createElement("pre");
      const contentDOM = document.createElement("code"); // 使用 code 的目的是保证字体等样式与 shiki 的一致性
      contentDOM.classList.add("tiptap-shiki--content");

      preDOM.appendChild(contentDOM);

      dom.appendChild(preDOM);

      return {
        dom: dom,
        contentDOM,
        update: (updatedNode) => {
          // 如果不是这个类型的节点，直接拒绝更新
          return updatedNode.type === node.type;
        },
        ignoreMutation: (mutation) => {
          return toolbarDOM?.contains(mutation.target) || false;
        },
      };
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.highlighter) throw new Error("highlighter is required");
    return [
      ...(this.parent?.() || []),
      ShikiLightPlugin({
        name: this.name,
        highlighter: this.options.highlighter,
        defaultLanguage: this.options.defaultLanguage,
        defaultTheme: this.options.defaultTheme,
      }),
    ];
  },
});

export { TiptapShiki };

export default TiptapShiki;
