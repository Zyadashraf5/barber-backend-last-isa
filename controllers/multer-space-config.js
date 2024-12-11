const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const AppError = require("../utils/AppError");

// Configure S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
    endpoint: 'https://salonbarber.nyc3.digitaloceanspaces.com',  // This should be the endpoint for your Space (without `/public`)
    region: 'nyc3',  // Region of your space (adjust if necessary)
    credentials: {
        accessKeyId: 'DO006HNPCVDZRH87WK6F',
        secretAccessKey: 'We7raxMqxTw5vpIB7iVa2sO67eXke8EYrBjYGtH5dyU'
    },
    forcePathStyle: true // Required for DigitalOcean Spaces
});

// Configure multer-s3 to upload photos to the desired folder
const s3Storage = multerS3({
    s3: s3Client,
    bucket: process.env.DO_SPACES_BUCKET, // Your Space's bucket name
    acl: 'public-read', // This allows public read access to the file
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically sets the content type
    key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Upload the file under /public/photos/ in the Space
        cb(null, `photos/${uniqueSuffix}-${file.originalname}`);
    }
});

// Create multer upload middleware
const upload = multer({
    storage: s3Storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limit file size to 5MB
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new AppError('Only image files are allowed!', 400), false);
        }
        cb(null, true);
    }
});

module.exports = upload; // Export the upload middleware
