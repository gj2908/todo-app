const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const multer = require("multer");
const streamifier = require("streamifier");
const { v2: cloudinary } = require("cloudinary");
const Document = require("../models/Document");

const sanitizeBaseName = (value) =>
  value
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);

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

const DOCUMENT_KINDS = ["general", "note", "datesheet", "syllabus"];

router.get("/", protect, async (req, res) => {
  try {
    const query = { user: req.user };
    if (req.query.kind) {
      if (!DOCUMENT_KINDS.includes(req.query.kind)) {
        return res.status(400).json({ message: "Invalid kind filter" });
      }
      query.kind = req.query.kind;
    }
    if (req.query.subject !== undefined) {
      query.subject = req.query.subject || null;
    }

    const documents = await Document.find(query).sort(
      req.query.kind === "syllabus" ? { date: 1, createdAt: -1 } : { createdAt: -1 }
    );
    res.json(documents);
  } catch (_error) {
    res.status(500).json({ message: "Error fetching documents" });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(document);
  } catch (_error) {
    res.status(500).json({ message: "Error fetching document" });
  }
});

router.get("/:id/download", protect, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const response = await fetch(document.url);
    if (!response.ok) {
      return res.status(502).json({ message: "Failed to download from storage provider" });
    }

    const fileBuffer = Buffer.from(await response.arrayBuffer());
    const inferredType =
      response.headers.get("content-type") ||
      (document.fileType === "pdf" ? "application/pdf" : "application/octet-stream");
    const fileName = (document.originalName || `${document.title}.${document.fileType === "pdf" ? "pdf" : "bin"}`)
      .replace(/[\r\n"\\/]/g, "_")
      .trim();

    res.setHeader("Content-Type", inferredType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    res.setHeader("Content-Length", String(fileBuffer.length));
    return res.send(fileBuffer);
  } catch (_error) {
    return res.status(500).json({ message: "Error downloading document" });
  }
});

router.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const requestedKind = req.body?.kind || "general";
    if (!DOCUMENT_KINDS.includes(requestedKind)) {
      return res.status(400).json({ message: "Invalid document kind" });
    }
    const subject = requestedKind === "note" || requestedKind === "syllabus" ? req.body?.subject || null : null;
    const date = requestedKind === "syllabus" && req.body?.date ? new Date(req.body.date) : null;
    // multipart fields always arrive as strings, unlike the JSON PUT route below
    const tags = typeof req.body?.tags === "string"
      ? req.body.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    configureCloudinary();

    const isPdf = req.file.mimetype === "application/pdf";
    const resourceType = isPdf ? "raw" : "image";
    const fileType = isPdf ? "pdf" : "image";

    if (requestedKind === "datesheet") {
      const existingDatesheets = await Document.find({ user: req.user, kind: "datesheet" });
      for (const existing of existingDatesheets) {
        try {
          await cloudinary.uploader.destroy(existing.publicId, { resource_type: existing.resourceType });
        } catch (err) {
          console.error("Cloudinary delete warning:", err?.message || err);
        }
      }
      await Document.deleteMany({ user: req.user, kind: "datesheet" });
    }

    const safeOriginalName = (req.file.originalname || "document")
      .replace(/[\\/]/g, "_")
      .trim();
    const requestedTitle = req.body?.title?.trim() || "";
    const baseName = sanitizeBaseName(requestedTitle || safeOriginalName) || "document";
    const generatedPublicId = `${baseName}-${Date.now()}`;

    const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "taskflow/documents",
      resource_type: resourceType,
      public_id: generatedPublicId,
      use_filename: false,
      unique_filename: false,
      overwrite: false,
      ...(isPdf && { format: "pdf" }),
    });

    const title = requestedTitle || safeOriginalName.replace(/\.[^/.]+$/, "") || safeOriginalName;
    // Cloudinary already returns the correct extension in secure_url: it's
    // auto-detected for images, and baked into the public_id for raw PDFs
    // because we pass format: "pdf" at upload time. Appending it again here
    // used to double it up (e.g. .pdf.pdf / .png.png), breaking delivery.

    const document = await Document.create({
      user: req.user,
      title,
      originalName: safeOriginalName,
      fileType,
      resourceType,
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      bytes: uploaded.bytes || req.file.size,
      kind: requestedKind,
      subject,
      date,
      tags,
    });

    res.json(document);
  } catch (error) {
    console.error("Document upload error:", error?.message || error);
    res.status(500).json({ message: "Error uploading document" });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const title = req.body?.title?.trim();
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const update = { title };
    if (req.body.tags !== undefined) update.tags = req.body.tags;

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      update,
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json(document);
  } catch (_error) {
    res.status(500).json({ message: "Error updating document" });
  }
});

router.delete("/:id", protect, async (req, res) => {
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
