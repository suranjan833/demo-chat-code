
export interface UploadResponse {
  status: 'success' | 'error';
  message: string;
  file_name?: string;
  file_size?: number;
  file_url?: string;
}

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('https://devdrm.xyz/upload.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
};
