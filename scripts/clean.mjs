import { rm } from 'node:fs/promises';

const DIRS = ['dist', 'screenshots'];

for (const dir of DIRS) {
  try {
    await rm(dir, { recursive: true, force: true });
    console.log(`cleaned  ${dir}`);
  } catch (err) {
    console.error(`failed to clean ${dir}:`, err);
  }
}
