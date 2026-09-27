const express = require('express');
const {
  createBug,
  getBugs,
  getBugById,
  updateBug,
  updateBugStatus,
  deleteBug,
  triageBug,
  getDashboardStats,
} = require('../controllers/bugController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/stats/dashboard', getDashboardStats);

router.post('/', createBug);
router.get('/', getBugs);
router.get('/:id', getBugById);
router.put('/:id', updateBug);
router.delete('/:id', deleteBug);
router.put('/:id/status', updateBugStatus);
router.post('/:id/triage', triageBug);

module.exports = router;
