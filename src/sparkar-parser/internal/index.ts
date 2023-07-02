export function getImportedScripts(jsonString: string) {
  const regex: RegExp = /"assetLocator":\s*"([^"]*)"/g;
  const values: string[] = [];

  for (const [_, match] of jsonString.matchAll(regex)) {
    if (String(match).startsWith('scripts/')) {
      values.push(match);
    }
  }

  return values;
}