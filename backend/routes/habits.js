const express = require('express');
const { body, validationResult } = require('express-validator');
const Habit = require('../models/Habit');
const TrackingEntry = require('../models/TrackingEntry');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/habits
// @desc    Get all habits for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { include_tracking } = req.query;
    
    if (include_tracking === 'true') {
      // Get habits with recent tracking data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // Last 30 days
      
      const habits = await Habit.getHabitsWithTracking(req.user._id, startDate, endDate);
      
      // Calculate streaks and completion rates for each habit
      const habitsWithStats = await Promise.all(
        habits.map(async (habit) => {
          const currentStreak = await TrackingEntry.getCurrentStreak(habit._id);
          const completionRate = await TrackingEntry.getCompletionRate(habit._id, startDate, endDate);
          
          return {
            ...habit,
            currentStreak,
            completionRate: Math.round(completionRate * 100)
          };
        })
      );
      
      res.json({
        habits: habitsWithStats,
        total: habitsWithStats.length
      });
    } else {
      // Get habits without tracking data
      const habits = await Habit.find({
        userId: req.user._id,
        isActive: true
      }).sort({ order: 1, createdAt: 1 });
      
      res.json({
        habits,
        total: habits.length
      });
    }
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({
      message: 'Server error getting habits',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/habits/:id
// @desc    Get a specific habit with details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!habit) {
      return res.status(404).json({
        message: 'Habit not found',
        code: 'HABIT_NOT_FOUND'
      });
    }
    
    // Get analytics for this habit
    const analytics = await TrackingEntry.getHabitAnalytics(habit._id, 30);
    
    res.json({
      habit,
      analytics
    });
  } catch (error) {
    console.error('Get habit error:', error);
    res.status(500).json({
      message: 'Server error getting habit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/habits
// @desc    Create a new habit
// @access  Private
router.post('/', [
  auth,
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Habit name is required')
    .isLength({ max: 100 })
    .withMessage('Habit name cannot be more than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Frequency must be daily, weekly, or monthly'),
  body('goal')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Goal cannot be more than 200 characters'),
  body('category')
    .optional()
    .isIn(['health', 'fitness', 'productivity', 'learning', 'social', 'spiritual', 'creative', 'other'])
    .withMessage('Invalid category'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Please enter a valid hex color'),
  body('targetDays')
    .optional()
    .isArray()
    .withMessage('Target days must be an array'),
  body('reminderTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please enter a valid time format (HH:MM)'),
  body('streakTarget')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Streak target must be at least 1')
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

    // Get the highest order number for user's habits
    const lastHabit = await Habit.findOne({
      userId: req.user._id
    }).sort({ order: -1 });

    const habitData = {
      ...req.body,
      userId: req.user._id,
      order: lastHabit ? lastHabit.order + 1 : 0
    };

    const habit = new Habit(habitData);
    await habit.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user._id}`).emit('habit-created', habit);

    res.status(201).json({
      message: 'Habit created successfully',
      habit
    });
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({
      message: 'Server error creating habit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/habits/:id
// @desc    Update a habit
// @access  Private
router.put('/:id', [
  auth,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Habit name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Habit name cannot be more than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Frequency must be daily, weekly, or monthly'),
  body('goal')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Goal cannot be more than 200 characters'),
  body('category')
    .optional()
    .isIn(['health', 'fitness', 'productivity', 'learning', 'social', 'spiritual', 'creative', 'other'])
    .withMessage('Invalid category'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Please enter a valid hex color'),
  body('targetDays')
    .optional()
    .isArray()
    .withMessage('Target days must be an array'),
  body('reminderTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please enter a valid time format (HH:MM)'),
  body('streakTarget')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Streak target must be at least 1'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
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

    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!habit) {
      return res.status(404).json({
        message: 'Habit not found',
        code: 'HABIT_NOT_FOUND'
      });
    }

    // Update habit
    const updatedHabit = await Habit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user._id}`).emit('habit-updated', updatedHabit);

    res.json({
      message: 'Habit updated successfully',
      habit: updatedHabit
    });
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({
      message: 'Server error updating habit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/habits/:id
// @desc    Delete a habit (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!habit) {
      return res.status(404).json({
        message: 'Habit not found',
        code: 'HABIT_NOT_FOUND'
      });
    }

    // Soft delete by setting isActive to false
    await Habit.findByIdAndUpdate(req.params.id, { isActive: false });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user._id}`).emit('habit-deleted', { habitId: req.params.id });

    res.json({
      message: 'Habit deleted successfully'
    });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({
      message: 'Server error deleting habit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/habits/reorder
// @desc    Reorder habits
// @access  Private
router.put('/reorder', [
  auth,
  body('habitOrders')
    .isArray()
    .withMessage('Habit orders must be an array')
    .custom((value) => {
      if (!value.every(item => item.habitId && typeof item.order === 'number')) {
        throw new Error('Each item must have habitId and order');
      }
      return true;
    })
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

    const { habitOrders } = req.body;

    // Update each habit's order
    const updatePromises = habitOrders.map(({ habitId, order }) =>
      Habit.findOneAndUpdate(
        { _id: habitId, userId: req.user._id },
        { order },
        { new: true }
      )
    );

    const updatedHabits = await Promise.all(updatePromises);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user._id}`).emit('habits-reordered', updatedHabits);

    res.json({
      message: 'Habits reordered successfully',
      habits: updatedHabits.filter(Boolean) // Remove null results
    });
  } catch (error) {
    console.error('Reorder habits error:', error);
    res.status(500).json({
      message: 'Server error reordering habits',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;