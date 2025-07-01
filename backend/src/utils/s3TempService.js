const fs = require("fs");
const AWS = require("aws-sdk");
const path = require("path");

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

const downloadFromS3 = (s3Url, localPath) => {
  return new Promise((resolve, reject) => {
    const { Bucket, Key } = extractBucketAndKey(s3Url);
    const pathDir = path.dirname(localPath);
    fs.mkdirSync(pathDir, { recursive: true });

    const file = fs.createWriteStream(localPath);
    s3.getObject({ Bucket, Key })
      .createReadStream()
      .on("error", reject)
      .pipe(file)
      .on("finish", resolve)
      .on("error", reject);
  });
};

const uploadFileToS3 = (localPath, key, bucket) => {
  const fileStream = fs.createReadStream(localPath);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: fileStream,
  };
  return s3
    .upload(params)
    .promise()
    .then((data) => data.Location);
};

const uploadFileToTempS3 = async (localPath) => {
  const key = `temp/overlay-${Date.now()}.mp4`;
  await uploadFileToS3(localPath, key, process.env.AWS_TEMP_BUCKET);
  return `https://${process.env.AWS_TEMP_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};


const moveOverlayToFinal = async (tempUrl) => {
  const { Bucket, Key } = extractBucketAndKey(tempUrl);
  const finalKey = Key.replace("temp/", "final/");

  await s3
    .copyObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      CopySource: `${Bucket}/${Key}`,
      Key: finalKey,
    })
    .promise();

  await s3.deleteObject({ Bucket, Key }).promise();

  return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${finalKey}`;
};

function extractBucketAndKey(s3Url) {
  const url = new URL(s3Url);
  const Bucket = url.hostname.split(".")[0];
  const Key = decodeURIComponent(url.pathname.slice(1));
  return { Bucket, Key };
}

module.exports = {
  downloadFromS3,
  uploadFileToTempS3,
  moveOverlayToFinal,
};
