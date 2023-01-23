/** @type {import('esbuild').BuildOptions} */
exports.config = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  minify: true,
  platform: 'node',
  plugins: [
    // https://github.com/evanw/esbuild/issues/1492#issuecomment-891676215
    {
      name: 'import.meta.url',
      setup({ onLoad }) {
        let fs = require('fs')
        let url = require('url')
        onLoad({ filter: /()/, namespace: 'file' }, args => {
          let code = fs.readFileSync(args.path, 'utf8')
          code = code.replace(
            /\bimport\.meta\.url\b/g,
            JSON.stringify(url.pathToFileURL(args.path))
          )
          return { contents: code, loader: 'default' }
        })
      }
    }],
  external: ['esbuild']
}
