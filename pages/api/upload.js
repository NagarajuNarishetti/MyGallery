import { createRouter } from "next-connect";
import multer from "multer";
import s3 from "../../lib/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { ensureBucketExists } from "../../lib/ensureBucket";

const upload = multer({ storage: multer.memoryStorage() });

const router = createRouter();

// Accept either single file (legacy) or multiple files
router.use((req, res, next) => {
    const m = req.query?.multi === "1" ? upload.array("files") : upload.single("file");
    return m(req, res, next);
});

router.post(async (req, res) => {
    try {
        // If multi=1, use req.files; else, use req.file
        const multi = req.query?.multi === "1";
        const files = multi ? (req.files || []) : (req.file ? [req.file] : []);
        if (!files.length) return res.status(400).json({ error: "No file(s) provided" });
        const bucket = process.env.AWS_S3_BUCKET || "my-gallery";
        await ensureBucketExists(s3, bucket);

        const uploaded = [];
        for (const file of files) {
            // Determine object key: prefer provided custom key, fallback to original filename
            // For multi, allow optional per-file key via body.keys[index] if provided
            let customKey = req.body?.key;
            if (multi && Array.isArray(req.body?.keys)) {
                const idx = files.indexOf(file);
                customKey = req.body.keys[idx];
            }
            if (typeof customKey === "string") customKey = customKey.trim();

            let objectKey = file.originalname;
            if (customKey) {
                const orig = file.originalname || "";
                const dot = orig.lastIndexOf(".");
                const origExt = dot > -1 ? orig.slice(dot) : "";
                const hasExt = /\.[^./\\]+$/.test(customKey);
                objectKey = hasExt ? customKey : `${customKey}${origExt}`;
            }

            const params = {
                Bucket: bucket,
                Key: objectKey,
                Body: file.buffer,
                ContentType: file.mimetype,
            };
            await s3.send(new PutObjectCommand(params));
            uploaded.push(objectKey);
        }

        res.status(200).json({ message: "Upload successful", keys: uploaded });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({
            error: err?.message || "Upload failed",
            name: err?.name,
            code: err?.Code || err?.code,
            status: err?.$metadata?.httpStatusCode,
        });
    }
});

export const config = {
    api: {
        bodyParser: false, // Disables Next.js built-in body parsing
    },
};

export default router.handler({
    onError(err, req, res) {
        console.error("Error in upload API:", err);
        res.status(500).json({ error: err?.message || "Upload failed" });
    },
    onNoMatch(req, res) {
        res.status(405).json({ error: "Method not allowed" });
    },
});
