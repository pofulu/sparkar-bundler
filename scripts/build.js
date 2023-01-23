require('esbuild')
  .build(require('./config').config)
  .then(() => console.log('Complete'));