# React Sample – Generate Resizes Feature

This repo demonstrates a real-world React feature: **automatic generation, download, and sharing of advertising resizes**. It uses custom hooks, RTK Query, and modular UI components.

---

## Features

- Generate resized assets for multiple advertising platforms.
- Polls backend tasks until `done`, `error`, or `cancelled`.
- Selective or full generation of resizes.
- Download and share generated assets.
- Handles errors with notifications.

---

## Architecture

- **Custom hook:** `useGenerateResizes`  
  - Returns a `Promise<string>` with the render URL.  
  - Polls backend until completion.  
  - **Note:** only one active task at a time.

- **UI Components:**  
  - `GenerateResizesButton` – buttons, modals, overlays.  
  - `GenerateResizesForm` – maps selected resizes to backend DTOs.

- **State management:** RTK Query for fetching/mutations, with polling and caching.

---

## Design Notes

- Polling used for simplicity over WebSockets.  
- Form handles orchestration + UI for maintainability.  
- No unit tests included in this demo.  

---

## Usage

```bash
git clone https://github.com/bulat-f/react-sample.git
npm install
npm start
```
