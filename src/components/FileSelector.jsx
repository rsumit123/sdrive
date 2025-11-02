import React from 'react';
import axios from 'axios';
import axiosS3 from '../axioS3';
import {
  Grid,
  Button,
  Typography,
  CircularProgress,
  LinearProgress,
  IconButton,
  Tooltip,
  Box,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

const FileSelector = ({
  selectedFiles,
  setSelectedFiles,
  fileProgress,
  setFileProgress,
  uploading,
  setUploading,
  overallProgress,
  setOverallProgress,
  tier,
  uploadErrors,
  setUploadErrors,
  setError,
  fetchUploadedFiles,
  setShowCmdUpload,
  onUploadComplete,
}) => {
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    
    const initialProgress = {};
    files.forEach(file => {
      initialProgress[file.name] = 0;
    });
    setFileProgress(initialProgress);
  };

  const removeSelectedFile = (fileName) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    setFileProgress(prev => {
      const newProgress = {...prev};
      delete newProgress[fileName];
      return newProgress;
    });
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setOverallProgress(0);
    setError('');
    setUploadErrors([]);

    try {
      const filesMetadata = selectedFiles.map(file => ({
        file_name: file.name,
        content_type: file.type,
        file_size: file.size,
        tier: tier
      }));

      console.log('Requesting presigned URLs for files:', filesMetadata);

      const presignedResponse = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/upload/`,
        {
          files: filesMetadata
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Presigned URL response:', presignedResponse.data);
      const { successful, failed } = presignedResponse.data;

      if (failed && failed.length > 0) {
        const failedMessages = failed.map(f => `${f.file_name}: ${f.message || 'Unknown error'}`);
        setUploadErrors(failedMessages);
      }

      if (successful && successful.length > 0) {
        const uploadPromises = successful.map(async (fileData) => {
          const { presigned_url, s3_key, file_name, content_type } = fileData;
          const fileToUpload = selectedFiles.find(f => f.name === file_name);
          
          if (!fileToUpload) {
            return { s3_key, status: 'error', message: 'File not found in selected files' };
          }

          try {
            console.log(`Starting upload for ${file_name} to ${presigned_url.split('?')[0]}`);
            
            // Use the content_type from the presigned URL response if available
            const effectiveContentType = content_type || fileToUpload.type;
            
            await axiosS3.put(presigned_url, fileToUpload, {
              headers: {
                'Content-Type': effectiveContentType,
              },
              transformRequest: [(data) => data],
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                
                setFileProgress(prev => ({
                  ...prev,
                  [file_name]: percentCompleted
                }));
                
                // Calculate overall progress based on current progress values
                setFileProgress(prev => {
                  const allFiles = Object.keys(prev);
                  if (allFiles.length > 0) {
                    const totalProgress = allFiles.reduce((sum, fileName) => {
                      return sum + (prev[fileName] || 0);
                    }, 0) / allFiles.length;
                    
                    setOverallProgress(Math.round(totalProgress));
                  }
                  return prev;
                });
              },
            });
            
            console.log(`Successfully uploaded ${file_name}`);
            return { s3_key, status: 'success' };
          } catch (error) {
            console.error(`Error uploading file ${file_name}:`, error);
            console.error('Error details:', {
              message: error.message,
              response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
              } : 'No response',
              request: error.request ? 'Request made but no response received' : 'Request setup error'
            });
            
            let errorMessage = 'Upload failed';
            
            // Special handling for 403 Forbidden errors
            if (error.response && error.response.status === 403) {
              errorMessage = 'Access denied to S3. The presigned URL may have expired or the permissions are incorrect.';
              console.error('S3 403 Forbidden Error. This is likely due to:');
              console.error('1. The presigned URL has expired');
              console.error('2. The S3 bucket policy does not allow this operation');
              console.error('3. The IAM user/role does not have sufficient permissions');
            } else if (error.message) {
              errorMessage = error.message;
            } else if (error.response && error.response.data) {
              errorMessage = typeof error.response.data === 'string' 
                ? error.response.data 
                : JSON.stringify(error.response.data);
            }
            
            return { 
              s3_key, 
              status: 'error', 
              message: errorMessage || 'Network error during upload'
            };
          }
        });

        console.log('Processing all uploads in parallel...');
        const uploadResults = await Promise.all(uploadPromises);
        console.log('Upload results:', uploadResults);
        
        const successfulUploads = uploadResults.filter(result => result.status === 'success');
        const failedUploads = uploadResults.filter(result => result.status === 'error');
        
        if (failedUploads.length > 0) {
          const newErrors = failedUploads.map(f => `Upload failed for ${f.s3_key}: ${f.message || 'Unknown error'}`);
          setUploadErrors(prev => [...prev, ...newErrors]);
        }
        
        if (successfulUploads.length > 0) {
          const s3Keys = successfulUploads.map(result => result.s3_key);
          
          console.log('Confirming uploads for keys:', s3Keys);
          try {
            const confirmResponse = await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/api/files/confirm_uploads/`,
              {
                s3_keys: s3Keys
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            console.log('Confirmation response:', confirmResponse.data);
            
            if (successfulUploads.length === selectedFiles.length) {
              alert('All files uploaded successfully');
            } else {
              alert(`${successfulUploads.length} of ${selectedFiles.length} files uploaded successfully`);
            }
          } catch (confirmError) {
            console.error('Error confirming uploads:', confirmError);
            setError('Files were uploaded but confirmation failed. Please contact support.');
          }
        }

        fetchUploadedFiles();
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    } catch (err) {
      console.error('Error in file upload process:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError(`Failed to upload files: ${err.message || 'Network error'}`);
      }
    } finally {
      setUploading(false);
      setOverallProgress(0);
      setFileProgress({});
      setSelectedFiles([]);
    }
  };

  return (
    <>
      <Grid container spacing={2} alignItems="center" justifyContent="space-between">
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFileIcon />}
            fullWidth
          >
            Select Files
            <input type="file" hidden onChange={handleFileChange} multiple />
          </Button>
          
          {selectedFiles.length > 0 && (
            <Paper elevation={2} sx={{ p: 2, mt: 2, maxHeight: '200px', overflow: 'auto' }}>
              <Typography variant="subtitle1" gutterBottom>
                Selected Files ({selectedFiles.length})
              </Typography>
              <Stack spacing={1}>
                {selectedFiles.map((file, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ width: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Tooltip title={file.name}>
                        <Typography noWrap variant="body2">{file.name}</Typography>
                      </Tooltip>
                      {fileProgress[file.name] > 0 && (
                        <LinearProgress 
                          variant="determinate" 
                          value={fileProgress[file.name]} 
                          sx={{ mt: 0.5, height: 5 }}
                        />
                      )}
                    </Box>
                    <Chip 
                      label={`${(file.size / (1024 * 1024)).toFixed(2)} MB`} 
                      size="small" 
                      sx={{ mr: 1 }}
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => removeSelectedFile(file.name)}
                      disabled={uploading}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleFileUpload}
            disabled={uploading || selectedFiles.length === 0}
            fullWidth
            startIcon={
              uploading ? <CircularProgress size={24} color="secondary" /> : <CloudUploadIcon />
            }
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length} files)` : ''}`}
          </Button>
        </Grid>
      </Grid>

      <Button
        variant="contained"
        color="secondary"
        onClick={() => setShowCmdUpload(true)}
        fullWidth
        sx={{ mt: 2 }}
      >
        Upload via CMD
      </Button>
      
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Overall Progress</span>
            <span>{overallProgress}%</span>
          </Typography>
          <LinearProgress variant="determinate" value={overallProgress} sx={{ mt: 1, mb: 1 }} />
        </Box>
      )}
    </>
  );
};

export default FileSelector; 