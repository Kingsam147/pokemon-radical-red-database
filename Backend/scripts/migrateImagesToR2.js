require('dotenv').config();
const fs = require('fs');
const path = require('path');
const clientS3 = require('@aws-sdk/client-s3');

const SOURCE_ROOT = process.argv[2] || process.env.MIGRATION_SOURCE_DIR;
const PROGRESS_LOG_PATH = path.join(__dirname, '.r2-migration-progress.log');
const CONCURRENCY = 16;
const MAX_RETRIES = 3;
const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const CONTENT_TYPES = {
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const REQUIRED_ENV = ['R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  console.error(`Missing required env vars: ${missingEnv.join(', ')}`);
  process.exit(1);
}

if (!SOURCE_ROOT || !fs.existsSync(SOURCE_ROOT)) {
  console.error('Usage: node migrateImagesToR2.js <path-to-downloaded-s3-folder>');
  process.exit(1);
}

const bucket = process.env.R2_BUCKET;
const r2Client = new clientS3.S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const walkFiles = (directory) => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
};

const toObjectKey = (filePath) => path.relative(SOURCE_ROOT, filePath).split(path.sep).join('/');

const loadAlreadyUploaded = () => {
  if (!fs.existsSync(PROGRESS_LOG_PATH)) return new Set();
  const lines = fs.readFileSync(PROGRESS_LOG_PATH, 'utf8').split('\n').filter(Boolean);
  return new Set(lines);
};

const uploadOne = async (filePath, objectKey, attempt = 1) => {
  const extension = path.extname(filePath).toLowerCase();
  try {
    await r2Client.send(new clientS3.PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: fs.readFileSync(filePath),
      ContentType: CONTENT_TYPES[extension] || 'application/octet-stream',
      CacheControl: CACHE_CONTROL,
    }));
    fs.appendFileSync(PROGRESS_LOG_PATH, `${objectKey}\n`);
    return true;
  } catch (error) {
    if (attempt <= MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      return uploadOne(filePath, objectKey, attempt + 1);
    }
    console.error(`FAILED ${objectKey}: ${error.message}`);
    return false;
  }
};

const countBucketObjects = async () => {
  let count = 0;
  let continuationToken;
  do {
    const page = await r2Client.send(new clientS3.ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }));
    count += page.KeyCount || 0;
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return count;
};

const main = async () => {
  const allFiles = walkFiles(SOURCE_ROOT);
  const alreadyUploaded = loadAlreadyUploaded();
  const pending = allFiles.filter((filePath) => !alreadyUploaded.has(toObjectKey(filePath)));

  console.log(`Found ${allFiles.length} files, ${alreadyUploaded.size} already uploaded, ${pending.length} to go.`);

  let nextIndex = 0;
  let uploadedCount = 0;
  let failedCount = 0;

  const worker = async () => {
    while (nextIndex < pending.length) {
      const filePath = pending[nextIndex];
      nextIndex += 1;
      const succeeded = await uploadOne(filePath, toObjectKey(filePath));
      if (succeeded) {
        uploadedCount += 1;
      } else {
        failedCount += 1;
      }
      const processed = uploadedCount + failedCount;
      if (processed % 1000 === 0) {
        console.log(`Progress: ${processed}/${pending.length} (${failedCount} failed)`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done. Uploaded ${uploadedCount}, failed ${failedCount}.`);

  const bucketCount = await countBucketObjects();
  console.log(`Bucket now holds ${bucketCount} objects; source folder has ${allFiles.length} files.`);
  if (failedCount > 0 || bucketCount < allFiles.length) {
    console.error('Migration incomplete — re-run the script to retry the remaining files.');
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
