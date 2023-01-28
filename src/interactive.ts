import { build } from "esbuild";
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { basename, parse, resolve } from "path";
import { bold, greenBright, redBright, yellowBright } from "ansi-colors";
import JSZip from "jszip";
import { getImporetedScripts } from "./sparkar-parser/internal";
import inquirer from "inquirer";
import type { TSConfigJSON } from "types-tsconfig";
import { getSparkARProjectFile } from './sparkar-parser/utils';
import baseConfig from "./sparkar-parser/baseConfig";

type ProjectInfo = {
  tsconfig: string;
  projectFile: string;
  outfile: string;
}

export const template = `${__dirname}/../template/src/main.ts`;

export async function interactiveMode(projectPath: string) {
  const { source } = await inquirer.prompt<{ source: string }>({ type: 'input', name: 'source', message: 'Which source do you want to bundle? (Will be created automatically if it does not exist)', default: 'src/main.ts' })
  const defaultEntry = resolve(projectPath, source);
  if (!existsSync(defaultEntry)) {
    await mkdir(parse(defaultEntry).dir, { recursive: true });
    await writeFile(defaultEntry, await readFile(template))
  }

  const projectInfo = await getProjectInfo(projectPath);
  const external = await generateTypeScriptConfig(projectInfo);

  await build({
    entryPoints: [defaultEntry],
    outfile: projectInfo.outfile,
    platform: 'node',
    define: { global: 'window' },

    // auto re-bundle when save
    watch: true,

    // minify file
    minify: true,

    // prevent using nullish in bundled file
    target: 'es2019',

    // it's necessary as using external
    bundle: true,

    // print message while compiling
    logLevel: 'info',

    // set Meta Spark API as external 
    external,
  });
}

async function generateTypeScriptConfig({ tsconfig, outfile }: ProjectInfo) {
  const result = await readFile(tsconfig, 'utf8');
  const tsconfigJSON: TSConfigJSON = JSON.parse(result);
  const baseUrl = tsconfigJSON.compilerOptions?.baseUrl;
  const paths = tsconfigJSON.compilerOptions?.paths?.['*'] ?? [];
  let apiList: string[] = [];

  for (let path of paths) {
    path = `${baseUrl}/${path}`;
    baseConfig.compilerOptions.paths['*'].push(path);

    // get Meta Spark API list
    if (path.includes('skylight-typedefs')) {
      const apiDir = path.substring(0, path.length - 1);
      if (!existsSync(apiDir)) {
        throw yellowBright(`tsconfig.json no longer valid, please delete the script "${basename(outfile)}" in Meta Spark Studio and re-create it again.`);
      }
      const files = await readdir(apiDir);
      apiList = files.map(file => file.split('.')).filter(arr => arr.length == 1).flat();
    }
  }

  const tsconfigOutputPath = resolve('src', 'tsconfig.json');
  await mkdir(parse(tsconfigOutputPath).dir, { recursive: true });
  await writeFile(tsconfigOutputPath, JSON.stringify(baseConfig, null, 2));

  console.log(greenBright('APIs'), apiList.join(', '));
  return apiList;
}

async function getProjectInfo(root: string): Promise<ProjectInfo> {
  const getInfo = async (root: string) => {
    const projectFile = await getSparkARProjectFile(root);

    if (projectFile != undefined) {
      const projectFilePath = resolve(root, projectFile);
      console.log(greenBright('Found project'), bold(projectFilePath));

      // get tsconfig.json
      const tsconfigPath = resolve(root, 'scripts', 'tsconfig.json');
      if (!existsSync(tsconfigPath)) {
        throw yellowBright(`tsconfig.json not found, please create a JavaScript script in Meta Spark Studio.`);
      }

      // get script output
      const zip = await JSZip.loadAsync(await readFile(projectFilePath));
      const main = zip.file('main.json');
      if (!main) {
        throw redBright('Invalid project file, is this file broken?');
      }

      const scripts = getImporetedScripts(await main.async('string'));
      if (scripts.length == 0) {
        throw yellowBright(`No script found, please create a JavaScript script in Meta Spark Studio and save it.`);
      }

      const result = await inquirer.prompt<{ outfile: string }>([{
        type: 'list',
        name: 'outfile',
        message: 'Which script do you want to output in Meta Spark Studio? (will OVERWRITE it)',
        choices: scripts.map(script => ({ name: basename(script), value: script })),
      }]);

      return {
        tsconfig: resolve(root, 'scripts', 'tsconfig.json'),
        projectFile: projectFilePath,
        outfile: resolve(root, result.outfile)
      };
    }
  }

  // find in spark ar project
  const info = await getInfo(root);
  if (info != undefined) {
    return info;
  }

  // find in node project
  const files = await readdir(root);
  for (const file of files) {
    const path = resolve(root, file);
    if (!(await stat(path)).isDirectory()) {
      continue;
    }
    const info = await getInfo(path);
    if (info != undefined) {
      return info;
    }
  }

  // not found
  throw yellowBright('Project not found');
}