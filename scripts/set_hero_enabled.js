/*
  Usage:
    node scripts/set_hero_enabled.js false
    node scripts/set_hero_enabled.js true

  Connects to the same MongoDB URI as server.js and updates the single Hero document.
*/

require('dotenv').config();
const mongoose = require('mongoose');
const Hero = require('../models/Hero');

async function main() {
  const arg = (process.argv[2] || '').toLowerCase();
  const enabled = arg === 'true' ? true : (arg === 'false' ? false : false);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zenrix';

  await mongoose.connect(mongoUri, { autoIndex: true });

  let hero = await Hero.findOne();
  if (!hero) {
    hero = new Hero();
  }

  hero.enabled = enabled;
  await hero.save();

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ success: true, enabled: hero.enabled, id: String(hero._id) }));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to set hero enabled:', err);
  try { await mongoose.disconnect(); } catch (_e) {}
  process.exitCode = 1;
});
