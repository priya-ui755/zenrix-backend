const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TestimonialAuditSchema = new Schema({
  testimonial: { type: Schema.Types.ObjectId, ref: 'Testimonial', required: true },
  action: { type: String, enum: ['create','status_change','update','delete'], required: true },
  adminName: { type: String },
  adminId: { type: Schema.Types.ObjectId, ref: 'User' },
  previousStatus: { type: String },
  newStatus: { type: String },
  note: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestimonialAudit', TestimonialAuditSchema);
