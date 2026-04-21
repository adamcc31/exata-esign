import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  region: process.env.S3_REGION || 'ap-southeast-1',
  endpoint: process.env.S3_ENDPOINT, // E.g., Railway/MinIO/S3 compatible endpoint
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'exata-nenkin';

export const uploadFileToS3 = async (key: string, body: Buffer, contentType: string) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3Client.send(command);
  // Return the path
  return key;
};

export const getPresignedUrl = async (key: string, expiresIn = 3600, downloadFilename?: string) => {
  const commandInput: any = {
    Bucket: BUCKET_NAME,
    Key: key,
  };
  
  if (downloadFilename) {
    commandInput.ResponseContentDisposition = `attachment; filename="${downloadFilename}"`;
  }

  const command = new GetObjectCommand(commandInput);
  return getSignedUrl(s3Client, command, { expiresIn });
};
