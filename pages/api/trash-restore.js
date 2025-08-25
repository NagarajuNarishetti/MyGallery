import s3 from "../../lib/s3Client";
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { ensureBucketExists } from "../../lib/ensureBucket";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { key } = req.query; // original key (without trash/)
    if (!key) return res.status(400).json({ error: "Missing key" });

    try {
        const bucket = process.env.AWS_S3_BUCKET || "my-gallery";
        const srcKey = `trash/${key}`;
        await ensureBucketExists(s3, bucket);
        await s3.send(
            new CopyObjectCommand({
                Bucket: bucket,
                CopySource: `/${bucket}/${encodeURIComponent(srcKey)}`,
                Key: key,
            })
        );
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: srcKey }));
        res.status(200).json({ message: "Restored", key });
    } catch (err) {
        console.error("Trash restore error:", err);
        res.status(500).json({ error: err?.message || "Restore failed" });
    }
}


