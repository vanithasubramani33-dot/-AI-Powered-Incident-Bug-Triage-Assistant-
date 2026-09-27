const mongoose = require('mongoose');

const CATEGORIES = [
  'Frontend/UI',
  'Backend/API',
  'Database',
  'Authentication',
  'Performance',
  'Security',
  'Deployment',
  'Other',
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

const BugSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    stepsToReproduce: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    severity: { type: String, enum: SEVERITIES, default: 'Medium' },
    environment: { type: String, default: 'Production' },
    reporter: { type: String, required: true },

    // Populated by AI triage
    category: { type: String, enum: CATEGORIES, default: null },
    priority: { type: String, enum: PRIORITIES, default: null },
    status: { type: String, enum: STATUSES, default: 'Open' },
    assignedTeam: { type: String, default: null },
    assignedTo: { type: String, default: null },

    triageResult: { type: mongoose.Schema.Types.ObjectId, ref: 'TriageResult', default: null },
  },
  { timestamps: true }
);

BugSchema.index({ title: 'text', description: 'text', errorMessage: 'text' });

module.exports = mongoose.model('Bug', BugSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.SEVERITIES = SEVERITIES;
module.exports.STATUSES = STATUSES;
