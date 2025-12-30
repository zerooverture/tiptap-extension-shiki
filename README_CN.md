# Tiptap Shiki 语法高亮扩展

[📖 View English Version](./README.md)

### 安装

```bash
npm install shiki tiptap-extension-shiki
```

### 使用方法

```typescript
new Editor({
  content: "",
  extensions: [
    TiptapShiki.configure({
      // 必须有一个默认主题来进行回退
      defaultTheme: "dracula",
      // 必须有一个默认语言来进行回退
      defaultLanguage: "javascript",
      // 由于渲染器是异步的，所以必须在扩展配置中传递高亮器实例
      highlighter: await createHighlighter({
        // 你只能使用你高亮器加载的主题和语言，否则会报错
        // 因为主要目的是提供给后台的编辑器使用所以我不会考虑异步去加载额外的语言和主题
        themes: ["dracula", "dark-plus"],
        langs: ["javascript", "typescript", "html", "css", "python", "json"],
      }),
    }),
    StarterKit.configure({
      codeBlock: false,
    }),
  ],
});
```

### Tiptap getHTML 返回高亮后的 html

```typescript
TiptapShiki.configure({
  // 传递配置项之后 使用tiptap的 getHTML将会返回高亮后的 html
  // 注意：如果启用了 getHighlighHTML，返回的 HTML 不能用于setContent 回填，所以请储存getJSON用来编辑，而 html 只用来做前台展示
  getHighlighHTML: true,
}),
```

### 自定义工具栏

```typescript
// 你可以导入预制的样式文件来使用，也可以自行编写样式
import "tiptap-extension-shiki/dist/style.css";

TiptapShiki.configure({
  renderToolbar: ({ language, theme, toolbarDOM, setTheme, setLanguage }) => {
    // 在这里，您可以按照自己的方式(React/VUE)插入 DOM 到 toolbarDOM 中。
    // 例如，您可以使用 renderer(VNode,toolbarDOM)

    // 示例用原生 dom 来创建工具栏
    // Create language selection dropdown
    const languageSelect = document.createElement("select");
    languageSelect.style.cssText =
      "width: 200px; padding: 4px 8px; margin-right: 8px;";
    languageSelect.innerHTML = `
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="python">Python</option>
            <option value="json">JSON</option>
            <option value="c++">C++</option>
          `;

    // Create theme selection dropdown
    const themeSelect = document.createElement("select");
    themeSelect.style.cssText = "width: 200px; padding: 4px 8px;";
    themeSelect.innerHTML = `
            <option value="dracula">Dracula</option>
            <option value="dark-plus">DarkPlus</option>
          `;

    // Add language change event listener
    languageSelect.addEventListener("change", (event) => {
      // 设置选中的语言
      setLanguage((event.target as HTMLSelectElement).value);
    });

    // Add theme change event listener
    themeSelect.addEventListener("change", (event) => {
      // 设置选中的主题
      setTheme((event.target as HTMLSelectElement).value);
    });

    // 在工具栏容器中添加DOM
    toolbarDOM.appendChild(languageSelect);
    toolbarDOM.appendChild(themeSelect);
  },
});
```

### 功能特性

- ✨ 支持多种编程语言切换
- 🎨 支持多种主题切换
- 🛠️ 可自定义工具栏界面
- 🚀 实时语法高亮渲染
- 🔧 基于 Shiki 的高性能语法高亮引擎

### 配置选项

| 选项              | 类型          | 默认值         | 描述                      |
| ----------------- | ------------- | -------------- | ------------------------- |
| `defaultTheme`    | `string`      | `'dracula'`    | 默认语法高亮主题 （必需） |
| `defaultLanguage` | `string`      | `'javascript'` | 默认编程语言 （必需）     |
| `highlighter`     | `Highlighter` | `undefined`    | Shiki 高亮器实例（必需）  |
| `getHighlighHTML` | `boolean`     | `false`        | 是否生成静态高亮 HTML     |
| `renderToolbar`   | `function`    | `undefined`    | 自定义工具栏渲染函数      |

### 自定义样式

你可以通过 CSS 自定义代码块的外观：

```css
.tiptap-shiki--container {
  border-radius: 8px;
  font-family: "Fira Code", monospace;
}

.tiptap-shiki--toolbar {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px 6px 0 0;
}
```

### 贡献
这个插件参考了原有的高亮插件
[extension-code-block-lowlight](https://github.com/ueberdosis/tiptap/tree/main/packages/extension-code-block-lowlight)

### 注意事项

1. 使用前必须创建并配置 Shiki 高亮器实例
2. 自定义工具栏函数中的 DOM 操作是安全的，编辑器会处理冲突
3. 确保在使用前安装所有依赖包

### 许可证

MIT License
