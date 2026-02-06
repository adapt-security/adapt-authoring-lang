#!/usr/bin/env node
/**
 * Checks for unused and missing language strings
*/
import fs from 'fs/promises'
import { glob } from 'glob'
import path from 'path'

const root = `${process.cwd().replaceAll(path.sep, '/')}/node_modules`

const underline = (s = '', topLine = true) => {
  const line = () => ''.padEnd(80, '-')
  console.log(`${topLine ? line() + '\n' : ''}  ${s}\n${line()}`)
}

async function check () {
  underline('Language String Check')
  
  const translatedStrings = await getTranslatedStrings()
  console.log('\n\  Languages found:')
  Object.keys(translatedStrings).forEach(l => console.log('  -', l))
  

  for (const lang of Object.keys(translatedStrings)) {
    console.log('\n')
    underline(`Language: ${lang}`.toUpperCase())

    const langStrings = translatedStrings[lang]
    const usedStrings = await getUsedStrings(langStrings)
    const unusedStrings = Object.entries(langStrings).filter(([k, v]) => !k.startsWith('error.') && !v).map(([k]) => k)
    const missingStrings = Object.entries(usedStrings).filter(([key]) => !langStrings[key] && !key.startsWith('error') && key !== 'app.js')

    console.log()
    if (unusedStrings.length) {
      logStrings(unusedStrings, 'translated strings unreferenced in the code')
      console.log()
    }
    if (missingStrings.length) {
      logStrings(missingStrings, 'strings without translation')
      console.log()
    }
    if (!unusedStrings.length && !missingStrings.length) {
      console.log('✓ No issues found!\n')
    }
    underline(`Summary:\n  - ${unusedStrings.length} unused language strings found\n  - ${missingStrings.length} missing language strings found`)
  }
  console.log()
}

async function getTranslatedStrings () {
  const langPacks = await glob(`${root}/adapt-authoring-langpack-*/lang`)
  const keyMap = {}
  await Promise.all((langPacks).map(async l => {
    await Promise.all((await fs.readdir(l)).map(async f => {
      const keys = JSON.parse(await fs.readFile(`${l}/${f}`))
      const [lang, id] = f.split('.')
      if (!keyMap[lang]) keyMap[lang] = {}
      Object.keys(keys)
        .map(k => `${id}.${k}`)
        .forEach(k => {
          keyMap[lang][k] = false
        })
    }))
  }))
  return keyMap
}

async function getUsedStrings (translatedStrings) {
  const usedStrings = {}
  const errorFiles = await glob('adapt-authoring-*/errors/*.json', { cwd: root, absolute: true })
  await Promise.all(errorFiles.map(async f => {
    Object.keys(JSON.parse((await fs.readFile(f)))).forEach(e => {
      const key = `error.${e}`
      if (!usedStrings[key]) usedStrings[key] = new Set()
      usedStrings[key].add(f.replace(root, '').split('/')[1]) // only add module name for errors
    })
  }))
  const sourceFiles = await glob('adapt-authoring-*/**/*.@(js|hbs)', { cwd: root, absolute: true, ignore: '**/node_modules/**' })

  await Promise.all(sourceFiles.map(async f => {
    const contents = (await fs.readFile(f)).toString()
    // Match all potential language keys in the file (app.*, error.*, etc.)
    const allMatches = contents.matchAll(/(['"`])((?:app|error)\.[\w.]+)\1/g)

    for (const m of allMatches) {
      const key = m[2]
      if (Object.hasOwn(translatedStrings, key)) {
        translatedStrings[key] = true
      }
      if (!usedStrings[key]) usedStrings[key] = new Set()
      usedStrings[key].add(f.replace(root, ''))
    }
  }))
  Object.entries(usedStrings).forEach(([k, set]) => {
    usedStrings[k] = `${Array.from(set).map(s => `\n    ${s}`).join('')}`
  })
  return usedStrings
}

function logStrings (strings, message) {
  if (!strings.length) {
    return console.log(`✓ No ${message}`);
  }
  underline(`Found ${strings.length} ${message}`)
  console.log(`${strings.map(s => `\n- ${s}`).join('')}`)
  process.exitCode = 1
}

check()
