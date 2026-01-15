const express = require('express');
const Product = require('../models/Product');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `${unique}${ext}`);
    }
});

const fileFilter = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (jpeg, png, webp, gif)'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Admin: Reprocess all product images to normalized format
router.post('/reprocess-images', requireAdmin, async (req, res) => {
    try {
        const products = await Product.find();
        let updated = 0, failed = 0;
        for (const product of products) {
            let changed = false;
            // Main image
            if (product.image) {
                try {
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
                        // download remote image and normalize
                        const downloaded = await downloadRemoteImage(product.image);
                        if (downloaded) {
                            try {
                                const normalized = await normalizeUploadedImage(downloaded, { size: 1200 });
                                if (normalized?.url) { product.image = normalized.url; changed = true; }
                            } catch (e) { failed++; }
                        }
                    }
                } catch (e) { failed++; }
            }
            // Extra images
            if (Array.isArray(product.images)) {
                const newImages = [];
                    for (const img of product.images) {
                        try {
                            if (img && img.startsWith('/uploads/products/')) {
                                const imgPath = img.replace('/uploads/', 'uploads/');
                                const absPath = path.join(__dirname, '..', imgPath);
                                if (fs.existsSync(absPath)) {
                                    const ext = path.extname(absPath).toLowerCase();
                                    if (ext !== '.webp') {
                                        const normalized = await normalizeUploadedImage({ path: absPath, filename: path.basename(absPath) }, { size: 1200 });
                                        newImages.push(normalized?.url || img);
                                        changed = true;
                                    } else {
                                        newImages.push(img);
                                    }
                                } else {
                                    newImages.push(img);
                                }
                            } else if (img && img.startsWith('http')) {
                                const downloaded = await downloadRemoteImage(img);
                                if (downloaded) {
                                    try {
                                        const normalized = await normalizeUploadedImage(downloaded, { size: 1200 });
                                        newImages.push(normalized?.url || img);
                                        changed = true;
                                    } catch (e) { newImages.push(img); failed++; }
                                } else {
                                    newImages.push(img);
                                }
                            } else {
                                newImages.push(img);
                            }
                        } catch (e) { newImages.push(img); failed++; }
                    }
                if (JSON.stringify(newImages) !== JSON.stringify(product.images)) {
                    product.images = newImages;
                    changed = true;
                }
            }
            if (changed) {
                await product.save();
                updated++;
            }
        }
        res.json({ success: true, updated, failed });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

async function normalizeUploadedImage(file, { size = 1200, background = '#ffffff' } = {}) {
    if (!file || !file.path || !file.filename) return null;

    const inputPath = file.path;
    const ext = (path.extname(file.filename) || '').toLowerCase();
    const base = path.basename(file.filename, ext);
    const outName = `${base}-${size}.webp`;
    const outPath = path.join(uploadDir, outName);

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

// Download a remote image URL into the uploadDir and return an object compatible with normalizeUploadedImage
async function downloadRemoteImage(url) {
    try {
        const parsed = new URL(url);
        const protocol = parsed.protocol === 'https:' ? https : http;
        const ext = path.extname(parsed.pathname) || '.jpg';
        const filename = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
        const outPath = path.join(uploadDir, filename);

        await new Promise((resolve, reject) => {
            const req = protocol.get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    // follow redirect
                    return resolve(downloadRemoteImage(res.headers.location));
                }
                if (res.statusCode !== 200) return reject(new Error('Failed to download image: ' + res.statusCode));
                const fileStream = fs.createWriteStream(outPath);
                res.pipe(fileStream);
                fileStream.on('finish', () => fileStream.close(resolve));
                fileStream.on('error', reject);
            });
            req.on('error', reject);
        });

        return { path: outPath, filename };
    } catch (e) {
        return null;
    }
}

