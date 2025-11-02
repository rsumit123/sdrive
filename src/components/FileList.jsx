import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  Box,
  IconButton,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Paper,
  InputAdornment,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
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
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import MediaScrollView from './MediaScrollView';

const FileList = ({
  uploadedFiles: initialFiles,
  loading: initialLoading,
  error: initialError,
  searchText,
  setSearchText,
  handleFileAction,
  tier,
  totalSpaceUsed,
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
  
  // View mode: 'list' or 'grid'
  const [viewMode, setViewMode] = useState('list');
  
  // Filter state: 'all', 'images', 'videos', 'docs'
  const [filter, setFilter] = useState('all');

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

  // State for scrollable media view
  const [scrollableViewOpen, setScrollableViewOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [loadingMoreMedia, setLoadingMoreMedia] = useState(false);

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

  // Function to fetch next page for media view (appends to existing files)
  const fetchNextPageForMedia = async () => {
    if (page >= totalPages || loadingMoreMedia) return;
    
    setLoadingMoreMedia(true);
    try {
      const nextPage = page + 1;
      const params = { 
        page: nextPage,
        per_page: itemsPerPage,
        use_cache: false
      };
      
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/v3/files/`, 
        { params }
      );
      
      // Append new files to existing ones
      setFiles(prevFiles => [...prevFiles, ...response.data.files]);
      setTotalPages(response.data.total_pages || totalPages);
      setTotalFiles(response.data.total || totalFiles);
      setPage(nextPage);
      
    } catch (err) {
      console.error('Error fetching next page for media:', err);
    } finally {
      setLoadingMoreMedia(false);
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

  // Handle card click to open file in new tab or scrollable view
  const handleCardClick = (file) => {
    // If it's a media file, open in scrollable view
    if ((isImage(file.file_name) || isVideo(file.file_name)) && files.length > 0) {
      const mediaFiles = files.filter(f => isImage(f.file_name) || isVideo(f.file_name));
      const mediaIndex = mediaFiles.findIndex(f => 
        f.id === file.id || f.s3_key === file.s3_key
      );
      if (mediaIndex !== -1) {
        setSelectedMediaIndex(mediaIndex);
        setScrollableViewOpen(true);
        return;
      }
    }
    // Otherwise, open in new tab
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

  // Check if file is an image
  const isImage = (fileName) => {
    if (!fileName) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );
  };

  // Check if file is a video
  const isVideo = (fileName) => {
    if (!fileName) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
    return videoExtensions.some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );
  };

  // Check if file is a PDF
  const isPDF = (fileName) => {
    if (!fileName) return false;
    return fileName.toLowerCase().endsWith('.pdf');
  };

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

  // Filter files based on search text and type filter
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchText.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === 'all') return true;
    if (filter === 'images') return isImage(file.file_name);
    if (filter === 'videos') return isVideo(file.file_name);
    if (filter === 'docs') return isPDF(file.file_name) || (!isImage(file.file_name) && !isVideo(file.file_name));
    return true;
  });

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

  // Calculate storage percentage (assuming 2GB limit, can be made configurable)
  const storageLimit = 2 * 1024 * 1024 * 1024; // 2GB in bytes
  const storagePercentage = totalSpaceUsed ? Math.min((totalSpaceUsed / storageLimit) * 100, 100) : 0;

  return (
    <Box>
      {/* Storage Progress Bar */}
      {totalSpaceUsed !== undefined && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            borderRadius: 3,
            backgroundColor: 'white',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
              {formatFileSize(totalSpaceUsed)} of {formatFileSize(storageLimit)} used
            </Typography>
            <Button size="small" variant="text" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              Upgrade
            </Button>
          </Box>
          <LinearProgress
            variant="determinate"
            value={storagePercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e5e7eb',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                backgroundColor: '#f3f4f6',
                flex: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Files
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem', mt: 0.25 }}>
                {totalFiles}
              </Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                backgroundColor: '#f3f4f6',
                flex: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                In View
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem', mt: 0.25 }}>
                {filteredFiles.length}
              </Typography>
            </Paper>
          </Box>
        </Paper>
      )}

      {/* Modern Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search files..."
          variant="outlined"
          fullWidth
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={refreshFiles}
                  disabled={refreshing}
                  sx={{
                    mr: -1,
                  }}
                >
                  {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              backgroundColor: '#f9fafb',
              '& fieldset': {
                borderColor: '#e5e7eb',
              },
              '&:hover fieldset': {
                borderColor: '#d1d5db',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
      </Box>

      {/* Filter Chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {['all', 'images', 'videos', 'docs'].map((filterType) => (
          <Chip
            key={filterType}
            label={filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            onClick={() => setFilter(filterType)}
            size="small"
            sx={{
              backgroundColor: filter === filterType ? 'primary.main' : '#f3f4f6',
              color: filter === filterType ? 'white' : '#6b7280',
              fontWeight: filter === filterType ? 600 : 500,
              '&:hover': {
                backgroundColor: filter === filterType ? 'primary.dark' : '#e5e7eb',
              },
            }}
          />
        ))}
      </Box>

      {/* File List Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Uploaded Files ({filteredFiles.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {(() => {
            const allFiles = filteredFiles.length > 0 ? filteredFiles : files;
            const mediaFiles = allFiles.filter(f => {
              if (!f || !f.file_name) return false;
              return isImage(f.file_name) || isVideo(f.file_name);
            });
            
            return mediaFiles.length > 0 ? (
              <Tooltip title={`Open Scrollable Media View (${mediaFiles.length} ${mediaFiles.length === 1 ? 'file' : 'files'})`}>
                <IconButton
                  size="small"
                  onClick={() => {
                    const allMediaFiles = files.filter(f => isImage(f.file_name) || isVideo(f.file_name));
                    if (allMediaFiles.length > 0) {
                      setSelectedMediaIndex(0);
                      setScrollableViewOpen(true);
                    }
                  }}
                  sx={{
                    backgroundColor: '#f3f4f6',
                    '&:hover': { backgroundColor: '#e5e7eb' },
                  }}
                >
                  <ViewStreamIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null;
          })()}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{
              backgroundColor: '#f3f4f6',
              '& .MuiToggleButton-root': {
                border: 'none',
                px: 1.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              },
            }}
          >
            <ToggleButton value="list">
              <ViewListIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="grid">
              <GridViewIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
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
      ) : (
        <Box sx={{ position: 'relative' }}>
          {/* Loading Overlay for pagination/refresh when files exist */}
          {(loading || refreshing) && files.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(2px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                borderRadius: 2,
                minHeight: 400,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <CircularProgress size={48} />
                <Typography variant="body1" color="text.secondary">
                  {refreshing ? 'Refreshing files...' : 'Loading files...'}
                </Typography>
              </Box>
            </Box>
          )}

          {filteredFiles.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                textAlign: 'center',
              }}
            >
              <FolderOpenIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                {files.length === 0 ? 'No files uploaded yet' : 'No files match your search'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {files.length === 0 ? 'Upload your first file to get started' : 'Try adjusting your search or filters'}
              </Typography>
            </Box>
          ) : viewMode === 'list' ? (
            // Modern List View
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <List sx={{ py: 0 }}>
                {filteredFiles.map((file, index) => (
                  <React.Fragment key={file.id || file.s3_key}>
                    <ListItem
                      onClick={() => handleCardClick(file)}
                      sx={{
                        cursor: 'pointer',
                        py: 2,
                        px: { xs: 2, sm: 3 },
                        backgroundColor: updatingFileId === file.id || updatingFileId === file.s3_key ? 'action.hover' : 'transparent',
                        opacity: updatingFileId === file.id || updatingFileId === file.s3_key ? 0.7 : 1,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isImage(file.file_name) || isVideo(file.file_name) ? 'transparent' : '#f3f4f6',
                            overflow: 'hidden',
                          }}
                        >
                          {(isImage(file.file_name) || isVideo(file.file_name)) ? (
                            <img
                              src={file.simple_url}
                              alt={file.file_name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                // Fallback handled by parent container
                              }}
                            />
                          ) : (
                            getFileIcon(file.file_name)
                          )}
                        </Box>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              fontSize: { xs: '0.95rem', sm: '1rem' },
                              mb: 0.25,
                            }}
                            noWrap
                          >
                            {file.file_name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(file.metadata?.size)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>
                              •
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(file.last_modified)}
                            </Typography>
                            <Box sx={{ ml: 1 }}>
                              <Chip
                                icon={getTierIcon(file.metadata?.tier)}
                                label={getTierLabel(file.metadata?.tier)}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  '& .MuiChip-icon': {
                                    fontSize: '0.875rem',
                                  },
                                }}
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={(e) => handleClick(e, file)}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                      {(updatingFileId === file.id || updatingFileId === file.s3_key) && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            zIndex: 1,
                          }}
                        >
                          <CircularProgress size={24} />
                        </Box>
                      )}
                    </ListItem>
                    {index < filteredFiles.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          ) : (
            // Grid View (existing card design, slightly updated)
            <Grid container spacing={2}>
              {filteredFiles.map((file) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      position: 'relative',
                      opacity: updatingFileId === file.id || updatingFileId === file.s3_key ? 0.7 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius: 3,
                      overflow: 'hidden',
                      '&:hover': {
                        transform: { xs: 'none', sm: 'translateY(-4px)' },
                        boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.1)', sm: '0 8px 24px rgba(0,0,0,0.15)' },
                      },
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'divider',
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
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        <CircularProgress size={30} />
                      </Box>
                    )}

                    {getFileThumbnail(file)}

                    <CardContent sx={{ flexGrow: 1, position: 'relative', p: { xs: 1.5, sm: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Tooltip title={file.file_name} arrow>
                          <Typography
                            variant="h6"
                            noWrap
                            sx={{
                              maxWidth: { xs: '70%', sm: '80%' },
                              fontSize: { xs: '0.95rem', sm: '1rem' },
                              fontWeight: 600,
                            }}
                          >
                            {file.file_name}
                          </Typography>
                        </Tooltip>
                        <IconButton
                          aria-label="more"
                          onClick={(e) => handleClick(e, file)}
                          size="small"
                          sx={{
                            zIndex: 2,
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      <Box sx={{ mt: 1 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5 }}
                        >
                          Size: {formatFileSize(file.metadata?.size)}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 1 }}
                        >
                          Modified: {formatDate(file.last_modified)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                          <Chip
                            icon={getTierIcon(file.metadata?.tier)}
                            label={getTierLabel(file.metadata?.tier)}
                            size="small"
                            color={file.metadata?.tier === 'glacier' ? 'info' : 'default'}
                            variant={file.metadata?.tier === 'unarchiving' ? 'outlined' : 'filled'}
                            sx={{
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 },
                            }}
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
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 2, sm: 3 }, mb: 2 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary"
            disabled={loading || refreshing}
            size="small"
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: 2,
              },
              '& .MuiPaginationItem-sizeSmall': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                minWidth: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
              },
            }}
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

      {/* Media Scrollable View */}
      <MediaScrollView
        files={files}
        open={scrollableViewOpen}
        onClose={() => setScrollableViewOpen(false)}
        initialIndex={selectedMediaIndex}
        handleFileAction={handleFileAction}
        fetchMoreFiles={fetchNextPageForMedia}
        hasMorePages={page < totalPages}
        loadingMore={loadingMoreMedia}
        currentPage={page}
      />
    </Box>
  );
};

export default FileList; 