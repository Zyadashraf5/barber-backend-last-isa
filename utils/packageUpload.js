const multer = require('multer');
const path = require('path');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

// Initialize S3Client for DigitalOcean Spaces
const s3 = new S3Client({
    endpoint: 'https://nyc3.digitaloceanspaces.com', // DigitalOcean region endpoint
    region: 'nyc3', // DigitalOcean Spaces region
    credentials: {
        accessKeyId: process.env.SPACES_KEY, // Use your access key
        secretAccessKey: process.env.SPACES_SECRET // Use your secret key
    }
});

// Set up storage configuration for package photos in DigitalOcean Spaces
const packageStorage = multerS3({
    s3: s3,
    bucket: 'salonbarber', // Replace with your DigitalOcean Space name
    acl: 'public-read', // Makes the file publicly readable
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically set the file's content type
    key: (req, file, cb) => {
        const fileName = `packages/${Date.now()}${path.extname(file.originalname)}`; // Store in 'packages' folder with unique file name
        cb(null, fileName); // Set the file path in DigitalOcean Space
    }
});

// Set up Multer middleware for file upload
const upload = multer({ storage: packageStorage });

// Export the upload middleware
module.exports = upload;
