const express = require('express');
const mongoose = require('mongoose');
const TrackingEntry = require('../models/TrackingEntry');
const Habit = require('../models/Habit');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Get overall analytics for user
// @access  Private
router.get('/overview', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(days) * 24 * 60 * 60 * 1000));
    
    // Get user's active habits
    const habits = await Habit.find({
      userId: req.user._id,
      isActive: true
    });
    
    if (habits.length === 0) {
      return res.json({
        message: 'No active habits found',
        overview: {
          totalHabits: 0,
          completionRate: 0,
          totalStreaks: 0,
          averageStreak: 0,
          categoriesBreakdown: {},
          weeklyTrends: [],
          bestDay: null,
          longestStreak: 0
        }
      });
    }
    
    const habitIds = habits.map(h => h._id);
    
    // Get all tracking entries for the period
    const entries = await TrackingEntry.find({
      userId: req.user._id,
      habitId: { $in: habitIds },
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate overall completion rate
    const totalPossibleEntries = habits.length * parseInt(days);
    const completedEntries = entries.filter(e => e.completed).length;
    const completionRate = totalPossibleEntries > 0 ? (completedEntries / totalPossibleEntries) * 100 : 0;
    
    // Calculate streaks for all habits
    const streakPromises = habitIds.map(habitId => TrackingEntry.getCurrentStreak(habitId));
    const streaks = await Promise.all(streakPromises);
    const totalStreaks = streaks.reduce((sum, streak) => sum + streak, 0);
    const averageStreak = habits.length > 0 ? totalStreaks / habits.length : 0;
    const longestStreak = Math.max(...streaks, 0);
    
    // Categories breakdown
    const categoriesBreakdown = habits.reduce((acc, habit) => {
      const category = habit.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    // Weekly trends (last 7 days)
    const weeklyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDate.getTime() - (i * 24 * 60 * 60 * 1000));
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const dayEntries = entries.filter(e => 
        e.date >= date && e.date < nextDate && e.completed
      );
      
      weeklyTrends.push({
        date: date.toISOString().split('T')[0],
        completedHabits: dayEntries.length,
        completionRate: habits.length > 0 ? (dayEntries.length / habits.length) * 100 : 0
      });
    }
    
    // Find best day (highest completion rate)
    const bestDay = weeklyTrends.reduce((best, day) => 
      day.completionRate > best.completionRate ? day : best, 
      weeklyTrends[0] || { completionRate: 0 }
    );
    
    res.json({
      overview: {
        totalHabits: habits.length,
        completionRate: Math.round(completionRate),
        totalStreaks,
        averageStreak: Math.round(averageStreak * 10) / 10,
        categoriesBreakdown,
        weeklyTrends,
        bestDay,
        longestStreak,
        period: {
          days: parseInt(days),
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Get overview analytics error:', error);
    res.status(500).json({
      message: 'Server error getting analytics overview',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/analytics/habit/:habitId
// @desc    Get detailed analytics for a specific habit
// @access  Private
router.get('/habit/:habitId', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
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
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(days) * 24 * 60 * 60 * 1000));
    
    // Get tracking entries
    const entries = await TrackingEntry.find({
      habitId: req.params.habitId,
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    // Calculate basic analytics
    const totalDays = parseInt(days);
    const trackedDays = entries.length;
    const completedDays = entries.filter(e => e.completed).length;
    const completionRate = trackedDays > 0 ? (completedDays / trackedDays) * 100 : 0;
    
    // Calculate current streak
    const currentStreak = await TrackingEntry.getCurrentStreak(req.params.habitId);
    
    // Calculate longest streak in the period
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (const entry of entries) {
      if (entry.completed) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Daily completion chart data
    const dailyData = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(endDate.getTime() - (i * 24 * 60 * 60 * 1000));
      date.setHours(0, 0, 0, 0);
      
      const entry = entries.find(e => {
        const entryDate = new Date(e.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === date.getTime();
      });
      
      dailyData.push({
        date: date.toISOString().split('T')[0],
        completed: entry ? entry.completed : false,
        value: entry ? entry.value : null,
        mood: entry ? entry.mood : null,
        difficulty: entry ? entry.difficulty : null
      });
    }
    
    // Weekly aggregation
    const weeklyData = [];
    for (let week = 0; week < Math.ceil(parseInt(days) / 7); week++) {
      const weekStart = new Date(startDate.getTime() + (week * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(Math.min(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000), endDate.getTime()));
      
      const weekEntries = entries.filter(e => e.date >= weekStart && e.date < weekEnd);
      const weekCompleted = weekEntries.filter(e => e.completed).length;
      
      weeklyData.push({
        week: week + 1,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        completedDays: weekCompleted,
        totalDays: weekEntries.length,
        completionRate: weekEntries.length > 0 ? (weekCompleted / weekEntries.length) * 100 : 0
      });
    }
    
    // Mood and difficulty analysis (if available)
    const moodEntries = entries.filter(e => e.mood && e.completed);
    const difficultyEntries = entries.filter(e => e.difficulty && e.completed);
    
    const averageMood = moodEntries.length > 0 ? 
      moodEntries.reduce((sum, e) => sum + e.mood, 0) / moodEntries.length : null;
    
    const averageDifficulty = difficultyEntries.length > 0 ? 
      difficultyEntries.reduce((sum, e) => sum + e.difficulty, 0) / difficultyEntries.length : null;
    
    // Predictions and insights
    const predictions = generatePredictions(entries, habit, currentStreak);
    const insights = generateInsights(entries, habit, completionRate, currentStreak);
    
    res.json({
      habit,
      analytics: {
        period: {
          days: parseInt(days),
          startDate,
          endDate
        },
        summary: {
          totalDays,
          trackedDays,
          completedDays,
          completionRate: Math.round(completionRate),
          currentStreak,
          longestStreak,
          averageMood: averageMood ? Math.round(averageMood * 10) / 10 : null,
          averageDifficulty: averageDifficulty ? Math.round(averageDifficulty * 10) / 10 : null
        },
        dailyData,
        weeklyData,
        predictions,
        insights
      }
    });
  } catch (error) {
    console.error('Get habit analytics error:', error);
    res.status(500).json({
      message: 'Server error getting habit analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/analytics/heatmap
// @desc    Get heatmap data for all habits
// @access  Private
router.get('/heatmap', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31); // December 31st
    
    // Get all user's active habits
    const habits = await Habit.find({
      userId: req.user._id,
      isActive: true
    });
    
    if (habits.length === 0) {
      return res.json({
        heatmapData: {},
        habits: [],
        year: parseInt(year)
      });
    }
    
    // Get all tracking entries for the year
    const entries = await TrackingEntry.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).populate('habitId', 'name color category');
    
    // Group entries by date
    const heatmapData = {};
    
    // Initialize all dates in the year
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      heatmapData[dateStr] = {
        date: dateStr,
        totalHabits: habits.length,
        completedHabits: 0,
        completionRate: 0,
        habits: []
      };
    }
    
    // Fill in actual data
    entries.forEach(entry => {
      const dateStr = entry.date.toISOString().split('T')[0];
      if (heatmapData[dateStr]) {
        heatmapData[dateStr].habits.push({
          habitId: entry.habitId._id,
          name: entry.habitId.name,
          color: entry.habitId.color,
          category: entry.habitId.category,
          completed: entry.completed
        });
        
        if (entry.completed) {
          heatmapData[dateStr].completedHabits++;
        }
        
        heatmapData[dateStr].completionRate = 
          (heatmapData[dateStr].completedHabits / heatmapData[dateStr].totalHabits) * 100;
      }
    });
    
    res.json({
      heatmapData,
      habits: habits.map(h => ({
        id: h._id,
        name: h.name,
        color: h.color,
        category: h.category
      })),
      year: parseInt(year)
    });
  } catch (error) {
    console.error('Get heatmap data error:', error);
    res.status(500).json({
      message: 'Server error getting heatmap data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/analytics/trends
// @desc    Get trend analysis for habits
// @access  Private
router.get('/trends', auth, async (req, res) => {
  try {
    const { period = 'month', groupBy = 'week' } = req.query;
    
    let days;
    switch (period) {
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'quarter': days = 90; break;
      case 'year': days = 365; break;
      default: days = 30;
    }
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // Get user's habits
    const habits = await Habit.find({
      userId: req.user._id,
      isActive: true
    });
    
    // Get tracking entries
    const entries = await TrackingEntry.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).populate('habitId', 'name color category');
    
    // Group data based on groupBy parameter
    const groupSize = groupBy === 'day' ? 1 : groupBy === 'week' ? 7 : 30;
    const trends = [];
    
    for (let i = 0; i < days; i += groupSize) {
      const periodStart = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const periodEnd = new Date(Math.min(
        periodStart.getTime() + (groupSize * 24 * 60 * 60 * 1000),
        endDate.getTime()
      ));
      
      const periodEntries = entries.filter(e => e.date >= periodStart && e.date < periodEnd);
      const completedEntries = periodEntries.filter(e => e.completed);
      
      // Category breakdown
      const categoryBreakdown = {};
      habits.forEach(habit => {
        const category = habit.category || 'other';
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = { total: 0, completed: 0 };
        }
        categoryBreakdown[category].total++;
        
        const habitEntries = completedEntries.filter(e => 
          e.habitId._id.toString() === habit._id.toString()
        );
        categoryBreakdown[category].completed += habitEntries.length;
      });
      
      trends.push({
        period: groupBy,
        startDate: periodStart.toISOString().split('T')[0],
        endDate: periodEnd.toISOString().split('T')[0],
        totalEntries: periodEntries.length,
        completedEntries: completedEntries.length,
        completionRate: periodEntries.length > 0 ? 
          (completedEntries.length / periodEntries.length) * 100 : 0,
        categoryBreakdown
      });
    }
    
    res.json({
      trends,
      period,
      groupBy,
      habits: habits.map(h => ({
        id: h._id,
        name: h.name,
        category: h.category,
        color: h.color
      }))
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      message: 'Server error getting trends',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to generate predictions
function generatePredictions(entries, habit, currentStreak) {
  const completedEntries = entries.filter(e => e.completed);
  
  if (completedEntries.length === 0) {
    return {
      streakTarget: null,
      nextMilestone: null,
      probabilityOfSuccess: 0
    };
  }
  
  const completionRate = completedEntries.length / entries.length;
  const averageGap = calculateAverageGap(entries);
  
  // Predict when user might reach their streak target
  const streakTarget = habit.streakTarget || 7;
  const daysToTarget = Math.max(0, streakTarget - currentStreak);
  
  const predictions = {
    streakTarget: {
      target: streakTarget,
      current: currentStreak,
      daysRemaining: daysToTarget,
      estimatedDate: daysToTarget > 0 ? 
        new Date(Date.now() + (daysToTarget * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] : null
    },
    nextMilestone: getNextMilestone(currentStreak),
    probabilityOfSuccess: Math.round(completionRate * 100)
  };
  
  return predictions;
}

// Helper function to generate insights
function generateInsights(entries, habit, completionRate, currentStreak) {
  const insights = [];
  
  // Completion rate insights
  if (completionRate >= 80) {
    insights.push({
      type: 'success',
      message: `Excellent! You have an ${Math.round(completionRate)}% completion rate for this habit.`,
      actionable: false
    });
  } else if (completionRate >= 60) {
    insights.push({
      type: 'warning',
      message: `Good progress with ${Math.round(completionRate)}% completion rate. Consider what's preventing the remaining completions.`,
      actionable: true
    });
  } else if (completionRate < 40) {
    insights.push({
      type: 'danger',
      message: `Your completion rate is ${Math.round(completionRate)}%. Consider adjusting your habit or schedule to make it more achievable.`,
      actionable: true
    });
  }
  
  // Streak insights
  if (currentStreak >= 7) {
    insights.push({
      type: 'success',
      message: `Amazing! You're on a ${currentStreak}-day streak. Keep the momentum going!`,
      actionable: false
    });
  } else if (currentStreak === 0) {
    insights.push({
      type: 'info',
      message: `Start building your streak today! Consistency is key to forming lasting habits.`,
      actionable: true
    });
  }
  
  // Pattern insights
  const recentEntries = entries.slice(-7); // Last 7 entries
  const recentCompletions = recentEntries.filter(e => e.completed).length;
  
  if (recentCompletions > recentEntries.length * 0.8) {
    insights.push({
      type: 'success',
      message: `You've been very consistent this week with ${recentCompletions}/${recentEntries.length} completions!`,
      actionable: false
    });
  }
  
  return insights;
}

// Helper functions
function calculateAverageGap(entries) {
  const completedDates = entries.filter(e => e.completed).map(e => e.date);
  if (completedDates.length < 2) return 0;
  
  let totalGap = 0;
  for (let i = 1; i < completedDates.length; i++) {
    const gap = (completedDates[i] - completedDates[i-1]) / (24 * 60 * 60 * 1000);
    totalGap += gap;
  }
  
  return totalGap / (completedDates.length - 1);
}

function getNextMilestone(currentStreak) {
  const milestones = [7, 14, 21, 30, 60, 90, 180, 365];
  const nextMilestone = milestones.find(m => m > currentStreak);
  
  return nextMilestone ? {
    days: nextMilestone,
    remaining: nextMilestone - currentStreak
  } : null;
}

module.exports = router;