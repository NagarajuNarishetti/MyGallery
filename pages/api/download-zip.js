import s3 from "../../lib/s3Client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { ensureBucketExists } from "../../lib/ensureBucket";

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const { keys, bin } = req.body || {};
        if (!Array.isArray(keys) || keys.length === 0) {
            return res.status(400).json({ error: "keys array required" });
        }

        // Lazy import archiver to keep cold start small
        const archiver = (await import("archiver")).default;

        const bucket = process.env.AWS_S3_BUCKET || "my-gallery";
        await ensureBucketExists(s3, bucket);

        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="gallery-download-${Date.now()}.zip"`
        );

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.on("error", (err) => {
            console.error("Zip error:", err);
            try { res.status(500).end(); } catch {}
        });
        archive.pipe(res);

        for (const key of keys) {
            if (!key || typeof key !== "string") continue;
            const objectKey = bin ? `trash/${key}` : key;
            try {
                const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
                const filename = key.split("/").pop() || key;
                archive.append(obj.Body, { name: filename });
            } catch (err) {
                // Skip missing/bad keys, but log for visibility
                console.warn("Skipping key in zip:", objectKey, err?.message);
            }
        }

        await archive.finalize();
    } catch (err) {
        console.error("download-zip error:", err);
        res.status(500).json({ error: err?.message || "Failed to build zip" });
    }
}


