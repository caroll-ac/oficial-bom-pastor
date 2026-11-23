import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export type UploadedStorageFile = {
  url: string;
  key: string;
};

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly publicClient?: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly publicEndpoint?: string;
  private bucketReady = false;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET') || '';
    this.region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    this.endpoint = this.configService.get<string>('S3_ENDPOINT') || undefined;
    this.publicEndpoint = this.configService.get<string>('S3_PUBLIC_ENDPOINT') || undefined;

 

    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY') || '';

    

    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: Boolean(this.endpoint),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    if (this.publicEndpoint) {
      this.publicClient = new S3Client({
        region: this.region,
        endpoint: this.publicEndpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  async uploadBase64Document(base64OrDataUrl: string, folder: string, documentLabel: string): Promise<string> {
    const parsed = this.parseBase64(base64OrDataUrl);
    const uploaded = await this.uploadBufferDocument(parsed.buffer, parsed.mimeType, folder, documentLabel);

    return uploaded.url;
  }

  async uploadBufferDocument(buffer: Buffer, mimeType: string, folder: string, documentLabel: string): Promise<UploadedStorageFile> {
    this.ensureS3Config();
    await this.ensureBucketExists();

    const extension = this.extensionFromMime(mimeType);
    const datePrefix = new Date().toISOString().slice(0, 10);
    const key = `${folder}/${datePrefix}/${randomUUID()}-${documentLabel}.${extension}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
    } catch {
      throw new InternalServerErrorException('Falha ao enviar arquivo para o storage');
    }

    return {
      key,
      url: await this.buildFileUrl(key),
    };
  }

  async deleteObject(key: string) {
    this.ensureS3Config();

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch {
      throw new InternalServerErrorException('Falha ao remover arquivo do storage');
    }
  }

  private ensureS3Config() {
    if (!this.bucket) {
      throw new InternalServerErrorException('S3_BUCKET nao configurado');
    }
  }

  private async ensureBucketExists() {
    if (this.bucketReady) {
      return;
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucketReady = true;
      return;
    } catch {
      // Bucket nao existe ainda
    }

    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.bucketReady = true;
    } catch {
      throw new InternalServerErrorException('Falha ao preparar bucket no storage');
    }
  }

  private parseBase64(base64OrDataUrl: string): { buffer: Buffer; mimeType: string } {
    const dataUrlMatch = base64OrDataUrl.match(/^data:([^;]+);base64,(.+)$/);

    if (dataUrlMatch) {
      const mimeType = dataUrlMatch[1];
      const base64Payload = dataUrlMatch[2];
      return {
        buffer: Buffer.from(base64Payload, 'base64'),
        mimeType,
      };
    }

    return {
      buffer: Buffer.from(base64OrDataUrl, 'base64'),
      mimeType: 'application/octet-stream',
    };
  }

  private extensionFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };

    return map[mimeType] || 'bin';
  }

  async getFileUrl(key: string): Promise<string> {
  this.ensureS3Config();
  return this.buildFileUrl(key);
}

  async getPrivateFileUrl(key: string): Promise<string> {
    this.ensureS3Config();
    return getSignedUrl(
      this.publicClient ?? this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 60 * 15 },
    );
  }

async getStoredFileUrl(location: string): Promise<string> {
  let key = location;

  if (location.startsWith('s3://')) {
    const prefix = `s3://${this.bucket}/`;
    if (!location.startsWith(prefix)) {
      throw new InternalServerErrorException('Bucket do documento inválido');
    }
    key = location.slice(prefix.length);
  } else if (/^https?:\/\//i.test(location)) {
    const url = new URL(location);
    const configuredEndpoints = [this.endpoint, this.publicEndpoint].filter(Boolean);

    if (!configuredEndpoints.some((endpoint) => new URL(endpoint).origin === url.origin)) {
      throw new InternalServerErrorException(
        'Endereço do documento não corresponde ao storage configurado',
      );
    }

    const marker = `/${this.bucket}/`;
    const index = url.pathname.indexOf(marker);

    if (index < 0) {
      throw new InternalServerErrorException('Endereço do documento inválido');
    }

    key = decodeURIComponent(url.pathname.slice(index + marker.length));
  }

  return this.getFileUrl(key);
}// Remover a seção de doação.

  private async buildFileUrl(key: string): Promise<string> {
    const endpoint = this.publicEndpoint || this.endpoint;

    if (endpoint) {
      if (this.publicClient) {
        return getSignedUrl(
          this.publicClient,
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
          {
            expiresIn: 60 * 60 * 24 * 7,
          },
        );
      }

      const normalized = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
      return `${normalized}/${this.bucket}/${key}`;
    }

    return `s3://${this.bucket}/${key}`;
  }
}
