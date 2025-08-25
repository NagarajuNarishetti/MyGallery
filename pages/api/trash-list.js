import s3 from "../../lib/s3Client";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { ensureBucketExists } from "../../lib/ensureBucket";

export default async function handler(req, res) {
    try {
        const bucket = process.env.AWS_S3_BUCKET || "my-gallery";
        const prefix = "trash/";
        await ensureBucketExists(s3, bucket);
        const data = await s3.send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
            })
        );

        const files = (data.Contents || [])
            .filter((obj) => obj.Key && obj.Key.startsWith(prefix))
            .map((obj) => ({
                key: obj.Key.slice(prefix.length),
                trashKey: obj.Key,
                size: typeof obj.Size === "number" ? obj.Size : null,
                lastModified: obj.LastModified ? new Date(obj.LastModified).toISOString() : null,
            }))
            .filter((f) => f.key); // ignore folder placeholder

        res.status(200).json({ files });
    } catch (err) {
        console.error("Error listing trash objects:", err);
        res.status(500).json({ error: err?.message || "Failed to list trash" });
    }
}


