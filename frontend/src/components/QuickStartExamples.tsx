/**
 * QUICK START EXAMPLE
 * 
 * How to integrate Secure Signed Uploads into your existing React components
 */

// ============================================================================
// EXAMPLE 1: Replace DocumentVault in HomePage.tsx
// ============================================================================
/*
// OLD CODE (in HomePage.tsx)
import DocumentVault from '../components/DocumentVault';

export default function HomePage() {
  return (
    <div>
      {activeView === 'vault' && <DocumentVault />}
    </div>
  );
}

// NEW CODE (with signed uploads)
import EnhancedDocumentVault from '../components/EnhancedDocumentVault';

export default function HomePage() {
  return (
    <div>
      {activeView === 'vault' && <EnhancedDocumentVault />}
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 2: Use in a Separate Page/Modal
// ============================================================================
/*
import SecureCloudinaryUpload from '../components/SecureCloudinaryUpload';

export default function MediaUploadPage() {
  return (
    <div className="p-8">
      <h1>Upload Media</h1>
      <SecureCloudinaryUpload />
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 3: Custom Hook for Signed Uploads (Reusable)
// ============================================================================

import { useState, useCallback } from 'react';
import axios from 'axios';

interface UseSignedUploadOptions {
  folder?: string;
  resourceType?: string;
  onSuccess?: (response: any) => void;
  onError?: (error: string) => void;
}

export function useSignedUpload(options: UseSignedUploadOptions = {}) {
  const {
    folder = 'taskflow/documents',
    resourceType = 'auto',
    onSuccess,
    onError,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Main upload function
   * Usage:
   *   const response = await upload(file, fileTitle);
   */
  const upload = useCallback(
    async (file: File, title: string) => {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      try {
        const token = localStorage.getItem('token');

        if (!token) throw new Error('Not authenticated');

        // Step 1: Get signature
        const { data: sigData } = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cloudinary-signature`,
          { folder, resource_type: resourceType },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setProgress(25);

        // Step 2: Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sigData.api_key);
        formData.append('signature', sigData.signature);
        formData.append('timestamp', sigData.timestamp.toString());
        formData.append('folder', sigData.folder);
        formData.append('resource_type', sigData.resource_type);

        const { data: cloudRes } = await axios.post(
          `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/auto/upload`,
          formData,
          {
            onUploadProgress: (evt) => {
              if (evt.total) {
                const pct = Math.round((evt.loaded / evt.total) * 70 + 25);
                setProgress(pct);
              }
            },
          }
        );

        if (cloudRes.error) throw new Error(cloudRes.error.message);

        setProgress(90);

        // Step 3: Save to database
        const { data: dbRes } = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cloudinary-upload-complete`,
          {
            file_id: cloudRes.public_id,
            url: cloudRes.secure_url,
            title,
            size: cloudRes.bytes,
            resource_type: cloudRes.resource_type,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setProgress(100);
        setIsLoading(false);

        onSuccess?.(dbRes);
        return dbRes;
      } catch (err) {
        const msg = 
          err instanceof Error
            ? err.message
            : 'Upload failed';
        
        setError(msg);
        setIsLoading(false);
        onError?.(msg);
        
        throw err;
      }
    },
    [folder, resourceType, onSuccess, onError]
  );

  return {
    upload,
    isLoading,
    progress,
    error,
  };
}

// ============================================================================
// EXAMPLE 4: Using the Hook in a Component
// ============================================================================
/*
import { useSignedUpload } from '../hooks/useSignedUpload';

export function MyUploadComponent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');

  const { upload, isLoading, progress, error } = useSignedUpload({
    folder: 'taskflow/my-custom-folder',
    onSuccess: (response) => {
      console.log('Upload successful:', response);
      setSelectedFile(null);
      setTitle('');
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    },
  });

  const handleUpload = async () => {
    if (!selectedFile || !title) return;
    await upload(selectedFile, title);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        disabled={isLoading}
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        disabled={isLoading}
      />
      <button onClick={handleUpload} disabled={isLoading || !selectedFile}>
        {isLoading ? `Uploading... ${progress}%` : 'Upload'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 5: Integration with Existing DocumentVault
// ============================================================================
/*
// If you want to keep your old DocumentVault but add signed upload as an option,
// you can create a hybrid component:

import DocumentVault from '../components/DocumentVault';
import SecureCloudinaryUpload from '../components/SecureCloudinaryUpload';
import { useState } from 'react';

export function HybridDocumentVault() {
  const [uploadMode, setUploadMode] = useState<'traditional' | 'signed'>('signed');

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setUploadMode('signed')}
          style={{
            fontWeight: uploadMode === 'signed' ? 'bold' : 'normal',
            color: uploadMode === 'signed' ? 'blue' : 'gray',
          }}
        >
          Signed Upload (Recommended)
        </button>
        <button
          onClick={() => setUploadMode('traditional')}
          style={{
            fontWeight: uploadMode === 'traditional' ? 'bold' : 'normal',
            color: uploadMode === 'traditional' ? 'blue' : 'gray',
          }}
        >
          Traditional Upload
        </button>
      </div>

      {uploadMode === 'signed' && <SecureCloudinaryUpload />}
      {uploadMode === 'traditional' && <DocumentVault />}
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 6: TypeScript Types for Signed Upload Response
// ============================================================================

export interface SignatureResponse {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
  resource_type: string;
}

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  bytes: number;
  resource_type: string;
  error?: {
    message: string;
  };
}

export interface DocumentRecord {
  id: string;
  title: string;
  file_id: string;
  url: string;
  size: number;
  uploadedAt: string;
}

// ============================================================================
// EXAMPLE 7: Advanced - Batch Upload Multiple Files
// ============================================================================
/*
import { useSignedUpload } from '../hooks/useSignedUpload';

export function BatchUploadComponent() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { upload } = useSignedUpload();

  const handleBatchUpload = async () => {
    for (const file of files) {
      try {
        await upload(file, file.name.replace(/\.[^/.]+$/, ''));
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: 100,
        }));
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
      <button onClick={handleBatchUpload} disabled={files.length === 0}>
        Upload {files.length} Files
      </button>
    </div>
  );
}
*/

export default function QuickStartExamples() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Secure Cloudinary Signed Upload - Implementation Examples</h1>
      <p>See inline comments above for different integration patterns.</p>
      <p>
        Most Common Usage:{' '}
        <code>import EnhancedDocumentVault from '../components/EnhancedDocumentVault'</code>
      </p>
    </div>
  );
}
