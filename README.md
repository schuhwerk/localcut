# LocalCut

A browser-based video snipping tool powered by FFmpeg WASM.

## Features

- **Local Processing**: Video files are processed entirely in your browser.
- **Privacy**: No files are uploaded to any server.

## Usage

1. **Cut Video**:
   - Drag & drop a video file.
   - Use `I` and `O` keys (or buttons) to mark In/Out points.
   - Press `Enter` to add a segment.
   - **Naming**: Segments with the **same name** are merged into one file. Different names create separate files.
   - Click "Cut Now" to process and download.

2. **Export Command**:
   - Click "Show Cmd" to generate FFmpeg commands for local execution.
   - Enable "CUDA" in Settings (⚙️) to generate commands with NVENC flags (fast!).

## Hotkeys

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `I` | Set In Point |
| `O` | Set Out Point |
| `Enter` | Add Segment |

## Notes

- **CUDA/GPU**: Not supported in browser (WASM is CPU-only). Use "Show Cmd" to run with GPU locally.
- vibe-coded with gemini 3 Pro

## Serve Locally

Due to `SharedArrayBuffer` requirements, this must be served with specific headers (COOP/COEP).

A `coi-serviceworker.js` is included to handle this on GitHub Pages or simple static hosts.

For local testing:
```bash
python -m http.server 8080
# Then open http://localhost:8080