const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');

// Initialize S3Client for DigitalOcean Spaces
const s3 = new S3Client({
    endpoint: 'https://frank-space.fra1.digitaloceanspaces.com', // DigitalOcean region endpoint
    region: 'fra1', // DigitalOcean Spaces region
    credentials: {
        accessKeyId: process.env.SPACES_KEY, // Use your access key
        secretAccessKey: process.env.SPACES_SECRET // Use your secret key
    }
});

const storage = multerS3({
    s3: s3,
    bucket: 'salonbarber',
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically sets the correct Content-Type
    key: (req, file, cb) => {
        cb(null, `photos/${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Initialize multer for multiple file uploads (for multiple photos)
const multipleUpload = multer({
    storage,
    limits: { 
        fileSize: 10 * 1024 * 1024 // Example file size limit (10 MB)
    },
    // Custom fileFilter function to check the number of files
    fileFilter: (req, file, cb) => {
        if (req.files && req.files.length >= 11) {
            return cb(new Error('Cannot upload more than 10 files.'));
        }
        cb(null, true);
    }
}).array('photos'); // Handle multiple files with the field name 'photos'

module.exports = {
    multipleUpload
};
