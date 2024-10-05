import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosS3 from '../axioS3'; // Import the S3 axios instance
import { useAuth } from '../contexts/AuthContext';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
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

  const { logout } = useAuth();

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
  
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('tier', tier);
  
    setUploading(true);
    setUploadProgress(0);
    setError('');
  
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/files/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });
  
      if (response.data.presigned_url) {
        const { presigned_url, s3_key } = response.data;
  
        // Upload to S3
        await axiosS3.put(presigned_url, selectedFile, {
          headers: {
            'Content-Type': selectedFile.type,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        });
  
        // Confirm upload
        await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/files/confirm_upload/`, {
          s3_key: s3_key,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        alert('File uploaded successfully');
      } else {
        // Small file upload handled by backend
        alert('File uploaded successfully');
      }
  
      fetchUploadedFiles();
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload the file. Please try again.');
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
    // console.log('Downloading file and filename ', fileId, filename);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/${fileId}/download_file/`,
        { responseType: 'blob' }
      );
      if (response.status === 202) {
        alert(
          'This file is archived and needs to be restored. Please check back in one day.'
        );
        // if (userConfirmed) {
        //   alert('Restoration has been initiated. Please try again in 1 day.');
        // }
      } else if (response.status === 203) {
        alert('This file is already being restored. Please check back in one day.');

      }
      else {
        const contentType = response.headers['content-type'];
        const url = window.URL.createObjectURL(
          new Blob([response.data], { type: contentType })
        );
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Failed to download the file. Please try again later.');
    }
  };

  const handleClick = (event, file) => {
    if (!file) {
      console.error('handleClick called without a file');
      return;
    }
    setAnchorEl(event.currentTarget);
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
          
          const tierValue = params;
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
            <IconButton
              aria-label="more"
              onClick={(e) => handleClick(e, params.row)}
            >
              <MoreVertIcon />
            </IconButton>
          );
        },
      },
    ];

    return columns;


  }
  // Define columns for DataGrid with defensive checks
  

  // Prepare rows for DataGrid with flattened tier
  const rows = uploadedFiles.map((file, index) => ({
    id: file.id || index, // Ensure each row has a unique id
    file_name: file.file_name || 'Unnamed File',
    simple_url: file.simple_url || '#',
    fileTier: file.metadata?.tier || 'standard', // Renamed tier field
  }));


  // Filter rows based on search text
  const filteredRows = rows.filter((row) =>
    row.file_name.toLowerCase().includes(searchText.toLowerCase())
  );

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
              uploading ? (
                <CircularProgress size={24} color="secondary" />
              ) : (
                <UploadFileIcon />
              )
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

      {/* Actions Menu */}
      <MUIMenu
        id="long-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {selectedFileForMenu && (
          <MUIMenuItem
            onClick={() => {
              downloadFile(selectedFileForMenu.id, selectedFileForMenu.file_name);
              handleClose();
            }}
          >
            <DownloadIcon style={{ marginRight: '8px' }} /> Download
          </MUIMenuItem>
        )}
      </MUIMenu>
    </Container>
  );
};

export default FileUpload;
