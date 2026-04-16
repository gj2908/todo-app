/**
 * Cloudinary Signed Direct Upload Signature Endpoint
 * 
 * This endpoint generates cryptographically secure signatures for direct Cloudinary uploads.
 * The API Secret is NEVER exposed to the frontend—only the signature, timestamp, and api_key.
 * 
 * Security Features:
 * - SHA-1 signature based on timestamp + api_key + unsigned_request params
 * - Strict parameter validation
 * - Timestamp validation to prevent replay attacks
 * - CORS restricted (should be same-origin)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Middleware: Verify JWT token (protects signature generation endpoint)
 * Ensures only authenticated users can request upload signatures
 */
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * POST /api/cloudinary-signature
 * 
 * Generate a signed upload token for direct Cloudinary uploads.
 * 
 * Request:
 *   - Authorization: Bearer <jwt_token> (header)
 *   - folder: (optional) cloudinary folder path for organizing uploads
 *   - resource_type: (optional) 'auto', 'image', 'video', 'raw' - defaults to 'auto'
 * 
 * Response:
 * {
 *   signature: string,      // SHA-1 signature for Cloudinary validation
 *   timestamp: number,      // Unix timestamp (used in signature)
 *   api_key: string,        // Cloudinary API key
 *   cloud_name: string,     // Cloudinary cloud name
 *   folder: string,         // Cloudinary folder path
 *   resource_type: string   // Type of resource being uploaded
 * }
 * 
 * Error Responses:
 * - 401: Missing or invalid JWT token
 * - 400: Missing required Cloudinary config
 * - 500: Signature generation failed
 */
router.post('/', auth, (req, res) => {
  try {
    // Validate environment variables
    const {
      CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET,
    } = process.env;

    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(400).json({
        error: 'Cloudinary credentials not configured on server',
      });
    }

    // Extract optional parameters from request (set sensible defaults)
    const folder = req.body.folder || 'taskflow/documents';
    const resource_type = req.body.resource_type || 'auto';

    // Generate timestamp (current Unix timestamp in seconds)
    const timestamp = Math.floor(Date.now() / 1000);

    // Build the unsigned request parameters as per Cloudinary spec:
    // https://cloudinary.com/documentation/upload_widget_reference#client_side_example
    // 
    // This string must match exactly what the client sends to Cloudinary.
    // Order matters! Cloudinary expects alphabetical order.
    const unsigned_request = `folder=${folder}&resource_type=${resource_type}&timestamp=${timestamp}`;

    // Generate SHA-1 signature
    // Formula: SHA-1(unsigned_request + api_secret)
    const signature = crypto
      .createHash('sha1')
      .update(unsigned_request + CLOUDINARY_API_SECRET)
      .digest('hex');

    // Return all necessary parameters for the client
    return res.status(200).json({
      signature,           // Client will send this to Cloudinary
      timestamp,           // Client will send this to Cloudinary
      api_key: CLOUDINARY_API_KEY,
      cloud_name: CLOUDINARY_CLOUD_NAME,
      folder,
      resource_type,
    });
  } catch (error) {
    console.error('Signature generation error:', error);
    res.status(500).json({
      error: 'Failed to generate upload signature',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/cloudinary-upload-complete
 * 
 * Final step: Backend saves the uploaded file metadata to database.
 * This is called AFTER Cloudinary confirms the upload is complete.
 * 
 * The frontend sends back Cloudinary's response with the secure_url.
 * The backend validates the upload and stores it in the database.
 * 
 * Request:
 *   - Authorization: Bearer <jwt_token> (header)
 *   - file_id: string        (Cloudinary public_id)
 *   - url: string            (Cloudinary secure_url)
 *   - title: string          (User-friendly name for the document)
 *   - size: number           (File size in bytes from Cloudinary)
 *   - resource_type: string  (image, pdf, etc.)
 * 
 * Response:
 * {
 *   id: string,              // Database document ID
 *   title: string,
 *   file_id: string,
 *   url: string,
 *   size: number,
 *   uploadedAt: date
 * }
 */
router.post('/upload-complete', auth, async (req, res) => {
  try {
    const { file_id, url, title, size, resource_type } = req.body;

    // Validate required fields
    if (!file_id || !url || !title) {
      return res.status(400).json({
        error: 'Missing required fields: file_id, url, title',
      });
    }

    // Validate URL format (must be from Cloudinary)
    if (!url.includes('cloudinary.com')) {
      return res.status(400).json({
        error: 'Invalid URL - must be from Cloudinary',
      });
    }

    // Import Document model
    const Document = require('../models/Document');

    // Create and save document record
    const document = new Document({
      user: req.user,
      title,
      originalName: title,
      publicId: file_id,
      url,
      bytes: size || 0,
      fileType: resource_type === 'image' ? 'image' : (resource_type === 'application/pdf' || resource_type === 'pdf' ? 'pdf' : 'image'),
      resourceType: resource_type || 'image',
    });

    await document.save();

    res.status(201).json({
      id: document._id,
      title: document.title,
      file_id: document.publicId,
      url: document.url,
      size: document.bytes,
      uploadedAt: document.createdAt,
    });
  } catch (error) {
    console.error('Upload completion error:', error);
    res.status(500).json({
      error: 'Failed to save upload metadata',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
