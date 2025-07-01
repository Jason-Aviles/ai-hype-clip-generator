const fs = require("fs");
const AWS = require("aws-sdk");
const path = require("path");

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

function uploadFileToS3(filePath, key) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileStream,
    };

    s3.upload(params, (err, data) => {
      if (err) return reject(err);
      resolve(data.Location); // public URL
    });
  });
}

function downloadFileFromS3(s3Key, localPath) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key.replace(`https://${BUCKET_NAME}.s3.amazonaws.com/`, ""),
    };

    const fileStream = fs.createWriteStream(localPath);
    s3.getObject(params)
      .createReadStream()
      .on("error", reject)
      .pipe(fileStream)
      .on("finish", resolve)
      .on("error", reject);
  });
}

module.exports = {
  uploadFileToS3,
  downloadFileFromS3,
};
