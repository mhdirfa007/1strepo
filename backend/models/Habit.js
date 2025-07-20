const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [100, 'Habit name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily',
    required: true
  },
  goal: {
    type: String,
    trim: true,
    maxlength: [200, 'Goal cannot be more than 200 characters']
  },
  category: {
    type: String,
    enum: ['health', 'fitness', 'productivity', 'learning', 'social', 'spiritual', 'creative', 'other'],
    default: 'other'
  },
  color: {
    type: String,
    default: '#3B82F6',
    match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color']
  },
  targetDays: {
    type: [String],
    default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    validate: {
      validator: function(days) {
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        return days.every(day => validDays.includes(day));
      },
      message: 'Invalid day specified'
    }
  },
  reminderTime: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  streakTarget: {
    type: Number,
    default: 7,
    min: [1, 'Streak target must be at least 1']
  }
}, {
  timestamps: true
});

// Indexes for performance
habitSchema.index({ userId: 1, isActive: 1 });
habitSchema.index({ userId: 1, order: 1 });

// Virtual for current streak (calculated from tracking entries)
habitSchema.virtual('currentStreak', {
  ref: 'TrackingEntry',
  localField: '_id',
  foreignField: 'habitId',
  justOne: false
});

// Static method to get habits with tracking data
habitSchema.statics.getHabitsWithTracking = async function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: { 
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true
      }
    },
    {
      $lookup: {
        from: 'trackingentries',
        localField: '_id',
        foreignField: 'habitId',
        as: 'trackingEntries',
        pipeline: [
          {
            $match: {
              date: {
                $gte: startDate,
                $lte: endDate
              }
            }
          }
        ]
      }
    },
    {
      $sort: { order: 1, createdAt: 1 }
    }
  ]);
};

module.exports = mongoose.model('Habit', habitSchema);