const mongoose = require('mongoose');

const trackingEntrySchema = new mongoose.Schema({
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  value: {
    type: Number,
    min: 0,
    default: null // For quantifiable habits (e.g., minutes exercised, pages read)
  },
  mood: {
    type: Number,
    min: 1,
    max: 5,
    default: null // Rate mood when completing habit (1-5 scale)
  },
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: null // Rate difficulty (1-5 scale)
  }
}, {
  timestamps: true
});

// Compound index to ensure one entry per habit per day per user
trackingEntrySchema.index({ habitId: 1, userId: 1, date: 1 }, { unique: true });

// Index for efficient queries
trackingEntrySchema.index({ userId: 1, date: -1 });
trackingEntrySchema.index({ habitId: 1, date: -1 });

// Static method to get completion rate for a habit
trackingEntrySchema.statics.getCompletionRate = async function(habitId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        habitId: new mongoose.Types.ObjectId(habitId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        completedEntries: {
          $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        completionRate: {
          $cond: [
            { $eq: ['$totalEntries', 0] },
            0,
            { $divide: ['$completedEntries', '$totalEntries'] }
          ]
        }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].completionRate : 0;
};

// Static method to calculate current streak
trackingEntrySchema.statics.getCurrentStreak = async function(habitId) {
  const entries = await this.find({
    habitId: new mongoose.Types.ObjectId(habitId),
    completed: true
  }).sort({ date: -1 }).limit(100); // Get recent completed entries
  
  if (entries.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if today is completed
  const todayEntry = entries.find(entry => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });
  
  let currentDate = todayEntry ? new Date(today) : new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  for (const entry of entries) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    
    if (entryDate.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (entryDate.getTime() < currentDate.getTime()) {
      break;
    }
  }
  
  return streak;
};

// Static method to get habit analytics
trackingEntrySchema.statics.getHabitAnalytics = async function(habitId, days = 30) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
  
  const analytics = await this.aggregate([
    {
      $match: {
        habitId: new mongoose.Types.ObjectId(habitId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        completedDays: {
          $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
        },
        averageMood: { $avg: '$mood' },
        averageDifficulty: { $avg: '$difficulty' },
        totalValue: { $sum: '$value' }
      }
    }
  ]);
  
  const currentStreak = await this.getCurrentStreak(habitId);
  
  return {
    ...analytics[0] || { totalDays: 0, completedDays: 0 },
    currentStreak,
    completionRate: analytics[0] ? analytics[0].completedDays / analytics[0].totalDays : 0
  };
};

module.exports = mongoose.model('TrackingEntry', trackingEntrySchema);