# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is an intelligent schedule management application with calendar view functionality, built with vanilla HTML, CSS, and JavaScript. The application runs entirely in the browser using localStorage for data persistence, with optional Supabase cloud sync integration. The current implementation focuses on habit tracking with plans to integrate schedule-goal linking features.

### Core Structure
- **index.html**: Main HTML file containing the complete UI structure with embedded sync system
- **script.js**: Core habit tracking functionality and business logic
- **styles.css**: Complete styling with Apple-inspired design system

### Key Components

**Data Management**:
- `habits[]`: Array storing active habit records with checkmark data
- `archivedHabits[]`: Array storing completed habits (21+ day streaks)
- All data persisted to localStorage with keys: 'habits', 'archivedHabits'

**Core Functions**:
- Habit CRUD: `saveHabit()`, `deleteHabit()`, `loadHabits()`
- Weekly navigation: `goToPrevWeek()`, `goToNextWeek()`, `goToCurrentWeek()`
- Checkmark system: `toggleCheckmark()`, `calculateCompletedDays()`
- Archive system: `archiveHabit()` (auto-triggered at 21-day streak)

**Sync System** (embedded in index.html):
- `EnhancedSyncSystem` class handles cloud synchronization with Supabase
- Automatic conflict resolution and offline mode support  
- Real-time sync status indicators with 6 states (idle, syncing, success, error, timeout, offline)
- Global instance available as `enhancedSyncSystem`

### Data Structure

**Habit Object**:
```javascript
{
    id: string,
    name: string,
    description: string,
    color: string,
    checkmarks: { 'YYYY-MM-DD': true },
    weeklyHighest: number,
    weeklyTarget: number,
    weeklyRecords: { 'YYYY-WW': completedDays }
}
```

## Development Commands

This is a static web application with no build process. To develop:

1. **Run locally**: Open `index.html` directly in browser or use a local server (e.g., `python -m http.server` or VS Code Live Server)
2. **No package manager**: No npm, package.json, or build tools required
3. **No testing framework**: Manual testing via browser developer tools
4. **No linting tools**: Code follows vanilla JS patterns
5. **Debugging**: Use browser DevTools console for sync system debugging and localStorage inspection

## Configuration Notes

- **.cursorrules**: Contains Chinese development guidelines emphasizing simplicity and Apple-style aesthetics, with specific requirements for beginner-friendly implementations and SVG design capabilities
- **CSS Variables**: Design system defined in `:root` with Apple-inspired color palette  
- **Responsive Design**: Mobile-first approach with breakpoints at 768px and 576px
- **Font**: Uses Noto Sans SC for Chinese text support
- **Supabase Integration**: Cloud sync system with fallback to offline mode, includes automatic timeout handling (15s) and retry logic (max 3 retries)

## Key Features

- Weekly habit tracking with visual checkmark grid
- Automatic habit archiving after 21 consecutive days
- Streak calculation and progress tracking  
- Certificate generation for completed habits
- Cloud sync with offline fallback
- Tab-based navigation (habits/archived)
- Smart schedule management integration (planned feature)