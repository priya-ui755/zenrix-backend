const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');

// Configure multer for file uploads (5MB limit)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
  }
});

// Career model
const careerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  department: { type: String, required: true, enum: ['Engineering', 'Design', 'Sales', 'Marketing', 'HR', 'Operations', 'Support'] },
  location: { type: String, required: true },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Freelance'], default: 'Full-time' },
  salary: { min: Number, max: Number, currency: { type: String, default: 'USD' } },
  requirements: [String],
  benefits: [String],
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Career = mongoose.model('Career', careerSchema);

// Application model
const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', required: true },
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  resumeFileName: String,
  resumeMimeType: String,
  resumeData: Buffer,
  coverLetter: String,
  status: { type: String, enum: ['submitted', 'reviewing', 'shortlisted', 'rejected', 'hired'], default: 'submitted' },
  appliedAt: { type: Date, default: Date.now }
});

const Application = mongoose.model('Application', applicationSchema);

// Get all careers (public)
router.get('/', async (req, res) => {
  try {
    const careers = await Career.find({ published: true });
    res.json({ success: true, count: careers.length, data: careers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all careers (admin - includes draft)
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const careers = await Career.find();
    res.json({ success: true, count: careers.length, data: careers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single career
router.get('/:id', async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career) return res.status(404).json({ success: false, error: 'Career not found' });
    res.json({ success: true, data: career });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create career (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const career = new Career(req.body);
    await career.save();
    res.status(201).json({ success: true, data: career });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update career (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const career = await Career.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!career) return res.status(404).json({ success: false, error: 'Career not found' });
    res.json({ success: true, data: career });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete career (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const career = await Career.findByIdAndDelete(req.params.id);
    if (!career) return res.status(404).json({ success: false, error: 'Career not found' });
    res.json({ success: true, message: 'Career deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit application
router.post('/:id/apply', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Resume file is required' });
    }

    const application = new Application({
      jobId: req.params.id,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      resumeFileName: req.file.originalname,
      resumeMimeType: req.file.mimetype,
      resumeData: req.file.buffer,
      coverLetter: req.body.coverLetter || '',
      status: 'submitted'
    });
    
    await application.save();
    res.status(201).json({ success: true, data: { 
      _id: application._id,
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      phone: application.phone,
      resumeFileName: application.resumeFileName,
      coverLetter: application.coverLetter,
      status: application.status,
      appliedAt: application.appliedAt
    }});
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get applications for a job (admin)
router.get('/:id/applications', requireAdmin, async (req, res) => {
  try {
    const applications = await Application.find({ jobId: req.params.id });
    res.json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download resume for an application (admin)
router.get('/:jobId/applications/:appId/resume', requireAdmin, async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.appId, jobId: req.params.jobId });
    if (!application || !application.resumeData) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    const mime = application.resumeMimeType || 'application/octet-stream';
    const filename = application.resumeFileName || 'resume';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(application.resumeData);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update application status (admin)
router.put('/:jobId/applications/:appId', requireAdmin, async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(req.params.appId, { status: req.body.status }, { new: true });
    if (!application) return res.status(404).json({ success: false, error: 'Application not found' });
    res.json({ success: true, data: application });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
