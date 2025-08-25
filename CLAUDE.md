# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm dev` - Starts Next.js development server with Turbopack
- **Build**: `pnpm build` - Creates production build
- **Production server**: `pnpm start` - Serves production build
- **Linting**: `pnpm lint` - Runs ESLint checks

## Architecture Overview

### Core Structure
This is a Next.js 15 Sudoku game application with multiple game modes and a sophisticated game state management system. The app uses App Router and TypeScript throughout.

### Key Components Architecture

**Game Modes** (located in `/src/components/`):
- `challenge-mode.tsx` - Main gameplay with timer and scoring
- `generate-mode.tsx` - Batch puzzle generation with printing options
- `solver-mode.tsx` - Auto-solving mode with real-time deduction visualization
- `history-mode.tsx` - Game history management and replay functionality

**Core Logic** (located in `/src/lib/`):
- `sudoku.ts` - Contains `SudokuUtils` class with all game logic including puzzle generation, validation, solving algorithms, and hint system
- `storage.ts` - Contains `StorageUtils` class managing localStorage persistence for games, stats, and settings
- `utils.ts` - Utility functions including Tailwind class merging

**Type System** (`/src/types/sudoku.ts`):
- `SudokuGrid` - 9x9 matrix of numbers or null
- `SudokuGame` - Complete game state with history and metadata
- `Difficulty` - Six levels: easy, medium, hard, expert, master, extreme
- `Move`, `Conflict`, `Hint` - Supporting interfaces for game mechanics

### Game State Management
Games are stored in localStorage with complete state persistence including:
- Move history with unlimited undo/redo
- Timer state with smart pause/resume on visibility changes
- Current game auto-save (separate from completed games history)
- Statistics tracking across difficulties

### UI Architecture
- Built with shadcn/ui components (Radix UI primitives + Tailwind CSS)
- Responsive left-right layout on desktop, stacked on mobile
- Theme support via next-themes with system/light/dark modes
- Framer Motion animations for smooth transitions
- Sonner for notifications
- Canvas confetti for completion celebrations

### Key Features
- **Smart Timer**: Only starts counting when first number is entered
- **Intelligent Hints**: Not just highlighting - actually fills in numbers with reasoning
- **Conflict Detection**: Real-time validation with visual feedback
- **Auto-solving Visualization**: Shows program-deduced numbers in gray, prevents user modification
- **Batch Generation**: Print-optimized layout with customizable page formats
- **Cross-mode Data Transfer**: Can import current game state into solver mode

### Component Communication
Components communicate via props for cross-mode data sharing (e.g., challenge mode can export current state to solver mode).

### Development Notes
- Package manager: pnpm
- UI components configured in `components.json` for shadcn/ui
- Path aliases: `@/*` maps to `src/*`
- Tailwind configured with CSS variables for theming
- Chinese language interface with difficulty names in Chinese