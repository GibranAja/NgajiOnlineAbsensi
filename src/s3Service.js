/**
 * S3 Service - Object Storage Upload Service
 * S3-Compatible storage for photo uploads
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Load config from file if exists
function loadConfigFromFile() {
  try {
    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData);
      if (config.s3) {
        console.log('[S3] Loaded config from file');
        return config.s3;
      }
    }
  } catch (error) {
    console.error('[S3] Error loading config file:', error.message);
  }
  return null;
}

// S3 Configuration - Load from file or use defaults/env
const fileConfig = loadConfigFromFile();

const S3Config = {
  accessKey: fileConfig?.accessKey || process.env.S3_ACCESS_KEY || 'YOUR_ACCESS_KEY',
  secretKey: fileConfig?.secretKey || process.env.S3_SECRET_KEY || 'YOUR_SECRET_KEY',
  serviceUrl: fileConfig?.serviceUrl || process.env.S3_SERVICE_URL || 'https://is3.cloudhost.id',
  bucketName: fileConfig?.bucketName || process.env.S3_BUCKET_NAME || 'ngajiku-photos',
  region: fileConfig?.region || process.env.S3_REGION || 'us-east-1'
};

// Initialize S3 client
let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: S3Config.region,
      endpoint: S3Config.serviceUrl,
      credentials: {
        accessKeyId: S3Config.accessKey,
        secretAccessKey: S3Config.secretKey,
      },
      forcePathStyle: true, // Required for S3-compatible endpoints
    });
  }
  return s3Client;
}

/**
 * Generate unique filename for photo
 * Format: absensi/{date}/{personId}_{acaraId}_{timestamp}.jpg
 */
function generatePhotoKey(personId, acaraId) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timestamp = now.getTime();
  return `absensi/${dateStr}/${personId}_${acaraId}_${timestamp}.jpg`;
}

/**
 * Upload photo to S3-compatible storage
 * @param {string} base64Data - Base64 encoded image data (without data URL prefix)
 * @param {number} personId - Person ID
 * @param {number} acaraId - Event ID
 * @returns {Promise<{success: boolean, url?: string, key?: string, error?: string}>}
 */
async function uploadPhoto(base64Data, personId, acaraId) {
  try {
    console.log('[S3] Starting photo upload...');

    if (!base64Data) {
      return { success: false, error: 'No photo data provided' };
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique key
    const key = generatePhotoKey(personId, acaraId);

    console.log('[S3] Uploading to key:', key);
    console.log('[S3] Buffer size:', buffer.length, 'bytes');

    // Create upload command
    const command = new PutObjectCommand({
      Bucket: S3Config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      // Optional: Set ACL to public-read if bucket policy allows
      ACL: 'public-read',
    });

    // Execute upload
    const client = getS3Client();
    const response = await client.send(command);

    console.log('[S3] Upload response:', response);

    // Construct the public URL
    // Format depends on your S3-compatible service configuration
    const photoUrl = `${S3Config.serviceUrl}/${S3Config.bucketName}/${key}`;

    console.log('[S3] Photo URL:', photoUrl);

    return {
      success: true,
      url: photoUrl,
      key: key,
      etag: response.ETag
    };

  } catch (error) {
    console.error('[S3] Upload error:', error);
    return {
      success: false,
      error: error.message || 'Unknown upload error'
    };
  }
}

/**
 * Update S3 configuration at runtime
 * Useful for configuration from UI
 */
function updateConfig(config) {
  if (config.accessKey) S3Config.accessKey = config.accessKey;
  if (config.secretKey) S3Config.secretKey = config.secretKey;
  if (config.serviceUrl) S3Config.serviceUrl = config.serviceUrl;
  if (config.bucketName) S3Config.bucketName = config.bucketName;
  if (config.region) S3Config.region = config.region;

  // Reset client to use new config
  s3Client = null;

  console.log('[S3] Configuration updated');
}

/**
 * Get current S3 configuration (without secrets)
 */
function getConfig() {
  return {
    serviceUrl: S3Config.serviceUrl,
    bucketName: S3Config.bucketName,
    region: S3Config.region,
    hasCredentials: !!(S3Config.accessKey && S3Config.secretKey)
  };
}

/**
 * Test S3 connection
 */
async function testConnection() {
  try {
    // Try to upload a small test file
    const testKey = `test/connection_test_${Date.now()}.txt`;
    const testData = Buffer.from('test');

    const command = new PutObjectCommand({
      Bucket: S3Config.bucketName,
      Key: testKey,
      Body: testData,
      ContentType: 'text/plain',
    });

    const client = getS3Client();
    await client.send(command);

    console.log('[S3] Connection test successful');
    return { success: true };
  } catch (error) {
    console.error('[S3] Connection test failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  uploadPhoto,
  updateConfig,
  getConfig,
  testConnection
};
