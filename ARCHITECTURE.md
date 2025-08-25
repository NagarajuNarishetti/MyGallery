## My Gallery – Architecture and Feature Deep Dive

This document explains every feature and technology used in the project, how it works end-to-end, and why it’s designed this way. Use this as your go-to reference before reviews or handoffs.

### Contents
- Purpose and High-Level Overview
- User Flows (Upload → Browse → Preview → Delete/Restore → Download)
- Technologies and Why We Chose Them
- Storage Model (S3/MinIO)
- Frontend Architecture (pages/index.js)
- Backend/API Architecture (pages/api/*)
- Detailed Features
  - Upload (single/multiple)
  - Listing & Sorting
  - Grid/List Views
  - Light/Dark Theme
  - Image Lightbox
  - Videos Support
  - Delete → Bin (Trash) Flow
  - Restore & Delete Permanently
  - Multi-select & Bulk Actions (Zip Download)
- Operational & Security Considerations
- Scaling and Performance
- File Reference Map

---

## Purpose and High-Level Overview
My Gallery is a minimal, production-friendly media manager. It stores images and videos in S3-compatible object storage and provides a clean UI to upload, view, sort, and manage them. A soft-delete Bin model prevents accidental data loss.

## User Flows
1) Upload
 - User selects one or more files. The client submits a multipart request to `/api/upload`.
 - For multiple files, the client uses `?multi=1` and repeats `files` fields.
 - The API writes each file to the bucket via AWS SDK v3 `PutObjectCommand`.

2) Browse
 - On load, the UI fetches `/api/list` to get `{ key, size, lastModified }` per object.
 - Items are split into Images vs Videos by filename extension.
 - Users can choose Grid or List view and sort by date/size/name.

3) Preview (Images)
 - Clicking an image opens a fullscreen lightbox with keyboard navigation.
 - The image bytes are streamed inline from `/api/download?inline=1&key=...`.

4) Delete / Bin
 - In Images/Videos, Delete triggers soft-delete: the object is copied to `trash/<key>` then the original is removed (`/api/trash-move`).
 - The Bin tab lists objects from `trash/` via `/api/trash-list`.

5) Restore / Delete Permanently
 - Restore copies from `trash/<key>` back to `<key>` and deletes the trash copy (`/api/trash-restore`).
 - Permanent delete removes `trash/<key>` (`/api/trash-delete`).

6) Multi-select & Bulk Actions
 - Each row/card has a checkbox; selections are tracked in state.
 - Bulk Download calls `POST /api/download-zip` to stream one ZIP containing all selected items.
 - Bulk Delete behaves like single delete (to Bin) outside Bin; inside Bin it permanently deletes. Bulk Restore applies in Bin.

## Technologies and Why We Chose Them
- Next.js: Combines React UI with serverless-style API routes. Simplifies deployment and reduces the need for a separate backend service.
- AWS SDK v3: Standard and well-supported S3 client compatible with both MinIO and AWS S3.
- MinIO: Local, free, and S3-compatible. Ideal for development; later switch to AWS S3 without code changes.
- archiver: Efficiently zips multiple objects for bulk download.
- multer: Simple multipart handling in the Next.js API route for uploads.

## Storage Model (S3/MinIO)
- Bucket: All objects live in a single bucket (default `my-gallery`).
- Keys: Usually the original filename; the UI supports an optional custom name for single-file uploads.
- Bin: Implemented as a prefix `trash/`. Soft-deleted items are moved here. Restores copy them back; permanent deletes remove the `trash/` copy.
- Metadata: Size and last-modified returned by S3 are used for display/sorting; no separate database is required.

## Frontend Architecture (pages/index.js)
- State: `files`, `binFiles`, `activeTab` (images/videos/bin), `sortKey`, `viewMode`, `selectedKeys`, theme, and upload helpers.
- Fetching: `fetchFiles()` and `fetchTrash()` call the respective API routes.
- Views: Grid/List components render cards or rows. Cards include actions and optional selection checkboxes.
- Bulk Bar: When any items are selected, a bulk action bar appears with context-aware actions (Download, Delete/Restore, Delete Permanently).
- Lightbox: Only for images in the Images tab; arrow keys navigate, Esc closes.

## Backend/API Architecture (pages/api/*)
- list.js: `ListObjectsV2` for the main bucket, mapping to `{ key, size, lastModified }`.
- upload.js: Accepts single `file` or multi `files` (when `?multi=1`), writes via `PutObjectCommand`.
- download.js: Streams an object (inline or attachment) via `GetObjectCommand`.
- trash-move.js: Copy to `trash/<key>` then delete original.
- trash-list.js: List objects under `trash/`.
- trash-restore.js: Copy back from `trash/<key>` then delete trash copy.
- trash-delete.js: Permanently delete `trash/<key>`.
- download-zip.js: Streams a zip of multiple requested objects; supports `bin` to read from `trash/`.

## Detailed Features
### Upload (single/multiple)
- Single: field `file`, optional `key` for custom name. Server ensures bucket, sets `ContentType`, and stores bytes.
- Multiple: query `?multi=1`, repeated `files` fields; server iterates and uploads all.

### Listing & Sorting
- `GET /api/list` returns metadata; the client sorts by name/size/date. Sorting is entirely client-side for simplicity.

### Grid/List Views
- A toggle switches between a responsive card grid and a compact list.
- Cards/rows include previews, metadata, actions, and selection controls.

### Light/Dark Theme
- CSS variables in `styles/globals.css` define theme colors. A toggle updates `data-theme` on `<html>` and persists to `localStorage`.

### Image Lightbox
- Shows a large inline image fetched via `/api/download?inline=1&key=...`. Supports ←/→ and Esc.

### Videos Support
- Videos render with `<video controls>` and stream via the same download endpoint with inline mode.

### Delete → Bin (Trash)
- Deletes in Images/Videos call `/api/trash-move` (soft-delete). Items disappear from the main tabs and appear in Bin.

### Restore & Delete Permanently
- Bin ‘Restore’ calls `/api/trash-restore`.
- Bin ‘Delete Permanently’ calls `/api/trash-delete`.

### Multi-select & Bulk Actions (Zip Download)
- Checkbox per item. Bulk bar shows Download, Delete (or Restore / Delete Permanently when in Bin), and Clear.
- Download collects all selected keys and posts to `/api/download-zip`, returning a single zip to avoid popup blocking and improve UX.

## Operational & Security Considerations
- Credentials via env vars; never commit secrets. Limit IAM permissions when using AWS.
- Objects are served via the backend by default; add auth/middleware to restrict access in production.
- Consider input validation for uploads (size/type limits) and server-side thumbnails for performance.

## Scaling and Performance
- Listing: add pagination and caching for large buckets.
- Delivery: use a CDN (e.g., CloudFront) or signed URLs for large-scale traffic.
- Uploads: switch to multipart/resumable uploads for very large files.
- Metadata: introduce a DB if you need richer attributes (tags, sharing, ACLs) and fast search.

## File Reference Map
- UI: `pages/index.js`
- API:
  - Upload: `pages/api/upload.js`
  - List: `pages/api/list.js`
  - Download single: `pages/api/download.js`
  - Download zip (bulk): `pages/api/download-zip.js`
  - Trash (soft-delete): `pages/api/trash-move.js`
  - Trash list: `pages/api/trash-list.js`
  - Trash restore: `pages/api/trash-restore.js`
  - Trash delete permanently: `pages/api/trash-delete.js`
- Storage helpers: `lib/s3Client.js`, `lib/ensureBucket.js`
- Styles & App: `styles/globals.css`, `pages/_app.js`

---

## See Also
- README (visual tour and quick start)
- ProjectExplanation.md (comprehensive overview)


