const Bug = require('../models/Bug');
const TriageResult = require('../models/TriageResult');
const { analyzeBug } = require('../ai/triageEngine');

// Run AI triage for a bug document and persist the TriageResult,
// updating the bug's category/priority/status/assignedTeam fields.
async function runTriageForBug(bug) {
  const result = await analyzeBug(bug);

  const triage = await TriageResult.create({
    bugId: bug._id,
    category: result.category,
    severity: result.severity || bug.severity,
    priority: result.priority,
    rootCause: result.rootCause,
    suggestedTeam: result.suggestedTeam,
    suggestedAssignee: result.suggestedAssignee || 'Unassigned',
    recommendedAction: result.recommendedAction,
    confidenceScore: result.confidenceScore,
    engine: result.engine || 'rule-based',
  });

  bug.category = result.category;
  bug.priority = result.priority;
  bug.assignedTeam = result.suggestedTeam;
  bug.assignedTo = result.suggestedAssignee || 'Unassigned';
  bug.triageResult = triage._id;
  await bug.save();

  return triage;
}

// POST /api/bugs  (creates bug, then immediately runs AI triage)
async function createBug(req, res, next) {
  try {
    const { title, description, stepsToReproduce, errorMessage, severity, environment, reporter } = req.body;

    if (!title || !description || !reporter) {
      return res.status(400).json({ success: false, message: 'title, description and reporter are required' });
    }

    const bug = await Bug.create({
      title,
      description,
      stepsToReproduce,
      errorMessage,
      severity: severity || 'Medium',
      environment: environment || 'Production',
      reporter,
    });

    const triage = await runTriageForBug(bug);

    res.status(201).json({ success: true, bug, triage });
  } catch (err) {
    next(err);
  }
}

// POST /api/bugs/:id/triage  (re-run AI triage on an existing bug)
async function triageBug(req, res, next) {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ success: false, message: 'Bug not found' });

    const triage = await runTriageForBug(bug);
    res.json({ success: true, bug, triage });
  } catch (err) {
    next(err);
  }
}

// GET /api/bugs  (list with search + filters)
async function getBugs(req, res, next) {
  try {
    const { search, category, priority, severity, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { errorMessage: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (severity) query.severity = severity;
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [bugs, total] = await Promise.all([
      Bug.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Bug.countDocuments(query),
    ]);

    res.json({
      success: true,
      bugs,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/bugs/:id
async function getBugById(req, res, next) {
  try {
    const bug = await Bug.findById(req.params.id).populate('triageResult');
    if (!bug) return res.status(404).json({ success: false, message: 'Bug not found' });
    res.json({ success: true, bug });
  } catch (err) {
    next(err);
  }
}

// PUT /api/bugs/:id
async function updateBug(req, res, next) {
  try {
    const bug = await Bug.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!bug) return res.status(404).json({ success: false, message: 'Bug not found' });
    res.json({ success: true, bug });
  } catch (err) {
    next(err);
  }
}

// PUT /api/bugs/:id/status
async function updateBugStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }
    const bug = await Bug.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!bug) return res.status(404).json({ success: false, message: 'Bug not found' });
    res.json({ success: true, bug });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/bugs/:id
async function deleteBug(req, res, next) {
  try {
    const bug = await Bug.findByIdAndDelete(req.params.id);
    if (!bug) return res.status(404).json({ success: false, message: 'Bug not found' });
    await TriageResult.deleteMany({ bugId: bug._id });
    res.json({ success: true, message: 'Bug deleted' });
  } catch (err) {
    next(err);
  }
}

// GET /api/bugs/stats/dashboard
async function getDashboardStats(req, res, next) {
  try {
    const [total, critical, high, medium, low, open, inProgress, resolved, closed, byCategory, byPriority, byStatus] =
      await Promise.all([
        Bug.countDocuments(),
        Bug.countDocuments({ priority: 'Critical' }),
        Bug.countDocuments({ priority: 'High' }),
        Bug.countDocuments({ priority: 'Medium' }),
        Bug.countDocuments({ priority: 'Low' }),
        Bug.countDocuments({ status: 'Open' }),
        Bug.countDocuments({ status: 'In Progress' }),
        Bug.countDocuments({ status: 'Resolved' }),
        Bug.countDocuments({ status: 'Closed' }),
        Bug.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
        Bug.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
        Bug.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ]);

    res.json({
      success: true,
      stats: {
        totalBugs: total,
        criticalBugs: critical,
        highPriorityBugs: high,
        mediumPriorityBugs: medium,
        lowPriorityBugs: low,
        openBugs: open,
        inProgressBugs: inProgress,
        resolvedBugs: resolved,
        closedBugs: closed,
      },
      charts: {
        byCategory: byCategory.map((c) => ({ label: c._id || 'Unclassified', count: c.count })),
        byPriority: byPriority.map((p) => ({ label: p._id || 'Unclassified', count: p.count })),
        byStatus: byStatus.map((s) => ({ label: s._id || 'Unknown', count: s.count })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBug,
  getBugs,
  getBugById,
  updateBug,
  updateBugStatus,
  deleteBug,
  triageBug,
  getDashboardStats,
};
