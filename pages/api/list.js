import s3 from "../../lib/s3Client";   // ✅ relative path instead of @
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { ensureBucketExists } from "../../lib/ensureBucket";

export default async function handler(req, res) {
    try {
        const bucket = process.env.AWS_S3_BUCKET || "my-gallery";
        await ensureBucketExists(s3, bucket);
        const data = await s3.send(
            new ListObjectsV2Command({
                Bucket: bucket,
            })
        );

        const endpoint = (process.env.AWS_S3_ENDPOINT || "http://localhost:9000").replace(/\/$/, "");
        const files = (data.Contents || []).map((obj) => ({
            key: obj.Key,
            url: `${endpoint}/${bucket}/${encodeURIComponent(obj.Key)}`,
            size: typeof obj.Size === "number" ? obj.Size : null,
            lastModified: obj.LastModified ? new Date(obj.LastModified).toISOString() : null,
        }));

        res.status(200).json({ files });
    } catch (err) {
        console.error("Error listing objects:", err);
        res.status(500).json({ error: err?.message || "Failed to list objects" });
    }
}
