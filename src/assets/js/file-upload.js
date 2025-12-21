/**
 * File Upload Component
 *
 * Simple file upload system for field service SaaS
 * Handles uploads to Supabase Storage and metadata tracking
 *
 * Usage:
 * const uploader = new FileUploader({
 *   entityType: 'job',
 *   entityId: 'uuid-here',
 *   containerId: 'file-upload-container'
 * });
 */

class FileUploader {
  constructor(config) {
    // Configuration
    this.entityType = config.entityType; // 'client', 'estimate', or 'job'
    this.entityId = config.entityId;
    this.containerId = config.containerId || 'file-upload-container';

    // File constraints
    this.maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

    // Initialize Supabase client (assuming it's globally available)
    this.supabase = window.supabase;

    if (!this.supabase) {
      console.error('Supabase client not found. Make sure to initialize it first.');
      return;
    }

    // Initialize component
    this.init();
  }

  /**
   * Initialize the file upload component
   */
  init() {
    this.setupElements();
    this.attachEventListeners();
    this.loadFiles();
  }

  /**
   * Get DOM element references
   */
  setupElements() {
    const container = document.getElementById(this.containerId);

    this.elements = {
      dropzone: container.querySelector('#dropzone'),
      fileInput: container.querySelector('#fileInput'),
      uploadProgress: container.querySelector('#uploadProgress'),
      progressFilename: container.querySelector('.cs-progress-filename'),
      progressPercentage: container.querySelector('.cs-progress-percentage'),
      progressFill: container.querySelector('.cs-progress-fill'),
      fileCategory: container.querySelector('#fileCategory'),
      clientVisible: container.querySelector('#clientVisible'),
      filesLoading: container.querySelector('#filesLoading'),
      filesEmpty: container.querySelector('#filesEmpty'),
      filesList: container.querySelector('#filesList'),
      fileCount: container.querySelector('#fileCount'),
      errorMessage: container.querySelector('#errorMessage')
    };
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // File input change
    this.elements.fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // Drag and drop events
    this.elements.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.dropzone.classList.add('cs-drag-over');
    });

    this.elements.dropzone.addEventListener('dragleave', () => {
      this.elements.dropzone.classList.remove('cs-drag-over');
    });

    this.elements.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.dropzone.classList.remove('cs-drag-over');
      this.handleFiles(e.dataTransfer.files);
    });
  }

  /**
   * Handle selected files
   */
  async handleFiles(files) {
    // Validate and upload each file
    for (const file of files) {
      if (this.validateFile(file)) {
        await this.uploadFile(file);
      }
    }

    // Refresh file list after uploads
    await this.loadFiles();
  }

  /**
   * Validate file before upload
   */
  validateFile(file) {
    // Check file size
    if (file.size > this.maxFileSize) {
      this.showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
      return false;
    }

    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      this.showError(`File "${file.name}" has an unsupported format. Only images and PDFs are allowed.`);
      return false;
    }

    return true;
  }

  /**
   * Upload file to Supabase Storage and save metadata
   */
  async uploadFile(file) {
    try {
      // Show progress
      this.showProgress(file.name, 0);

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${this.entityType}/${this.entityId}/${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Update progress
      this.showProgress(file.name, 50);

      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Save file metadata to database
      const { data: fileData, error: dbError } = await this.supabase
        .from('files')
        .insert({
          uploaded_by: user.id,
          entity_type: this.entityType,
          entity_id: this.entityId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          category: this.elements.fileCategory.value,
          client_visible: this.elements.clientVisible.checked
        })
        .select()
        .single();

      if (dbError) {
        // If database insert fails, delete the uploaded file
        await this.supabase.storage.from('files').remove([storagePath]);
        throw dbError;
      }

      // Complete progress
      this.showProgress(file.name, 100);

      // Hide progress after a short delay
      setTimeout(() => {
        this.hideProgress();
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      this.showError(`Failed to upload "${file.name}": ${error.message}`);
      this.hideProgress();
    }
  }

  /**
   * Load files for the current entity
   */
  async loadFiles() {
    try {
      // Show loading state
      this.elements.filesLoading.style.display = 'block';
      this.elements.filesEmpty.style.display = 'none';
      this.elements.filesList.innerHTML = '';

      // Fetch files from database
      const { data: files, error } = await this.supabase
        .from('files')
        .select(`
          id,
          file_name,
          file_type,
          file_size,
          storage_path,
          category,
          client_visible,
          created_at
        `)
        .eq('entity_type', this.entityType)
        .eq('entity_id', this.entityId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Hide loading state
      this.elements.filesLoading.style.display = 'none';

      // Show empty state or render files
      if (!files || files.length === 0) {
        this.elements.filesEmpty.style.display = 'block';
        this.elements.fileCount.textContent = '0 files';
      } else {
        this.elements.filesEmpty.style.display = 'none';
        this.elements.fileCount.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;
        this.renderFiles(files);
      }

    } catch (error) {
      console.error('Load files error:', error);
      this.showError(`Failed to load files: ${error.message}`);
      this.elements.filesLoading.style.display = 'none';
    }
  }

  /**
   * Render file list
   */
  renderFiles(files) {
    const template = document.getElementById('fileItemTemplate');

    files.forEach(file => {
      // Clone template
      const fileItem = template.content.cloneNode(true);
      const container = fileItem.querySelector('.cs-file-item');
      container.dataset.fileId = file.id;

      // Set file preview (image thumbnail or icon)
      const preview = fileItem.querySelector('.cs-file-preview');
      if (file.file_type.startsWith('image/')) {
        this.loadImagePreview(file.storage_path, preview);
      } else {
        preview.innerHTML = this.getPDFIcon();
      }

      // Set file info
      fileItem.querySelector('.cs-file-name').textContent = file.file_name;
      fileItem.querySelector('.cs-file-size').textContent = this.formatFileSize(file.file_size);
      fileItem.querySelector('.cs-file-category').textContent = file.category || 'general';
      fileItem.querySelector('.cs-file-date').textContent = this.formatDate(file.created_at);
      fileItem.querySelector('.cs-file-visibility').textContent = file.client_visible ? 'Visible to client' : 'Staff only';

      // Attach action handlers
      fileItem.querySelector('.cs-download-button').addEventListener('click', () => {
        this.downloadFile(file);
      });

      fileItem.querySelector('.cs-delete-button').addEventListener('click', () => {
        this.deleteFile(file);
      });

      // Append to list
      this.elements.filesList.appendChild(fileItem);
    });
  }

  /**
   * Load image preview thumbnail
   */
  async loadImagePreview(storagePath, previewElement) {
    try {
      // Get signed URL for the image
      const { data, error } = await this.supabase.storage
        .from('files')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      // Create img element
      const img = document.createElement('img');
      img.src = data.signedUrl;
      img.alt = 'File preview';
      img.className = 'cs-preview-image';
      previewElement.appendChild(img);

    } catch (error) {
      console.error('Failed to load preview:', error);
      previewElement.innerHTML = this.getImageIcon();
    }
  }

  /**
   * Download file
   */
  async downloadFile(file) {
    try {
      // Get signed URL for download
      const { data, error } = await this.supabase.storage
        .from('files')
        .createSignedUrl(file.storage_path, 60); // 1 minute expiry

      if (error) {
        throw error;
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.file_name;
      link.click();

    } catch (error) {
      console.error('Download error:', error);
      this.showError(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(file) {
    if (!confirm(`Are you sure you want to delete "${file.file_name}"?`)) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from('files')
        .remove([file.storage_path]);

      if (storageError) {
        throw storageError;
      }

      // Delete metadata from database
      const { error: dbError } = await this.supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) {
        throw dbError;
      }

      // Reload file list
      await this.loadFiles();

    } catch (error) {
      console.error('Delete error:', error);
      this.showError(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Show upload progress
   */
  showProgress(filename, percentage) {
    this.elements.uploadProgress.style.display = 'block';
    this.elements.progressFilename.textContent = filename;
    this.elements.progressPercentage.textContent = `${percentage}%`;
    this.elements.progressFill.style.width = `${percentage}%`;
  }

  /**
   * Hide upload progress
   */
  hideProgress() {
    this.elements.uploadProgress.style.display = 'none';
    this.elements.progressFill.style.width = '0%';
  }

  /**
   * Show error message
   */
  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.elements.errorMessage.style.display = 'none';
    }, 5000);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get PDF icon SVG
   */
  getPDFIcon() {
    return `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M9 13h6"/>
        <path d="M9 17h6"/>
      </svg>
    `;
  }

  /**
   * Get image icon SVG
   */
  getImageIcon() {
    return `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    `;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileUploader;
}
