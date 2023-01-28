import { blueBright, gray, yellowBright } from 'ansi-colors';
import commandLineUsage from 'command-line-usage';
import JoyCon from 'joycon';
import meow from 'meow';
import { resolve } from 'path';
import updateNotifier from 'update-notifier';
import packageJson from '../package.json';
import { configMode } from './configMode';
import { interactiveMode } from './interactive';
import { fuzzyParseSparkARProject, generateTypeScriptConfig } from './sparkar-parser';

updateNotifier({ pkg: packageJson }).notify();

void async function main() {
  const { flags } = meow(commandLineUsage(
    [
      {
        header: 'Usage',
        content: [
          'sparkar-bundler [options]',
          '',
          gray('If no parameters are passed, it will start in interactive mode'),
        ],
      },
      {
        header: 'Options',
        optionList: [
          { name: 'help', alias: 'h', typeLabel: ' ', description: `Print command line usage.` },
          { name: 'tsconfig', alias: 't', typeLabel: '[output-dir]', description: `Generate tsconfig.json by Spark AR, default output is 'src'.` },
        ]
      }
    ]),
    {
      importMeta: { url: import.meta.url },
      flags: {
        help: { alias: 'h' },
        tsconfig: { alias: 't', type: 'string' }
      },
    })

  try {
    const projectPath = resolve();

    // if no args passed
    if (Object.keys(flags).length == 0) {
      const joycon = new JoyCon();
      const result = await joycon.load(['sparkar-bundler.config.json']);

      if (result.data == undefined) {
        await interactiveMode(projectPath);
      } else {
        console.log(blueBright('Using config:'), result.path);
        await configMode(result.data, projectPath);
      }
      return;
    }

    // pass -t flag
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