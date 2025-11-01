import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  IconButton,
  Typography,
  CircularProgress,
  Dialog,
  Button,
  Chip,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloudIcon from '@mui/icons-material/Cloud';
import AcUnitIcon from '@mui/icons-material/AcUnit';

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

const MediaScrollView = ({ 
  files, 
  open, 
  onClose, 
  initialIndex = 0,
  handleFileAction 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loadingItems, setLoadingItems] = useState({});
  const containerRef = useRef(null);
  const mediaFiles = files.filter(file => 
    isImage(file.file_name) || isVideo(file.file_name)
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

  useEffect(() => {
    if (open && mediaFiles.length > 0) {
      setCurrentIndex(Math.min(initialIndex, mediaFiles.length - 1));
      // Scroll to the current item
      if (containerRef.current) {
        const element = containerRef.current.children[currentIndex];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [open, initialIndex, mediaFiles.length]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.key === 'ArrowDown') {
          goToNext();
        } else {
          goToPrevious();
        }
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, mediaFiles.length]);

  const goToNext = () => {
    if (currentIndex < mediaFiles.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollToIndex(nextIndex);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollToIndex(prevIndex);
    }
  };

  const scrollToIndex = (index) => {
    if (containerRef.current) {
      const element = containerRef.current.children[index];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleScroll = (e) => {
    if (!containerRef.current) return;

    const scrollTop = e.target.scrollTop;
    const itemHeight = e.target.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < mediaFiles.length) {
      setCurrentIndex(newIndex);
    }
  };

  if (mediaFiles.length === 0) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: '#000',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            color: 'white',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            No media files to display
          </Typography>
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </Box>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          backgroundColor: '#000',
          m: 0,
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
          }}
        >
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
            {currentIndex + 1} / {mediaFiles.length}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {mediaFiles[currentIndex]?.metadata?.tier && (
              <Chip
                icon={getTierIcon(mediaFiles[currentIndex].metadata.tier)}
                label={getTierLabel(mediaFiles[currentIndex].metadata.tier)}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' },
                }}
              />
            )}
            <IconButton
              onClick={onClose}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Scrollable Content */}
        <Box
          ref={containerRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            scrollSnapType: 'y mandatory',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.5)',
              },
            },
          }}
        >
          {mediaFiles.map((file, index) => (
            <Box
              key={file.id || index}
              sx={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'start',
                position: 'relative',
              }}
            >
              {isImage(file.file_name) ? (
                <Box
                  component="img"
                  src={file.simple_url}
                  alt={file.file_name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                  onLoadStart={() => setLoadingItems(prev => ({ ...prev, [index]: true }))}
                  onLoad={() => setLoadingItems(prev => ({ ...prev, [index]: false }))}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    setLoadingItems(prev => ({ ...prev, [index]: false }));
                  }}
                />
              ) : (
                <Box
                  component="video"
                  src={file.simple_url}
                  controls
                  autoPlay={index === currentIndex}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                  onLoadStart={() => setLoadingItems(prev => ({ ...prev, [index]: true }))}
                  onLoadedData={() => setLoadingItems(prev => ({ ...prev, [index]: false }))}
                  onError={() => setLoadingItems(prev => ({ ...prev, [index]: false }))}
                />
              )}
              
              {/* Loading Indicator */}
              {loadingItems[index] && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <CircularProgress sx={{ color: 'white' }} />
                </Box>
              )}

              {/* File Name Overlay (bottom) */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: 2,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: 500,
                  }}
                >
                  {file.file_name}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Navigation Buttons */}
        {currentIndex > 0 && (
          <IconButton
            onClick={goToPrevious}
            sx={{
              position: 'absolute',
              top: '50%',
              left: 16,
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              zIndex: 10,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <KeyboardArrowUpIcon fontSize="large" />
          </IconButton>
        )}

        {currentIndex < mediaFiles.length - 1 && (
          <IconButton
            onClick={goToNext}
            sx={{
              position: 'absolute',
              top: '50%',
              right: 16,
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              zIndex: 10,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <KeyboardArrowDownIcon fontSize="large" />
          </IconButton>
        )}

        {/* Footer with action buttons */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            p: 2,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            zIndex: 10,
          }}
        >
          <Tooltip title="Previous (↑)">
            <IconButton
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&:disabled': {
                  opacity: 0.3,
                },
              }}
            >
              <ArrowUpwardIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Next (↓)">
            <IconButton
              onClick={goToNext}
              disabled={currentIndex === mediaFiles.length - 1}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&:disabled': {
                  opacity: 0.3,
                },
              }}
            >
              <ArrowDownwardIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Dialog>
  );
};

export default MediaScrollView;

