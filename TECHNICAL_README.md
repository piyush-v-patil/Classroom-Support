# ⚙️ Technical Architecture — AV Support Dashboard

This document provides a development overview for the UNCC Classroom AV Support Dashboard. The application is built entirely as a client-side Static Web Application (HTML/CSS/JS) to guarantee zero-latency execution, flawless offline capabilities (PWA ready), and minimal hosting overhead.

---

## 🏗️ Project Structure

The project has been refactored from a single monolithic file into a modular structure:

*   **`index.html`** (formerly `av-support.html`): The DOM structure. Handles the base layout, navigation, modal targets, and structural anchors.
*   **`styles.css`**: All visual rules. Utilizes modern CSS custom properties (variables) for the cyberpunk/dark-mode theme. Contains all responsive `@media` breakpoints, UI micro-animations, and the specialized print engine rules.
*   **`app.js`**: State management, initial data payloads, and event logic.

---

## 💾 State Management & Data Handling

Because this app prioritizes speed and requires no backend, **all data is currently loaded in memory** when the application spins up.

### `DEVICES` Array
Contains static metadata for the hardware reference grid.
```javascript
{ img: 'images/Extron.jpg', ico: '🧠', name: 'IPCP Pro 360xi', role: '...', ... }
```

### `issues` Array
The dynamic core of the troubleshooting application. The `loadDemoData()` function populates this array on boot.
*   The system uses an **In-Memory CRUD** architecture. When an administrator logs in, they can push, edit, or delete items inside the `issues` array. 
*   *Note on persistence:* Because there is no database (SQL/Firebase) attached, any `issues` array mutations made in the admin UI will not survive a browser refresh. To permanently add an issue, the raw array in `app.js` must be updated.

---

## 🖨️ The PDF Print Engine

Instead of utilizing an external library like `jspdf` or `html2canvas` (which negatively impacts performance and creates bloat), the PDF exporter is powered entirely via the browser's native DOM-to-PDF rendering pipeline.

*   `app.js > window.exportPDF()`: Dynamically modifies the `document.title` to force a clean filename (`UNCC_Classroom_Support_Guide.pdf`), intercepts the DOM to add the `.open` class to every single hidden accordion, and fires `window.print()`.
*   `styles.css > @media print`: Radically restructures the layout. Hides heavy media, overrides the dark theme with forced `#fff` backgrounds, and applies `page-break-inside: avoid` to prevent troubleshooting steps from snapping across multi-page boundaries.

---

## 🚀 Deployment (Vercel / GitHub Pages)

The application requires no node modules, build steps, or compilation. It is immediately ready for deployment to any static edge network.

*   **Vercel:** Drag and drop the root folder into the Vercel dashboard. Vercel automatically detects `index.html` and distributes the assets globally.
*   **GitHub Pages:** Push the repository to GitHub, enable GitHub Pages via Settings, and deploy directly from the `main` branch.

All image assets are locally referenced inside the `/images/` directory. If migrating to cloud storage, update the `img:` string inside the `DEVICES` array in `app.js`.
