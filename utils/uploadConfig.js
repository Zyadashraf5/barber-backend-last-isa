const multer = require("multer");
const path = require("path");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

// Initialize S3Client
const s3 = new S3Client({
    endpoint: "https://fra1.digitaloceanspaces.com", // Your endpoint URL
    region: "fra1", // DigitalOcean Spaces region
    credentials: {
        accessKeyId: process.env.SPACES_KEY, // Your access key
        secretAccessKey: process.env.SPACES_SECRET, // Your secret key
    },
});

// Configure Multer with S3 storage for photos
const photoStorage = multerS3({
    s3: s3,
    bucket: "frank-space", // Your space name
    acl: "public-read", // Makes the file publicly readable
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically set the content type (e.g., image/jpeg)
    key: (req, file, cb) => {
        const fileName = `photos/${Date.now()}${path.extname(
            file.originalname
        )}`; // Unique file name with timestamp
        cb(null, fileName); // Save to the 'photos/' directory with the new file name
    },
});

// Set up multer middleware to handle file uploads
const upload = multer({ storage: photoStorage });

module.exports = upload;
