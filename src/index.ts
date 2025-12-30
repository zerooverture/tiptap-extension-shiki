/**
 * Tiptap Shiki 语法高亮扩展
 * 
 * 本文件实现了一个基于 Shiki 的 Tiptap 扩展，用于在富文本编辑器中提供语法高亮功能。
 * 该扩展扩展了 Tiptap 的 CodeBlock，添加了以下功能：
 * - 支持多种编程语言的语法高亮
 * - 支持多种主题切换
 * - 自定义工具栏界面
 * - 键盘快捷键支持
 * - 实时语法高亮渲染
 */

// 导入 Tiptap 核心组件
import CodeBlock from "@tiptap/extension-code-block";
// 导入样式文件
import "./index.css";

// 导入 Shiki 类型定义
import type {
  BundledLanguage,
  BundledTheme,
  HighlighterGeneric,
  SpecialLanguage,
  StringLiteralUnion,
  ThemeRegistrationAny,
} from "shiki";

// 导入 Shiki 轻量级插件
import { ShikiLightPlugin } from "./ShikiLightPlugin.js";

/**
 * TiptapShiki 扩展类定义
 * 
 * 该类扩展了 Tiptap 的 CodeBlock，添加了语法高亮功能和相关配置选项。
 * 使用泛型类型定义扩展选项和节点视图属性。
 * 
 * @template T - 扩展选项类型，包含默认主题、语言、高亮器等配置
 * @template U - 节点视图属性类型，定义 DOM 元素的类型
 */
const TiptapShiki = CodeBlock.extend<
  {
    // 默认语法高亮主题
    defaultTheme: ThemeRegistrationAny | StringLiteralUnion<string>;
    // 默认编程语言
    defaultLanguage: StringLiteralUnion<SpecialLanguage>;
    // 可选的 Shiki 高亮器实例
    highlighter?: HighlighterGeneric<BundledLanguage, BundledTheme>;
    // 是否获取高亮的 HTML 字符串
    getHighlighHTML?: boolean;
    // 自定义工具栏渲染函数
    renderToolbar?: (props: {
      toolbarDOM: HTMLElement;
      language: StringLiteralUnion<SpecialLanguage>;
      theme: ThemeRegistrationAny | StringLiteralUnion<string>;
      setLanguage: (lang: string) => void;
      setTheme: (theme: string) => void;
    }) => void;
  },
  { 
    // 节点视图中的 DOM 元素类型定义
    container: HTMLElement; 
    shikiCode: HTMLElement; 
    contentDOM: HTMLElement 
  }
