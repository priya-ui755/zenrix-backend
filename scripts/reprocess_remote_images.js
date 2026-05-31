const mongoose = require('mongoose');
const Product = require('../models/Product');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

function downloadRemoteImage(url) {
  return new Promise(async (resolve) => {
    try {
      const parsed = new URL(url);
      const protocol = parsed.protocol === 'https:' ? https : http;
      const ext = path.extname(parsed.pathname) || '.jpg';
      const filename = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
      const outPath = path.join(uploadDir, filename);

      const req = protocol.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // follow redirect
          return resolve(downloadRemoteImage(res.headers.location));
        }
        if (res.statusCode !== 200) return resolve(null);
        const fileStream = fs.createWriteStream(outPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => fileStream.close(() => resolve({ path: outPath, filename })));
        fileStream.on('error', () => resolve(null));
      });
      req.on('error', () => resolve(null));
    } catch (e) {
      return resolve(null);
    }
  });
}

async function normalizeUploadedImage(file, { size = 1200 } = {}) {
  if (!file || !file.path || !file.filename) return null;
  const inputPath = file.path;
  const ext = (path.extname(file.filename) || '').toLowerCase();
  const base = path.basename(file.filename, ext);
  const outName = `${base}-${size}.webp`;
  const outPath = path.join(uploadDir, outName);

  if (ext === '.gif') return { url: `/uploads/products/${file.filename}`, filename: file.filename, processed: false };

  await sharp(inputPath)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255, alpha: 0 } }) // Remove white background, make transparent
    .resize(size, size, {
        fit: 'fill',
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Ensure resize background is transparent
    })
    .webp({ quality: 82 })
    .toFile(outPath);

  try { if (path.resolve(inputPath) !== path.resolve(outPath)) fs.unlinkSync(inputPath); } catch (e) {}

  return { url: `/uploads/products/${outName}`, filename: outName, processed: true };
}

async function run() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/fashionhub';
  console.log('Using mongo URL:', mongoUrl);
  await mongoose.connect(mongoUrl);
  console.log('Connected to MongoDB');
  const products = await Product.find();
  let updated = 0, failed = 0;
  for (const product of products) {
    let changed = false;
    try {
      // Process main image
      if (product.image) {
        if (product.image.startsWith('/uploads/products/')) {
          const imgPath = product.image.replace('/uploads/', 'uploads/');
          const absPath = path.join(__dirname, '..', imgPath);
          if (fs.existsSync(absPath)) {
            const ext = path.extname(absPath).toLowerCase();
            if (ext !== '.webp') {
              const normalized = await normalizeUploadedImage({ path: absPath, filename: path.basename(absPath) }, { size: 1200 });
              if (normalized?.url) { product.image = normalized.url; changed = true; }
            }
          }
        } else if (product.image.startsWith('http')) {
          const downloaded = await downloadRemoteImage(product.image);
          if (downloaded) {
            const normalized = await normalizeUploadedImage(downloaded, { size: 1200 });
            if (normalized && normalized.url) {
              product.image = normalized.url;
              changed = true;
            }
          }
        }
      }

      // Process extra images
      if (Array.isArray(product.images) && product.images.length) {
        const newImages = [];
        for (const img of product.images) {
          if (img) {
            if (img.startsWith('/uploads/products/')) {
              const imgPath = img.replace('/uploads/', 'uploads/');
              const absPath = path.join(__dirname, '..', imgPath);
              if (fs.existsSync(absPath)) {
                const ext = path.extname(absPath).toLowerCase();
                if (ext !== '.webp') {
                  const normalized = await normalizeUploadedImage({ path: absPath, filename: path.basename(absPath) }, { size: 1200 });
                  newImages.push(normalized?.url || img);
                  if (normalized?.url) changed = true;
                } else {
                  newImages.push(img);
                }
              } else {
                newImages.push(img);
              }
            } else if (img.startsWith('http')) {
              const d = await downloadRemoteImage(img);
              if (d) {
                const n = await normalizeUploadedImage(d, { size: 1200 });
                newImages.push((n && n.url) ? n.url : img);
                if (n && n.url) changed = true;
              } else newImages.push(img);
            } else {
              newImages.push(img);
            }
          }
        }
        product.images = newImages;
      }

      if (changed) {
        await product.save();
        updated++;
        console.log('Updated product:', product._id.toString(), product.name);
      }
    } catch (e) {
      failed++; console.error('Failed product:', product._id?.toString(), e.message || e);
    }
  }
  console.log('Done. updated:', updated, 'failed:', failed);
  process.exit(0);
}

run().catch(e=>{console.error(e); process.exit(1);});
