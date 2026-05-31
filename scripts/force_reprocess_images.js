const mongoose = require('mongoose');
const Product = require('../models/Product');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function normalizeUploadedImage(file, { size = 1200 } = {}) {
    if (!file || !file.path || !file.filename) return null;

    const inputPath = file.path;
    const ext = (path.extname(file.filename) || '').toLowerCase();
    const base = path.basename(file.filename, ext);
    const outName = `${base}-${size}.webp`;
    const outPath = path.join(path.dirname(inputPath), outName);

    // Skip processing for GIFs to avoid breaking animations.
    if (ext === '.gif') {
        return {
            url: `/uploads/products/${file.filename}`,
            filename: file.filename,
            processed: false
        };
    }

    await sharp(inputPath)
        .rotate()
        .flatten({ background: { r: 255, g: 255, b: 255, alpha: 0 } }) // Remove white background, make transparent
        .resize(size, size, {
            fit: 'fill',
            background: { r: 255, g: 255, b: 255, alpha: 0 } // Ensure resize background is transparent
        })
        .webp({ quality: 82 })
        .toFile(outPath);

    // Remove the original upload to keep storage clean (best-effort).
    try {
        if (path.resolve(inputPath) !== path.resolve(outPath)) {
            fs.unlinkSync(inputPath);
        }
    } catch (_e) {
        // ignore
    }

    return {
        url: `/uploads/products/${outName}`,
        filename: outName,
        processed: true
    };
}

async function reprocessAll() {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/fashionhub';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    const products = await Product.find();
    let updated = 0, failed = 0;

    for (const product of products) {
        let changed = false;
        // Main image
        if (product.image && product.image.startsWith('/uploads/products/')) {
            const imgPath = product.image.replace('/uploads/', 'uploads/');
            const absPath = path.join(__dirname, imgPath);
            if (fs.existsSync(absPath)) {
                try {
                    const normalized = await normalizeUploadedImage({ path: absPath, filename: path.basename(absPath) }, { size: 1200 });
                    if (normalized?.url) {
                        product.image = normalized.url;
                        changed = true;
                    }
                } catch (e) {
                    console.error(`Failed to process ${absPath}:`, e);
                    failed++;
                }
            }
        }

        // Extra images
        if (Array.isArray(product.images)) {
            const newImages = [];
            for (const img of product.images) {
                if (img && img.startsWith('/uploads/products/')) {
                    const imgPath = img.replace('/uploads/', 'uploads/');
                    const absPath = path.join(__dirname, imgPath);
                    if (fs.existsSync(absPath)) {
                        try {
                            const normalized = await normalizeUploadedImage({ path: absPath, filename: path.basename(absPath) }, { size: 1200 });
                            newImages.push(normalized?.url || img);
                            changed = true;
                        } catch (e) {
                            console.error(`Failed to process ${absPath}:`, e);
                            newImages.push(img);
                            failed++;
                        }
                    } else {
                        newImages.push(img);
                    }
                } else {
                    newImages.push(img);
                }
            }
            if (changed) product.images = newImages;
        }

        if (changed) {
            await product.save();
            console.log(`Updated product: ${product._id} ${product.name}`);
            updated++;
        }
    }

    console.log(`Done. updated: ${updated} failed: ${failed}`);
    process.exit(0);
}

reprocessAll().catch(console.error);