>({
    // 扩展名称，用于标识这个自定义扩展
    name: "tiptapShiki",
    
    /**
     * 添加扩展配置选项
     * 
     * 定义了 Shiki 语法高亮的默认配置，包括默认主题、编程语言等。
     * 使用父类的配置选项并添加本扩展特有的选项。
     * 
     * @returns 配置对象，包含默认主题、语言和高亮器设置
     */
    addOptions() {
      return {
        // 继承父类的配置选项
        ...this.parent?.(),
        // 默认语法高亮主题
        defaultTheme: "dracula",
        // 默认编程语言
        defaultLanguage: "javascript",
        // 初始化时的高亮器实例（可选）
        highlighter: undefined,
      };
    },
     /**
      * 添加节点属性
      * 
      * 定义了代码块节点的自定义属性，包括编程语言和主题。
      * 这些属性用于存储和渲染代码块的语法高亮配置。
      * 
      * @returns 属性配置对象，包含语言和主题属性
      */
     addAttributes() {
       return {
         // 继承父类的属性
         ...this.parent?.(),
         
         // 编程语言属性
         language: {
           // 默认语言配置
           default: this.options.defaultLanguage || "javascript",
           
           /**
            * 从 HTML 元素解析语言属性
            * @param element - HTML 元素
            * @returns 编程语言字符串
            */
           parseHTML: (element) => {
             // 从 data-language 属性获取语言信息
             return element.getAttribute("data-language");
           },
           
           /**
            * 渲染 HTML 时设置语言属性
            * @param attributes - 节点属性对象
            * @returns HTML 属性对象
            */
           renderHTML: (attributes) => {
             // 将语言信息存储在 data-language 属性中
             return { "data-language": attributes.language };
           },
         },
         
         // 主题属性
         theme: {
           // 默认主题配置
           default: this.options.defaultTheme || "dracula",
           
           /**
            * 从 HTML 元素解析主题属性
            * @param element - HTML 元素
            * @returns 主题名称字符串
            */
           parseHTML: (element) => element.getAttribute("data-theme"),
           
           /**
            * 渲染 HTML 时设置主题属性
            * @param attributes - 节点属性对象
            * @returns HTML 属性对象
            */
           renderHTML: (attributes) => ({
             "data-theme": attributes.theme,
           }),
         },
       };
     },

      /**
       * 渲染 HTML
       * 
       * 定义了代码块节点在静态 HTML 中的渲染逻辑。
       * 如果配置了 getHighlighHTML 和 highlighter，将使用 Shiki 生成高亮的 HTML；
       * 否则返回标准的 pre/code 标签结构。
       * 
       * @param node - ProseMirror 节点对象
       * @param HTMLAttributes - HTML 属性对象
       * @returns HTML 数组或元素
       */
      renderHTML({ node, HTMLAttributes }) {
        // 如果启用了高亮 HTML 生成并且有高亮器实例
        if (this.options.getHighlighHTML && this.options.highlighter) {
          // 获取代码内容、编程语言和主题
          const language = node.attrs.language || this.options.defaultLanguage;
          const theme = node.attrs.theme || this.options.defaultTheme;
          const content = node.textContent;
  
          // 使用 Shiki 将代码转换为带样式的 HTML
          const highlightedCode = this.options.highlighter.codeToHtml(content, {
            lang: language,
            theme: theme,
          });
          
          // 解析生成的 HTML 字符串并返回第一个元素
          const container = document.createElement("div");
          container.innerHTML = highlightedCode;
          if (container.firstElementChild) return container.firstElementChild;
        }
  
        // 返回标准的 pre/code 标签结构
        return ["pre", HTMLAttributes, ["code", 0]];
      },

       /**
        * 添加节点视图
        * 
        * 创建代码块的交互式 DOM 视图，包括工具栏和代码显示区域。
        * 提供了实时的语法高亮和主题切换功能。
        * 
        * @returns 节点视图工厂函数
        */
       addNodeView() {
         // 检查是否有高亮器实例
         if (!this.options.highlighter) throw new Error("highlighter is required");
         
         return (props) => {
           // 获取视图相关参数
           const { view, getPos, node } = props;
   
           // 获取当前主题配置
           const theme = this.options.highlighter.getTheme(
             node.attrs.theme || this.options.defaultTheme
           );
   
           // 创建主容器 DOM 元素
           const dom = document.createElement("div");
           dom.classList.add(
             "tiptap-shiki--container",
             "not-prose",
             "shiki",
             "dracula"
           );
           // 应用主题颜色
           dom.style.backgroundColor = theme.bg;
           dom.style.color = theme.fg;
   
           // 创建工具栏（如果配置了自定义渲染器）
           let toolbarDOM: HTMLElement | undefined;
           if (
             this.options.renderToolbar &&
             typeof this.options.renderToolbar === "function"
           ) {
             // 创建工具栏容器
             toolbarDOM = document.createElement("div");
             toolbarDOM.classList.add("tiptap-shiki--toolbar");
             toolbarDOM.setAttribute("contenteditable", "false");
             
             // 创建节点标记更新函数
             const setNodeMarkup = (attr: Record<string, string>) => {
               if (typeof getPos !== "function") return;
               const pos = getPos();
               if (pos === undefined) return;
               const { tr } = view.state;
               const nowNode = view.state.doc.nodeAt(pos);
   
               // 更新节点属性
               tr.setNodeMarkup(pos, this.type, { ...nowNode?.attrs, ...attr });
               view.dispatch(tr);
             };
   
             // 创建语言设置函数
             const setLanguage = (language: string) => {
               setNodeMarkup({
                 language, // 仅修改当前代码块的编程语言
               });
             };
   
             // 创建主题设置函数
             const setTheme = (theme: string) => {
               setNodeMarkup({
                 theme, // 仅修改当前代码块的主题
               });
             };
   
             // 调用自定义工具栏渲染器
             this.options.renderToolbar({
               language: node.attrs.language,
               theme: node.attrs.theme,
               toolbarDOM,
               setLanguage,
               setTheme,
             });
   
             // 将工具栏添加到主容器
             dom.appendChild(toolbarDOM);
           }
   
           // 创建代码显示区域
           const preDOM = document.createElement("pre");
           const contentDOM = document.createElement("code");
           contentDOM.classList.add("tiptap-shiki--content");
   
           // 组装 DOM 结构
           preDOM.appendChild(contentDOM);
           dom.appendChild(preDOM);
   
           // 返回节点视图对象
           return {
             // 主 DOM 元素
             dom: dom,
             // 内容 DOM 元素
             contentDOM,
             
             /**
              * 更新节点视图
              * @param updatedNode - 更新后的节点
              * @returns 是否成功更新
              */
             update: (updatedNode) => {
               // 如果不是相同类型的节点，拒绝更新
               return updatedNode.type === node.type;
             },
             
             /**
              * 忽略某些 DOM 变化
              * @param mutation - DOM 变化对象
              * @returns 是否忽略该变化
              */
             ignoreMutation: (mutation) => {
               // 忽略工具栏区域的 DOM 变化
               return toolbarDOM?.contains(mutation.target) || false;
             },
           };
         };
       },

        /**
         * 添加 ProseMirror 插件
         * 
         * 注册 Shiki 轻量级语法高亮插件，实现实时语法高亮功能。
         * 继承父类的插件并添加自定义的高亮插件。
         * 
         * @returns ProseMirror 插件数组
         */
        addProseMirrorPlugins() {
          // 检查是否有高亮器实例
          if (!this.options.highlighter) throw new Error("highlighter is required");
          
          return [
            // 继承父类的插件
            ...(this.parent?.() || []),
            // 添加 Shiki 轻量级高亮插件
            ShikiLightPlugin({
              name: this.name,
              highlighter: this.options.highlighter,
              defaultLanguage: this.options.defaultLanguage,
              defaultTheme: this.options.defaultTheme,
            }),
          ];
        },
   });
   
   // 导出命名导出
   export { TiptapShiki };
   
   // 导出默认导出
   export default TiptapShiki;
