# Secure Cloudinary Signed Direct Upload - Integration Guide

## 📋 Overview

This implementation provides a production-ready **secure signed direct upload** flow for your Taskflow app. It includes:

1. **Backend Signature Endpoint** (`api/routes/cloudinary-signature.js`)
   - Generates SHA-1 signatures for Cloudinary upload validation
   - API Secret never exposed to frontend
   - Timestamp-based signatures prevent replay attacks

2. **React Components** (Frontend)
   - `SecureCloudinaryUpload.tsx` - Standalone component with full upload flow
   - `EnhancedDocumentVault.tsx` - Drop-in replacement for existing DocumentVault with signed uploads

3. **Database Integration**
   - Updated `Document.js` model with enhanced schema
   - `cloudinary-upload-complete` endpoint to save file metadata

---

## 🔧 Backend Setup

### 1. Route Mounted in `server.js`
The signature route is already mounted:
```javascript
const cloudinarySignatureRoutes = require("./routes/cloudinary-signature");
app.use("/api/cloudinary-signature", cloudinarySignatureRoutes);
```

### 2. Environment Variables Required
Ensure these are in your `.env`:
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
MONGO_URI=mongodb://...
```

### 3. Test Backend Endpoints

**Generate Signature:**
```bash
curl -X POST http://localhost:6002/api/cloudinary-signature \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folder":"taskflow/documents","resource_type":"auto"}'
```

**Save Upload Result:**
```bash
curl -X POST http://localhost:6002/api/cloudinary-upload-complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_id":"taskflow/documents/abc123",
    "url":"https://res.cloudinary.com/...",
    "title":"My Document",
    "size":51234,
    "resource_type":"image"
  }'
```

---

## 🎨 Frontend Integration

### Option A: Use Enhanced Document Vault (Recommended)

Replace your existing DocumentVault component with `EnhancedDocumentVault.tsx`:

```typescript
// In HomePage.tsx or wherever you use DocumentVault
import EnhancedDocumentVault from '../components/EnhancedDocumentVault';

// Replace the old DocumentVault component
// OLD: <DocumentVault />
// NEW:
<EnhancedDocumentVault />
```

### Option B: Use Standalone Component

For a simple upload form elsewhere in your app:

```typescript
import SecureCloudinaryUpload from '../components/SecureCloudinaryUpload';

export default function MyPage() {
  return (
    <div>
      <SecureCloudinaryUpload />
    </div>
  );
}
```

### Option C: Minimal Custom Implementation

```typescript
import axios from 'axios';

// 1. Fetch signature
const { signature, timestamp, api_key, cloud_name, folder } = 
  await axios.post('/api/cloudinary-signature', 
    { folder: 'taskflow/documents' },
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.data);

// 2. Upload to Cloudinary
const formData = new FormData();
formData.append('file', file);
formData.append('api_key', api_key);
formData.append('signature', signature);
formData.append('timestamp', timestamp);
formData.append('folder', folder);

const cloudinaryResp = await axios.post(
  `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`,
  formData
);

// 3. Save to database
await axios.post('/api/cloudinary-upload-complete',
  {
    file_id: cloudinaryResp.data.public_id,
    url: cloudinaryResp.data.secure_url,
    title: 'My File',
    size: cloudinaryResp.data.bytes
  },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## 🔐 Security Features

### Signature Validation
- **Formula**: `SHA-1(folder={folder}&resource_type={type}&timestamp={ts} + API_SECRET)`
- **Timestamp**: Unique per upload (prevents replay attacks)
- **API Secret**: Never leaves the server ✅

### Frontend Never Sees
- ❌ Cloudinary API Secret
- ❌ Raw database credentials
- ✅ Only gets: api_key, signature, timestamp, cloud_name

### Backend Validates
- ✅ JWT token before generating signature
- ✅ URL format before saving to database
- ✅ File ownership (userId matches JWT)
- ✅ File type and size limits

---

## 📊 Upload Flow Diagram

```
┌─────────────┐
│   Browser   │
└─────────────┘
      │
      ├──1. POST /api/cloudinary-signature──────────┐
      │      (JWT token in header)                   │
      │                                  ┌─────────────────────┐
      │                                  │ Your Node.js Server │
      │                                  │                     │
      │                                  │ - Verify JWT        │
      │                                  │ - Generate SHA-1    │
      │                                  │ - Return signature  │
      │                                  └─────────────────────┘
      │────2. Get { signature, timestamp, api_key }─┘
      │
      │
      ├──3. POST /v1_1/{cloud}/auto/upload──────────┐
      │      (file + signature + timestamp)          │
      │                                  ┌─────────────────────┐
      │                                  │    Cloudinary       │
      │                                  │                     │
      │                                  │ - Validate signature│
      │                                  │ - Store file        │
      │                                  │ - Return secure_url │
      │                                  └─────────────────────┘
      │────4. Get secure_url ───────────────────────┘
      │
      │
      └──5. POST /api/cloudinary-upload-complete──┐
             (secure_url + metadata)                │
                                       ┌─────────────────────┐
                                       │ Your Node.js Server │
                                       │                     │
                                       │ - Validate URL      │
                                       │ - Save to MongoDB   │
                                       │ - Return record ID  │
                                       └─────────────────────┘

```

---

## 🧪 Testing

### 1. Start Your Backend
```bash
cd api
npm install  # If you haven't already
npm start
```

### 2. Start Your Frontend
```bash
cd frontend
npm start
```

### 3. Test in Browser
1. Login to the app
2. Navigate to Document Vault
3. Select a file (image or PDF)
4. Enter a title
5. Click "Upload Securely"
6. Check browser console for debug logs

### 4. Verify in MongoDB
```javascript
// Check if document was saved
db.documents.find({ user: ObjectId("...") })
```

### 5. Verify in Cloudinary Dashboard
- Files should appear in `All Media > Folders > taskflow/documents`
- Public IDs should match database records

---

## 🚀 Performance Benefits

| Metric | Traditional | Signed Upload |
|--------|------------|---------------|
| **File Processing** | Server CPU | Cloudinary (offloaded) |
| **Bandwidth** | Your server | Direct to Cloudinary |
| **Upload Speed** | Slower | Faster (direct) |
| **Server Load** | Higher | Lower |
| **Error Handling** | Retry logic needed | Built into Cloudinary |

---

## ❌ Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to generate signature" | Missing JWT token | Ensure user is logged in |
| "Cloudinary error: Invalid signature" | Signature mismatch | Check API_SECRET in .env |
| "Upload failed: Only images and PDF files are allowed" | Wrong file type | Select JPG, PNG, GIF, WebP, or PDF |
| "File size must be less than 10MB" | File too large | Compress and retry |
| "Missing required fields" | Incomplete form | Fill in title field |

---

## 📝 API Reference

### POST `/api/cloudinary-signature`

**Request Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "folder": "taskflow/documents",
  "resource_type": "auto"
}
```

**Response (200):**
```json
{
  "signature": "sha1_hash_here",
  "timestamp": 1713283200,
  "api_key": "your_api_key",
  "cloud_name": "your_cloud",
  "folder": "taskflow/documents",
  "resource_type": "auto"
}
```

**Error (401):**
```json
{
  "message": "Unauthorized"
}
```

---

### POST `/api/cloudinary-upload-complete`

**Request Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "file_id": "taskflow/documents/public_id",
  "url": "https://res.cloudinary.com/...",
  "title": "Document Name",
  "size": 51234,
  "resource_type": "image"
}
```

