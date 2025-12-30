// rollup.config.js

const autoExternal = require("rollup-plugin-auto-external");
const sourcemaps = require("rollup-plugin-sourcemaps");
const commonjs = require("@rollup/plugin-commonjs");
const babel = require("@rollup/plugin-babel");
const typescript = require("rollup-plugin-typescript2");
const postcss = require("rollup-plugin-postcss");
const cssnano = require("cssnano");
const autoprefixer = require("autoprefixer");

const config = {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      exports: "named",
      sourcemap: true,
    },
    {
      file: "dist/index.js",
      format: "esm",
      exports: "named",
      sourcemap: true,
    },
  ],
  plugins: [
    autoExternal({ 
      packagePath: "./package.json",
    }),
    postcss({
      plugins: [
        autoprefixer(),
        cssnano({
          preset: "default",
        }),
      ],
      extract: true,
      minimize: true,
    }),
    sourcemaps(),
    babel(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      useTsconfigDeclarationDir: true,
      clean: true,
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          emitDeclarationOnly: false,
          noEmit: false,
          outDir: "./dist",
        },
      },
    }),
  ],
  external: [
    // Tiptap依赖保持原始导入路径
    "@tiptap/core",
    "@tiptap/pm/model",
    "@tiptap/pm/state",
    "@tiptap/pm/view",
    "@tiptap/extension-code-block",
    // Shiki依赖
    "shiki",
  ],
};

module.exports = config;
