import { HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";

/**
 * Ensures the target bucket exists. If not, attempts to create it.
 * Safe to call on every request; HeadBucket is cheap.
 */
export async function ensureBucketExists(s3, bucketName) {
    if (!bucketName) {
        throw new Error("AWS_S3_BUCKET is not set");
    }

    try {
        await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
        return true;
    } catch (_err) {
        // On any failure, attempt to create (MinIO may return varied codes)
        try {
            await s3.send(
                new CreateBucketCommand({
                    Bucket: bucketName,
                })
            );
            return true;
        } catch (createErr) {
            // If bucket already exists due to race or policy, treat as success
            const alreadyExists = createErr?.$metadata?.httpStatusCode === 409;
            if (alreadyExists) return true;
            throw createErr;
        }
    }
}


