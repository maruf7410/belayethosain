export interface ChunkedUploadProgress {
  sessionId: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
  status: 'initializing' | 'uploading' | 'assembling' | 'finalizing' | 'completed' | 'failed' | 'paused';
  speedBytesPerSec: number;
}

export interface ChunkedUploadOptions {
  file: File;
  userId: string;
  targetType: 'project' | 'bot';
  targetId?: string;
  chunkSize?: number; // Defaults to 5MB (5 * 1024 * 1024)
  metadata?: Record<string, any>;
  onProgress?: (progress: ChunkedUploadProgress) => void;
  signal?: AbortSignal;
}

export async function uploadLargeProjectChunked(options: ChunkedUploadOptions): Promise<any> {
  const {
    file,
    userId,
    targetType,
    targetId,
    chunkSize = 5 * 1024 * 1024, // 5 MB chunks
    metadata = {},
    onProgress,
    signal
  } = options;

  const totalChunks = Math.ceil(file.size / chunkSize);
  let startTime = Date.now();
  let uploadedBytes = 0;

  // 1. Initialize upload session
  const initRes = await fetch('/api/v1/uploads/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Uid': userId
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      totalChunks,
      chunkSize,
      targetType,
      targetId,
      metadata
    }),
    signal
  });

  const initData = await initRes.json();
  if (!initData.success || !initData.session) {
    throw new Error(initData.error?.message || initData.message || 'Failed to initialize upload session');
  }

  const session = initData.session;
  const sessionId = session.id;

  // Check for any previously uploaded chunks (for resuming)
  let uploadedChunkIndices = new Set<number>(session.uploaded_chunks || []);

  const report = (status: ChunkedUploadProgress['status'], chunkIndex: number) => {
    if (onProgress) {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speed = elapsedSec > 0 ? Math.round(uploadedBytes / elapsedSec) : 0;
      const percentage = Math.min(99, Math.round((uploadedBytes / file.size) * 100));

      onProgress({
        sessionId,
        fileName: file.name,
        totalBytes: file.size,
        uploadedBytes,
        percentage: status === 'completed' ? 100 : percentage,
        currentChunk: chunkIndex + 1,
        totalChunks,
        status,
        speedBytesPerSec: speed
      });
    }
  };

  report('uploading', 0);

  // 2. Upload chunks with retry logic
  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) {
      throw new Error('Upload aborted by user');
    }

    const start = i * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunkBlob = file.slice(start, end);

    // If chunk was already uploaded in a resumed session, skip uploading
    if (uploadedChunkIndices.has(i)) {
      uploadedBytes += chunkBlob.size;
      report('uploading', i);
      continue;
    }

    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        const chunkRes = await fetch(`/api/v1/uploads/sessions/${sessionId}/chunks/${i}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-User-Uid': userId
          },
          body: chunkBlob,
          signal
        });

        const chunkData = await chunkRes.json();
        if (chunkData.success) {
          success = true;
          uploadedBytes += chunkBlob.size;
          uploadedChunkIndices.add(i);
          report('uploading', i);
        } else {
          throw new Error(chunkData.error?.message || `Chunk ${i} upload failed`);
        }
      } catch (err: any) {
        if (signal?.aborted) throw err;
        if (attempts >= maxAttempts) {
          report('failed', i);
          throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks} after ${maxAttempts} attempts: ${err.message}`);
        }
        // Exponential backoff wait before retry
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }
  }

  // 3. Finalize & Assemble
  report('assembling', totalChunks - 1);

  const finalizeRes = await fetch(`/api/v1/uploads/sessions/${sessionId}/finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Uid': userId
    },
    signal
  });

  const finalizeData = await finalizeRes.json();
  if (!finalizeData.success) {
    report('failed', totalChunks - 1);
    throw new Error(finalizeData.error?.message || finalizeData.message || 'Assembly / Deployment failed');
  }

  report('completed', totalChunks - 1);
  return finalizeData;
}
