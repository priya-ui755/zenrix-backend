const express = require('express');
const Product = require('../models/Product');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

            const imagePath = mainImage ? `/uploads/products/${mainImage.filename}` : (req.body.image || '');
            const imagesPaths = extraImages.map(f => `/uploads/products/${f.filename}`);

            const product = new Product({
                name: req.body.name,
                price: req.body.price,
                description: req.body.description,
                category: req.body.category,
                stock: req.body.stock,
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
    body('name').optional().isString().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('category').optional().isString().notEmpty(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const updates = { ...req.body };

            const mainImage = req.files?.image?.[0];
            const extraImages = req.files?.images || [];

            if (mainImage) {
                updates.image = `/uploads/products/${mainImage.filename}`;
            }

            if (extraImages.length) {
                updates.images = extraImages.map(f => `/uploads/products/${f.filename}`);
            }

            // Coerce boolean/number fields
            if (typeof updates.price !== 'undefined') updates.price = parseFloat(updates.price);
            if (typeof updates.stock !== 'undefined') updates.stock = parseInt(updates.stock, 10);
            if (typeof updates.featured !== 'undefined') updates.featured = updates.featured === 'on' || updates.featured === 'true' || updates.featured === true;

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