import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getBucketName, getAwsRegion } from '../configs/s3.config';
import crypto from 'crypto';
import path from 'path';

export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  originalName: string,
  mimetype: string,
  folder: string = 'general'
): Promise<string> => {
  const s3Client = getS3Client();
  const bucketName: string = getBucketName();
  const region: string = getAwsRegion();

  const fileExtension: string = path.extname(originalName);
  const uniqueName: string = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
  const key: string = `${folder}/${uniqueName}`;

  const command: PutObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await s3Client.send(command);

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};