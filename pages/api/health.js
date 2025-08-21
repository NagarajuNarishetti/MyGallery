import s3 from "../../lib/s3Client";
import { ListBucketsCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    try {
        const endpoint = process.env.AWS_S3_ENDPOINT;
        const bucket = process.env.AWS_S3_BUCKET;
        const region = process.env.AWS_S3_REGION;

        // Basic connectivity: list buckets
        const list = await s3.send(new ListBucketsCommand({}));

        // Bucket existence check (no creation here)
        let bucketExists = false;
        try {
            await s3.send(new HeadBucketCommand({ Bucket: bucket }));
            bucketExists = true;
        } catch (_) {
            bucketExists = false;
        }

        res.status(200).json({
            ok: true,
            endpoint,
            region,
            bucket,
            bucketExists,
            buckets: list?.Buckets?.map((b) => b.Name) || [],
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
}


