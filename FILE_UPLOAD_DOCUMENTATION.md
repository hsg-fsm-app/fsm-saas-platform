# File Upload System Documentation

A simple, mobile-friendly file upload component for field service SaaS applications. Built with Supabase Storage and vanilla JavaScript.

## Features

- ✅ Drag-and-drop file uploads
- ✅ Mobile-friendly file picker
- ✅ Real-time upload progress
- ✅ Image thumbnail previews
- ✅ PDF support
- ✅ File categorization
- ✅ Client visibility controls
- ✅ Permission-based access (RLS)
- ✅ Download files
- ✅ Delete files (staff only)
- ✅ Dark mode support

## File Structure

```
src/
├── _includes/
│   └── components/
│       └── file-upload.html          # Reusable HTML component
├── assets/
│   ├── js/
│   │   └── file-upload.js            # FileUploader class
│   └── sass/
│       └── portal.scss               # Styles (appended)
├── content/
│   └── pages/
│       └── files-example.html        # Example integration
└── supabase/
    └── migrations/
        └── create_files_system.sql   # Database schema
```

## Quick Start

### 1. Database Setup

The database migration has already been applied. It creates:

- **`files` table** - Stores file metadata
- **`files` storage bucket** - Stores actual files
- **RLS policies** - Enforces permissions

### 2. Include Component in Your Page

```html
{% include "components/file-upload.html" %}
```

### 3. Initialize Supabase Client

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Make it globally available
window.supabase = supabase
```

### 4. Initialize File Uploader

```javascript
// Load the script
const script = document.createElement('script')
script.src = '/assets/js/file-upload.js'
script.onload = () => {
  const uploader = new FileUploader({
    entityType: 'job',      // 'client', 'estimate', or 'job'
    entityId: 'job-uuid',   // The ID of the entity
    containerId: 'file-upload-container'
  })
}
document.head.appendChild(script)
```

## Integration Examples

### Example 1: Job Detail Page

Add file uploads to a job detail page:

```html
<div class="job-detail">
  <h1>Kitchen Renovation - Smith Residence</h1>

  <!-- Other job details -->

  <div class="job-files-section">
    <h2>Project Files</h2>
    {% include "components/file-upload.html" %}
  </div>
</div>

<script>
  // Initialize with job ID from page context
  const jobId = '{{ job.id }}' // From server context

  const uploader = new FileUploader({
    entityType: 'job',
    entityId: jobId,
    containerId: 'file-upload-container'
  })
</script>
```

### Example 2: Client Portal

Allow clients to upload documents:

```javascript
// Client can only see files marked as client_visible
const uploader = new FileUploader({
  entityType: 'client',
  entityId: currentUser.id,
  containerId: 'file-upload-container'
})
```

### Example 3: Estimate Creation

Attach files to estimates:

```javascript
const uploader = new FileUploader({
  entityType: 'estimate',
  entityId: estimateId,
  containerId: 'file-upload-container'
})
```

## Configuration Options

### FileUploader Constructor

```javascript
new FileUploader({
  entityType: string,    // Required: 'client', 'estimate', or 'job'
  entityId: string,      // Required: UUID of the entity
  containerId: string    // Optional: Default is 'file-upload-container'
})
```

### File Constraints

```javascript
// Defined in file-upload.js
maxFileSize: 10 * 1024 * 1024  // 10MB
allowedTypes: [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf'
]
```

To modify constraints, edit the class properties in `/src/assets/js/file-upload.js`.

## Database Schema

### `files` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `business_id` | UUID | References profiles (business owner) |
| `uploaded_by` | UUID | References profiles (uploader) |
| `entity_type` | TEXT | 'client', 'estimate', or 'job' |
| `entity_id` | UUID | ID of related entity |
| `file_name` | TEXT | Original filename |
| `file_type` | TEXT | MIME type |
| `file_size` | BIGINT | Size in bytes |
| `storage_path` | TEXT | Path in Supabase Storage (unique) |
| `category` | TEXT | Optional: 'invoice', 'photo', 'contract', etc. |
| `client_visible` | BOOLEAN | Whether clients can see this file |
| `created_at` | TIMESTAMPTZ | Upload timestamp |

### Indexes

- `idx_files_entity` - Fast queries by entity_type and entity_id
- `idx_files_business` - Fast queries by business
- `idx_files_uploaded_by` - Fast queries by uploader

## Permissions (RLS Policies)

### Staff Access (Admin/Team Members)

```sql
-- Staff can view all files for their business
-- Staff can upload files
-- Staff can delete their own files or admins can delete any
```

### Client Access

```sql
-- Clients can only view files where client_visible = true
-- Clients can only view files for entities they own (e.g., their jobs)
```

### Storage Bucket Policies

```sql
-- Staff can upload to 'files' bucket
-- Staff can view all files in bucket
-- Staff can delete files from bucket
-- Clients can view client_visible files only
```

## API Operations

### Upload File

The `FileUploader` class handles uploads automatically. The flow:

1. User selects/drops file
2. Validate file size and type
3. Upload to Supabase Storage (`files` bucket)
4. Save metadata to `files` table
5. Show in file list

```javascript
// Called internally by FileUploader
await this.uploadFile(file)
```

### Get Files for Entity

```javascript
// Fetch files (called internally)
const { data: files } = await supabase
  .from('files')
  .select('*')
  .eq('entity_type', 'job')
  .eq('entity_id', jobId)
  .order('created_at', { ascending: false })
