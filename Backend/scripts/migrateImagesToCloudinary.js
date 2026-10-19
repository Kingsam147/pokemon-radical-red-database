require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const SOURCE_ROOT = process.argv[2] || process.env.MIGRATION_SOURCE_DIR;
const PROGRESS_LOG_PATH = path.join(__dirname, '.migration-progress.log');
const CONCURRENCY = 10;
const MAX_RETRIES = 2;

if (!SOURCE_ROOT) {
  console.error('Usage: node migrateImagesToCloudinary.js <path-to-downloaded-s3-folder>');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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

const toPublicId = (filePath) => {
  const relativePath = path.relative(SOURCE_ROOT, filePath);
  const withoutExtension = relativePath.slice(0, -path.extname(relativePath).length);
  return withoutExtension.split(path.sep).join('/');
};

const loadAlreadyUploaded = () => {
  if (!fs.existsSync(PROGRESS_LOG_PATH)) return new Set();
  const lines = fs.readFileSync(PROGRESS_LOG_PATH, 'utf8').split('\n').filter(Boolean);
  return new Set(lines);
};

const appendToProgressLog = (publicId) => {
  fs.appendFileSync(PROGRESS_LOG_PATH, `${publicId}\n`);
};

const uploadOne = async (filePath, publicId, attempt = 1) => {
  try {
    await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
    });
    appendToProgressLog(publicId);
    return { publicId, status: 'uploaded' };
  } catch (error) {
    if (attempt <= MAX_RETRIES) {
      return uploadOne(filePath, publicId, attempt + 1);
    }
    return { publicId, status: 'failed', error: error.message };
  }
};

const runMigration = async () => {
  const allFiles = walkFiles(SOURCE_ROOT);
  const alreadyUploaded = loadAlreadyUploaded();

  const pending = allFiles
    .map((filePath) => ({ filePath, publicId: toPublicId(filePath) }))
    .filter(({ publicId }) => !alreadyUploaded.has(publicId));

  console.log(`Found ${allFiles.length} files, ${alreadyUploaded.size} already uploaded, ${pending.length} remaining.`);

  const failed = [];
  let uploadedCount = alreadyUploaded.size;

  for (let start = 0; start < pending.length; start += CONCURRENCY) {
    const batch = pending.slice(start, start + CONCURRENCY);
    const results = await Promise.all(batch.map(({ filePath, publicId }) => uploadOne(filePath, publicId)));

    for (const result of results) {
      if (result.status === 'uploaded') {
        uploadedCount += 1;
      } else {
        failed.push(result);
      }
    }

    if (uploadedCount % 100 < CONCURRENCY) {
      console.log(`Progress: ${uploadedCount}/${allFiles.length} uploaded.`);
    }
  }

  console.log(`Done. Uploaded: ${uploadedCount}/${allFiles.length}. Failed: ${failed.length}.`);
  if (failed.length > 0) {
    console.log('Failed public IDs:');
    failed.forEach(({ publicId, error }) => console.log(`  ${publicId}: ${error}`));
  }
};

runMigration();
