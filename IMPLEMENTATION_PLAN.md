# Implementation Plan: UX Improvements

## Overview
This plan covers 7 UX/UI improvements for Vox, organized into logical PRs for easier review.

---

## 📋 Task Breakdown

### PR #1: Model Download UX Improvements
**Related Issues:** #33 (Skip auto-download on startup if any Whisper model is already available)

**Tasks:**
1. **Add warning dialog during startup auto-download**
   - Show a native dialog before auto-downloading the recommended model
   - Message: "Vox needs to download the recommended Whisper model (small, ~460MB). This only happens once. Continue?"
   - Options: "Download" or "Cancel"
   - If canceled, show error dialog and exit gracefully

2. **Skip auto-download if ANY model is already downloaded**
   - Modify `src/main/app.ts` line 56-69
   - Check if ANY model is downloaded, not just the recommended one
   - Only auto-download if no models exist locally

3. **Add download confirmation dialog when selecting undownloaded model**
   - Modify `src/renderer/components/whisper/WhisperPanel.tsx` `handleSelect` function
   - Check if selected model is downloaded before switching
   - If not downloaded, show dialog: "Model '{size}' is not downloaded yet (~{size}MB). Download now?"
   - Options: "Download" or "Cancel"
   - If canceled, revert radio button to previously selected model
   - If confirmed, trigger download and only switch selection after completion

**Files to modify:**
- `src/main/app.ts`
- `src/renderer/components/whisper/WhisperPanel.tsx`
- `src/renderer/components/whisper/ModelRow.tsx` (may need state tracking)

---

### PR #2: LLM System Prompt Enhancement (Question Preservation)
**Related Issues:** #3 (Enhance system prompt with self-correction capability)

**Tasks:**
1. **Enhance system prompt to preserve question intonation**
   - Modify `src/shared/constants.ts` `LLM_SYSTEM_PROMPT`
   - Add rule: "If the input contains a question (indicated by rising intonation, question words like 'what', 'why', 'how', or context suggesting inquiry), preserve it as a question with a question mark"
   - Add rule: "Maintain the interrogative nature of questions even when fixing grammar"

**Files to modify:**
- `src/shared/constants.ts`

**Testing:**
- Test with sample questions: "where is the file", "what time is it", "why does this happen"
- Verify question marks are preserved after correction

---

### PR #3: Tray Icon "Start Listening" Feature
**Related Issues:** None directly related

**Tasks:**
1. **Add "Start Listening" menu item to tray**
   - Modify `src/main/tray.ts`
   - Add new menu item: "Start Listening" between "Show Vox" and separator
   - Clicking triggers the same action as pressing the toggle shortcut
   - Should return focus to previously focused application/text field

2. **Implement focus restoration**
   - Research Electron APIs for tracking/restoring previous window focus
   - Store reference to focused window before showing indicator
   - Return focus after indicator is dismissed
   - Test on macOS with various apps (browsers, text editors, terminals)

**Files to modify:**
- `src/main/tray.ts`
- `src/main/shortcuts/manager.ts` (may need to expose trigger method)
- Potentially new utility for focus management

---

### PR #4: Multi-Monitor Overlay Support
**Related Issues:** None directly related

**Tasks:**
1. **Dynamic display detection for indicator overlay**
   - Modify `src/main/indicator.ts` line 111-113
   - Replace `screen.getPrimaryDisplay()` with `screen.getDisplayNearestPoint(screen.getCursorScreenPoint())`
   - This ensures overlay appears on the monitor where the cursor/focus is currently located

2. **Test multi-monitor scenarios**
   - Test with 2+ monitors
   - Verify overlay appears on correct monitor when triggering shortcut
   - Test when moving between monitors and triggering shortcut

**Files to modify:**
- `src/main/indicator.ts`

---

### PR #5: Settings Window Header Redesign
**Related Issues:** None directly related

**Tasks:**
1. **Center and resize header logo**
   - Modify `src/renderer/components/layout/Header.tsx`
   - Reduce logo size (experiment with 24px-32px height)
   - Center horizontally in header
   - Position vertically aligned with window controls (traffic lights on macOS)
   - Update `src/renderer/components/layout/Header.module.scss` accordingly

**Files to modify:**
- `src/renderer/components/layout/Header.tsx`
- `src/renderer/components/layout/Header.module.scss`

---

### PR #6: Cancel Recording with Escape Key
**Related Issues:** #32 (Cancel recording with Escape key)

