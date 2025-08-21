## Project: My Gallery

A lightweight, full‑stack Next.js app for uploading, listing, previewing, downloading, and deleting media (images/videos) stored in an S3‑compatible object storage (MinIO locally by default, AWS S3 in production).

### Why this project exists
- **Simple personal media hosting**: Quickly manage images and videos without a database.
- **S3‑compatible storage**: Leverages durable, cheap, and scalable object storage (works with MinIO, AWS S3, and others).
- **Drop‑in hosting**: Runs locally with MinIO; switch to AWS S3 via environment variables for deployment.

### High‑level architecture (How it works)
- **Frontend (Next.js + React)**: Single page (`pages/index.js`) that:
  - Lists files from `/api/list`
  - Uploads with a form to `/api/upload`
  - Deletes via `/api/delete?key=...`
  - Streams media via `/api/download?key=...&inline=1`
  - Provides a light/dark theme toggle with persistent preference
- **Backend (Next.js API routes)**: Thin API layer using AWS SDK v3 to interact with S3/MinIO:
  - `pages/api/upload.js`: Receive and store files
  - `pages/api/list.js`: List objects
  - `pages/api/download.js`: Stream an object to client
  - `pages/api/delete.js`: Delete an object
  - `pages/api/health.js`: Basic connectivity and bucket existence info
- **Storage**: `lib/s3Client.js` configures an `S3Client` instance (MinIO by default, AWS S3 if configured). `lib/ensureBucket.js` ensures the bucket exists.

### Tech stack (What is used)
- **Framework/UI**: Next.js 15 (Pages Router), React 19
- **API middleware**: `next-connect` for composable handlers
- **Upload handling**: `multer` with in‑memory storage
- **Storage SDK**: AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`)
- **Object storage**: MinIO locally by default; S3‑compatible endpoints (AWS S3 supported)
- **Styling**: Inline styles powered by global CSS variables for theming

### Repository structure
- `pages/index.js`: UI for upload, listing, preview, delete, download, sorting, and theme toggle
- `pages/api/upload.js`: POST multipart upload (field name: `file`)
- `pages/api/list.js`: GET list of objects in the bucket
- `pages/api/download.js`: GET stream of an object; `inline=1` for inline preview
- `pages/api/delete.js`: DELETE an object by key
- `pages/api/health.js`: Health and storage diagnostics
- `lib/s3Client.js`: Configured S3 client (endpoint, region, credentials)
- `lib/ensureBucket.js`: Bucket existence/creation helper
- `styles/globals.css`: Theme variables and base styles
- `pages/_app.js`: Global CSS import and initial theme setup

### Configuration
Provide these environment variables (a `local .env` example is included):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_ENDPOINT` (e.g., `http://localhost:9000` for MinIO or an S3 endpoint)
- `AWS_S3_REGION` (e.g., `us-east-1`)
- `AWS_S3_BUCKET` (e.g., `my-gallery`)

Defaults enable local development with MinIO: `minioadmin` credentials, `http://localhost:9000`, bucket `my-gallery`.

### Running locally
1) Install dependencies
```bash
npm install
```
2) Start MinIO (or use an existing S3 endpoint)
- With Docker (example):
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -v ./data:/data \
  quay.io/minio/minio server /data --console-address ":9001"
```
3) Create/update `local .env` with your values
4) Run the dev server
```bash
npm run dev
```
5) Open the app at `http://localhost:3000`

### Deployment
- Any Next.js‑compatible host (e.g., Vercel, Render, AWS Amplify) works.
- Set production env vars to point at AWS S3 (or another S3‑compatible provider):
  - `AWS_S3_ENDPOINT` to S3 (omit for default AWS behavior or keep provider endpoint)
  - Use real IAM credentials with restricted access
- Ensure outbound network access from the host to your storage endpoint.

### Frontend behavior
- Fetches file metadata from `/api/list` on load.
- Splits results into images and videos based on extension.
- Sorting options: date (asc/desc), size (asc/desc), name (asc/desc).
- Image grid: previews via `/api/download?inline=1&key=...`.
- Video grid: HTML5 video with the same inline stream.
- Download button: triggers a new tab download.
- Delete button: calls `/api/delete` then refreshes the list.

