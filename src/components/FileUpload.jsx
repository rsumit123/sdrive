import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosS3 from '../axioS3'; // Import the S3 axios instance
import { useAuth } from '../contexts/AuthContext';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import RenameIcon from '@mui/icons-material/Delete'; // Import Rename Icon
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const FileUpload = ({ setShowCmdUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [tier, setTier] = useState('standard');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFileForMenu, setSelectedFileForMenu] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false); // New state for loading
  const [error, setError] = useState(''); // New state for error messages

  // States for Rename Dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameNewFilename, setRenameNewFilename] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState('');

  const { logout } = useAuth();

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const { name: file_name, type: content_type, size: file_size } = selectedFile;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Handle large file upload via presigned URL
      // Step 1: Request presigned URL from backend
      const presignedResponse = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/upload/`,
        {
          file_name,
          tier,
          content_type,
          file_size,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { presigned_url, s3_key } = presignedResponse.data;

      // Step 2: Upload the file directly to S3
      await axiosS3.put(presigned_url, selectedFile, {
        headers: {
          'Content-Type': content_type, // Must match the presigned URL
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      // Step 3: Notify backend that upload is complete
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/confirm_upload/`,
        {
          s3_key: s3_key,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      alert('File uploaded successfully');

      fetchUploadedFiles();
    } catch (err) {
      console.error('Error uploading file:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to upload the file. Please try again.');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
    }
  };

  const fetchUploadedFiles = async () => {
    setLoading(true); // Start loading
    setError(''); // Reset previous errors
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files/`);
      if (Array.isArray(response.data)) {
        // console.log('Uploaded Files:', response.data); // Debugging
        setUploadedFiles(response.data);
      } else {
        console.error('Response data is not an array:', response.data);
        setError('Unexpected response format from the server.');
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Could not fetch data. Please contact admin.');
    } finally {
      setLoading(false); // End loading
    }
  };

  const downloadFile = async (fileId, filename) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/${fileId}/download_presigned_url/`,
        {
          // No need for responseType 'blob' since we're getting a URL
          headers: {
            // Include any necessary headers, e.g., authorization tokens
          },
        }
      );

      if (response.status === 202) {
        alert('This file is archived and needs to be restored. Please check back in one day.');
      } else if (response.status === 203) {
        alert('This file is already being restored. Please check back in one day.');
      } else if (response.status === 200) {
        const { presigned_url, file_name } = response.data;

        // Create a temporary link to trigger the download
        const link = document.createElement('a');
        link.href = presigned_url;
        link.setAttribute('download', file_name || filename); // Use the file name from the response if available
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
  };

  /**
   * Deletes a file with the given fileId.
   *
   * @param {string} fileId - The unique identifier of the file to be deleted.
   * @param {function} onSuccess - Callback function to execute after successful deletion.
   */
  const deleteFile = async (fileId, onSuccess) => {
    // Optional: Prompt user for confirmation before deletion
    const userConfirmed = window.confirm('Are you sure you want to delete this file? This action cannot be undone.');

    if (!userConfirmed) {
      return; // Exit the function if user cancels the action
    }

    try {
      // Retrieve the authentication token from localStorage (adjust if stored differently)
      const token = localStorage.getItem('authToken');

      // Send DELETE request to the backend
      const response = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/files/${fileId}/`, {
        headers: {
          Authorization: `Bearer ${token}`, // Include the token in the Authorization header
          'Content-Type': 'application/json', // Adjust headers if necessary
        },
      });

      // Handle successful deletion
      if (response.status === 200) {
        alert('File deleted successfully.');
        fetchUploadedFiles(); // Refresh the file list
      }
      // Handle other potential success statuses if needed
      else {
        alert(`Unexpected response status: ${response.status}`);
      }
    } catch (err) {
      // Handle different error scenarios
      if (err.response) {
        // Server responded with a status other than 2xx
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
        // Request was made but no response received
        console.error('No response received:', err.request);
        alert('No response from server. Please check your network connection.');
      } else {
        // Something happened in setting up the request
        console.error('Error setting up request:', err.message);
        alert('An unexpected error occurred. Please try again.');
      }

      console.error('Delete file error:', err);
    }
  };

  const handleClick = (event, file) => {
    if (!file) {
      console.error('handleClick called without a file');
      return;
    }
    setAnchorEl(event.currentTarget);
    console.log("File selected ",file);
    setSelectedFileForMenu(file);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedFileForMenu(null);
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
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [uploadedFiles]);

  const fetchColumns = () => {
    console.log('Fetching Columns'); // Debugging
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
        field: 'fileTier', // Renamed field to avoid conflict
        headerName: 'Tier',
        width: 120,
        valueFormatter: (params) => {
          const tierValue = params.value; // Corrected to access params.value
          // console.log('Formatted Tier:', tierValue); // Debugging
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
        width: 180, // Increased width to accommodate the date format
        sortable: true,
        filterable: true,
        valueFormatter: (params) => {
          console.log("params value",params);
          if (!params) {console.log("No value for date ");return '';}
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

  // Prepare rows for DataGrid with flattened tier
  const rows = uploadedFiles.map((file, index) => ({

    id: file.id || index, // Ensure each row has a unique id
    file_name: file.file_name || 'Unnamed File',
    simple_url: file.simple_url || '#',
    fileTier: file.metadata?.tier || 'standard', // Renamed tier field
    s3_key: file.s3_key || '', // Include s3_key for rename operation
    last_modified: file.last_modified || '', // Include last_modified for Date column
  }));

  // Filter rows based on search text
  const filteredRows = rows.filter((row) =>
    row.file_name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Handle Rename Dialog Open
  const handleRename = () => {
    if (selectedFileForMenu) {
      setRenameNewFilename(selectedFileForMenu.file_name);
      setRenameDialogOpen(true);
      // handleClose();
      console.log("Selected file for rename while dialog opens",selectedFileForMenu);
    }
  };

  // Handle Rename Submit
  const submitRename = async () => {
    
    console.log('Renaming file:', selectedFileForMenu, 'to:', renameNewFilename); // Debugging
    if (!selectedFileForMenu) return;
    if (!renameNewFilename.trim()) {
      setRenameError('New filename cannot be empty.');
      return;
    }

    setRenameLoading(true);
    setRenameError('');

    try {
      // Retrieve the authentication token from localStorage (adjust if stored differently)
      const token = localStorage.getItem('authToken');

      // Send POST request to rename the file
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/rename/`,
        {
          s3_key: selectedFileForMenu.s3_key,
          new_filename: renameNewFilename.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Include the token in the Authorization header
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        alert('File renamed successfully.');
        fetchUploadedFiles(); // Refresh the file list
        setRenameDialogOpen(false); // Close the dialog
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h4" gutterBottom>
            SDrive
          </Typography>
        </Grid>
        <Grid item>
          <Button color="primary" variant="contained" onClick={logout}>
            Logout
          </Button>
        </Grid>
      </Grid>

      {/* Storage Tier Selection */}
      <FormControl fullWidth margin="normal">
        <InputLabel>Storage Tier</InputLabel>
        <Select value={tier} onChange={(e) => setTier(e.target.value)}>
          <MenuItem value="standard">Standard</MenuItem>
          <MenuItem value="glacier">Archive</MenuItem>
        </Select>
      </FormControl>

      {/* File Selection and Upload */}
      <Grid container spacing={2} alignItems="center" justifyContent="space-between">
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFileIcon />}
            fullWidth
          >
            Select File
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
          {selectedFile && (
            <Typography
              variant="body1"
              gutterBottom
              sx={{
                mt: 1,
                wordWrap: 'break-word',
              }}
            >
              {selectedFile.name}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleFileUpload}
            disabled={uploading || !selectedFile}
            fullWidth
            startIcon={
              uploading ? <CircularProgress size={24} color="secondary" /> : <UploadFileIcon />
            }
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </Grid>
      </Grid>

      {/* Upload via CMD Button */}
      <Button
        variant="contained"
        color="secondary"
        onClick={() => setShowCmdUpload(true)}
        fullWidth
        sx={{ mt: 2 }}
      >
        Upload via CMD
      </Button>
      {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1 }} />}

      {/* Search Bar */}
      <Grid container spacing={2} alignItems="center" sx={{ mt: 4, mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Search Files"
            variant="outlined"
            fullWidth
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Grid>
      </Grid>

      {/* Uploaded Files Table */}
      <Typography variant="h6" gutterBottom>
        Uploaded Files
      </Typography>
      {loading ? (
        // Loading Spinner
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 200, // Adjust height as needed
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        // Error Message
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : uploadedFiles.length > 0 ? (
        // DataGrid
        <div style={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={fetchColumns()}
            pageSize={10}
            rowsPerPageOptions={[5, 10, 20]}
            pagination
            autoHeight
            disableSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell': {
                alignItems: 'center',
              },
            }}
          />
        </div>
      ) : (
        // No Files Message
        <Typography variant="body1" sx={{ mt: 2 }}>
          No files uploaded yet.
        </Typography>
      )}

        <MUIMenu
          id="long-menu"
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          {selectedFileForMenu && [
            <MUIMenuItem
              key="download"
              onClick={() => {
                downloadFile(selectedFileForMenu.id, selectedFileForMenu.file_name);
                handleClose();
              }}
            >
              <DownloadIcon style={{ marginRight: '8px' }} /> Download
            </MUIMenuItem>,
            <MUIMenuItem
              key="delete"
              onClick={() => {
                deleteFile(selectedFileForMenu.id, null);
                handleClose();
              }}
            >
              <DeleteIcon style={{ marginRight: '8px' }} /> Delete
            </MUIMenuItem>,
            <MUIMenuItem
              key="rename"
              onClick={() => {
                handleRename();
              }}
            >
              <RenameIcon style={{ marginRight: '8px' }} /> Rename
            </MUIMenuItem>,
          ]}
        </MUIMenu>


      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Rename File</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Renaming <strong>{selectedFileForMenu?.file_name}</strong> to:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="New Filename"
            type="text"
            fullWidth
            variant="outlined"
            value={renameNewFilename}
            onChange={(e) => setRenameNewFilename(e.target.value)}
            disabled={renameLoading}
          />
          {renameError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {renameError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)} disabled={renameLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => submitRename()}
            color="primary"
            variant="contained"
            disabled={renameLoading}
          >
            {renameLoading ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FileUpload;
