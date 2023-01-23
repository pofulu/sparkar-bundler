import { yellowBright } from 'ansi-colors';
import commandLineUsage from 'command-line-usage';
import meow from 'meow';
import { resolve } from 'path';
import updateNotifier from 'update-notifier';
import packageJson from '../package.json';
import { interactiveMode } from './interactive';
import { fuzzyParseSparkARProject, generateTypeScriptConfig } from './sparkar-parser';


export const templateFile = `${__dirname}/../template`;

updateNotifier({ pkg: packageJson }).notify();

void async function main() {
  const { flags } = meow(commandLineUsage(
    [{
      optionList: [
        { name: 'help', alias: 'h', typeLabel: ' ', description: `Print command line usage.` },
        { name: 'tsconfig', alias: 't', typeLabel: '[output]', description: `Generate tsconfig.json by Spark AR, default output is ./src.` }
      ]
    }]),
    {
      importMeta: { url: import.meta.url },
      flags: {
        help: { alias: 'h' },
        tsconfig: { alias: 't', type: 'string' }
      },
    })


  try {
    const projectPath = resolve();
    if (Object.keys(flags).length == 0) {
      await interactiveMode(projectPath);
      return;
    }

    if (flags.tsconfig != undefined) {
      const outputDir = String(flags.tsconfig).trim() == '' ? 'src' : flags.tsconfig;
      const project = await fuzzyParseSparkARProject(projectPath);

      if (project == undefined) {
        throw yellowBright('Project not found');
      }

      if (project.tsconfig == undefined) {
        throw yellowBright(`tsconfig.json not found, please create a script in Meta Spark Studio.`)
      }

      const tsconfig = await project.tsconfig.json();
      await generateTypeScriptConfig(tsconfig, outputDir);
    }
  } catch (error) {
    console.log(error);
  }
}()