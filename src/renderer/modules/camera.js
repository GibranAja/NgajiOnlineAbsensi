/**
 * Camera Management
 * Handles camera initialization, streaming, and photo capture
 */

let mediaStream = null;

async function initCamera() {
  try {
    // Stop existing stream if any
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }

    // Request camera access with specific constraints for external webcam
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    elements.cameraPreview.srcObject = mediaStream;
    elements.cameraError.style.display = 'none';
    elements.cameraOverlay.style.display = 'flex';

    return true;
  } catch (error) {
    console.error('Camera initialization error:', error);
    elements.cameraError.style.display = 'flex';
    elements.cameraOverlay.style.display = 'none';
    return false;
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (elements.cameraPreview) {
    elements.cameraPreview.srcObject = null;
  }
}

function capturePhoto() {
  const canvas = elements.photoCanvas;
  const video = elements.cameraPreview;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Get base64 image (JPEG for smaller size)
  const photoData = canvas.toDataURL('image/jpeg', 0.8);

  return photoData;
}
