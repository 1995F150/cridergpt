/** Prepare a bounded, metadata-free copy for the existing native chat API. */
export async function prepareNativeImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Use a JPEG, PNG or WebP image for local image recognition.');
  }
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('Use an image smaller than 20 MiB.');
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) {
      throw new Error('Use an image with at most 40 megapixels.');
    }
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the image.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const output = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image could not be encoded.')), 'image/jpeg', 0.9);
    });
    if (output.size > 3 * 1024 * 1024) throw new Error('Prepared image exceeds 3 MiB. Use a smaller image.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Image could not be read.'));
      reader.readAsDataURL(output);
    });
  } finally {
    bitmap.close();
  }
}
