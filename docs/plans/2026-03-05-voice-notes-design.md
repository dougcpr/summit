# Voice-to-Text Notes

## Summary

Add a microphone button inside the note editor textarea that uses the Web Speech API to transcribe speech and append it to the current note content.

## Design

### Interaction

- Mic icon sits in the bottom-right corner of the textarea (small, faded)
- Tap to start listening — icon turns red/pulsing to indicate active recording
- Speech transcribes in real-time, appending to current note content (space-separated)
- Tap again to stop, or auto-stops on silence
- Existing auto-save debounce handles persistence

### Implementation

- Use browser `webkitSpeechRecognition` / `SpeechRecognition` API
- `continuous: true`, `interimResults: true` for real-time feedback
- Append final results to current content state
- If API unavailable (Firefox), hide the mic button entirely

### Error Handling

- Permission denied: stop recording, reset icon state
- No speech detected: auto-stops, no action needed

### Files Changed

- `src/components/log/note-editor.tsx` — wrap textarea in relative container, add mic button with speech recognition logic

### Approach

Web Speech API chosen over external services (Whisper, Deepgram) because it's free, requires no API keys or backend changes, and works on Safari/Chrome which covers mobile gym use.
