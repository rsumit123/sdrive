import React, { useState } from 'react';
import axios from 'axios';
import {
  Button, Box, Container, TextField, Typography, Paper,
  CircularProgress, IconButton, Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

function CmdLineUpload({ setShowCmdUpload }) {
    const [fileName, setFileName] = useState('');
    const [curlCommand, setCurlCommand] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGeneratePresignedUrl = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files/presign/`, {
                params: { file_name: fileName },
            });
            const presignedUrl = response.data.presigned_url;
            const curlCmd = `curl -X PUT -T "${fileName}" "${presignedUrl}"`;
            setCurlCommand(curlCmd);
        } catch (error) {
            console.error('Error fetching presigned URL:', error);
            alert('Failed to generate presigned URL');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(curlCommand).then(() => {
            alert('Copied to clipboard!');
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <Container component="main" maxWidth="sm">
            <Typography variant="h4" align="center" gutterBottom>SDrive</Typography>
            <Paper elevation={3} sx={{ p: 3, mt: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Generate Command Line Upload
                </Typography>
                <Box
                    component="form"
                    sx={{ '& > :not(style)': { m: 1 }, display: 'flex', flexDirection: 'column' }}
                    noValidate
                    autoComplete="off"
                >
                    <TextField
                        fullWidth
                        label="File Name"
                        variant="outlined"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Enter file name"
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleGeneratePresignedUrl}
                        disabled={loading || !fileName}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {loading ? 'Generating...' : 'Generate Upload Command'}
                    </Button>
                </Box>
                {curlCommand && (
                    <Box sx={{ mt: 2, position: 'relative', width: '100%' }}>
                    <Typography variant="body1" gutterBottom>
                        Use this CURL command to upload your file:
                    </Typography>
                    <Paper variant="outlined" sx={{ position: 'relative', overflow: 'auto', background: '#f4f4f4', p: 2, display: 'flex' }}>
                        <Typography
                            component="pre"
                            sx={{
                                flexGrow: 1,
                                margin: 0,
                                whiteSpace: 'pre-wrap',  // Allows the text to wrap
                                wordWrap: 'break-word', // Breaks the word at the end of the line
                                overflowWrap: 'break-word', // Ensures long URLs etc., are broken to the next line
                            }}
                        >
                            <code>{curlCommand}</code>
                        </Typography>
                        <Tooltip title="Copy to clipboard" sx={{ alignSelf: 'center' }}>
                            <IconButton onClick={handleCopyToClipboard}>
                                <ContentCopyIcon />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                  </Box>
                  
                )}
            </Paper>
            <Button onClick={() => setShowCmdUpload(false)}>Back to File Upload</Button>
        </Container>
    );
}

export default CmdLineUpload;
