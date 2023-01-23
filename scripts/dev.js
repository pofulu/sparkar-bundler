require('esbuild').build({
  ...require('./config').config,
  watch: true
})