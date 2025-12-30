# Tiptap Extension Shiki

[📖 View Chinese Version](./README_CN.md)

### Installation

```bash
npm install shiki tiptap-extension-shiki
```

### Usage

```typescript
new Editor({
  content: "",
  extensions: [
    TiptapShiki.configure({
      // Must have a default theme for fallback
      defaultTheme: "dracula",
      // Must have a default language for fallback
      defaultLanguage: "javascript",
      // Since the renderer is asynchronous, the highlighter instance must be passed in the extension configuration
      highlighter: await createHighlighter({
        // You can only use the themes and languages loaded by your highlighter, otherwise it will throw an error
        // Since the main purpose is to provide it for background editor usage, I won't consider asynchronously loading additional languages and themes
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

### Tiptap getHTML Returns Highlighted HTML

```typescript
TiptapShiki.configure({
  // After passing the configuration, using tiptap's getHTML will return highlighted HTML
  // Note: If getHighlighHTML is enabled, the returned HTML cannot be used for setContent backfill, so please store getJSON for editing, and use HTML only for frontend display
  getHighlighHTML: true,
}),
```

### Custom Toolbar

```typescript
// You can import the built-in stylesheet or write your own styles
import "tiptap-extension-shiki/dist/style.css";

TiptapShiki.configure({
  renderToolbar: ({ language, theme, toolbarDOM, setTheme, setLanguage }) => {
    // Here, you can insert DOM elements into toolbarDOM in your own way (React/VUE).
    // For example, you can use renderer(VNode,toolbarDOM)

    // Example: Create toolbar using native DOM
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
      // Set selected language
      setLanguage((event.target as HTMLSelectElement).value);
    });

    // Add theme change event listener
    themeSelect.addEventListener("change", (event) => {
      // Set selected theme
      setTheme((event.target as HTMLSelectElement).value);
    });

    // Add DOM elements to toolbar container
    toolbarDOM.appendChild(languageSelect);
    toolbarDOM.appendChild(themeSelect);
  },
});
```

### Features

- ✨ Support for multiple programming languages
- 🎨 Support for multiple theme switching
- 🛠️ Customizable toolbar interface
- 🚀 Real-time syntax highlighting rendering
- 🔧 High-performance syntax highlighting engine based on Shiki

### Configuration Options

| Option             | Type          | Default         | Description                          |
| ----------------- | ------------- | -------------- | ------------------------------------ |
| `defaultTheme`    | `string`      | `'dracula'`    | Default syntax highlighting theme (Required) |
| `defaultLanguage` | `string`      | `'javascript'` | Default programming language (Required)     |
| `highlighter`     | `Highlighter` | `undefined`    | Shiki highlighter instance (Required)       |
| `getHighlighHTML` | `boolean`     | `false`        | Whether to generate static highlighted HTML |
| `renderToolbar`   | `function`    | `undefined`    | Custom toolbar rendering function            |

### Custom Styling

You can customize the appearance of code blocks through CSS:

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

### Contributing
This plugin references the original highlighting plugin
[extension-code-block-lowlight](https://github.com/ueberdosis/tiptap/tree/main/packages/extension-code-block-lowlight)

### Notes

1. You must create and configure a Shiki highlighter instance before use
2. DOM operations in custom toolbar functions are safe, the editor will handle conflicts
3. Make sure to install all dependencies before use

### License

MIT License
