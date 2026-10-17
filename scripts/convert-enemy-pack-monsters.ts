/**
 * One-off importer: turns the Tiny Swords Enemy Pack idle/attack sprite sheets into
 * monster GIFs under public/monster/. Each sheet is a horizontal strip of square frames.
 *
 * Levels are random per monster (non-boss, 1-3) and the same for its idle and attack GIF.
 * Run `npm run generate:monster-catalog` afterwards to refresh the generated catalog sources.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import sharp from 'sharp';
import {
  MAX_NON_BOSS_LEVEL,
  MIN_LEVEL,
  buildMonsterSpriteFilename,
} from '../src/modules/game-rules/monster-catalog-generator';

const projectRoot = path.resolve(__dirname, '..');
const enemyPackDirectory = path.join(projectRoot, 'public/tiny-swords/Enemy Pack');
const monsterDirectory = path.join(projectRoot, 'public/monster');

const OUTPUT_SIZE_PX = 256; // matches the existing monster GIFs in public/monster
const FRAME_DELAY_MS = 150; // matches the existing monster GIFs

interface EnemyPackMonster {
  /** Folder under Enemy Pack, used to name the monster. */
  folder: string;
  /** Paths relative to Enemy Pack; the attack sheet is named differently for Spear Goblin. */
  idleSheet: string;
  attackSheet: string;
}

const MONSTERS: EnemyPackMonster[] = [
  { folder: 'Bumblebee', idleSheet: 'Bumblebee/Bumblebee_Idle.png', attackSheet: 'Bumblebee/Bumblebee_Attack.png' },
  { folder: 'Giant Bat', idleSheet: 'Giant Bat/Giant Bat_Idle.png', attackSheet: 'Giant Bat/Giant Bat_Attack.png' },
  { folder: 'Gnome', idleSheet: 'Gnome/Gnome_Idle.png', attackSheet: 'Gnome/Gnome_Attack.png' },
  { folder: 'Hex Shaman', idleSheet: 'Hex Shaman/Hex Shaman_Idle.png', attackSheet: 'Hex Shaman/Hex Shaman_Attack.png' },
  { folder: 'Lizard', idleSheet: 'Lizard/Lizard_Idle.png', attackSheet: 'Lizard/Lizard_Attack.png' },
  { folder: 'Paddle Shark', idleSheet: 'Paddle Shark/Paddle Shark_Idle.png', attackSheet: 'Paddle Shark/Paddle Shark_Attack.png' },
  { folder: 'Panda', idleSheet: 'Panda/Panda_Idle.png', attackSheet: 'Panda/Panda_Attack.png' },
  {
    folder: 'Pig Rider Spear Goblin',
    idleSheet: 'Extra/Pig Rider Spear Goblin/Pig Rider_Idle.png',
    attackSheet: 'Extra/Pig Rider Spear Goblin/Pig Rider_Attack.png',
  },
  { folder: 'Skull', idleSheet: 'Skull/Skull_Idle.png', attackSheet: 'Skull/Skull_Attack.png' },
  { folder: 'Snake', idleSheet: 'Snake/Snake_Idle.png', attackSheet: 'Snake/Snake_Attack.png' },
  {
    folder: 'Spear Goblin',
    idleSheet: 'Spear Goblin/Spear Goblin_Idle.png',
    attackSheet: 'Spear Goblin/Spear Goblin_Attack Fast.png',
  },
  { folder: 'Spider', idleSheet: 'Spider/Spider_Idle.png', attackSheet: 'Spider/Spider_Attack.png' },
  { folder: 'Thief', idleSheet: 'Thief/Thief_Idle.png', attackSheet: 'Thief/Thief_Attack.png' },
  { folder: 'Torch Goblin', idleSheet: 'Torch Goblin/Torch Goblin_Idle.png', attackSheet: 'Torch Goblin/Torch Goblin_Attack.png' },
  { folder: 'Troll', idleSheet: 'Troll/Troll_Idle.png', attackSheet: 'Troll/Troll_Attack.png' },
  { folder: 'Turtle', idleSheet: 'Turtle/Turtle_Idle.png', attackSheet: 'Turtle/Turtle_Attack.png' },
];

function randomNonBossLevel(): number {
  return MIN_LEVEL + Math.floor(Math.random() * (MAX_NON_BOSS_LEVEL - MIN_LEVEL + 1));
}

/** Splits a horizontal strip of square frames into RGBA buffers at the output size. */
async function readFrames(sheetPath: string): Promise<Buffer[]> {
  const { width = 0, height = 0 } = await sharp(sheetPath).metadata();
  if (height === 0 || width % height !== 0) {
    throw new Error(`${sheetPath} is not a strip of square frames (${width}x${height})`);
  }
  const frameCount = width / height;
  const frames: Buffer[] = [];
  for (let index = 0; index < frameCount; index += 1) {
    const frame = await sharp(sheetPath)
      .extract({ left: index * height, top: 0, width: height, height })
      .resize(OUTPUT_SIZE_PX, OUTPUT_SIZE_PX, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer();
    frames.push(frame);
  }
  return frames;
}

/** Encodes RGBA frames as an infinitely looping GIF with one-bit transparency. */
function encodeGif(frames: Buffer[]): Buffer {
  const encoder = GIFEncoder();
  for (const rgba of frames) {
    const palette = quantize(rgba, 256, { format: 'rgba4444', oneBitAlpha: true });
    const indexed = applyPalette(rgba, palette, 'rgba4444');
    encoder.writeFrame(indexed, OUTPUT_SIZE_PX, OUTPUT_SIZE_PX, {
      palette,
      delay: FRAME_DELAY_MS,
      transparent: true,
    });
  }
  encoder.finish();
  return Buffer.from(encoder.bytes());
}

async function convertMonster(monster: EnemyPackMonster): Promise<string> {
  const level = randomNonBossLevel();
  const idleGif = encodeGif(await readFrames(path.join(enemyPackDirectory, monster.idleSheet)));
  const attackGif = encodeGif(await readFrames(path.join(enemyPackDirectory, monster.attackSheet)));
  const name = monster.folder;
  const idleFile = buildMonsterSpriteFilename(name, level, false, 'idle');
  const attackFile = buildMonsterSpriteFilename(name, level, false, 'attack');
  writeGif(idleFile, idleGif);
  writeGif(attackFile, attackGif);
  return `${idleFile}, ${attackFile}`;
}

function writeGif(filename: string, bytes: Buffer): void {
  writeFileSync(path.join(monsterDirectory, filename), bytes);
}

async function main(): Promise<void> {
  mkdirSync(monsterDirectory, { recursive: true });
  for (const monster of MONSTERS) {
    const written = await convertMonster(monster);
    console.warn(`${monster.folder}: ${written}`);
  }
}

void main();
