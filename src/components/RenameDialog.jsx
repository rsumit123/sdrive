import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';

const RenameDialog = ({
  open,
  onClose,
  file,
  newFilename,
  setNewFilename,
  loading,
  error,
  onSubmit,
}) => {
  if (!file) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Rename File</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Renaming <strong>{file?.file_name}</strong> to:
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="New Filename"
          type="text"
          fullWidth
          variant="outlined"
          value={newFilename}
          onChange={(e) => setNewFilename(e.target.value)}
          disabled={loading}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          color="primary"
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RenameDialog; 