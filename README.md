# Task Management System

A tree-based task management desktop application built with Electron, React, and TypeScript.

## Features

- 🌳 **Hierarchical Task Organization** - Organize tasks in a tree structure with unlimited nesting
- 📊 **Analytics Dashboard** - Visualize task progress with charts and statistics
- 🏷️ **Tag System** - Categorize tasks with customizable colored tags
- 🔄 **Routine Tasks** - Create recurring tasks with automatic generation
- 📈 **Progress Tracking** - Track completion status with visual indicators
- 🎨 **Modern UI** - Clean and intuitive interface with dark sidebar navigation
- 💾 **Local Storage** - All data stored locally using SQLite

## Screenshots

- Dashboard view with task overview
- Task management with drag-and-drop
- Analytics page with progress charts
- Export functionality

## Installation

### From Release (Recommended)

1. Download the latest release from the releases page
2. For macOS: Download the `.dmg` file
3. Mount the DMG and drag the app to Applications
4. First time opening: Right-click and select "Open" to bypass Gatekeeper

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/task-management-system.git
cd task-management-system

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm run package
```

## Development

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- macOS (for building macOS packages)

### Tech Stack

- **Frontend**: React, TypeScript, React Router
- **Backend**: Electron, SQLite (better-sqlite3)
- **Styling**: CSS Modules
- **Build**: Webpack, electron-builder

### Project Structure

```
tms/
├── src/
│   ├── main.ts           # Electron main process
│   ├── preload.ts        # Preload script
│   ├── database/         # Database layer
│   ├── renderer/         # React application
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   ├── hooks/        # Custom hooks
│   │   └── styles/       # CSS files
│   └── types/            # TypeScript types
├── schema.sql            # Database schema
├── package.json
└── webpack.config.js
```

### Available Scripts

- `npm run dev` - Start development environment
- `npm run build` - Build the application
- `npm run package` - Create distributable packages
- `npm start` - Run the built application

## Troubleshooting

### macOS Security Warning

If you see "Task Management System is damaged and can't be opened":

```bash
sudo xattr -rd com.apple.quarantine /Applications/Task\ Management\ System.app
```

### Database Issues

The database is stored at:
- macOS: `~/Library/Application Support/task-management-system/tasks.db`
- Windows: `%APPDATA%/task-management-system/tasks.db`
- Linux: `~/.config/task-management-system/tasks.db`

See `DB_TROUBLESHOOTING.md` for detailed troubleshooting steps.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Electron and React
- Icons from Material Design Icons
- Charts powered by custom SVG components