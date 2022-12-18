# Spark AR Bundler

Bundler TypeScript for Meta Spark Studio based on esbuild. This tool resolve the type definition of Meta Spark API, so the IntelliSense (VSCode) will works for both Meta Spark API and node modules.



## Usage

1. Install this package with npm globally:

   ```shell
   npm i -g sparkar-bundler
   ```

2. Create a empty project → Save it → Create a JavaScript

3. Open terminal in your target Meta Spark project:

   ```shell
   ~/myProject> sparkar-bundler
   ```

3. The command line tool will guide you select a script target for outputting the bundled result.
4. If everything is ready, you will see `hello, world` printed in Meta Spark Studio.



## How it works

This bundler will transpile the `./src/main.ts` to the script you selected in Meta Spark Studio.



## Project File Structure

This bundler support two types of project structure:

```
sparkar-project/
├── sparkar-project.arproj
├── scripts/
│   └── script.js
├── src/
│   └── main.ts
└── ...  
```

▲ This is the default structure when File→Save a new project in Meta Spark Studio.

```
node-project/
├── src/
│   └── main.ts
└── sparkar-project/
    ├── sparkar-project.arproj
    ├── scripts/
    │   └── script.js
    └── ...  
```

▲ This is the structure that wrapped the sparkar project with a parent directory, it's useful when you want to separate the spark ar project from the original code.



*The `./src/main.ts` will be generated by bundler if it not existed when first build.*



