import { bold, greenBright, redBright, yellowBright } from 'ansi-colors';
import { build } from 'esbuild';
import { existsSync } from 'fs';
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
import inquirer from 'inquirer';
import JSZip from 'jszip';
import { basename, parse, resolve } from 'path';
import { TSConfigJSON } from 'types-tsconfig';

const templateFile = `${__dirname}/template`;

const baseConfig = {
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

type ProjectInfo = {
  /** e.g. `/Users/name/Desktop/myProject/scripts/tsconfig.json` */
  tsconfig: string;
  /** e.g. `myProject.arproj` */
  projectFile: string;
  /** e.g. `scripts/script.js` */
  outfile: string;
}

void async function main() {
  try {
    const projectPath = resolve();
    const projectInfo = await getProjectInfo(projectPath);
    const external = await generateTypeScriptConfig(projectInfo);
    const defaultEntry = resolve(projectPath, 'src', 'main.ts');
    if (!existsSync(defaultEntry)) {
      await cp(templateFile, projectPath, { recursive: true });
    }

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

  } catch (error) {
    console.log(error)
  }
}()

function getScripts(jsonString: string) {
  const regex: RegExp = /"assetLocator":\s*"([^"]*)"/g;
  const values: string[] = [];

  for (const [_, match] of jsonString.matchAll(regex)) {
    if (String(match).startsWith('scripts/')) {
      values.push(match);
    }
  }

  return values;
}

async function getProjectInfo(root: string): Promise<ProjectInfo> {
  const getInfo = async (root: string) => {
    const files = await readdir(root);
    const projectFile = files.find(file => parse(file).ext == '.arproj');

    if (projectFile != undefined) {
      const projectFilePath = resolve(root, projectFile);
      console.log(greenBright('Found project'), bold(projectFilePath));

      // get tsconfig.json
      const tsconfigPath = resolve(root, 'scripts', 'tsconfig.json');
      if (!existsSync(tsconfigPath)) {
        throw yellowBright(`tsconfig.json not found, please create a JavaScript script in Meta Spark Studio.`);
      }

      // get script output
      const zip = await JSZip.loadAsync(await readFile(resolve(root, projectFilePath)));
      const main = zip.file('main.json');
      if (!main) {
        throw redBright('Invalid project file, is this file broken?');
      }

      const scripts = getScripts(await main.async('string'));
      if (scripts.length == 0) {
        throw yellowBright('No script found, please create a JavaScript script in Meta Spark Studio.');
      }

      const { outfile } = await inquirer.prompt<{ outfile: string }>([{
        type: 'list',
        name: 'outfile',
        message: 'Which script do you want to output in Meta Spark Studio? (will OVERWRITE it)',
        choices: scripts.map(script => ({ name: basename(script), value: script })),
      }]);

      return {
        tsconfig: resolve(root, 'scripts', 'tsconfig.json'),
        projectFile,
        outfile
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