```

### Download File

```javascript
// Generate signed URL (1-minute expiry)
const { data } = await supabase.storage
  .from('files')
  .createSignedUrl(storagePath, 60)

// Trigger download
const link = document.createElement('a')
link.href = data.signedUrl
link.download = filename
link.click()
```

### Delete File

```javascript
// Delete from storage
await supabase.storage
  .from('files')
  .remove([storagePath])

// Delete metadata
await supabase
  .from('files')
  .delete()
  .eq('id', fileId)
```

## Customization

### Change Allowed File Types

Edit `/src/assets/js/file-upload.js`:

```javascript
this.allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
  'application/msword',  // Add Word docs
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
```

### Change Max File Size

```javascript
this.maxFileSize = 25 * 1024 * 1024  // 25MB instead of 10MB
```

### Add More Categories

Edit the `<select>` in `/src/_includes/components/file-upload.html`:

```html
<select id="fileCategory" class="cs-form-input">
  <option value="general">General</option>
  <option value="invoice">Invoice</option>
  <option value="contract">Contract</option>
  <option value="photo">Photo</option>
  <option value="blueprint">Blueprint</option>  <!-- Add new -->
  <option value="warranty">Warranty</option>    <!-- Add new -->
</select>
```

### Styling

All styles are in `/src/assets/sass/portal.scss` under the "File Upload Component" section.

Key CSS classes:
- `.cs-file-upload-wrapper` - Main container
- `.cs-upload-dropzone` - Drag-drop area
- `.cs-file-item` - Individual file card
- `.cs-preview-image` - Image thumbnails

## Mobile Considerations

The component is fully responsive:

- **Mobile (< 768px):**
  - Single column layout
  - Larger touch targets
  - Simplified file list

- **Tablet (768px+):**
  - Two-column options layout
  - Larger file previews (80px)

- **Desktop (1024px+):**
  - Full desktop experience
  - Side-by-side layouts

## Security Best Practices

1. **Always validate file types** - Both client and server-side
2. **Enforce file size limits** - Prevent abuse
3. **Use RLS policies** - Never expose all files to all users
4. **Use signed URLs** - Don't make storage publicly accessible
5. **Sanitize filenames** - Remove special characters
6. **Set short URL expiry** - 1-hour for viewing, 1-minute for downloads

## Error Handling

The component displays user-friendly errors:

- File too large: "File is too large. Maximum size is 10MB."
- Invalid type: "File has an unsupported format."
- Upload failed: "Failed to upload file: [error message]"
- Delete failed: "Failed to delete file: [error message]"

Errors auto-hide after 5 seconds.

## Testing

### Test Upload Flow

1. Navigate to `/files-example/`
2. Ensure you're authenticated
3. Drag a JPG file to upload zone
4. Verify progress bar shows
5. Check file appears in list with thumbnail
6. Test download
7. Test delete

### Test Permissions

1. **As Staff:**
   - Upload files
   - View all files
   - Delete any file

2. **As Client:**
   - Only see client_visible files
   - Cannot upload (if disabled for clients)
   - Cannot delete

### Test File Types

- ✅ JPG image (should work)
- ✅ PNG image (should work)
- ✅ PDF document (should work)
- ❌ DOCX document (should reject)
- ❌ 15MB file (should reject - too large)

## Troubleshooting

### Files not uploading

1. Check Supabase URL and anon key are correct
2. Verify user is authenticated
3. Check browser console for errors
4. Verify storage bucket exists and is named "files"

### Files not showing

1. Check RLS policies are applied correctly
2. Verify user has permission to view files
3. Check entity_type and entity_id match
4. Look for database query errors in console

### Previews not loading

1. Verify signed URLs are being generated
2. Check storage bucket permissions
3. Ensure images are valid format
4. Check for CORS issues (should be fine with Supabase)

### Permission denied errors

1. Verify RLS policies are correctly set up
2. Check user role in profiles table
3. Ensure user is authenticated
4. Review storage bucket policies

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android)

## Dependencies

- **Supabase JS Client** (v2+) - For storage and database
- **No other dependencies** - Pure vanilla JavaScript

## Future Enhancements

Potential features to add:

1. **Multiple file selection** - Already supported via `multiple` attribute
2. **File versioning** - Track file history
3. **Image compression** - Reduce file sizes automatically
4. **OCR for PDFs** - Extract text for search
5. **Folder organization** - Group files in folders
6. **File sharing links** - Generate public links
7. **Batch operations** - Download/delete multiple files
8. **Search/filter** - Find files by name or category
9. **File preview modal** - View files without downloading
10. **Image editing** - Crop, rotate, annotate images

## Support

For issues or questions:
1. Check this documentation
2. Review code comments in source files
3. Check Supabase Storage documentation
4. Test with example page at `/files-example/`

## License

This component is part of the Intermediate Website Kit and follows the same license.
