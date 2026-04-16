const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const streamifier = require("streamifier");
const { v2: cloudinary } = require("cloudinary");
const Document = require("../models/Document");

const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf";
    const isImage = file.mimetype.startsWith("image/");
    if (!isPdf && !isImage) {
      return cb(new Error("Only image and PDF files are allowed"));
    }
    cb(null, true);
  },
});

const configureCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary environment variables are missing");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
};

const uploadBufferToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

router.get("/", auth, async (req, res) => {
  try {
    const documents = await Document.find({ user: req.user }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (_error) {
    res.status(500).json({ message: "Error fetching documents" });
  }
});

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    configureCloudinary();

    const isPdf = req.file.mimetype === "application/pdf";
    const resourceType = isPdf ? "raw" : "image";
    const fileType = isPdf ? "pdf" : "image";

    const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "taskflow/documents",
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    });

    const title = req.body?.title?.trim() || req.file.originalname;

    const document = await Document.create({
      user: req.user,
      title,
      originalName: req.file.originalname,
      fileType,
      resourceType,
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      bytes: uploaded.bytes || req.file.size,
    });

    res.json(document);
  } catch (error) {
    console.error("Document upload error:", error?.message || error);
    res.status(500).json({ message: "Error uploading document" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    configureCloudinary();

    try {
      await cloudinary.uploader.destroy(document.publicId, {
        resource_type: document.resourceType,
      });
    } catch (err) {
      console.error("Cloudinary delete warning:", err?.message || err);
    }

    await Document.deleteOne({ _id: document._id });
    res.json({ message: "Document deleted" });
  } catch (_error) {
    res.status(500).json({ message: "Error deleting document" });
  }
});

module.exports = router;
