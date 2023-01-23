import { readdir } from "fs/promises";
import { parse, resolve } from "path";

/**
 * The directory is considered a Spark AR project if there is an `.arproj` file in it.
 * @param directory 
 * @returns 
 */
export async function getSparkARProjectFile(directory: string) {
  const files = await readdir(directory);
  const projectFile = files.find(file => parse(file).ext == '.arproj');

  if (projectFile != undefined) {
    return resolve(directory, projectFile);
  }

  return projectFile;
}