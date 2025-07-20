export interface User {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    timezone: string;
  };
  createdAt: string;
}

export interface Habit {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  goal?: string;
  category: 'health' | 'fitness' | 'productivity' | 'learning' | 'social' | 'spiritual' | 'creative' | 'other';
  color: string;
  targetDays: string[];
  reminderTime?: string;
  isActive: boolean;
  order: number;
  streakTarget: number;
  createdAt: string;
  updatedAt: string;
  currentStreak?: number;
  completionRate?: number;
  trackingEntries?: TrackingEntry[];
}

export interface TrackingEntry {
  _id: string;
  habitId: string;
  userId: string;
  date: string;
  completed: boolean;
  notes?: string;
  value?: number;
  mood?: number;
  difficulty?: number;
  createdAt: string;
  updatedAt: string;
  habitId?: Habit; // When populated
}

export interface Analytics {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalDays: number;
    trackedDays: number;
    completedDays: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
    averageMood?: number;
    averageDifficulty?: number;
  };
  dailyData: DailyData[];
  weeklyData: WeeklyData[];
  predictions: Predictions;
  insights: Insight[];
}

export interface DailyData {
  date: string;
  completed: boolean;
  value?: number;
  mood?: number;
  difficulty?: number;
}

export interface WeeklyData {
  week: number;
  startDate: string;
  endDate: string;
  completedDays: number;
  totalDays: number;
  completionRate: number;
}

export interface Predictions {
  streakTarget: {
    target: number;
    current: number;
    daysRemaining: number;
    estimatedDate?: string;
  } | null;
  nextMilestone: {
    days: number;
    remaining: number;
  } | null;
  probabilityOfSuccess: number;
}

export interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  message: string;
  actionable: boolean;
}

export interface OverviewAnalytics {
  totalHabits: number;
  completionRate: number;
  totalStreaks: number;
  averageStreak: number;
  categoriesBreakdown: Record<string, number>;
  weeklyTrends: WeeklyTrend[];
  bestDay: {
    date: string;
    completedHabits: number;
    completionRate: number;
  } | null;
  longestStreak: number;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export interface WeeklyTrend {
  date: string;
  completedHabits: number;
  completionRate: number;
}

export interface HeatmapData {
  [date: string]: {
    date: string;
    totalHabits: number;
    completedHabits: number;
    completionRate: number;
    habits: HabitDay[];
  };
}

export interface HabitDay {
  habitId: string;
  name: string;
  color: string;
  category: string;
  completed: boolean;
}

export interface TrendData {
  period: string;
  startDate: string;
  endDate: string;
  totalEntries: number;
  completedEntries: number;
  completionRate: number;
  categoryBreakdown: Record<string, { total: number; completed: number }>;
}

// API Response types
export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface HabitsResponse {
  habits: Habit[];
  total: number;
}

export interface TrackingResponse {
  entries: TrackingEntry[];
  total: number;
}

export interface CalendarResponse {
  entriesByDate: Record<string, TrackingEntry[]>;
  startDate: string;
  endDate: string;
}

export interface HabitWithAnalytics {
  habit: Habit;
  analytics: Analytics;
}

// Context types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface HabitContextType {
  habits: Habit[];
  loading: boolean;
  error: string | null;
  fetchHabits: () => Promise<void>;
  createHabit: (habit: Partial<Habit>) => Promise<void>;
  updateHabit: (id: string, habit: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  reorderHabits: (habitOrders: { habitId: string; order: number }[]) => Promise<void>;
}

export interface TrackingContextType {
  entries: TrackingEntry[];
  loading: boolean;
  error: string | null;
  trackHabit: (habitId: string, date: string, completed: boolean, notes?: string, value?: number, mood?: number, difficulty?: number) => Promise<void>;
  getTrackingHistory: (habitId: string, startDate?: string, endDate?: string) => Promise<TrackingEntry[]>;
  getCalendarData: (year: number, month: number) => Promise<CalendarResponse>;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface HabitForm {
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  goal: string;
  category: Habit['category'];
  color: string;
  targetDays: string[];
  reminderTime: string;
  streakTarget: number;
}

export interface TrackingForm {
  completed: boolean;
  notes: string;
  value: number | '';
  mood: number | '';
  difficulty: number | '';
}

// Component prop types
export interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  onTrack: (habitId: string, completed: boolean) => void;
}

export interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export interface ChartProps {
  data: any;
  options?: any;
  type: 'line' | 'bar' | 'pie' | 'doughnut';
}

// Socket.io event types
export interface SocketEvents {
  'habit-created': (habit: Habit) => void;
  'habit-updated': (habit: Habit) => void;
  'habit-deleted': (data: { habitId: string }) => void;
  'habits-reordered': (habits: Habit[]) => void;
  'tracking-created': (entry: TrackingEntry) => void;
  'tracking-updated': (entry: TrackingEntry) => void;
  'tracking-deleted': (data: { entryId: string }) => void;
}

// Theme types
export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Notification types
export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  duration?: number;
}

// Filter and sort types
export interface HabitFilters {
  category?: Habit['category'];
  search?: string;
  sortBy?: 'name' | 'created' | 'streak' | 'completion';
  sortOrder?: 'asc' | 'desc';
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Dashboard types
export interface DashboardStats {
  totalHabits: number;
  completedToday: number;
  currentStreaks: number;
  longestStreak: number;
  completionRate: number;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}