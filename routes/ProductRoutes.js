const express = require('express');
const Product = require('../models/Product');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');

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
    // validation
    body('name').isString().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('category').isString().notEmpty(),
    async (req, res) => {
        // run validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const product = new Product(req.body);
            await product.save();
            res.status(201).json({ success: true, data: product });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
);

// UPDATE product (protected)
router.put('/:id', requireAdmin,
    body('name').optional().isString().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('category').optional().isString().notEmpty(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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