### Theming (Light/Dark)
- Global CSS variables live in `styles/globals.css` for colors (bg, text, muted, border, card, primary, danger, etc.).
- `pages/_app.js` sets `document.documentElement[data-theme]` to `light` or `dark` based on localStorage or system preference.
- `pages/index.js` uses CSS variables instead of hardcoded colors and exposes a toggle (🌙/☀️).

### API Endpoints
- `POST /api/upload`
  - Multipart form with field name `file` (single file)
  - Uses `multer` memory storage; writes object to S3/MinIO via `PutObjectCommand`
  - Response: `{ message: "Upload successful" }` or error JSON
- `GET /api/list`
  - Returns `{ files: [{ key, url, size, lastModified }] }`
- `GET /api/download?key=...&inline=1`
  - Streams object; `inline=1` for inline preview, otherwise attachment download
- `DELETE /api/delete?key=...`
  - Deletes the specified key; returns `{ message: "Deleted successfully" }`
- `GET /api/health`
  - Connectivity and bucket existence info; lists buckets for quick diagnostics

### Storage details
- Keys are the original filenames provided by the client.
- Bucket is ensured on upload/list/download/delete via `ensureBucketExists`.
- For MinIO, `forcePathStyle: true` is enabled for compatibility.

### Error handling & observability
- API routes wrap operations in try/catch and return meaningful HTTP status codes (400/405/500).
- Upload endpoint returns extra debugging metadata on failure (name/code/status when available).
- Client logs to console on fetch failures and safely falls back to empty lists.

### Security considerations (Important)
- Do not commit real credentials. Use environment variables in deployment.
- Limit IAM access (AWS):
  - Scope policy to a specific bucket and minimal S3 actions (GetObject, PutObject, DeleteObject, ListBucket, HeadBucket).
- Consider restricting uploads to certain MIME types and max sizes (current code accepts any single file and stores as‑is).
- Add authentication/authorization before exposing publicly (current app is open by design for local use/testing).
- Set CORS on your bucket/provider as needed for your domain.

### Performance & scalability
- S3/MinIO scales horizontally; files are streamed, not buffered, on download.
- Listing uses `ListObjectsV2` without pagination; consider pagination for large buckets.
- Uploads use in‑memory `multer` storage; for very large files, consider streaming multipart to S3 (e.g., `Upload` from `@aws-sdk/lib-storage`).

### Common customizations
- File naming: prefix keys with user/session folders or timestamps to avoid collisions.
- Validation: enforce allowed extensions, MIME types, and size limits.
- Thumbnails: generate and store smaller previews for large images/videos (serverless function or queue worker).
- Access control: add login and per‑user buckets or key prefixes.
- UI: switch to a CSS framework (Tailwind, etc.) if desired.

### Troubleshooting
- Cannot connect to MinIO/S3:
  - Verify `AWS_S3_ENDPOINT`, credentials, and that the service is reachable from the app.
  - For MinIO with path‑style URLs, keep `forcePathStyle: true` (already set).
- 403/AccessDenied:
  - Check bucket policy/IAM permissions; ensure region and bucket name are correct.
- Upload succeeds but preview fails:
  - Confirm `ContentType` was set on upload (it is set from `multer`’s `file.mimetype`).
  - Access the file via `/api/download?inline=1&key=...` and check browser console/network.
- Nothing appears in the list:
  - Ensure the bucket exists (the app attempts to create it). Check `/api/health`.

### FAQs
- **Can I use AWS S3 in production?** Yes. Set AWS creds, region, and bucket; point `AWS_S3_ENDPOINT` to AWS or omit it.
- **Where are files stored?** In your configured S3‑compatible bucket. No database is used.
- **How big can files be?** Constrained by server memory (since `multer` uses memory). Switch to streamed uploads for very large files.
- **How are images/videos detected?** By filename extension on the client for grouping the grid.
- **Does it support subfolders?** Keys can include `/` and will work; listing is flat unless you implement prefix/delimiter logic.

---

If you need production hardening (auth, validations, pagination, streamed uploads, CDN, or CI/CD), see “Common customizations” to prioritize next steps.


