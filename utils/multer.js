
// multer.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary'); // Import the cloudinary config

// Set up Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'public/uploads/images', // Folder on Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'avif', 'webp'], // Allowed file types
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, // Unique file name
  },
});

// Initialize Multer with Cloudinary storage and file size limit
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max size: 5MB
});

module.exports = upload;
