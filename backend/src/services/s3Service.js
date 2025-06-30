// backend/services/s3Service.js
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
      Body: fileStream,// Optional: allows public access
    };

    s3.upload(params, (err, data) => {
      if (err) return reject(err);
      resolve(data.Location); // public URL
    });
  });
}

module.exports = { uploadFileToS3 };
