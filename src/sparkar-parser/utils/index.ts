import { readdir } from "fs/promises";
import { parse, resolve } from "path";

/**
 * The directory is considered a Spark AR project if it has an .arproj or .arprojbk file in it.
 * @param directory 
 * @returns 
 */
export async function getSparkARProjectFile(directory: string) {
  const files = await readdir(directory);
  const projectFile = files.find(file => parse(file).ext == '.arproj' || parse(file).ext == '.arprojbk');

  if (projectFile != undefined) {
    return resolve(directory, projectFile);
  }

  return projectFile;
}