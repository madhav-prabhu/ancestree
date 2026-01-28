/**
 * Image processing utilities for family member photos.
 *
 * Handles client-side image resizing and compression to keep
 * photos under ~200KB for efficient IndexedDB storage.
 */

/**
 * Maximum dimension (width or height) for resized images.
 */
const MAX_DIMENSION = 400

/**
 * Target file size in bytes (~200KB).
 */
const TARGET_SIZE = 200 * 1024

/**
 * Maximum input file size (10MB) to prevent browser memory issues.
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Process an image file: resize to max dimension and compress.
 *
 * @param file - The image file to process
 * @returns Promise resolving to a Base64 data URL
 * @throws Error if file is not a valid image
 */
export async function processImage(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  // Validate file size to prevent browser memory issues
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image file is too large. Maximum size is 10MB.')
  }

  // Load image
  const img = await loadImage(file)

  // Calculate new dimensions (maintain aspect ratio)
  const { width, height } = calculateDimensions(img.width, img.height)

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  // Compress with quality adjustment
  return compressToTarget(canvas)
}

/**
 * Load an image file into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Calculate new dimensions maintaining aspect ratio.
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  // If already within limits, keep original size
  if (originalWidth <= MAX_DIMENSION && originalHeight <= MAX_DIMENSION) {
    return { width: originalWidth, height: originalHeight }
  }

  // Scale down to fit within max dimension
  const ratio = Math.min(
    MAX_DIMENSION / originalWidth,
    MAX_DIMENSION / originalHeight
  )

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  }
}

/**
 * Compress canvas to JPEG, adjusting quality to meet target size.
 */
function compressToTarget(canvas: HTMLCanvasElement): string {
  // Start with high quality and reduce if needed
  let quality = 0.9
  let dataUrl = canvas.toDataURL('image/jpeg', quality)

  // Reduce quality until we're under target size (or hit minimum quality)
  while (dataUrl.length > TARGET_SIZE && quality > 0.3) {
    quality -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  return dataUrl
}

/**
 * Get initials from a name for avatar display.
 *
 * @param name - Full name
 * @returns 1-2 character initials
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
