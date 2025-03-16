// src/axiosS3.js
import axios from 'axios';

const axiosS3 = axios.create({
  // Don't transform the request body, which is important for binary file uploads
  transformRequest: [(data) => data],
  // Increase timeout for large files
  timeout: 120000, // 2 minutes
  // Don't include credentials for cross-origin requests to S3
  withCredentials: false,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  // Remove default headers that might interfere with presigned URLs
  headers: {}
});

// Add response interceptor for better error handling
axiosS3.interceptors.response.use(
  response => response,
  error => {
    // Special handling for S3 errors
    if (error.response && error.response.status === 403) {
      console.error('S3 Access Denied (403 Forbidden):', {
        message: 'The request to S3 was rejected with a 403 Forbidden error.',
        url: error.config?.url?.split('?')[0] || 'Unknown URL',
        possibleCauses: [
          'The presigned URL has expired',
          'The S3 bucket policy does not allow this operation',
          'The IAM user/role does not have sufficient permissions',
          'Headers added to the request invalidated the signature'
        ]
      });
    } else {
      console.error('S3 Request Error:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        } : 'No response',
        request: error.request ? 'Request was made but no response received' : 'Request setup error',
        config: error.config ? {
          url: error.config.url?.split('?')[0] || 'Unknown URL', // Only log the base URL, not the full presigned URL with credentials
          method: error.config.method,
          headers: error.config.headers
        } : 'No config'
      });
    }
    return Promise.reject(error);
  }
);

export default axiosS3;
