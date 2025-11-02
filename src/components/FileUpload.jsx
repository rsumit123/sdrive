import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosS3 from '../axioS3';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  IconButton,
  Menu as MUIMenu,
  MenuItem,
  ListItemText,
  Divider,
  Fab,
  LinearProgress,
  Alert,
  SwipeableDrawer,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UploadIcon from '@mui/icons-material/Upload';
import TerminalIcon from '@mui/icons-material/Terminal';
import StorageIcon from '@mui/icons-material/Storage';

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

  // Account usage state
  const [accountUsage, setAccountUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const { logout, user } = useAuth();
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  useEffect(() => {
    fetchUploadedFiles();
    fetchAccountUsage();
  }, []);

  // Fetch account usage from API
  const fetchAccountUsage = async () => {
    setUsageLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/account/check_account_usage/`
      );
      setAccountUsage(response.data);
    } catch (err) {
      console.error('Error fetching account usage:', err);
      // Don't show error to user, just log it
    } finally {
      setUsageLoading(false);
    }
  };

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
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v2/files/`);
      if (Array.isArray(response.data.files)) {
        setUploadedFiles(response.data.files);
      } else {
        console.error('Response data.files is not an array:', response.data);
        setError('Unexpected response format from the server.');
      }
      
      // Refresh account usage when files are fetched
      fetchAccountUsage();
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err.response?.data?.error || 'Could not fetch data. Please contact admin.');
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
          fetchAccountUsage(); // Refresh usage after delete
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
        fetchAccountUsage(); // Refresh usage after rename
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

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 MB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const handleSettingsClick = (event) => {
    setSettingsAnchorEl(event.currentTarget);
    setSettingsMenuOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
    setSettingsMenuOpen(false);
  };

  // Get total space used from API or fallback to 0
  const totalSpaceUsed = accountUsage?.total_file_size || 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        pb: { xs: 10, sm: 4 },
      }}
    >
      {/* Modern App Header */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderBottom: '1px solid',
          borderColor: '#e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          px: { xs: 2, sm: 4 },
          pt: { xs: 3, sm: 4 },
          pb: { xs: 2, sm: 2.5 },
        }}
      >
        <Box
          sx={{
            maxWidth: { xs: '100%', sm: '1200px' },
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.5,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                mb: 0.25,
                color: '#0f172a',
              }}
            >
              SDrive
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#64748b',
                fontSize: { xs: '0.813rem', sm: '0.875rem' },
              }}
            >
              {formatFileSize(totalSpaceUsed)} used
            </Typography>
          </Box>
          <IconButton
            onClick={handleSettingsClick}
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: '#f1f5f9',
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Settings Menu */}
      <MUIMenu
        anchorEl={settingsAnchorEl}
        open={settingsMenuOpen}
        onClose={handleSettingsClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { setShowCmdUpload(true); handleSettingsClose(); }}>
          <TerminalIcon sx={{ mr: 2, fontSize: 20 }} />
          <ListItemText primary="Upload via CMD" secondary="Advanced upload method" />
        </MenuItem>
        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
            Storage Tier
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Box
              onClick={() => { setTier('standard'); handleSettingsClose(); }}
              sx={{
                p: 1,
                borderRadius: 1,
                backgroundColor: tier === 'standard' ? 'primary.light' : 'transparent',
                cursor: 'pointer',
                mb: 0.5,
              }}
            >
              <Typography variant="body2">Standard</Typography>
            </Box>
            <Box
              onClick={() => { setTier('glacier'); handleSettingsClose(); }}
              sx={{
                p: 1,
                borderRadius: 1,
                backgroundColor: tier === 'glacier' ? 'primary.light' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <Typography variant="body2">Archive</Typography>
            </Box>
          </Box>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            logout();
            handleSettingsClose();
          }}
        >
          <LogoutIcon sx={{ mr: 2, fontSize: 20 }} />
          <ListItemText primary="Logout" />
        </MenuItem>
      </MUIMenu>

      {/* Main Content */}
      <Box
        sx={{
          maxWidth: { xs: '100%', sm: '1200px' },
          mx: 'auto',
          px: { xs: 3, sm: 4 },
          pt: { xs: 2, sm: 3 },
        }}
      >
        {/* Upload Sheet Content (Hidden FileSelector) */}
        <FileList
          uploadedFiles={uploadedFiles}
          loading={loading}
          error={error}
          searchText={searchText}
          setSearchText={setSearchText}
          handleFileAction={handleFileAction}
          tier={tier}
          totalSpaceUsed={totalSpaceUsed}
          accountUsage={accountUsage}
          onFilesChanged={fetchAccountUsage}
        />

        {uploadErrors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2, mb: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2">Some files failed to upload:</Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {uploadErrors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Box>

      {/* Upload Bottom Sheet / Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        onOpen={() => setUploadSheetOpen(true)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '90vh',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              backgroundColor: '#d1d5db',
              borderRadius: 2,
              mx: 'auto',
              mb: 3,
            }}
          />
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Upload Files
          </Typography>
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
            onUploadComplete={() => setUploadSheetOpen(false)}
          />
        </Box>
      </SwipeableDrawer>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="upload"
        onClick={() => setUploadSheetOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 20, sm: 24 },
          right: { xs: 16, sm: 24 },
          width: { xs: 56, sm: 56 },
          height: { xs: 56, sm: 56 },
          boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000,
          '&:hover': {
            boxShadow: '0 8px 16px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)',
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <UploadIcon sx={{ fontSize: 28 }} />
      </Fab>

      {/* Upload Progress Indicator */}
      {uploading && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 0, sm: 0 },
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 2,
            zIndex: 1000,
          }}
        >
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Uploading... {overallProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={overallProgress} sx={{ borderRadius: 1, height: 6 }} />
          </Box>
        </Box>
      )}

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
    </Box>
  );
};

export default FileUpload;
