const express = require('express');
const { body, validationResult } = require('express-validator');
const TrackingEntry = require('../models/TrackingEntry');
const Habit = require('../models/Habit');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/tracking
// @desc    Get tracking entries for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { habitId, startDate, endDate, limit = 100 } = req.query;
    
    const query = { userId: req.user._id };
    
    if (habitId) {
      query.habitId = habitId;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const entries = await TrackingEntry.find(query)
      .populate('habitId', 'name color category')
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json({
      entries,
      total: entries.length
    });
  } catch (error) {
    console.error('Get tracking entries error:', error);
    res.status(500).json({
      message: 'Server error getting tracking entries',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/tracking/calendar
// @desc    Get tracking data for calendar view
// @access  Private
router.get('/calendar', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({
        message: 'Year and month are required',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0); // Last day of month
    
    const entries = await TrackingEntry.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).populate('habitId', 'name color category');
    
    // Group entries by date
    const entriesByDate = entries.reduce((acc, entry) => {
      const dateStr = entry.date.toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(entry);
      return acc;
    }, {});
    
    res.json({
      entriesByDate,
      startDate,
      endDate
    });
  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({
      message: 'Server error getting calendar data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/tracking
// @desc    Create or update a tracking entry
// @access  Private
router.post('/', [
  auth,
  body('habitId')
    .notEmpty()
    .withMessage('Habit ID is required')
    .isMongoId()
    .withMessage('Invalid habit ID'),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('completed')
    .isBoolean()
    .withMessage('Completed must be a boolean'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot be more than 500 characters'),
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('mood')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Mood must be between 1 and 5'),
  body('difficulty')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Difficulty must be between 1 and 5')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { habitId, date, completed, notes, value, mood, difficulty } = req.body;
    
    // Verify habit belongs to user
    const habit = await Habit.findOne({
      _id: habitId,
      userId: req.user._id,
      isActive: true
    });
    
    if (!habit) {
      return res.status(404).json({
        message: 'Habit not found or not accessible',
        code: 'HABIT_NOT_FOUND'
      });
    }
    
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Check if entry already exists for this habit and date
    const existingEntry = await TrackingEntry.findOne({
      habitId,
      userId: req.user._id,
      date: entryDate
    });
    
    if (existingEntry) {
      // Update existing entry
      existingEntry.completed = completed;
      if (notes !== undefined) existingEntry.notes = notes;
      if (value !== undefined) existingEntry.value = value;
      if (mood !== undefined) existingEntry.mood = mood;
      if (difficulty !== undefined) existingEntry.difficulty = difficulty;
      
      await existingEntry.save();
      
      // Emit real-time update
      const io = req.app.get('io');
      io.to(`user-${req.user._id}`).emit('tracking-updated', existingEntry);
      
      res.json({
        message: 'Tracking entry updated successfully',
        entry: existingEntry
      });
    } else {
      // Create new entry
      const entry = new TrackingEntry({
        habitId,
        userId: req.user._id,
        date: entryDate,
        completed,
        notes,
        value,
        mood,
        difficulty
      });
      
      await entry.save();
      
      // Emit real-time update
      const io = req.app.get('io');
      io.to(`user-${req.user._id}`).emit('tracking-created', entry);
      
      res.status(201).json({
        message: 'Tracking entry created successfully',
        entry
      });
    }
  } catch (error) {
    console.error('Create/update tracking entry error:', error);
    res.status(500).json({
      message: 'Server error creating/updating tracking entry',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/tracking/:id
// @desc    Update a specific tracking entry
// @access  Private
router.put('/:id', [
  auth,
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot be more than 500 characters'),
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('mood')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Mood must be between 1 and 5'),
  body('difficulty')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Difficulty must be between 1 and 5')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const entry = await TrackingEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        message: 'Tracking entry not found',
        code: 'ENTRY_NOT_FOUND'
      });
    }

    // Update entry
    const updatedEntry = await TrackingEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('habitId', 'name color category');

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user._id}`).emit('tracking-updated', updatedEntry);

    res.json({
      message: 'Tracking entry updated successfully',
      entry: updatedEntry
    });
  } catch (error) {
    console.error('Update tracking entry error:', error);
    res.status(500).json({
      message: 'Server error updating tracking entry',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/tracking/:id
// @desc    Delete a tracking entry
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await TrackingEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        message: 'Tracking entry not found',
        code: 'ENTRY_NOT_FOUND'
      });
    }

    await TrackingEntry.findByIdAndDelete(req.params.id);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user._id}`).emit('tracking-deleted', { entryId: req.params.id });

    res.json({
      message: 'Tracking entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete tracking entry error:', error);
    res.status(500).json({
      message: 'Server error deleting tracking entry',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/tracking/habit/:habitId
// @desc    Get tracking history for a specific habit
// @access  Private
router.get('/habit/:habitId', auth, async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    // Verify habit belongs to user
    const habit = await Habit.findOne({
      _id: req.params.habitId,
      userId: req.user._id
    });
    
    if (!habit) {
      return res.status(404).json({
        message: 'Habit not found or not accessible',
        code: 'HABIT_NOT_FOUND'
      });
    }
    
    const query = {
      habitId: req.params.habitId,
      userId: req.user._id
    };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const entries = await TrackingEntry.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    // Calculate streak and completion rate
    const currentStreak = await TrackingEntry.getCurrentStreak(req.params.habitId);
    const analytics = await TrackingEntry.getHabitAnalytics(req.params.habitId, 30);
    
    res.json({
      habit,
      entries,
      currentStreak,
      analytics,
      total: entries.length
    });
  } catch (error) {
    console.error('Get habit tracking history error:', error);
    res.status(500).json({
      message: 'Server error getting habit tracking history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/tracking/streak/:habitId
// @desc    Get current streak for a habit
// @access  Private
router.get('/streak/:habitId', auth, async (req, res) => {
  try {
    // Verify habit belongs to user
    const habit = await Habit.findOne({
      _id: req.params.habitId,
      userId: req.user._id
    });
    
    if (!habit) {
      return res.status(404).json({
        message: 'Habit not found or not accessible',
        code: 'HABIT_NOT_FOUND'
      });
    }
    
    const currentStreak = await TrackingEntry.getCurrentStreak(req.params.habitId);
    
    res.json({
      habitId: req.params.habitId,
      currentStreak
    });
  } catch (error) {
    console.error('Get streak error:', error);
    res.status(500).json({
      message: 'Server error getting streak',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;