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
        { name: 'help', alias: 'h', typeLabel: ' ', description: `Print command line usgae.` },
        { name: 'tsconfig', alias: 't', typeLabel: ' ', description: `Generate tsconfig.json to ./src by Spark AR.` }
      ]
    }]),
    {
      importMeta: { url: import.meta.url },
      flags: {
        help: { alias: 'h' },
        tsconfig: { alias: 't' }
      },
    })

  try {
    const projectPath = resolve();
    if (Object.keys(flags).length == 0) {
      await interactiveMode(projectPath);
    } else if (flags.tsconfig) {
      const project = await fuzzyParseSparkARProject(projectPath);

      if (project == undefined) {
        throw yellowBright('Project not found');
      }

      if (project.tsconfig == undefined) {
        throw yellowBright(`tsconfig.json not found, please create a script in Meta Spark Studio.`)
      }

      const tsconfig = await project.tsconfig.json();
      await generateTypeScriptConfig(tsconfig);
    }
  } catch (error) {
    console.log(error);
  }
}()