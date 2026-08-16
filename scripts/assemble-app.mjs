import fs from 'node:fs/promises';
import path from 'node:path';

const dir = path.resolve('.bootstrap/app');
const names = (await fs.readdir(dir)).filter(n => n.endsWith('.part.js')).sort();
if (!names.length) throw new Error('No app bootstrap parts found');
const parts = await Promise.all(names.map(name => fs.readFile(path.join(dir, name), 'utf8')));
await fs.writeFile(path.resolve('public/app.js'), parts.join(''));
console.log(`assembled public/app.js from ${names.length} parts`);
