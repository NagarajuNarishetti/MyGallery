## My Gallery

A lightweight Next.js app to upload, list, preview, download, and delete (with Bin) images and videos on an S3‑compatible storage (MinIO locally, AWS S3 in production). Includes light/dark theme, sorting, grid/list views, multi-file upload, and multi-select with bulk download (zip) and delete/restore.

For full details, see `ProjectExplanation.md`.

Architecture and deep dive: see `ARCHITECTURE.md`.

## Visual Tour

### Light Mode
![Light Mode UI](Images/InLightMood.png)

- Shows the default light theme.
- Media are displayed in a responsive grid; images render as previews, videos render with controls.
- Header provides upload form, tabs to switch Images/Videos, sorting, and theme toggle.

### Dark Mode
![Dark Mode UI](Images/InDarkMood.png)

- Demonstrates the dark theme using CSS variables.
- Toggle switches between light and dark; preference persists via `localStorage` and respects system preference on first load.

### Sort By Controls
![Sort By Options](Images/SortBy.png)

- Sorting options: Date (Latest → Oldest, Oldest → Latest), Size (Small → Large, Large → Small), Name (A → Z, Z → A).
- Sorting applies independently within the active tab (Images or Videos).

### Grid and List Views
![Grid and List Views](Images/GridViewAndListView.png)

- Toggle between Grid and List to suit your browsing style.
- Works across Images, Videos, and Bin tabs.

### Multi-select, Bulk Download and Delete/Restore
![Select and Bulk Actions](Images/DowloadeAndDeleteMultipleFIlesWithSelectOption.png)

- Select multiple items using the checkbox on each card/row.
- Bulk Download creates a single ZIP file for all selected items.
- In Images/Videos: bulk Delete moves items to Bin (soft delete).
- In Bin: bulk Restore or Delete Permanently.

### Trash Bin (Recently Deleted)
![Trash Bin](Images/TrashBin.png)

- Deleted items move to Bin under a `trash/` prefix in storage.
- Restore brings an item back; Delete Permanently removes it from storage.

## Quick Start
```bash
npm install
npm run dev
# open http://localhost:3000
```

Ensure your environment variables are set (see `local .env` example and `ProjectExplanation.md`).


