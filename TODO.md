# TODO List

## High Priority

### 1. Fix Sorting

- [ ] Implement proper sorting functionality for table columns
- [ ] Handle different data types (string, number, date, file)
- [ ] Add visual indicators for sort direction (ascending/descending)
- [ ] Support multi-column sorting
- [ ] Persist sort state

### 2. Fix Filtering

- [ ] Fix filter functionality in FilterPopover component
- [ ] Ensure filters work with all column types
- [ ] Add proper filter operators (equals, contains, greater than, etc.)
- [ ] Handle date range filtering
- [ ] Clear all filters functionality
- [ ] Show active filter indicators

### 3. ~~Update File Column Editing~~ ✅

- [x] Add file info display (extension, name, path) in EditableCell
- [x] Show file metadata when editing
- [x] Improve file selection UI with file details
- [x] Add validation for file existence
- [x] Handle file path display (show shortened paths with ellipsis)

### 4. ~~File Editor Restrictions~~ ✅

- [x] Add extension-based restrictions for file columns
- [x] Configure allowed extensions per column type
- [x] Show appropriate error messages for invalid file types
- [x] Add file type configuration in TableColumn model
- [x] Validate file extensions on selection

### 5. File Preview on Hover

- [ ] Implement hover tooltip/popover for file columns
- [ ] Show file preview for supported types (images, PDFs)
- [ ] Display file metadata (size, modified date, type)
- [ ] Add file icon based on extension
- [ ] Handle files that don't exist or can't be previewed

### 6. Conditional Column/Row Formatting

- [ ] Add conditional formatting rules engine
- [ ] Support color coding based on values
- [ ] Add row highlighting based on conditions
- [ ] Support cell background/text color changes
- [ ] Add UI for managing formatting rules
- [ ] Examples:
  - Highlight overdue items (deadlineAt < today && !doneAt)
  - Color code by status
  - Warning colors for low counts

### 7. Statistics - Date Range Selection

- [ ] Add date range picker to statistics page
- [ ] Update database queries to filter by date range
- [ ] Get proper aggregated data from database
- [ ] Add preset ranges (This Week, This Month, This Quarter, This Year)
- [ ] Show statistics for selected date range
- [ ] Update charts/graphs with filtered data

### 8. ~~Fix Pagination~~ ✅

- [x] Fix pagination component behavior
- [x] Ensure page size changes work correctly
- [x] Add total count display
- [x] Add "Go to page" functionality
- [x] Preserve page state on refresh
- [x] Handle edge cases (empty results, single page)
- [x] Update URL params with current page

### 9. Date/Datetime Picker for Editors

- [ ] Add date picker component for date fields in EditableCell
- [ ] Add datetime picker component for datetime fields
- [ ] Replace plain text input with proper date/time picker UI
- [ ] Support keyboard input and picker selection
- [ ] Add calendar popup for date selection
- [ ] Add time selection UI for datetime fields
- [ ] Handle timezone considerations
- [ ] Add date format validation
- [ ] Add clear/reset date functionality
- [ ] Ensure accessibility (keyboard navigation, screen readers)
- [ ] Consider using a library (e.g., flatpickr, date-fns) or native HTML5 inputs

## Notes

- Each task should be broken down into smaller subtasks when work begins
- Test thoroughly after each implementation
- Update this file as tasks are completed or requirements change
- Consider performance implications for large datasets
- Ensure all changes work with existing refresh mechanism

## Completed Tasks

- [x] Table cell refresh mechanism
- [x] File selection for file-type columns
- [x] Double-click to edit cells
- [x] Automatic version bumping in Makefile
- [x] GitHub Actions updater JSON configuration
- [x] **Pagination** - Fixed pagination component behavior and functionality
- [x] **Gist Auto-Updater** - Set up automatic Gist updates for latest.json (private repo solution)
- [x] **Update File Column Editing** - Enhanced file editing UI with extension badge, name, path display, and file existence validation
- [x] **File Editor Restrictions** - Extension validation with allowed file types (PDF, DOCX, DOC, TXT, ODG)
- [x] **Editor Component Refactoring** - Separated all editors into reusable components (FileEditor, TextEditor, NumberEditor, DateEditor, DateTimeEditor, TextAreaEditor)
