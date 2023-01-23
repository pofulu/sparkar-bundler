import { resolve } from "path";

export default {
  compilerOptions: {
    allowJs: true,
    esModuleInterop: true,
    target: 'ESNext',
    moduleResolution: "node",
    skipLibCheck: true,
    paths: {
      "*": [
        resolve('node_modules', '*')
      ]
    }
  }
};