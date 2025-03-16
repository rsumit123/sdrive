import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosS3 from '../axioS3'; // Import the S3 axios instance
import { useAuth } from '../contexts/AuthContext';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit' ;
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Container,
  Grid,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  LinearProgress,
  IconButton,
  Link,
  Menu as MUIMenu,
  MenuItem as MUIMenuItem,
  Tooltip,
  TextField,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

// Import the new components
import FileSelector from './FileSelector';
import FileList from './FileList';
import RenameDialog from './RenameDialog';

const FileUpload = ({ setShowCmdUpload }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [tier, setTier] = useState('standard');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fileProgress, setFileProgress] = useState({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFileForMenu, setSelectedFileForMenu] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadErrors, setUploadErrors] = useState([]);

  // States for Rename Dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedFileForRename, setSelectedFileForRename] = useState(null);
  const [renameNewFilename, setRenameNewFilename] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState('');

  const { logout } = useAuth();

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

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

  const fetchUploadedFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v3/files/`);
      if (Array.isArray(response.data.files)) {2
        setUploadedFiles(response.data.files);
      } else {
        console.error('Response data is not an array:', response.data);
        setError('Unexpected response format from the server.');
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Could not fetch data. Please contact admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileAction = {
    download: async (fileId, filename) => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/files/${fileId}/download_presigned_url/`
        );
  
        if (response.status === 202) {
          alert('This file is archived and needs to be restored. Please check back in one day.');
        } else if (response.status === 203) {
          alert('This file is already being restored. Please check back in one day.');
        } else if (response.status === 200) {
          const { presigned_url, file_name } = response.data;
  
          const link = document.createElement('a');
          link.href = presigned_url;
          link.setAttribute('download', file_name || filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } else {
          alert('Unexpected response from the server.');
        }
      } catch (err) {
        console.error('Error downloading file:', err);
        alert('Failed to download the file. Please try again later.');
      }
    },
    
    delete: async (s3Key) => {
      const userConfirmed = window.confirm('Are you sure you want to delete this file? This action cannot be undone.');
  
      if (!userConfirmed) {
        return;
      }
  
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/files/`, {
          data: { s3_key: s3Key },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
  
        if (response.status === 200) {
          alert('File deleted successfully.');
          fetchUploadedFiles();
        } else {
          alert(`Unexpected response status: ${response.status}`);
        }
      } catch (err) {
        if (err.response) {
          const { status, data } = err.response;
          if (status === 404) {
            alert('File not found or you do not have permission to delete this file.');
          } else if (status === 400) {
            alert('Invalid request. Please try again.');
          } else if (status === 500) {
            alert('Server error occurred while deleting the file. Please try again later.');
          } else {
            alert(`Error: ${data.error || 'An error occurred while deleting the file.'}`);
          }
        } else if (err.request) {
          console.error('No response received:', err.request);
          alert('No response from server. Please check your network connection.');
        } else {
          console.error('Error setting up request:', err.message);
          alert('An unexpected error occurred. Please try again.');
        }
  
        console.error('Delete file error:', err);
      }
    },
    
    rename: (file) => {
      setSelectedFileForRename(file);
      setRenameNewFilename(file.file_name);
      setRenameDialogOpen(true);
    }
  };

  const submitRename = async () => {
    if (!selectedFileForRename) return;
    if (!renameNewFilename.trim()) {
      setRenameError('New filename cannot be empty.');
      return;
    }

    setRenameLoading(true);
    setRenameError('');

    try {
      const token = localStorage.getItem('authToken');

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/rename/`,
        {
          s3_key: selectedFileForRename.s3_key,
          new_filename: renameNewFilename.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        fetchUploadedFiles();
        setRenameDialogOpen(false);
      } else {
        setRenameError('Unexpected response from the server.');
      }
    } catch (err) {
      console.error('Error renaming file:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setRenameError(err.response.data.error);
      } else {
        setRenameError('Failed to rename the file. Please try again.');
      }
    } finally {
      setRenameLoading(false);
    }
  };

  const refreshFileMetadata = async (fileId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/${fileId}/refresh_file_metadata/`
      );
      setUploadedFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, metadata: response.data.metadata } : file
        )
      );
    } catch (err) {
      console.error('Error refreshing file metadata:', err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      uploadedFiles.forEach((file) => {
        if (file.metadata && file.metadata.tier === 'unarchiving') {
          refreshFileMetadata(file.id);
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [uploadedFiles]);

  const fetchColumns = () => {
    const columns = [
      {
        field: 'file_name',
        headerName: 'File Name',
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          if (!params || !params.row) return null;
          return (
            <Tooltip title={params.value} arrow>
              <Link
                href={params.row.simple_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
              >
                {params.value}
              </Link>
            </Tooltip>
          );
        },
      },
      {
        field: 'fileTier',
        headerName: 'Tier',
        width: 120,
        valueFormatter: (params) => {
          const tierValue = params.value;
          if (tierValue === 'glacier') return 'Archived';
          if (tierValue === 'unarchiving') return 'Restoring';
          return 'Standard';
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          if (!params || !params.row) return null;
          return (
            <IconButton aria-label="more" onClick={(e) => handleClick(e, params.row)}>
              <MoreVertIcon />
            </IconButton>
          );
        },
      },
      {
        field: 'last_modified',
        headerName: 'Date',
        width: 180,
        sortable: true,
        filterable: true,
        valueFormatter: (params) => {
          if (!params) {return '';}
          return new Date(params).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        },
      },
    ];

    return columns;
  };

  const rows = uploadedFiles.map((file, index) => ({
    id: file.id || index,
    file_name: file.file_name || 'Unnamed File',
    simple_url: file.simple_url || '#',
    fileTier: file.metadata?.tier || 'standard',
    s3_key: file.s3_key || '',
    last_modified: file.last_modified || '',
  }));

  const filteredRows = rows.filter((row) =>
    row.file_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleClick = (event, file) => {
    if (!file) {
      console.error('handleClick called without a file');
      return;
    }
    setAnchorEl(event.currentTarget);
    console.log("File selected ",file);
    setSelectedFileForMenu(file);
  };

  const handleClose = ({selected_file= false} = {}) => {
    console.log("anchorEl",anchorEl);
    setAnchorEl(null);
    if(!selected_file === true){
    console.log("Delting selected file",selectedFileForMenu);
    setSelectedFileForMenu(null);}
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
        <Grid item xs={6} sm={6}>
          <Typography variant="h4" gutterBottom>
            SDrive
          </Typography>
        </Grid>
        <Grid item xs={6} sm={6} container justifyContent="flex-end">
          <Button color="primary" variant="contained" onClick={logout}>
            Logout
          </Button>
        </Grid>
      </Grid>
      
      <FormControl fullWidth margin="normal">
        <InputLabel>Storage Tier</InputLabel>
        <Select value={tier} onChange={(e) => setTier(e.target.value)}>
          <MenuItem value="standard">Standard</MenuItem>
          <MenuItem value="glacier">Archive</MenuItem>
        </Select>
      </FormControl>

      <FileSelector
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        fileProgress={fileProgress}
        setFileProgress={setFileProgress}
        uploading={uploading}
        setUploading={setUploading}
        overallProgress={overallProgress}
        setOverallProgress={setOverallProgress}
        tier={tier}
        uploadErrors={uploadErrors}
        setUploadErrors={setUploadErrors}
        setError={setError}
        fetchUploadedFiles={fetchUploadedFiles}
        setShowCmdUpload={setShowCmdUpload}
      />
      
      {uploadErrors.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Some files failed to upload:</Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {uploadErrors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </Alert>
      )}

      <FileList
        uploadedFiles={uploadedFiles}
        loading={loading}
        error={error}
        searchText={searchText}
        setSearchText={setSearchText}
        handleFileAction={handleFileAction}
      />

      <RenameDialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        file={selectedFileForRename}
        newFilename={renameNewFilename}
        setNewFilename={setRenameNewFilename}
        loading={renameLoading}
        error={renameError}
        onSubmit={submitRename}
      />
    </Container>
  );
};

export default FileUpload;
