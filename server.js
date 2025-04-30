const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('frontend'));

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/faculty', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'faculty', 'index.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'student', 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 