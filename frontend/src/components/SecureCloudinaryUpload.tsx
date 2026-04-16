/**
 * Secure Cloudinary Direct Upload Component (React)
 * 
 * This component implements a signed direct upload to Cloudinary.
 * 
 * Flow:
 * 1. User selects file
 * 2. Component fetches signature from backend
 * 3. Component uploads file directly to Cloudinary using signature
 * 4. Cloudinary validates signature and completes upload
 * 5. Component sends secure_url back to backend for database storage
 * 
 * Security:
 * - API Secret never exposed to frontend
 * - Signature is unique per upload (includes timestamp)
 * - JWT token required for signature generation
 * - URL validation in backend before saving
 */

import React, { useState, useRef, useCallback } from 'react';
import axios, { AxiosError } from 'axios';

interface CloudinaryResponse {
  public_id: string;
  secure_url: string;
  bytes: number;
  resource_type: string;
  error?: {
    message: string;
  };
}

interface UploadState {
  isLoading: boolean;
  error: string | null;
  progress: number;
}

const getResourceType = (file: File) => (file.type === 'application/pdf' ? 'raw' : 'image');

const SecureCloudinaryUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Component state
  const [uploadState, setUploadState] = useState<UploadState>({
    isLoading: false,
    error: null,
    progress: 0,
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  /**
   * Step 1: Fetch upload signature from backend
   * 
   * This is called when the user selects a file.
   * The backend generates a SHA-1 signature that Cloudinary will validate.
   * 
   * @returns Promise with signature, timestamp, api_key, cloud_name
   */
  const fetchUploadSignature = useCallback(async (folder = 'taskflow/documents') => {
    try {
      const token = localStorage.getItem('token'); // Assuming JWT stored in localStorage
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cloudinary-signature`,
        { folder, resource_type: 'image' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.signature) {
        throw new Error('Failed to generate upload signature');
      }

      return response.data;
    } catch (error) {
      const message = 
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : error instanceof Error
          ? error.message
          : 'Failed to fetch signature';
      
      throw new Error(message);
    }
  }, []);

  /**
   * Step 2: Upload file directly to Cloudinary using signature
   * 
   * This bypasses the backend for file upload (faster, reduces server load).
   * Cloudinary validates the signature server-side.
   * 
   * @param file - File to upload
   * @param signatureData - Signature, timestamp, api_key from backend
   * @returns Promise with Cloudinary response containing secure_url
   */
  const uploadToCloudinary = useCallback(
    async (file: File, signatureData: any): Promise<CloudinaryResponse> => {
      try {
        const formData = new FormData();

        // Add file
        formData.append('file', file);

        // Add signature parameters (must match backend's unsigned_request order)
        formData.append('api_key', signatureData.api_key);
        formData.append('signature', signatureData.signature);
        formData.append('timestamp', signatureData.timestamp.toString());
        formData.append('folder', signatureData.folder);

        // Optional: Upload preset (if unsigned upload is configured in Cloudinary dashboard)
        // formData.append('upload_preset', 'your_unsigned_preset');

        // Build Cloudinary upload URL
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/${getResourceType(file)}/upload`;

        // Upload to Cloudinary with progress tracking
        const response = await axios.post<CloudinaryResponse>(
          cloudinaryUrl,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentage = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadState((prev) => ({ ...prev, progress: percentage }));
              }
            },
          }
        );

        // Check for Cloudinary-side errors
        if (response.data.error) {
          throw new Error(`Cloudinary error: ${response.data.error.message}`);
        }

        return response.data;
      } catch (error) {
        const message =
          axios.isAxiosError(error) && error.response?.data?.error?.message
            ? error.response.data.error.message
            : error instanceof Error
            ? error.message
            : 'Upload to Cloudinary failed';
        
        throw new Error(message);
      }
    },
    []
  );

  /**
   * Step 3: Send secure_url to backend for database storage
   * 
   * After successful Cloudinary upload, we notify the backend
   * so it can save the file metadata to the database.
   * 
   * @param cloudinaryResponse - Response from Cloudinary (contains secure_url, public_id, etc.)
   * @param originalFileName - Original filename (as title)
   */
  const saveUploadToDatabase = useCallback(
    async (cloudinaryResponse: CloudinaryResponse, originalFileName: string) => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const dbResponse = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cloudinary-upload-complete`,
          {
            file_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
            title: originalFileName.replace(/\.[^/.]+$/, ''), // Remove file extension
            size: cloudinaryResponse.bytes,
            resource_type: cloudinaryResponse.resource_type,
            format: cloudinaryResponse.resource_type === 'raw' ? 'pdf' : undefined,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return dbResponse.data;
      } catch (error) {
        const message =
          axios.isAxiosError(error) && error.response?.data?.error
            ? error.response.data.error
            : error instanceof Error
            ? error.message
            : 'Failed to save upload to database';
        
        throw new Error(message);
      }
    },
    []
  );

  /**
   * Main upload handler: Orchestrates the complete signed upload flow
   */
  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setUploadState({
        isLoading: false,
        error: 'No file selected',
        progress: 0,
      });
      return;
    }

    // Reset state
    setUploadState({ isLoading: true, error: null, progress: 0 });
    setUploadedUrl(null);

    try {
      // Step 1: Get signature from backend
      console.log('Fetching upload signature...');
      const signatureData = await fetchUploadSignature('taskflow/documents');

      // Step 2: Upload file directly to Cloudinary
      console.log('Uploading file to Cloudinary...');
      const cloudinaryResponse = await uploadToCloudinary(selectedFile, signatureData);

      // Step 3: Save metadata to database
      console.log('Saving upload metadata to database...');
      const dbRecord = await saveUploadToDatabase(
        cloudinaryResponse,
        selectedFile.name
      );

      // Success!
      setUploadState({
        isLoading: false,
        error: null,
        progress: 100,
      });
      setUploadedUrl(cloudinaryResponse.secure_url);
      setSelectedFile(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      console.log('Upload complete:', dbRecord);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadState({
        isLoading: false,
        error: message,
        progress: 0,
      });
      
      console.error('Upload error:', message);
    }
  }, [selectedFile, fetchUploadSignature, uploadToCloudinary, saveUploadToDatabase]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      
      if (!file) {
        setSelectedFile(null);
        return;
      }

      // Validate file type (images and PDFs only)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      
      if (!allowedTypes.includes(file.type)) {
        setUploadState({
          isLoading: false,
          error: 'Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed',
          progress: 0,
        });
        setSelectedFile(null);
        return;
      }

      // Validate file size (max 10MB)
      const maxSizeMB = 10;
      if (file.size > maxSizeMB * 1024 * 1024) {
        setUploadState({
          isLoading: false,
          error: `File size must be less than ${maxSizeMB}MB`,
          progress: 0,
        });
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setUploadState({ isLoading: false, error: null, progress: 0 });
    },
    []
  );

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Secure File Upload</h2>

      {/* File Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File (Images or PDFs, max 10MB)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={uploadState.isLoading}
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50"
        />
      </div>

      {/* Selected File Display */}
      {selectedFile && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm font-medium text-gray-800">
            Selected: {selectedFile.name}
          </p>
          <p className="text-xs text-gray-600">
            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {uploadState.progress > 0 && uploadState.progress < 100 && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Uploading... {uploadState.progress}%
          </p>
        </div>
      )}

      {/* Error Message */}
      {uploadState.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{uploadState.error}</p>
        </div>
      )}

      {/* Success Message */}
      {uploadedUrl && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700 font-medium">Upload successful! ✓</p>
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-600 hover:underline mt-1 block"
          >
            View uploaded file
          </a>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploadState.isLoading || !selectedFile}
        className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md
          hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
          transition-colors duration-200"
      >
        {uploadState.isLoading ? 'Uploading...' : 'Upload Securely'}
      </button>

      {/* Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md text-xs text-gray-600">
        <p className="font-semibold mb-2">How it works:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>File is uploaded directly to Cloudinary (not via your server)</li>
          <li>Server validates upload signature for security</li>
          <li>File URL is saved to your database</li>
          <li>Your API Secret is never exposed to the browser</li>
        </ol>
      </div>
    </div>
  );
};

export default SecureCloudinaryUpload;
