const multer = require("multer");
const path = require("path");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

// Initialize S3Client
const s3 = new S3Client({
    endpoint: "https://frank-space.fra1.digitaloceanspaces.com", // Replace 'nyc3' with your region
    region: "fra1", // DigitalOcean Spaces region
    credentials: {
        accessKeyId: process.env.SPACES_KEY, // Use your access key
        secretAccessKey: process.env.SPACES_SECRET, // Use your secret key
    },
});

// Configure Multer with S3 storage
const userStorage = multerS3({
    s3: s3,
    bucket: "salonbarber", // Replace with your space name
    acl: "public-read", // Makes the file publicly readable
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically set the file's content type
    key: (req, file, cb) => {
        const fileName = `users/${Date.now()}${path.extname(
            file.originalname
        )}`;
        cb(null, fileName); // Unique file name with timestamp
    },
});

// Set up Multer middleware
const upload = multer({ storage: userStorage });

module.exports = upload;
