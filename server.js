const express = require('express');
const multer = require('multer');
const azureStorage = require('azure-storage');
const ejs = require('ejs');
const path = require('path');
require('dotenv').config();


const app = express();

const blobService = azureStorage.createBlobService(process.env.AZURE_STORAGE_ACCOUNT, process.env.AZURE_ACCESS_KEY);
const containerName = 'posts';

app.set('view engine', 'ejs');

app.use(express.static('./public'));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
}).single('markdownfile');

app.get('/', (req, res) => res.render('index'));

app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) return res.status(500).send(err);

        const originalFilename = path.basename(req.file.originalname, path.extname(req.file.originalname));
        const blobName = `${originalFilename}-${getFormattedDate()}${path.extname(req.file.originalname)}`;
        
        const stream = require('stream');
        const blobStream = blobService.createWriteStreamToBlockBlob(containerName, blobName, {
            contentSettings: { contentType: 'text/markdown' }
        });

        const readable = new stream.PassThrough();
        readable.end(req.file.buffer);
        readable.pipe(blobStream);

        blobStream.on('error', (error) => {
            return res.status(500).send(error);
        });

        blobStream.on('finish', () => {
            res.render('index', { msg: 'File uploaded to Azure Blob storage!' });
        });
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening. Access at http://localhost:${port}/`));

function getFormattedDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    const hour = ("0" + date.getHours()).slice(-2);
    const minute = ("0" + date.getMinutes()).slice(-2);
    const second = ("0" + date.getSeconds()).slice(-2);
    return `${year}${month}${day}-${hour}${minute}${second}`;
}

