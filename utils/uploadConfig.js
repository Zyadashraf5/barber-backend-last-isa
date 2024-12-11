// const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3Client
const s3 = new S3Client({
    endpoint: 'https://fra1.digitaloceanspaces.com', // Replace 'nyc3' with your region
    region: 'fra1', // DigitalOcean Spaces region
    credentials: {
        accessKeyId: process.env.SPACES_KEY, // Use your access key
        secretAccessKey: process.env.SPACES_SECRET // Use your secret key
    }
});

// Configure Multer with S3Client
const uploadd = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'frank-space', // Replace with your space name
        acl: 'public-read',
        key: (req, file, cb) => {
            cb(null, `uploads/${Date.now()}_${file.originalname}`);
        }
    })
});

// const app = express();
module.exports = uploadd;

// Route to handle file upload

