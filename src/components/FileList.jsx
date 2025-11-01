import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Link,
  Tooltip,
  Menu as MUIMenu,
  MenuItem as MUIMenuItem,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Pagination,
  CardMedia,
  CardActionArea,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloudIcon from '@mui/icons-material/Cloud';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';

const FileList = ({
  uploadedFiles: initialFiles,
  loading: initialLoading,
  error: initialError,
  searchText,
  setSearchText,
  handleFileAction,
}) => {
  // State for pagination and data
  const [files, setFiles] = useState(initialFiles || []);
  const [loading, setLoading] = useState(initialLoading || false);
  const [error, setError] = useState(initialError || null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingFileId, setUpdatingFileId] = useState(null);
  const [itemsPerPage] = useState(10);

  // State for file actions menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFileForMenu, setSelectedFileForMenu] = useState(null);
  
  // State for tier change confirmation dialog
  const [tierChangeDialogOpen, setTierChangeDialogOpen] = useState(false);
  const [tierChangeTarget, setTierChangeTarget] = useState(null);
  const [tierChangeLoading, setTierChangeLoading] = useState(false);
  const [tierChangeError, setTierChangeError] = useState('');

  // State for copy link snackbar
  const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);

  // Fetch files from the API
  const fetchFiles = async (pageNum = 1, useCache = false, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const params = { 
        page: pageNum,
        per_page: itemsPerPage,
        use_cache: useCache
      };
      
      console.log(`Fetching files: page=${pageNum}, useCache=${useCache}`); // Log request params
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/v3/files/`, 
        { params }
      );
      
      // --- Add Logs Here --- 
      console.log("API Response for Files:", response.data);
      const receivedTotalPages = response.data.total_pages || 1;
      const receivedTotalFiles = response.data.total || 0;
      console.log(`Received total_pages: ${receivedTotalPages}, total: ${receivedTotalFiles}`);
      // --- End Logs --- 

      setFiles(response.data.files);
      setTotalPages(receivedTotalPages);
      setTotalFiles(receivedTotalFiles);
      
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err.response?.data?.error || 'Failed to fetch files. Please try again.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Fetch a single file's details
  const fetchSingleFileDetails = async (fileIdentifier) => {
    if (!fileIdentifier) return;
    
    setUpdatingFileId(fileIdentifier);
    
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/${fileIdentifier}/details/`
      );
      
      // Update just this file in the files array
      setFiles(prevFiles => {
        return prevFiles.map(file => {
          if (file.id === response.data.id || file.s3_key === response.data.s3_key) {
            return response.data;
          }
          return file;
        });
      });
    } catch (err) {
      console.error(`Error fetching details for file ${fileIdentifier}:`, err);
      // If we can't get the file details, we'll just leave it as is
    } finally {
      setUpdatingFileId(null);
    }
  };

  // Change file storage tier
  const changeFileTier = async (fileIdentifier, targetTier) => {
    if (!fileIdentifier) return;
    
    setTierChangeLoading(true);
    setTierChangeError('');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/${fileIdentifier}/change_tier/`,
        { target_tier: targetTier }
      );
      
      // Handle different response statuses
      if (response.status === 202) {
        // Restoration initiated
        alert(response.data.message || 'File restoration initiated. Try changing the tier again after restoration is complete.');
      } else {
        // Success - update the file in the list
        const updatedFile = { ...tierChangeTarget };
        if (response.data.metadata) {
          updatedFile.metadata = response.data.metadata;
        }
        
        // Update the file in the list
        setFiles(prevFiles => {
          return prevFiles.map(file => {
            if (file.id === fileIdentifier || file.s3_key === fileIdentifier) {
              return updatedFile;
            }
            return file;
          });
        });
        
        // Show success message
        alert(response.data.message || `File successfully changed to ${targetTier} tier`);
      }
      
      // Close the dialog
      setTierChangeDialogOpen(false);
      setTierChangeTarget(null);
      
    } catch (err) {
      console.error(`Error changing tier for file ${fileIdentifier}:`, err);
      setTierChangeError(err.response?.data?.error || 'Failed to change file tier. Please try again.');
    } finally {
      setTierChangeLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFiles(page);
  }, []);

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    fetchFiles(newPage);
  };

  // Refresh files with fresh data from S3
  const refreshFiles = () => {
    fetchFiles(page, false, true);
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  // Calculate total space used from all files
  const calculateTotalSpaceUsed = () => {
    const totalBytes = files.reduce((sum, file) => {
      const fileSize = file.metadata?.size || 0;
      return sum + fileSize;
    }, 0);
    return totalBytes;
  };

  // Format date to user-friendly format
  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown';
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle file menu open
  const handleClick = (event, file) => {
    if (!file) {
      console.error('handleClick called without a file');
      return;
    }
    event.stopPropagation(); // Prevent card click when clicking menu
    setAnchorEl(event.currentTarget);
    setSelectedFileForMenu(file);
  };

  // Handle file menu close
  const handleClose = () => {
    setAnchorEl(null);
    setSelectedFileForMenu(null);
  };

  // Handle card click to open file in new tab
  const handleCardClick = (file) => {
    if (file && file.simple_url) {
      window.open(file.simple_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle tier change menu item click
  const handleTierChangeClick = (file) => {
    setTierChangeTarget(file);
    setTierChangeDialogOpen(true);
    handleClose(); // Close the menu
  };

  // Handle tier change confirmation
  const handleTierChangeConfirm = () => {
    if (!tierChangeTarget) return;
    
    const currentTier = tierChangeTarget.metadata?.tier || 'standard';
    const targetTier = currentTier === 'glacier' ? 'standard' : 'glacier';
    
    changeFileTier(tierChangeTarget.id || tierChangeTarget.s3_key, targetTier);
  };

  // Handle tier change dialog close
  const handleTierChangeDialogClose = () => {
    setTierChangeDialogOpen(false);
    setTierChangeTarget(null);
    setTierChangeError('');
  };

  // Handle copy file link to clipboard
  const handleCopyLink = async (file) => {
    if (!file || !file.simple_url) {
      console.error('File or URL is missing');
      return;
    }

    try {
      await navigator.clipboard.writeText(file.simple_url);
      setCopySnackbarOpen(true);
      handleClose(); // Close the menu after copying
    } catch (err) {
      console.error('Failed to copy link to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = file.simple_url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySnackbarOpen(true);
        handleClose();
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
        alert('Failed to copy link. Please copy manually: ' + file.simple_url);
      }
      document.body.removeChild(textArea);
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setCopySnackbarOpen(false);
  };

  // Custom file action handlers that extend the provided handlers
  const extendedFileActions = {
    ...handleFileAction,
    download: async (fileId, fileName) => {
      try {
        // Show loading state for this specific file
        setUpdatingFileId(fileId);
        
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/files/${fileId}/download_presigned_url/`
        );
  
        if (response.status === 202) {
          alert('This file is archived and needs to be restored. Please check back in one day.');
        } else if (response.status === 203) {
          alert('This file is already being restored. Please check back in one day.');
        } else if (response.status === 200) {
          const { presigned_url, file_name } = response.data;
  
          // Create a temporary link element and trigger download
          const link = document.createElement('a');
          link.href = presigned_url;
          link.setAttribute('download', file_name || fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert('Unexpected response from the server.');
        }
      } catch (err) {
        console.error('Error downloading file:', err);
        alert('Failed to download the file. Please try again later.');
      } finally {
        setUpdatingFileId(null);
      }
    },
    rename: (file) => {
      // Call the original rename handler
      handleFileAction.rename(file);
      
      // Store the file ID to refresh it after renaming
      if (file && (file.id || file.s3_key)) {
        const fileIdentifier = file.id || file.s3_key;
        // We'll set this up to be used by the parent component
        window.fileToRefreshAfterRename = fileIdentifier;
      }
    }
  };

  // This effect will run when a file has been renamed
  useEffect(() => {
    if (window.fileRenamed && window.fileToRefreshAfterRename) {
      fetchSingleFileDetails(window.fileToRefreshAfterRename);
      // Reset the flags
      window.fileRenamed = false;
      window.fileToRefreshAfterRename = null;
    }
  }, [window.fileRenamed]);

  // Filter files based on search text
  const filteredFiles = files.filter((file) =>
    file.file_name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Get storage tier icon
  const getTierIcon = (tier) => {
    switch (tier) {
      case 'glacier':
        return <AcUnitIcon fontSize="small" />;
      case 'unarchiving':
        return <AcUnitIcon fontSize="small" color="action" />;
      default:
        return <CloudIcon fontSize="small" />;
    }
  };

  // Get storage tier label
  const getTierLabel = (tier) => {
    switch (tier) {
      case 'glacier':
        return 'Archived';
      case 'unarchiving':
        return 'Restoring';
      default:
        return 'Standard';
    }
  };

  // Check if file is an image
  const isImage = (fileName) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );
  };

  // Check if file is a video
  const isVideo = (fileName) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
    return videoExtensions.some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );
  };

  // Check if file is a PDF
  const isPDF = (fileName) => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  // Get file icon based on type
  const getFileIcon = (fileName) => {
    if (isImage(fileName)) {
      return <ImageIcon fontSize="large" />;
    } else if (isVideo(fileName)) {
      return <VideoFileIcon fontSize="large" />;
    } else if (isPDF(fileName)) {
      return <PictureAsPdfIcon fontSize="large" />;
    } else {
      return <InsertDriveFileIcon fontSize="large" />;
    }
  };

  // Get file thumbnail or icon
  const getFileThumbnail = (file) => {
    if (isImage(file.file_name) || isVideo(file.file_name)) {
      return (
        <CardMedia
          component={isImage(file.file_name) ? "img" : "video"}
          sx={{ 
            height: 140, 
            objectFit: 'cover',
            backgroundColor: '#f5f5f5'
          }}
          image={file.simple_url}
          title={file.file_name}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '';
            e.target.style.display = 'none';
            e.target.parentElement.style.height = 'auto';
            e.target.parentElement.style.minHeight = '60px';
            e.target.parentElement.style.display = 'flex';
            e.target.parentElement.style.alignItems = 'center';
            e.target.parentElement.style.justifyContent = 'center';
            const icon = document.createElement('div');
            icon.innerHTML = isImage(file.file_name) 
              ? '<svg class="MuiSvgIcon-root MuiSvgIcon-fontSizeLarge" focusable="false" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"></path></svg>'
              : '<svg class="MuiSvgIcon-root MuiSvgIcon-fontSizeLarge" focusable="false" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg>';
            e.target.parentElement.appendChild(icon);
          }}
        />
      );
    } else {
      return (
        <Box 
          sx={{ 
            height: 140, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f5f5f5'
          }}
        >
          {getFileIcon(file.file_name)}
        </Box>
      );
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Search Files"
            variant="outlined"
            fullWidth
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6} container justifyContent="flex-end">
          <Button 
            variant="outlined" 
            startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />} 
            onClick={refreshFiles}
            disabled={refreshing}
            sx={{ ml: 2 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Grid>
      </Grid>

      {/* Stats Section */}
      {files.length > 0 && (
        <Box 
          sx={{ 
            mb: 3, 
            p: 2, 
            backgroundColor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Space Used
            </Typography>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mt: 0.5 }}>
              {formatFileSize(calculateTotalSpaceUsed())}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Files
            </Typography>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mt: 0.5 }}>
              {totalFiles}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Files in View
            </Typography>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mt: 0.5 }}>
              {filteredFiles.length}
            </Typography>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Uploaded Files
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && files.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 200,
          }}
        >
          <CircularProgress />
        </Box>
      ) : filteredFiles.length === 0 ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          {files.length === 0 ? 'No files uploaded yet.' : 'No files match your search.'}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filteredFiles.map((file) => (
            <Grid item xs={12} sm={6} md={4} key={file.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%',
                  position: 'relative',
                  opacity: updatingFileId === file.id || updatingFileId === file.s3_key ? 0.7 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  },
                  cursor: 'pointer'
                }}
                onClick={() => handleCardClick(file)}
              >
                {(updatingFileId === file.id || updatingFileId === file.s3_key) && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      bottom: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      zIndex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    <CircularProgress size={30} />
                  </Box>
                )}
                
                {getFileThumbnail(file)}
                
                <CardContent sx={{ flexGrow: 1, position: 'relative' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Tooltip title={file.file_name} arrow>
                      <Typography variant="h6" noWrap sx={{ maxWidth: '80%' }}>
                        {file.file_name}
                      </Typography>
                    </Tooltip>
                    <IconButton 
                      aria-label="more" 
                      onClick={(e) => handleClick(e, file)}
                      size="small"
                      sx={{ zIndex: 2 }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Size: {formatFileSize(file.metadata?.size)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Modified: {formatDate(file.last_modified)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, justifyContent: 'space-between' }}>
                      <Chip 
                        icon={getTierIcon(file.metadata?.tier)} 
                        label={getTierLabel(file.metadata?.tier)}
                        size="small"
                        color={file.metadata?.tier === 'glacier' ? 'info' : 'default'}
                        variant={file.metadata?.tier === 'unarchiving' ? 'outlined' : 'filled'}
                      />
                      <Tooltip title="Open in new tab">
                        <OpenInNewIcon fontSize="small" color="action" />
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary"
            disabled={loading || refreshing}
          />
        </Box>
      )}

      <MUIMenu
        id="file-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {selectedFileForMenu && [
          <MUIMenuItem
            key="copyLink"
            onClick={() => handleCopyLink(selectedFileForMenu)}
          >
            <ContentCopyIcon style={{ marginRight: '8px' }} /> Copy Link
          </MUIMenuItem>,
          <MUIMenuItem
            key="download"
            onClick={() => {
              extendedFileActions.download(selectedFileForMenu.id, selectedFileForMenu.file_name);
              handleClose();
            }}
          >
            <DownloadIcon style={{ marginRight: '8px' }} /> Download
          </MUIMenuItem>,
          <MUIMenuItem
            key="delete"
            onClick={() => {
              extendedFileActions.delete(selectedFileForMenu.s3_key);
              handleClose();
            }}
          >
            <DeleteIcon style={{ marginRight: '8px' }} /> Delete
          </MUIMenuItem>,
          <MUIMenuItem
            key="rename"
            onClick={() => {
              extendedFileActions.rename(selectedFileForMenu);
              handleClose();
            }}
          >
            <EditIcon style={{ marginRight: '8px' }} /> Rename
          </MUIMenuItem>,
          <MUIMenuItem
            key="changeTier"
            onClick={() => handleTierChangeClick(selectedFileForMenu)}
          >
            {selectedFileForMenu.metadata?.tier === 'glacier' ? (
              <>
                <UnarchiveIcon style={{ marginRight: '8px' }} /> Restore to Standard
              </>
            ) : (
              <>
                <ArchiveIcon style={{ marginRight: '8px' }} /> Archive File
              </>
            )}
          </MUIMenuItem>
        ]}
      </MUIMenu>

      {/* Tier Change Confirmation Dialog */}
      <Dialog
        open={tierChangeDialogOpen}
        onClose={handleTierChangeDialogClose}
        aria-labelledby="tier-change-dialog-title"
      >
        <DialogTitle id="tier-change-dialog-title">
          {tierChangeTarget?.metadata?.tier === 'glacier' 
            ? 'Restore File to Standard Tier' 
            : 'Archive File'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {tierChangeTarget?.metadata?.tier === 'glacier' ? (
              <>
                Are you sure you want to restore <strong>{tierChangeTarget?.file_name}</strong> to standard tier? 
                This will make the file immediately accessible but may incur additional storage costs.
              </>
            ) : (
              <>
                Are you sure you want to archive <strong>{tierChangeTarget?.file_name}</strong>? 
                Archived files have lower storage costs but cannot be accessed immediately. 
                You'll need to restore the file before downloading it, which may take several hours.
              </>
            )}
          </DialogContentText>
          {tierChangeError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {tierChangeError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTierChangeDialogClose} disabled={tierChangeLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleTierChangeConfirm} 
            color="primary" 
            variant="contained"
            disabled={tierChangeLoading}
          >
            {tierChangeLoading ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Link Success Snackbar */}
      <Snackbar
        open={copySnackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          File link copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FileList; 