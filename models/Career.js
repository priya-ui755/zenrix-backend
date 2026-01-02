const mongoose = require('mongoose');

// Models for Careers
const careerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Engineering', 'Design', 'Sales', 'Marketing', 'HR', 'Operations', 'Support']
  },
  location: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Freelance'],
    default: 'Full-time'
  },
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'NPR' }
  },
  requirements: [String],
  benefits: [String],
  published: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Career',
    required: true
  },
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  resumeFileName: String,
  resumeMimeType: String,
  resumeData: Buffer,
  coverLetter: String,
  status: {
    type: String,
    enum: ['submitted', 'reviewing', 'shortlisted', 'rejected', 'hired'],
    default: 'submitted'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Career', careerSchema);
