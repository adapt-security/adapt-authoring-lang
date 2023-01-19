#!/usr/bin/env node
/**
 * Checks for string usage
*/
import fs from "fs/promises";
import globCb from "glob";
import { promisify } from "util";
const glob = promisify(globCb);

async function check() {
  console.log('Checking for unused language strings');
  const root = `${process.cwd()}/node_modules`;
  const langPacks = await glob(`${root}/adapt-authoring-langpack-*/lang`);
  const stringKeys = {};

  await Promise.all((langPacks).map(async l => {
    await Promise.all((await fs.readdir(l)).map(async f => {
      const keys = JSON.parse(await fs.readFile(`${l}/${f}`));
      const id = f.split('.')[1];
      if(id === 'error') {
        return;
      }
      Object.keys(keys)
        .map(k => `${id}.${k}`)
        .forEach(k => stringKeys[k] = false);
    }));
  }));
  const keys = Object.keys(stringKeys);
  const files = await glob(`${root}/adapt-authoring-ui/**/*.@(js|hbs)`, { absolute: true });
  await Promise.all(files.map(async f => {
    const contents = (await fs.readFile(f)).toString();
    keys.forEach(k => contents.includes(k) ? stringKeys[k] = true : null);
  }));
  const unusedKeys = Object.entries(stringKeys).filter(([k,v]) => !v).map(([k]) => k);
  if(unusedKeys.length) {
    unusedKeys.forEach(k => console.log(`- ${k}`));
    console.log(`${unusedKeys.length} unused language strings found`);
  }
  else console.log('No unused strings!');
}

check();