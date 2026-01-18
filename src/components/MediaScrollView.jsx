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
  handleFileAction,
  fetchMoreFiles, // Function to fetch next page
  hasMorePages, // Boolean indicating if more pages exist
  loadingMore, // Boolean indicating if more files are loading
  currentPage, // Current page number
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loadingItems, setLoadingItems] = useState({});
  const [allMediaFiles, setAllMediaFiles] = useState([]);
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const isLoadingMoreRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const previousFilesLengthRef = useRef(0);

  // Filter and update media files when files change
  // Use a smarter merge strategy to avoid resetting scroll position
  useEffect(() => {
    const mediaFiles = files.filter(file =>
      isImage(file.file_name) || isVideo(file.file_name)
    );

    // If this is a new set of files (dialog just opened or page changed)
    // We need to determine if files were appended (pagination) or replaced (new open)
    if (!open) {
      // Dialog is closed, reset for next open
      hasInitializedRef.current = false;
      previousFilesLengthRef.current = 0;
      return;
    }

    if (!hasInitializedRef.current) {
      // First time opening - set all files
      setAllMediaFiles(mediaFiles);
      previousFilesLengthRef.current = mediaFiles.length;
      hasInitializedRef.current = true;
    } else if (files.length > previousFilesLengthRef.current) {
      // More files were added (pagination) - append only new media files
      // Get existing file keys to avoid duplicates
      const existingKeys = new Set(allMediaFiles.map(f => f.s3_key || f.id));
      const newMediaFiles = mediaFiles.filter(f => !existingKeys.has(f.s3_key || f.id));

      if (newMediaFiles.length > 0) {
        setAllMediaFiles(prev => [...prev, ...newMediaFiles]);
      }
      previousFilesLengthRef.current = files.length;
    }
  }, [files, open]);

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

  // Effect to control video playback when currentIndex changes
  useEffect(() => {
    if (!open) return;

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      // Pause all videos first
      Object.keys(videoRefs.current).forEach((key) => {
        const idx = parseInt(key);
        const video = videoRefs.current[key];
        if (video && idx !== currentIndex) {
          try {
            video.pause();
            video.currentTime = 0; // Reset to beginning
          } catch (e) {
            // Ignore errors
          }
        }
      });

      // Play the current video if it exists and is a video file
      const currentFile = allMediaFiles[currentIndex];
      if (currentFile && isVideo(currentFile.file_name)) {
        const currentVideo = videoRefs.current[currentIndex];
        if (currentVideo) {
          // Reset video to beginning and play
          currentVideo.currentTime = 0;
          const playPromise = currentVideo.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // Video started playing successfully
              })
              .catch(error => {
                // Auto-play was prevented, might need user interaction
                console.log('Video autoplay prevented, user interaction may be required:', error);
              });
          }
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [currentIndex, open, allMediaFiles]);

  // Handle browser back button
  useEffect(() => {
    if (!open) return;

    // Push a state to history when dialog opens
    window.history.pushState({ mediaViewOpen: true }, '');

    const handlePopState = () => {
      // If back button is pressed and we're in media view, close it
      if (open) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [open, onClose]);

  // Only scroll to initial index when dialog first opens, not on subsequent file loads
  const hasScrolledToInitialRef = useRef(false);

  useEffect(() => {
    if (open && allMediaFiles.length > 0 && !hasScrolledToInitialRef.current) {
      const index = Math.min(initialIndex, allMediaFiles.length - 1);
      setCurrentIndex(index);
      // Scroll to the current item after a brief delay to ensure DOM is ready
      setTimeout(() => {
        if (containerRef.current) {
          const element = containerRef.current.children[index];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
      hasScrolledToInitialRef.current = true;
    }

    // Reset when dialog closes
    if (!open) {
      hasScrolledToInitialRef.current = false;
    }
  }, [open, initialIndex, allMediaFiles.length]);

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
  }, [open, currentIndex, allMediaFiles.length]);

  const goToNext = () => {
    if (currentIndex < allMediaFiles.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollToIndex(nextIndex);
    } else if (hasMorePages && fetchMoreFiles && !isLoadingMoreRef.current) {
      // Load next page if available
      loadNextPage();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollToIndex(prevIndex);
    }
  };

  const loadNextPage = async () => {
    if (isLoadingMoreRef.current || !hasMorePages || !fetchMoreFiles) return;
    
    isLoadingMoreRef.current = true;
    try {
      await fetchMoreFiles();
    } catch (error) {
      console.error('Error loading more files:', error);
    } finally {
      isLoadingMoreRef.current = false;
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
    const scrollHeight = e.target.scrollHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    // Update current index
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < allMediaFiles.length) {
      setCurrentIndex(newIndex);
    }

    // Check if near the end (within 2 items) and load more if available
    const distanceFromBottom = scrollHeight - scrollTop - itemHeight;
    const threshold = itemHeight * 2; // Load when 2 items away from bottom
    
    if (distanceFromBottom < threshold && hasMorePages && !loadingMore && !isLoadingMoreRef.current) {
      loadNextPage();
    }
  };

  if (allMediaFiles.length === 0 && !loadingMore) {
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
            {currentIndex + 1} / {allMediaFiles.length}{hasMorePages ? '+' : ''}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {allMediaFiles[currentIndex]?.metadata?.tier && (
              <Chip
                icon={getTierIcon(allMediaFiles[currentIndex].metadata.tier)}
                label={getTierLabel(allMediaFiles[currentIndex].metadata.tier)}
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
          {allMediaFiles.map((file, index) => (
            <Box
              key={file.id || `${file.s3_key}-${index}` || index}
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
                  ref={(el) => {
                    if (el) {
                      videoRefs.current[index] = el;
                    } else {
                      delete videoRefs.current[index];
                    }
                  }}
                  src={file.simple_url}
                  controls
                  muted={false}
                  playsInline
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                  onLoadStart={() => setLoadingItems(prev => ({ ...prev, [index]: true }))}
                  onLoadedData={() => {
                    setLoadingItems(prev => ({ ...prev, [index]: false }));
                    // Auto-play if this is the current video
                    if (index === currentIndex) {
                      const video = videoRefs.current[index];
                      if (video) {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                          playPromise.catch(error => {
                            console.log('Video autoplay prevented:', error);
                          });
                        }
                      }
                    }
                  }}
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
          
          {/* Loading indicator at the bottom when loading more */}
          {loadingMore && (
            <Box
              sx={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
                color: 'white',
              }}
            >
              <CircularProgress sx={{ color: 'white' }} />
              <Typography variant="body1">Loading more media...</Typography>
            </Box>
          )}
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

        {(currentIndex < allMediaFiles.length - 1 || (hasMorePages && fetchMoreFiles)) && (
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
              disabled={currentIndex === allMediaFiles.length - 1 && (!hasMorePages || loadingMore)}
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
              {loadingMore ? <CircularProgress size={24} sx={{ color: 'white' }} /> : <ArrowDownwardIcon />}
            </IconButton>
          </Tooltip>
          {loadingMore && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
              <CircularProgress size={20} sx={{ color: 'white' }} />
              <Typography variant="body2">Loading more...</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

export default MediaScrollView;

