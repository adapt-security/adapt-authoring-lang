#!/usr/bin/env node
/**
 * Checks for unused and missing language strings
*/
import fs from 'fs/promises'
import { glob } from 'glob'
import path from 'path'

const root = `${process.cwd().replaceAll(path.sep, '/')}/node_modules`

async function check () {
  console.log('Checking for unused language strings')

  const translatedStrings = await getTranslatedStrings()
  const usedStrings = await getUsedStrings(translatedStrings)

  logUnusedStrings(translatedStrings)
  logMissingStrings(translatedStrings, usedStrings)
}

async function getTranslatedStrings () {
  const langPacks = await glob(`${root}/adapt-authoring-langpack-*/lang`)
  const keyMap = {}
  await Promise.all((langPacks).map(async l => {
    await Promise.all((await fs.readdir(l)).map(async f => {
      const keys = JSON.parse(await fs.readFile(`${l}/${f}`))
      const id = f.split('.')[1]
      Object.keys(keys)
        .map(k => `${id}.${k}`)
        .forEach(k => {
          keyMap[k] = false
        })
    }))
  }))
  return keyMap
}

async function getUsedStrings (translatedStrings) {
  const translatedKeys = Object.keys(translatedStrings)
  const usedStrings = {}
  const errorFiles = await glob(`${root}/adapt-authoring-*/errors/*.json`, { absolute: true })
  await Promise.all(errorFiles.map(async f => {
    Object.keys(JSON.parse((await fs.readFile(f)))).forEach(e => {
      const key = `error.${e}`
      if (!usedStrings[key]) usedStrings[key] = new Set()
      usedStrings[key].add(f.replace(root, '').split('/')[1]) // only add module name for errors
    })
  }))
  const sourceFiles = await glob(`${root}/adapt-authoring-*/**/*.@(js|hbs)`, { absolute: true })
  await Promise.all(sourceFiles.map(async f => {
    const contents = (await fs.readFile(f)).toString()
    translatedKeys.forEach(k => {
      translatedStrings[k] = contents.includes(k) ? true : undefined
    })
    const match = contents.matchAll(/['|"|`|](app\.[\w|.]+)\W/g)
    if (match) {
      for (const m of match) {
        const key = m[1]
        if (!usedStrings[key]) usedStrings[key] = new Set()
        usedStrings[key].add(f.replace(root, ''))
      }
    }
  }))
  return usedStrings
}

function logUnusedStrings (data) {
  const unusedKeys = Object.entries(data).filter(([k, v]) => !k.startsWith('error.') && !v).map(([k]) => k)
  console.log('')
  if (unusedKeys.length) {
    unusedKeys.forEach(k => console.log(`- ${k}`))
    console.log(`\n${unusedKeys.length} unused language strings found`)
    process.exitCode = 1
  } else {
    console.log('\nNo unused strings!')
  }
}

function logMissingStrings (translatedStrings, usedStrings) {
  console.log('')
  const translatedKeys = Object.keys(translatedStrings)
  const missingStrings = Object.entries(usedStrings).filter(([key]) => !translatedKeys.includes(key) && key !== 'app.js')
  if (missingStrings.length) {
    const sep = '\n   => '
    missingStrings.forEach(([key, files]) => console.log(`- ${key}${sep}${Array.from(files).join(sep)}`))
    console.log(`\n${missingStrings.length} missing language strings found`)
    process.exitCode = 1
  } else {
    console.log('\nNo missing strings!')
  }
}

check()