**Response (201):**
```json
{
  "id": "64f3a1b2c3d4e5f6g7h8i9j0",
  "title": "Document Name",
  "file_id": "taskflow/documents/public_id",
  "url": "https://res.cloudinary.com/...",
  "size": 51234,
  "uploadedAt": "2024-04-16T10:30:00.000Z"
}
```

---

## 🔍 Debugging

### Enable Console Logs
The component logs each step:
```
📝 Requesting upload signature...
📤 Uploading to Cloudinary...
💾 Saving to database...
✅ Upload complete!
```

### Check Network Requests
In browser DevTools:
1. **Network tab** → Look for POST to `api/cloudinary-signature`
2. **Network tab** → Look for POST to `api.cloudinary.com`
3. **Network tab** → Look for POST to `api/cloudinary-upload-complete`
4. **Console** → Check for any errors

### Check Server Logs
```bash
# Terminal where Node server is running
[GET] /api/documents
[POST] /api/cloudinary-signature
[POST] /api/cloudinary-upload-complete
[POST] /api/documents
```

---

## 📦 Files Modified/Created

**Backend:**
- ✅ `/api/routes/cloudinary-signature.js` — NEW (signature generation + save)
- ✅ `/api/server.js` — MODIFIED (route mount)
- ✅ `/api/models/Document.js` — MODIFIED (enhanced schema)

**Frontend:**
- ✅ `/frontend/src/components/SecureCloudinaryUpload.tsx` — NEW (standalone)
- ✅ `/frontend/src/components/EnhancedDocumentVault.tsx` — NEW (CRUD + signed upload)

---

## ✅ Checklist

- [ ] Backend `.env` has Cloudinary credentials
- [ ] Backend route is mounted in `server.js`
- [ ] Frontend can import the new components
- [ ] Document Vault is replaced or integrated
- [ ] JWT token is available in localStorage on login
- [ ] Test upload with small file first
- [ ] Verify file appears in Cloudinary dashboard
- [ ] Verify record saved in MongoDB
- [ ] Test error handling (wrong file type, too large)
- [ ] Check security headers and CORS

---

## 🎯 Next Steps

1. **Deploy to Vercel** — Ensure `CLOUDINARY_*` env vars are set in Vercel dashboard
2. **Monitor Uploads** — Check Cloudinary dashboard for file uploads
3. **Add Compression** — Optionally compress images before upload
4. **Batch Uploads** — Extend component to support multiple files
5. **Drag & Drop** — Add `ondrop` handler for better UX

---

## 📚 References

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Signed Uploads](https://cloudinary.com/documentation/upload_widget_reference#client_side_example)
- [MongoDB Document Schema](https://mongoosejs.com/docs/schematypes.html)
- [JWT Security](https://tools.ietf.org/html/rfc7519)

---

## 💡 Tips

- **Production:** Always use HTTPS for signed uploads
- **Security:** Rotate Cloudinary API Secret every 6 months
- **Testing:** Use Postman to test backend endpoints independently
- **Monitoring:** Log all upload events for audit trails
- **Backup:** Export Cloudinary media monthly

---

Generated: 2024-04-16
Tech Stack: React 19 + TypeScript + Node.js + Express + MongoDB
