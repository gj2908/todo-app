/**
 * Enhanced Document Vault with Secure Signed Upload
 * 
 * This component replaces the multipart form upload with direct Cloudinary uploads.
 * Benefits:
 * - Files bypass your server (faster, smaller server footprint)
 * - Signature validation happens server-side (secure)
 * - Better progress tracking
 * - Reduced bandwidth on backend
 */

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

interface Document {
  _id: string;
  title: string;
  url: string;
  publicId: string;
  bytes: number;
  fileType: string;
  createdAt: string;
}

interface UploadProgress {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

const getResourceType = (file: File) => (file.type === "application/pdf" ? "raw" : "image");

const EnhancedDocumentVault: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    error: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  /**
   * Fetch all documents for the current user
   */
  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/documents`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDocuments(response.data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  /**
   * SECURE SIGNED UPLOAD FLOW
   * 
   * Step 1: Request signature from backend
   * Step 2: Upload directly to Cloudinary with signature
   * Step 3: Save metadata to database
   */
  const handleSecureUpload = async () => {
    if (!selectedFile || !title.trim()) {
      setUploadProgress({
        isUploading: false,
        progress: 0,
        error: "Please select a file and enter a title",
      });
      return;
    }

    setUploadProgress({ isUploading: true, progress: 0, error: null });

    try {
      const token = localStorage.getItem("token");

      // Step 1: Get signature from backend
      console.log("📝 Requesting upload signature...");
      const signatureResponse = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/cloudinary-signature`,
        {
          folder: "taskflow/documents",
          resource_type: "image",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const signatureData = signatureResponse.data;
      setUploadProgress((prev) => ({ ...prev, progress: 20 }));

      // Step 2: Upload file directly to Cloudinary
      console.log("📤 Uploading to Cloudinary...");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("api_key", signatureData.api_key);
      formData.append("signature", signatureData.signature);
      formData.append("timestamp", signatureData.timestamp.toString());
      formData.append("folder", signatureData.folder);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/${getResourceType(selectedFile)}/upload`;

      const uploadResponse = await axios.post(
        cloudinaryUrl,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentage = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total * 0.7 + 20
              );
              setUploadProgress((prev) => ({ ...prev, progress: percentage }));
            }
          },
        }
      );

      if (uploadResponse.data.error) {
        throw new Error(uploadResponse.data.error.message);
      }

      setUploadProgress((prev) => ({ ...prev, progress: 90 }));

      // Step 3: Save to database
      console.log("💾 Saving to database...");
      await axios.post(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/cloudinary-upload-complete`,
        {
          file_id: uploadResponse.data.public_id,
          url: uploadResponse.data.secure_url,
          title: title.trim(),
          size: uploadResponse.data.bytes,
          resource_type: uploadResponse.data.resource_type,
          format: uploadResponse.data.resource_type === "raw" ? "pdf" : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setUploadProgress({ isUploading: false, progress: 100, error: null });
      
      // Refresh documents
      await fetchDocuments();
      
      // Reset form
      setSelectedFile(null);
      setTitle("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      console.log("✅ Upload complete!");
    } catch (error) {
      const errorMsg = 
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : error instanceof Error
          ? error.message
          : "Upload failed";

      setUploadProgress({
        isUploading: false,
        progress: 0,
        error: errorMsg,
      });

      console.error("Upload error:", errorMsg);
    }
  };

  /**
   * Handle file selection with validation
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadProgress({
        isUploading: false,
        progress: 0,
        error: "Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed",
      });
      setSelectedFile(null);
      return;
    }

    // Validate file size
    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadProgress({
        isUploading: false,
        progress: 0,
        error: `File size must be less than ${maxSizeMB}MB`,
      });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadProgress({ isUploading: false, progress: 0, error: null });
  };

  /**
   * Delete document
   */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this document?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/documents/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDocuments(documents.filter((doc) => doc._id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  /**
   * Start editing document title
   */
  const startEdit = (doc: Document) => {
    setEditingId(doc._id);
    setEditTitle(doc.title);
  };

  /**
   * Save edited document title
   */
  const handleUpdate = async () => {
    if (!editingId || !editTitle.trim()) return;

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/documents/${editingId}`,
        { title: editTitle.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchDocuments();
      setEditingId(null);
      setEditTitle("");
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  /**
   * Cancel editing
   */
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📁 Document Vault</h1>
          <p className="text-gray-400">
            Secure file storage powered by Cloudinary signed uploads
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Upload New Document</h2>

          {/* File Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select File (Max 10MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={uploadProgress.isUploading}
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-amber-600 file:text-white
                hover:file:bg-amber-700
                disabled:opacity-50"
            />
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploadProgress.isUploading}
              placeholder="e.g., Invoice #2024-001"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md
                text-white placeholder-gray-400 focus:outline-none focus:border-amber-500
                disabled:opacity-50"
            />
          </div>

          {/* Selected File Display */}
          {selectedFile && (
            <div className="mb-4 p-3 bg-amber-900 bg-opacity-50 rounded-md border border-amber-700">
              <p className="text-sm font-medium text-amber-200">
                📄 {selectedFile.name}
              </p>
              <p className="text-xs text-amber-300">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {uploadProgress.progress > 0 && uploadProgress.progress < 100 && (
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">
                {uploadProgress.progress}%
              </p>
            </div>
          )}

          {/* Error Message */}
          {uploadProgress.error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-md">
              <p className="text-sm text-red-300">⚠️ {uploadProgress.error}</p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleSecureUpload}
            disabled={uploadProgress.isUploading || !selectedFile}
            className="w-full py-2 px-4 bg-gradient-to-r from-amber-600 to-orange-600
              text-white font-semibold rounded-md hover:from-amber-700 hover:to-orange-700
              disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            {uploadProgress.isUploading ? (
              <span>⏳ Uploading... {uploadProgress.progress}%</span>
            ) : (
              <span>🚀 Upload Securely</span>
            )}
          </button>
        </div>

        {/* Documents Grid */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Your Documents ({documents.length})
          </h2>

          {documents.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-gray-400">No documents yet. Upload your first file!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-amber-500 transition-colors"
                >
                  {/* Document Icon */}
                  <div className="mb-3">
                    {doc.fileType === "pdf" ? (
                      <span className="text-3xl">📕</span>
                    ) : (
                      <span className="text-3xl">🖼️</span>
                    )}
                  </div>

                  {/* Edit Mode or Title Display */}
                  {editingId === doc._id ? (
                    <div className="mb-3 space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-2 py-1 bg-gray-700 border border-amber-500 rounded
                          text-white text-sm focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdate}
                          className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white
                            text-xs font-semibold rounded transition-colors"
                        >
                          ✓ Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white
                            text-xs font-semibold rounded transition-colors"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <p className="font-semibold text-white text-sm truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(doc.bytes / 1024 / 1024).toFixed(2)} MB •{" "}
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 text-xs">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white
                        font-semibold rounded text-center transition-colors"
                    >
                      👁️ View
                    </a>
                    {editingId !== doc._id && (
                      <button
                        onClick={() => startEdit(doc)}
                        className="flex-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white
                          font-semibold rounded transition-colors"
                      >
                        ✎ Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white
                        font-semibold rounded transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-8 p-4 bg-blue-900 bg-opacity-50 border border-blue-700 rounded-lg">
          <p className="text-sm text-blue-300 font-semibold mb-2">🔐 Security & Privacy</p>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>✅ Files uploaded directly to Cloudinary (not via your server)</li>
            <li>✅ SHA-1 signatures validated server-side</li>
            <li>✅ Your Cloudinary API Secret never exposed to browser</li>
            <li>✅ URLs saved to database only after Cloudinary confirmation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDocumentVault;
