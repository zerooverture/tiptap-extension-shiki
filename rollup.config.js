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
      // 将shiki相关包标记为外部依赖
      external: id => {
        return id === 'shiki' || 
               id.startsWith('@shikijs/') || 
               id === 'hast' ||
               id.includes('hast');
      }
    }),
    postcss({
      plugins: [
        autoprefixer(),
        cssnano({
          preset: 'default'
        })
      ],
      extract: true,
      minimize: true
    }),
    sourcemaps(),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'bundled'
    }),
    commonjs({
      include: [],
      exclude: ['node_modules/**']
    }),
    typescript({
      tsconfig: './tsconfig.json',
      useTsconfigDeclarationDir: true,
      clean: true,
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          emitDeclarationOnly: false,
          noEmit: false,
          outDir: './dist'
        }
      }
    }),
  ],
  // 完全外部化shiki相关包
  external: id => {
    return id === 'shiki' || 
           id.startsWith('@shikijs/') || 
           id === 'hast' ||
           id.includes('hast');
  },
};

module.exports = config;