**Tasks:**
1. **Implement cancel functionality**
   - Modify `src/main/shortcuts/listener.ts` to handle Escape key
   - When Escape is pressed during "listening", "transcribing", or "correcting" states:
     - Cancel all ongoing operations (recording, transcription, LLM call)
     - Do NOT paste/type anything
     - Transition state machine to "idle"

2. **Add "Canceled" indicator**
   - Modify `src/main/indicator.ts` to add new mode: "canceled"
   - Color: Yellow/amber (`#fbbf24` or similar)
   - Text: "Canceled"
   - No pulse animation, static display
   - Auto-hide after 1.5 seconds

3. **Register global Escape listener**
   - Only active when recording/processing is in progress
   - Unregister when idle to avoid interfering with other apps

**Files to modify:**
- `src/main/shortcuts/listener.ts`
- `src/main/shortcuts/manager.ts`
- `src/main/indicator.ts`
- `src/main/pipeline.ts` (add cancel method)

---

### PR #7: Additional Enhancements (Optional/Future)
**Note:** These can be split into separate PRs if desired

**Tasks:**
1. **Improve error messaging**
   - Review all error states and ensure clear, actionable messages
   - Add retry mechanisms where appropriate

2. **Performance monitoring**
   - Add timing logs for each pipeline stage
   - Useful for debugging and future optimization

---

## 🎯 Issues Closed by These PRs

- **PR #1** closes: #33 (Skip auto-download on startup if any Whisper model is already available)
- **PR #2** closes: #3 (Enhance system prompt with self-correction capability)
- **PR #6** closes: #32 (Cancel recording with Escape key)

---

## 📝 Implementation Notes

### General Guidelines:
- All changes should be backwards compatible
- Existing config files should continue to work
- No breaking changes to IPC APIs
- Add appropriate error handling for all new features
- Test on macOS (primary platform) before creating PR

### Testing Checklist:
- [ ] Manual testing of each feature
- [ ] Test with existing user configs
- [ ] Test multi-monitor scenarios (PR #4)
- [ ] Test focus restoration (PR #3)
- [ ] Test model download cancellation (PR #1)
- [ ] Test Escape key cancellation (PR #6)

### PR Creation:
- Follow repo PR template
- Add appropriate labels: `enhancement`, `ui/ux`, `feature`
- Branch naming: `feature/description-of-change` or `fix/description-of-change`
- Assign to João
- Reference closed issues in PR description

---

## 🚀 Implementation Order (Recommended)

1. **PR #2** - Simplest, only affects system prompt
2. **PR #4** - Simple, single-line change, good quick win
3. **PR #5** - UI-only, no logic changes
4. **PR #1** - More complex, involves dialog flows
5. **PR #6** - Most complex, requires state machine changes
6. **PR #3** - Requires focus management research, possibly complex

---

## ✅ Decisions Made

1. **PR #1**: If user cancels the startup download:
   - **Decision**: App continues running normally, no download happens
   - Warning dialog is only informative during first installation
   - User can download models later from settings

2. **PR #3**: Focus restoration approach:
   - **Decision**: Keep it simple - just trigger the toggle shortcut
   - Tray menu disappears automatically (native behavior)
   - Focus returns naturally without extra management
   - NO AppleScript or complex focus tracking needed

3. **PR #6**: Escape cancellation behavior:
   - **Decision**: YES - Cancel at ANY stage (listening, transcribing, correcting)
   - Show "Canceled" indicator and return to idle

---

## 📦 Additional Context

### Current Architecture:
- **Frontend**: React + TypeScript in `src/renderer/`
- **Backend**: Electron main process in `src/main/`
- **IPC**: Defined in `src/main/ipc.ts` and `src/preload/index.ts`
- **State Management**: Zustand stores in `src/renderer/stores/`
- **Styling**: SCSS modules

### Key Components:
- **Pipeline**: `src/main/pipeline.ts` - orchestrates recording → transcription → LLM correction
- **ShortcutManager**: `src/main/shortcuts/manager.ts` - global shortcut handling
- **IndicatorWindow**: `src/main/indicator.ts` - floating overlay UI
- **ModelManager**: `src/main/models/manager.ts` - Whisper model downloads

---

## ✅ Success Criteria

Each PR should:
1. Pass existing tests (if any)
2. Be manually tested on macOS
3. Include clear commit messages following conventional commits
4. Update documentation if user-facing behavior changes
5. Close relevant GitHub issues

---

**Plan Created**: 2026-02-08
**Status**: Ready for implementation
**Estimated Total PRs**: 6-7
