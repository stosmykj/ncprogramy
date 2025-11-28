# NC Programs - Development Roadmap & TODO

Generated from PROJECT_ANALYSIS_AND_ROADMAP.md
Date: October 20, 2025

---

## 🎯 Priority Tasks

### G-Code Editor Enhancements

- [ ] Enhance G-code editor with code formatting and refactoring tools
  - Auto-indent and alignment
  - Code folding for subroutines
  - Convert absolute to incremental (G90/G91)
  - Optimize rapid moves
  - Remove redundant codes

### 3D Visualization System (High Priority)

- [ ] Upgrade 2D preview to full 3D toolpath visualization with Three.js
  - WebGL-based rendering
  - 60 FPS smooth animation
  - Multi-axis visualization (3, 4, 5-axis)
  - Tool holder and spindle models

- [ ] Add simulation controls (play/pause/speed/timeline scrubber)
  - Play/Pause/Stop buttons
  - Speed control (0.1x to 10x)
  - Step-by-step execution
  - Jump to line functionality
  - Timeline scrubber

- [ ] Implement material removal simulation in 3D viewer
  - Real-time stock removal visualization
  - Color-coded cutting operations
  - Tool compensation visualization

- [ ] Add collision detection for toolpath safety
  - Work envelope boundary checking
  - Tool collision warnings
  - Holder/spindle interference detection

- [ ] Create cycle time calculator and toolpath analyzer
  - Distance traveled statistics
  - Tool usage report
  - Feed rate optimization suggestions
  - Rapid move analysis

---

## 📦 Program Management

### Version Control

- [ ] Build program versioning system with Git-like features
  - Track changes and maintain history
  - Branching for experimental modifications
  - Rollback to previous versions
  - Change annotations with author/date

- [ ] Add diff viewer for G-code changes
  - Side-by-side code comparison
  - Line-by-line change highlighting
  - Syntax-aware diffing

### Time Tracking

- [ ] Implement machine time tracking with timers
  - Start/stop timers per program
  - Automatic time logging
  - Downtime tracking

- [ ] Create variance analysis (estimated vs actual time)
  - Efficiency metrics calculation
  - Performance trending
  - Optimization suggestions

---

## 🔧 Tool & Production Management

### Tool Library

- [ ] Build tool library management system
  - Tool catalog with specifications
  - Tool type, diameter, length, material
  - Max RPM and feed rate settings
  - Cost tracking per tool

- [ ] Add tool life tracking and automatic selection
  - Tool usage monitoring
  - Life remaining calculations
  - Automatic tool replacement alerts
  - Tool change optimization

## 📊 Implementation Phases

### Phase 1: Foundation (Q1 2025)

**Goal**: Enhance 3D visualization and code editing capabilities

**Tasks**:

- [ ] 3D visualization upgrade with Three.js
- [ ] Enhanced simulation controls (play/pause/speed)
- [ ] Code formatting and refactoring tools
- [ ] Material removal simulation
- [ ] Collision detection basics

**Expected Duration**: 12 weeks

### Phase 2: Management Features (Q2 2025)

**Goal**: Add comprehensive program and tool management

**Tasks**:

- [ ] Program versioning system with Git-like features
- [ ] Tool library management system
- [ ] Machine time tracking with timers
- [ ] Variance analysis (estimated vs actual)
- [ ] Diff viewer for G-code changes

**Expected Duration**: 12 weeks

## 🎓 Technical Requirements

### New Dependencies Required

#### For 3D Visualization

```json
{
  "dependencies": {
    "three": "^0.160.0",
    "@types/three": "^0.160.0",
    "three-mesh-bvh": "^0.7.0"
  }
}
```

#### For Advanced Code Editing

```json
{
  "dependencies": {
    "@codemirror/view": "^6.0.0",
    "@codemirror/language": "^6.0.0",
    "@codemirror/state": "^6.0.0"
  }
}
```

#### For Parsing

```json
{
  "dependencies": {
    "antlr4": "^4.13.0"
  }
}
```

---

## ✅ Completed Features

### Recent Session (October 20, 2025)

- [x] **G-code Editor with Monaco**
  - Comprehensive lexer and tokenizer
  - Syntax highlighting (G-codes, M-codes, axes)
  - IntelliSense with auto-completion
  - Real-time validation and linting
  - MIKROPROG-specific commands for FCM 28
  - Code snippets and quick insertions

- [x] **2D Toolpath Visualization**
  - Canvas-based preview rendering
  - Pan and zoom controls
  - Toolpath simulation with animation
  - Color-coded segments (rapid/linear/arc)
  - Statistics display (length, time, tools)
  - Grid and axes visualization

- [x] **Formatting Rules Editor**
  - Visual condition builder component
  - Nested AND/OR logic support (3 levels deep)
  - Row and cell-level formatting options
  - Color pickers for background and text
  - Font weight controls
  - Priority management with drag controls
  - Complete CRUD operations

- [x] **Icon Integration**
  - All Material Design icons imported
  - Menu navigation updates
  - Consistent icon usage across app

### Previously Completed (2024)

- [x] Advanced filtering with complex operators
- [x] Multi-column sorting with visual indicators
- [x] Conditional formatting with nested logic
- [x] File preview on hover with metadata
- [x] Statistics dashboard with date ranges
- [x] Import/export functionality (.pnc files)
- [x] Auto-update system via GitHub
- [x] Inline editing with double-click
- [x] Pagination with customizable page size
- [x] Keyboard navigation (arrows, Enter)
- [x] Context menu for row operations
- [x] File management with type validation
- [x] Reactive state management (Svelte 5 runes)
- [x] SQLite database with migrations
- [x] Tauri 2.0 desktop application

---

## 📈 Success Metrics

### Expected Impact Per Phase

**Phase 1 (3D Visualization)**:

- 40% reduction in programming errors (visual verification)
- 30% faster program review process
- 50% reduction in collision-related crashes

**Phase 2 (Management)**:

- 25% reduction in tool costs (better tracking)
- 20% improvement in time estimation accuracy
- Complete audit trail for all changes

### Overall Expected Benefits

- **Productivity**: 30-40% reduction in programming time
- **Quality**: 50% reduction in programming errors
- **Cost**: 20-25% reduction in tool wear and material waste
- **Safety**: Near-zero collision incidents with detection

---

## 🔗 Related Documentation

- [PROJECT_ANALYSIS_AND_ROADMAP.md](./PROJECT_ANALYSIS_AND_ROADMAP.md) - Complete analysis
- [TODO.md](./TODO.md) - Original task list
- [README.md](./README.md) - Project overview

---

## 📝 Notes

- Each task should be broken down into smaller subtasks when work begins
- Test thoroughly after each implementation
- Update this file as tasks are completed or requirements change
- Consider performance implications for large datasets
- Ensure backward compatibility with existing features
- Document all new APIs and components
- Gather user feedback at each phase milestone
