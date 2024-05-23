import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Button,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Grid,
  Link
} from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// import { Button, CircularProgress } from '@mui/core';


const FileUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [tier, setTier] = useState('standard');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloading, setDownloading] = useState({});

  const { login, logout } = useAuth();

  // const s3_bucket_endpoint = "https://sumits-private-storage.s3.amazonaws.com/"



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

    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      // Simulate backend processing time
      for (let i = uploadProgress; i <= 100; i++) {
        setTimeout(() => setUploadProgress(i), i * 50); // Adjust delay as needed
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate backend delay
      alert('File uploaded successfully');
      fetchUploadedFiles();
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files/`);
      if (Array.isArray(response.data)) {
        setUploadedFiles(response.data);
      } else {
        console.error('Response data is not an array:', response.data);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };


  const downloadFile = async (fileId, filename) => {
    setDownloading(prev => ({ ...prev, [fileId]: true }));
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files/${fileId}/download_file/`, { responseType: 'blob' });
      if (response.status === 202) {
        const userConfirmed = window.confirm('This file is archived and needs to be restored. Do you want to restore it? This may take some time.');
        if (userConfirmed) {
          alert('Restoration has been initiated. Please try again in 1 day.');
        }
      } else {
        const contentType = response.headers['content-type'];
        const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
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
    } finally {
      setDownloading(prev => ({ ...prev, [fileId]: false }));
    }
  };
  
  
  

  const refreshFileMetadata = async (fileId) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files/${fileId}/refresh_file_metadata/`);
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
        if (file.metadata.tier === 'unarchiving') {
          refreshFileMetadata(file.id);
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [uploadedFiles]);

  return (
    <Container maxWidth="md">
      <Grid container alignItems="center" justifyContent="space-between">
    <Grid item xs>
      <Typography variant="h4" align="center" gutterBottom>SDrive</Typography>
    </Grid>
    <Grid item>
      <Button color="primary" onClick={logout}>Logout</Button>
    </Grid>
  </Grid>

      <FormControl fullWidth margin="normal">
        <InputLabel>Storage Tier</InputLabel>
        <Select value={tier} onChange={(e) => setTier(e.target.value)}>
          <MenuItem value="standard">Standard</MenuItem>
          <MenuItem value="glacier">Archive</MenuItem>
        </Select>
      </FormControl>
      <Button
        variant="contained"
        component="label"
        startIcon={<UploadFile />}
        fullWidth
      >
        Select File
        <input type="file" hidden onChange={handleFileChange} />
      </Button>
      {selectedFile && (
        <Typography variant="body1" gutterBottom>
          {selectedFile.name}
        </Typography>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleFileUpload}
        disabled={uploading || !selectedFile}
        fullWidth
        startIcon={uploading && <CircularProgress size={24} color="secondary" />}
      >
        {uploading ? "Uploading..." : "Upload"}
</Button>
      {uploading && <LinearProgress variant="determinate" value={uploadProgress} />}
      <Typography variant="h6" gutterBottom>Uploaded Files</Typography>
      <List>
  {Array.isArray(uploadedFiles) && uploadedFiles.map((file) => (
    <ListItem key={file.id} divider>
      <ListItemText
        primary={<Link href={file.simple_url} target="_blank">{file.file_name}</Link>}
        secondary={
          file.metadata.tier === 'glacier' ? '(Archived)' :
          file.metadata.tier === 'unarchiving' ? '(Restoring)' :
          ''
        }
      />
      {file.metadata.tier !== 'unarchiving' && (
        <Button
          variant="contained"
          color="secondary"
          onClick={() => downloadFile(file.id, file.file_name)}
          disabled={downloading[file.id]}
        >
          {downloading[file.id] ? <CircularProgress size={24} color="inherit" /> : 'Download'}
        </Button>
      )}
    </ListItem>
  ))}
</List>


    </Container>
  );
};

export default FileUpload;
