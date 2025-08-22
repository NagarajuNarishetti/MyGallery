import { createRouter } from "next-connect";
import multer from "multer";
import s3 from "../../lib/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { ensureBucketExists } from "../../lib/ensureBucket";

const upload = multer({ storage: multer.memoryStorage() });

const router = createRouter();

router.use(upload.single("file"));

router.post(async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "No file provided" });
        }
        const bucket = process.env.AWS_S3_BUCKET || "my-gallery";
        await ensureBucketExists(s3, bucket);

        // Determine object key: prefer provided custom key, fallback to original filename
        let customKey = req.body?.key;
        if (typeof customKey === "string") customKey = customKey.trim();

        let objectKey = file.originalname;
        if (customKey) {
            // If custom key has no extension, append the original extension (if any)
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

        res.status(200).json({ message: "Upload successful", key: objectKey });
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
