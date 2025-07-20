# Professional Habit Tracker App

A comprehensive, full-stack habit tracking application with interactive dashboard, deep analytics, and real-time updates. Built with React, Node.js, Express, MongoDB, and TypeScript.

## 🌟 Features

### Core Functionality
- **User Authentication**: Secure JWT-based authentication with password hashing
- **Habit Management**: Create, edit, delete, and reorder habits with customizable properties
- **Daily Tracking**: Interactive calendar view with mood and difficulty tracking
- **Real-time Updates**: Live synchronization using Socket.io
- **Responsive Design**: Mobile-first design that works on all devices

### Analytics & Insights
- **Dashboard Overview**: Quick stats and recent activity summary
- **Deep Analytics**: Detailed habit analysis with completion rates and streaks
- **Heatmap Visualization**: GitHub-style calendar showing habit completion patterns
- **Predictive Insights**: AI-powered predictions for streak goals and milestones
- **Trend Analysis**: Weekly, monthly, and yearly progress trends
- **Interactive Charts**: Beautiful visualizations using Chart.js

### Professional UI/UX
- **Modern Design**: Clean, professional interface with Tailwind CSS
- **Dark Mode**: Complete dark/light theme support
- **Animations**: Smooth transitions and micro-interactions
- **Interactive Elements**: Drag-and-drop reordering, hover effects, and tooltips
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

### Technical Features
- **TypeScript**: Full type safety across frontend and backend
- **Real-time Sync**: WebSocket connections for live updates
- **Performance Optimized**: Lazy loading, memoization, and efficient queries
- **Security**: Rate limiting, input validation, and CORS protection
- **Error Handling**: Comprehensive error boundaries and user-friendly messages

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd habit-tracker-app
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Backend Environment Variables
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/habit-tracker
   JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
   JWT_EXPIRE=7d
   NODE_ENV=development

   # Frontend Environment Variables
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud) - update MONGO_URI accordingly
   ```

5. **Run the application**
   ```bash
   # Development mode (runs both frontend and backend)
   npm run dev
   
   # Or run separately
   npm run server  # Backend only
   npm run client  # Frontend only
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## 📁 Project Structure

```
habit-tracker-app/
├── frontend/                 # React TypeScript frontend
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React Context providers
│   │   ├── pages/           # Page components
│   │   ├── types/           # TypeScript type definitions
│   │   ├── App.tsx          # Main app component
│   │   └── index.tsx        # App entry point
│   ├── package.json
│   └── tailwind.config.js   # Tailwind CSS configuration
├── backend/                 # Node.js Express backend
│   ├── models/              # MongoDB Mongoose models
│   ├── routes/              # Express route handlers
│   ├── middleware/          # Custom middleware
│   ├── server.js            # Server entry point
│   └── package.json
├── package.json             # Root package.json for scripts
├── .env.example             # Environment variables template
└── README.md
```

## 🛠 Development

### Available Scripts

**Root Level:**
- `npm run dev` - Start both frontend and backend in development mode
- `npm run install-all` - Install dependencies for both frontend and backend
- `npm run build` - Build frontend for production
- `npm start` - Start backend in production mode

**Backend Scripts:**
- `npm run dev` - Start backend with nodemon
- `npm start` - Start backend in production
- `npm test` - Run backend tests

**Frontend Scripts:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run frontend tests

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

#### Habits
- `GET /api/habits` - Get user's habits
- `POST /api/habits` - Create new habit
- `GET /api/habits/:id` - Get specific habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `PUT /api/habits/reorder` - Reorder habits

#### Tracking
- `GET /api/tracking` - Get tracking entries
- `POST /api/tracking` - Create/update tracking entry
- `GET /api/tracking/calendar` - Get calendar view data
- `GET /api/tracking/habit/:id` - Get habit tracking history
- `GET /api/tracking/streak/:id` - Get habit streak

#### Analytics
- `GET /api/analytics/overview` - Get overview analytics
- `GET /api/analytics/habit/:id` - Get habit analytics
- `GET /api/analytics/heatmap` - Get heatmap data
- `GET /api/analytics/trends` - Get trend analysis

## 🎨 UI Components

### Key Components
- **Layout**: Main application layout with sidebar navigation
- **AuthProvider**: Authentication context and state management
- **HabitCard**: Individual habit display with tracking controls
- **ProgressRing**: Circular progress indicator
- **LoadingSpinner**: Reusable loading component
- **Chart Components**: Wrapper components for Chart.js

### Design System
- **Colors**: Primary blue, success green, warning orange, danger red
- **Typography**: Inter font family with consistent sizing
- **Spacing**: 8px base unit with Tailwind spacing scale
- **Shadows**: Soft shadows for depth and elevation
- **Animations**: Smooth transitions and micro-interactions

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Server-side validation using express-validator
- **CORS Protection**: Configured for secure cross-origin requests
- **Helmet**: Security headers for Express applications

## 📊 Database Schema

### User Model
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  name: String (required),
  preferences: {
    theme: String (light/dark),
    notifications: Boolean,
    timezone: String
  },
  timestamps: true
}
```

### Habit Model
```javascript
{
  userId: ObjectId (ref: User),
  name: String (required),
  description: String,
  frequency: String (daily/weekly/monthly),
  goal: String,
  category: String (enum),
  color: String (hex),
  targetDays: [String],
  reminderTime: String,
  isActive: Boolean,
  order: Number,
  streakTarget: Number,
  timestamps: true
}
```

### TrackingEntry Model
```javascript
{
  habitId: ObjectId (ref: Habit),
  userId: ObjectId (ref: User),
  date: Date (required),
  completed: Boolean,
  notes: String,
  value: Number,
  mood: Number (1-5),
  difficulty: Number (1-5),
  timestamps: true
}
```

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Heroku)
1. Create Heroku app: `heroku create your-app-name`
2. Set environment variables: `heroku config:set KEY=value`
3. Deploy: `git push heroku main`

### Database (MongoDB Atlas)
1. Create MongoDB Atlas cluster
2. Get connection string
3. Update MONGO_URI in environment variables

### Environment Variables for Production
```env
# Backend
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/habit-tracker
JWT_SECRET=your_production_secret_here
NODE_ENV=production

# Frontend
REACT_APP_API_URL=https://your-backend-domain.herokuapp.com/api
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Test Coverage
- Unit tests for API endpoints
- Integration tests for authentication flow
- Component tests for React components
- End-to-end tests for critical user journeys

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Chart.js](https://www.chartjs.org/) for beautiful charts and visualizations
- [React Router](https://reactrouter.com/) for client-side routing
- [Socket.io](https://socket.io/) for real-time communication
- [MongoDB](https://www.mongodb.com/) for the flexible document database

## 📞 Support

For support, email support@habittracker.com or create an issue on GitHub.

---

Built with ❤️ using React, Node.js, and MongoDB