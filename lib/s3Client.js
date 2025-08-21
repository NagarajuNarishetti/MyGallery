import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.AWS_S3_ENDPOINT || "http://localhost:9000";
const region = process.env.AWS_S3_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "minioadmin";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "minioadmin";

const s3 = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true, // required for MinIO
});

export default s3;
