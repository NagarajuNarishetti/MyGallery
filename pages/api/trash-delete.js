import s3 from "../../lib/s3Client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { ensureBucketExists } from "../../lib/ensureBucket";

export default async function handler(req, res) {
    if (req.method !== "DELETE") return res.status(405).end();

    const { key } = req.query; // original key (without trash/)
    if (!key) return res.status(400).json({ error: "Missing key" });

    try {
        const bucket = process.env.AWS_S3_BUCKET || "my-gallery";
        const trashKey = `trash/${key}`;
        await ensureBucketExists(s3, bucket);
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: trashKey }));
        res.status(200).json({ message: "Deleted permanently" });
    } catch (err) {
        console.error("Trash delete error:", err);
        res.status(500).json({ error: err?.message || "Permanent delete failed" });
    }
}


