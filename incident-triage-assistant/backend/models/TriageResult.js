const mongoose = require('mongoose');

const TriageResultSchema = new mongoose.Schema(
  {
    bugId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bug', required: true },
    category: { type: String, required: true },
    severity: { type: String, required: true },
    priority: { type: String, required: true },
    rootCause: { type: String, required: true },
    suggestedTeam: { type: String, required: true },
    suggestedAssignee: { type: String, default: 'Unassigned' },
    recommendedAction: { type: String, required: true },
    confidenceScore: { type: Number, min: 0, max: 100, required: true },
    engine: { type: String, enum: ['rule-based', 'ai-service'], default: 'rule-based' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('TriageResult', TriageResultSchema);
