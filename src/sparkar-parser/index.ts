import { redBright, yellowBright } from "ansi-colors";
import { existsSync } from "fs";
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import JSZip from "jszip";
import { basename, dirname, extname, parse, resolve } from "path";
import { TSConfigJSON } from "types-tsconfig";
import baseConfig from "./baseConfig";
import { getImportedScripts } from "./internal";
import { getSparkARProjectFile } from "./utils";

type SparkARScript = {
  /** Whether this code has already been imported into the project */
  imported: boolean;
  type: 'JavaScript' | 'TypeScript';
  path: string;
};

type SparkARProject = {
  arproj: string;
  tsconfig?: {
    path: string,
    json: () => Promise<TSConfigJSON>
  };
  scripts: SparkARScript[];
}

export async function parseProjectJSON(arproj: string) {
  const zip = await JSZip.loadAsync(await readFile(arproj));
  const main = zip.file('main.json');
  if (!main) {
    throw redBright('Invalid project file, is this file broken?');
  }

  return await main.async('string');
}

export async function fuzzyParseSparkARProject(direcotry: string) {
  const sparkARProject = await parseSparkARProject(direcotry);
  if (sparkARProject != undefined) {
    return sparkARProject;
  }

  for (const file of await readdir(direcotry)) {
    const sparkARProject = await parseSparkARProject(resolve(direcotry, file));
    if (sparkARProject != undefined) {
      return sparkARProject;
    }
  }
}

export async function parseSparkARProject(directory: string): Promise<SparkARProject | undefined> {
  if (!(await stat(directory)).isDirectory()) {
    return undefined;
  }

  // parse arproj file, it's required.
  const projectFilePath = await getSparkARProjectFile(directory);
  if (projectFilePath == undefined) {
    return undefined;
  }

  // parse tsconfig
  const tsconfig: SparkARProject['tsconfig'] = (() => {
    const path = resolve(directory, 'scripts', 'tsconfig.json');
    if (!existsSync(path)) {
      return undefined;
    }

    return {
      path: path,
      async json() {
        return JSON.parse(await readFile(path, 'utf8')) as TSConfigJSON;
      }
    }
  })();

  // parse sparkar scripts
  const importedScripts = getImportedScripts(await parseProjectJSON(projectFilePath)).map(p => basename(p));
  const scripts = (await readdir(resolve(directory, 'scripts')))
    .filter(file => extname(file) == '.js' || extname(file) == '.ts');

  const sparkarScripts: SparkARScript[] & { tsconfig?: string } = [];
  for (const script of scripts) {
    sparkarScripts.push({
      imported: importedScripts.includes(script),
      path: resolve(resolve(directory, 'scripts', script)),
      type: extname(script) == '.js' ? 'JavaScript' : 'TypeScript'
    })
  }

  return {
    arproj: projectFilePath,
    scripts: sparkarScripts,
    tsconfig
  }
}

export async function generateTypeScriptConfig(tsconfig: {
  compilerOptions?: {
    baseUrl?: string;
    paths?: { [key: string]: string[] };
  }
}, outputDir: string) {
  const baseUrl = tsconfig.compilerOptions?.baseUrl;
  const paths = tsconfig.compilerOptions?.paths?.['*'] ?? [];

  for (let path of paths) {
    path = `${baseUrl}/${path}`;
    baseConfig.compilerOptions.paths['*'].push(path);
  }

  const tsconfigOutputPath = resolve(outputDir, 'tsconfig.json');
  await mkdir(parse(tsconfigOutputPath).dir, { recursive: true });
  await writeFile(tsconfigOutputPath, JSON.stringify(baseConfig, null, 2));

  return {
    path: tsconfigOutputPath,
    json() {
      return structuredClone(baseConfig)
    }
  };
}

export async function getAPIList(tsconfig: {
  compilerOptions?: {
    baseUrl?: string;
    paths?: { [key: string]: string[] };
  }
}) {
  const paths = tsconfig.compilerOptions?.paths?.['*'] ?? [];
  const defs = paths.find(path => path.includes('skylight-typedefs'));
  if (!defs) {
    return [];
  }

  const baseUrl = tsconfig.compilerOptions?.baseUrl;
  const apiDir = baseUrl == undefined ?
    dirname(defs) :
    resolve(baseUrl, dirname(defs));

  if (!existsSync(apiDir)) {
    throw yellowBright(`tsconfig.json no longer valid`);
  }
  const files = await readdir(apiDir);
  return files.map(file => file.split('.')).filter(arr => arr.length == 1).flat();
}
