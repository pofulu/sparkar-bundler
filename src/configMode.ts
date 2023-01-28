import { greenBright, yellowBright } from 'ansi-colors';
import { build } from 'esbuild';
import { dirname } from 'path';
import { fuzzyParseSparkARProject, generateTypeScriptConfig, getAPIList } from './sparkar-parser';

export async function configMode(config: { input: string; output: string; }, projectPath: string) {
  const project = await fuzzyParseSparkARProject(projectPath);

  if (project == undefined) {
    throw yellowBright('Project not found');
  }

  if (project.tsconfig == undefined) {
    throw yellowBright(`tsconfig.json not found, please create a script in Meta Spark Studio.`);
  }

  const tsconfig = await project.tsconfig.json();
  await generateTypeScriptConfig(tsconfig, dirname(config.input));

  const apiList = await getAPIList(tsconfig);
  console.log(greenBright('APIs'), apiList.join(', '));

  await build({
    entryPoints: [config.input],
    outfile: config.output,
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
    external: apiList
  });
}