// GET all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json({ success: true, count: products.length, data: products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create product (protected)
router.post('/', requireAdmin,
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'images', maxCount: 4 }
    ]),
    body('name').isString().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('category').isString().notEmpty(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const mainImage = req.files?.image?.[0];
            const extraImages = req.files?.images || [];

            let imagePath = req.body.image || '';
            if (mainImage) {
                const normalized = await normalizeUploadedImage(mainImage, { size: 1200 });
                imagePath = normalized?.url || `/uploads/products/${mainImage.filename}`;
            }

            const normalizedExtras = await Promise.all(
                extraImages.map(async (f) => {
                    try {
                        const normalized = await normalizeUploadedImage(f, { size: 1200 });
                        return normalized?.url || `/uploads/products/${f.filename}`;
                    } catch (_e) {
                        return `/uploads/products/${f.filename}`;
                    }
                })
            );
            const imagesPaths = normalizedExtras.filter(Boolean);

            const saleEnd = req.body.saleEnd ? new Date(req.body.saleEnd) : undefined;
            const parsedSaleEnd = saleEnd && !isNaN(saleEnd) ? saleEnd : undefined;

            const parsedSalePrice = (typeof req.body.salePrice !== 'undefined' && req.body.salePrice !== '') ? parseFloat(req.body.salePrice) : undefined;
            const parsedStock = Number.isFinite(parseInt(req.body.stock, 10)) ? parseInt(req.body.stock, 10) : 0;

            const product = new Product({
                name: req.body.name,
                price: parseFloat(req.body.price),
                salePrice: parsedSalePrice,
                onSale: req.body.onSale === 'on' || req.body.onSale === true,
                saleLabel: req.body.saleLabel,
                saleEnd: parsedSaleEnd,
                description: req.body.description,
                category: req.body.category,
                stock: parsedStock,
                featured: req.body.featured === 'on' || req.body.featured === true,
                image: imagePath || undefined,
                images: imagesPaths.length ? imagesPaths : []
            });

            await product.save();
            res.status(201).json({ success: true, data: product });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
);

// UPDATE product (protected)
router.put('/:id', requireAdmin,
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'images', maxCount: 4 }
    ]),
    async (req, res) => {
        try {
            const updates = { ...req.body };

            // Basic validation
            if (updates.name && typeof updates.name !== 'string') {
                return res.status(400).json({ success: false, error: 'Name must be a string' });
            }
            if (updates.price && isNaN(parseFloat(updates.price))) {
                return res.status(400).json({ success: false, error: 'Price must be a number' });
            }
            if (updates.category && typeof updates.category !== 'string') {
                return res.status(400).json({ success: false, error: 'Category must be a string' });
            }

            const mainImage = req.files?.image?.[0];
            const extraImages = req.files?.images || [];

            if (mainImage) {
                const normalized = await normalizeUploadedImage(mainImage, { size: 1200 });
                updates.image = normalized?.url || `/uploads/products/${mainImage.filename}`;
            }

            if (extraImages.length) {
                const normalizedExtras = await Promise.all(
                    extraImages.map(async (f) => {
                        try {
                            const normalized = await normalizeUploadedImage(f, { size: 1200 });
                            return normalized?.url || `/uploads/products/${f.filename}`;
                        } catch (_e) {
                            return `/uploads/products/${f.filename}`;
                        }
                    })
                );
                updates.images = normalizedExtras.filter(Boolean);
            }

            // Coerce boolean/number fields
            if (typeof updates.price !== 'undefined') updates.price = parseFloat(updates.price);
            if (typeof updates.salePrice !== 'undefined') updates.salePrice = updates.salePrice === '' ? undefined : parseFloat(updates.salePrice);
            if (typeof updates.stock !== 'undefined') updates.stock = parseInt(updates.stock, 10);
            if (typeof updates.featured !== 'undefined') updates.featured = updates.featured === 'on' || updates.featured === 'true' || updates.featured === true;
            if (typeof updates.onSale !== 'undefined') updates.onSale = updates.onSale === 'on' || updates.onSale === 'true' || updates.onSale === true;
            if (typeof updates.saleEnd !== 'undefined') {
                const saleEnd = updates.saleEnd ? new Date(updates.saleEnd) : undefined;
                updates.saleEnd = saleEnd && !isNaN(saleEnd) ? saleEnd : undefined;
            }

            const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
            if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
            res.json({ success: true, data: product });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
);

// DELETE product (protected)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Product deleted successfully',
            deletedId: product._id
        });
        
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

module.exports = router;