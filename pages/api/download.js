import s3 from "../../lib/s3Client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { ensureBucketExists } from "../../lib/ensureBucket";

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).end();

    const { key, inline } = req.query;

    try {
        if (!key) {
            return res.status(400).json({ error: "Missing key" });
        }

        // Touch the object to validate existence (optional, but helpful for errors)
        const bucket = process.env.AWS_S3_BUCKET || "my-gallery";
        await ensureBucketExists(s3, bucket);
        const data = await s3.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            })
        );

        // Stream the object directly to client (works for private buckets / MinIO)
        res.setHeader("Content-Type", data.ContentType || "application/octet-stream");
        res.setHeader("Content-Length", data.ContentLength ?? undefined);
        const asAttachment = inline !== "1";
        res.setHeader(
            "Content-Disposition",
            `${asAttachment ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(key)}`
        );
        data.Body.pipe(res);
        return;
    } catch (err) {
        console.error("Download error:", err);
        res.status(500).json({ error: err?.message || "Download failed" });
    }
}
