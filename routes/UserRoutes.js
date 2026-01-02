const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Multer setup for avatar uploads
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

const paymentProofsDir = path.join(__dirname, '..', 'uploads', 'payment-proofs');
fs.mkdirSync(paymentProofsDir, { recursive: true });
const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, paymentProofsDir),
  filename: (_req, file, cb) => {
    const parsed = path.parse(file.originalname || 'proof');
    const extension = (parsed.ext || '.png').toLowerCase();
    const safeBase = (parsed.name || 'proof').replace(/[^a-zA-Z0-9\-_]/g, '_');
    cb(null, `${Date.now()}-${safeBase}${extension}`);
  }
});
const proofUpload = multer({
  storage: proofStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

// Middleware to verify user token
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Test route to verify routing works
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'User routes are working' });
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Registration request received:', { body: req.body });
    const { firstName, lastName, email, password } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      console.error('❌ Missing fields:', { firstName, lastName, email, password });
      return res.status(400).json({ success: false, error: 'Missing required fields: firstName, lastName, email, password' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.warn('⚠️  Email already registered:', email);
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    
    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    console.log('💾 Creating user in database...');
    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword
    });
    
    await user.save();
    console.log('✅ User saved to database:', { id: user._id, email: user.email });
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
    console.log('🔑 JWT token generated for user:', user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        membershipTier: user.membershipTier
      }
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        membershipTier: user.membershipTier,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender, avatar } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (avatar) user.avatar = avatar;
    
    await user.save();
    
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Change password
router.put('/change-password', authenticateUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    
    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add address
router.post('/addresses', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // If this is the first address or marked as default, set as default
    if (user.addresses.length === 0 || req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }
    
    user.addresses.push(req.body);
    await user.save();
    
    res.json({ success: true, data: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all addresses
router.get('/addresses', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update address
router.put('/addresses/:addressId', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }
    
    // If setting as default, unset others
    if (req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }
    
    Object.assign(address, req.body);
    await user.save();
    
    res.json({ success: true, data: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete address
router.delete('/addresses/:addressId', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    user.addresses.pull(req.params.addressId);
    await user.save();
    
    res.json({ success: true, data: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Wishlist operations
router.get('/wishlist', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('wishlist');
    res.json({ success: true, data: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

  // Get cart
  router.get('/cart', authenticateUser, async (req, res) => {
    try {
      const user = await User.findById(req.userId).populate('cart.product');
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({ success: true, data: user.cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Add to cart
  router.post('/cart', authenticateUser, async (req, res) => {
    try {
      const { productId, quantity = 1 } = req.body;
      if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const existing = user.cart.find(item => item.product?.toString() === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        user.cart.push({ product: productId, quantity });
      }
      await user.save();
      res.json({ success: true, data: user.cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update cart item quantity
  router.put('/cart/:itemId', authenticateUser, async (req, res) => {
    try {
      const { quantity } = req.body;
      if (!quantity || quantity < 1) return res.status(400).json({ success: false, error: 'quantity must be >= 1' });
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      const item = user.cart.id(req.params.itemId);
      if (!item) return res.status(404).json({ success: false, error: 'Cart item not found' });
      item.quantity = quantity;
      await user.save();
      res.json({ success: true, data: user.cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Remove cart item
  router.delete('/cart/:itemId', authenticateUser, async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      user.cart.pull(req.params.itemId);
      await user.save();
      res.json({ success: true, data: user.cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

// Orders summary
router.get('/orders/summary', authenticateUser, async (req, res) => {
  try {
    const [total, pending, completed, canceled] = await Promise.all([
      Order.countDocuments({ user: req.userId }),
      Order.countDocuments({ user: req.userId, status: 'Pending' }),
      Order.countDocuments({ user: req.userId, status: 'Completed' }),
      Order.countDocuments({ user: req.userId, status: 'Canceled' })
    ]);
    res.json({ success: true, data: { total, pending, completed, canceled } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List orders
router.get('/orders', authenticateUser, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Checkout: accept local cart payload, capture shipping + payment metadata
router.post('/orders/checkout', authenticateUser, async (req, res) => {
  try {
    const { cartItems = [], shipping = {}, payment = {} } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const requiredShipping = ['fullName', 'phone', 'address1', 'city'];
    const missingFields = requiredShipping.filter(key => !shipping[key]);
    if (missingFields.length) {
      return res.status(400).json({ success: false, error: `Missing shipping fields: ${missingFields.join(', ')}` });
    }

    const method = (payment.method || 'cod').toLowerCase();
    const allowedMethods = ['cod', 'bank-transfer', 'esewa', 'khalti', 'imepay'];
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({ success: false, error: 'Invalid payment method' });
    }

    const productIds = [...new Set(
      cartItems
        .map(item => item.productId)
        .filter(Boolean)
    )];
    if (productIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing product references' });
    }

    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const items = cartItems.map(item => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error('One or more products are no longer available. Refresh your cart and try again.');
      }
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
        variant: {
          color: item.color || '',
          size: item.size || '',
          notes: item.variantNotes || ''
        }
      };
    });

    const total = items.reduce((sum, orderItem) => sum + orderItem.price * orderItem.quantity, 0);
    if (total <= 0) {
      return res.status(400).json({ success: false, error: 'Unable to calculate total. Please refresh and try again.' });
    }

    const paymentStatus = method === 'cod'
      ? 'pending'
      : (payment.referenceId || payment.proofUrl ? 'submitted' : 'pending');

    const order = await Order.create({
      user: req.userId,
      items,
      total,
      shipping: {
        fullName: shipping.fullName,
        phone: shipping.phone,
        email: shipping.email || '',
        address1: shipping.address1,
        address2: shipping.address2 || '',
        city: shipping.city,
        province: shipping.province || '',
        postalCode: shipping.postalCode || '',
        notes: shipping.notes || ''
      },
      payment: {
        method,
        status: paymentStatus,
        referenceId: payment.referenceId || '',
        proofUrl: payment.proofUrl || '',
        instructionsAck: Boolean(payment.instructionsAck)
      },
      status: 'Pending'
    });

    await User.findByIdAndUpdate(req.userId, { cart: [] });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/orders/upload-proof', authenticateUser, (req, res) => {
  proofUpload.single('proof')(req, res, err => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const relativePath = path.join('uploads', 'payment-proofs', req.file.filename).replace(/\\/g, '/');
    res.json({ success: true, url: `/${relativePath}` });
  });
});

// Cart summary
router.get('/cart/summary', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('cart.product');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const items = (user.cart || []).map(item => {
      const price = item.product?.price || 0;
      return {
        id: item._id,
        product: item.product?._id,
        name: item.product?.name || 'Item',
        price,
        quantity: item.quantity,
        subtotal: price * item.quantity
      };
    });
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const total = items.reduce((sum, i) => sum + i.subtotal, 0);
    res.json({ success: true, data: { items, count, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload avatar
router.post('/avatar', authenticateUser, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Store relative URL for serving via /uploads
    const relativePath = path.join('uploads', 'avatars', req.file.filename).replace(/\\/g, '/');
    user.avatar = `/${relativePath}`;
    await user.save();

    res.json({ success: true, data: { avatar: user.avatar } });
  } catch (err) {
    console.error('Avatar upload error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/wishlist/:productId', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.wishlist.includes(req.params.productId)) {
      user.wishlist.push(req.params.productId);
      await user.save();
    }
    res.json({ success: true, data: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/wishlist/:productId', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.wishlist.pull(req.params.productId);
    await user.save();
    res.json({ success: true, data: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
