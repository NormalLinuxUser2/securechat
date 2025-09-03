const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const openpgp = require('openpgp');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const crypto = require('crypto');

// Kill switch state - stored in memory only
let killSwitchActivated = false;
let killSwitchPasscode = process.env.KILL_SWITCH_PASSCODE || 'SECURE_CHAT_KILL_SWITCH_2024';

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Security middleware - MAXIMUM SECURITY
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Aggressive rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Very restrictive
    message: 'Rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: false
}));

app.use(express.json({ limit: '5mb' }));

// In-memory storage (NO PERSISTENT DATA)
const activeConnections = new Map();
const messageHistory = new Map();

// PGP Key Management
let serverPublicKey = null;
let serverPrivateKey = null;

// Initialize PGP keys from existing files
async function initializePGPKeys() {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Try to load existing PGP keys from PGP folder
        const pgpDir = path.join(__dirname, 'PGP');
        const publicKeyPath = path.join(pgpDir, '0x16BA41A8-pub.asc');
        const privateKeyPath = path.join(pgpDir, '0x16BA41A8-sec.asc');
        
        if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
            // Load existing keys
            serverPublicKey = fs.readFileSync(publicKeyPath, 'utf8');
            serverPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');
            console.log('🔐 Loaded existing PGP keys from PGP folder');
        } else {
            // Fallback: generate new keys if existing ones not found
            console.log('⚠️  Existing PGP keys not found, generating new ones...');
            const { privateKey, publicKey } = await openpgp.generateKey({
                type: 'ecc',
                curve: 'curve25519',
                userIDs: [{ name: 'SecureChat Server', email: 'server@securechat.local' }],
                passphrase: crypto.randomBytes(32).toString('hex')
            });
            
            serverPrivateKey = privateKey;
            serverPublicKey = publicKey;
            console.log('🔐 Generated new PGP keys');
        }
        
        console.log('✅ PGP keys initialized - Server ready');
    } catch (error) {
        console.error('❌ Failed to initialize PGP keys:', error);
        process.exit(1);
    }
}

// Base64 encoding/decoding utilities
function encodeBase64(data) {
    return Buffer.from(JSON.stringify(data)).toString('base64');
}

function decodeBase64(encodedData) {
    try {
        return JSON.parse(Buffer.from(encodedData, 'base64').toString());
    } catch (error) {
        return null;
    }
}

// Encrypt message with PGP
async function encryptMessage(message, recipientPublicKey) {
    try {
        const publicKey = await openpgp.readKey({ armoredKey: recipientPublicKey });
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: message }),
            encryptionKeys: publicKey
        });
        return encrypted;
    } catch (error) {
        throw new Error('Encryption failed');
    }
}

// Decrypt message with PGP
async function decryptMessage(encryptedMessage, privateKey) {
    try {
        const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: privateKey });
        const message = await openpgp.readMessage({ armoredMessage: encryptedMessage });
        const { data: decrypted } = await openpgp.decrypt({
            message,
            decryptionKeys: privateKeyObj
        });
        return decrypted;
    } catch (error) {
        throw new Error('Decryption failed');
    }
}

// KILL SWITCH FUNCTIONALITY
function activateKillSwitch() {
    killSwitchActivated = true;
    
    // Clear ALL in-memory data
    activeConnections.clear();
    messageHistory.clear();
    
    // Clear server keys
    serverPublicKey = null;
    serverPrivateKey = null;
    
    // Force garbage collection
    if (global.gc) {
        global.gc();
    }
    
    console.log('KILL SWITCH ACTIVATED - ALL DATA DESTROYED');
}

// Middleware to check kill switch
function checkKillSwitch(req, res, next) {
    if (killSwitchActivated) {
        return res.status(404).send('Not Found');
    }
    next();
}

// Routes
app.use(checkKillSwitch);

// Main endpoint - serves the chat interface
app.get('/', (req, res) => {
    if (killSwitchActivated) {
        return res.status(404).send('Not Found');
    }
    
    // Generate the chat interface dynamically (no HTML files)
    const chatInterface = generateChatInterface();
    res.send(chatInterface);
});

// Kill switch endpoint
app.post('/killswitch', (req, res) => {
    const { passcode } = req.body;
    
    if (passcode === killSwitchPasscode) {
        activateKillSwitch();
        res.json({ success: true, message: 'Kill switch activated - site terminated' });
    } else {
        res.status(403).json({ success: false, message: 'Invalid passcode' });
    }
});

// Get server public key
app.get('/publickey', (req, res) => {
    if (killSwitchActivated) {
        return res.status(404).send('Not Found');
    }
    
    if (serverPublicKey) {
        res.json({ publicKey: serverPublicKey });
    } else {
        res.status(500).json({ error: 'Server key not available' });
    }
});

// Generate chat interface dynamically
function generateChatInterface() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecureChat - Fort Knox Security</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Courier New', monospace; 
            background: #000; 
            color: #0f0; 
            height: 100vh;
            overflow: hidden;
        }
        .container { 
            max-width: 1000px; 
            margin: 0 auto; 
            height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 10px;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #0f0; 
            padding: 15px 0; 
            margin-bottom: 10px;
            background: #001100;
        }
        .header h1 { color: #00ff00; font-size: 24px; }
        .status { 
            text-align: center; 
            margin: 10px 0; 
            font-size: 12px;
            color: #0f0;
        }
        .chat-container { 
            flex: 1;
            border: 2px solid #0f0; 
            padding: 15px; 
            overflow-y: auto;
            background: #001100;
            margin-bottom: 10px;
            border-radius: 5px;
        }
        .message { 
            margin: 8px 0; 
            padding: 8px; 
            border-left: 3px solid #0f0;
            background: #000;
            border-radius: 3px;
        }
        .input-container { 
            display: flex; 
            gap: 10px;
            margin-bottom: 10px;
        }
        input, button { 
            background: #000; 
            color: #0f0; 
            border: 2px solid #0f0; 
            padding: 12px; 
            font-family: 'Courier New', monospace;
            font-size: 14px;
            border-radius: 3px;
        }
        input { 
            flex: 1; 
        }
        input:focus, button:focus {
            outline: none;
            border-color: #00ff00;
            box-shadow: 0 0 10px #00ff00;
        }
        button:hover { 
            background: #0f0; 
            color: #000; 
            cursor: pointer;
        }
        .kill-switch { 
            position: fixed; 
            top: 15px; 
            right: 15px; 
            background: #ff0000; 
            color: #fff; 
            border: 2px solid #ff0000; 
            padding: 8px 15px; 
            cursor: pointer;
            font-weight: bold;
            border-radius: 3px;
        }
        .kill-switch:hover {
            background: #fff;
            color: #ff0000;
        }
        .hidden { display: none; }
        .modal {
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.95); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            z-index: 1000;
        }
        .modal-content {
            background: #000; 
            border: 3px solid #ff0000; 
            padding: 30px; 
            text-align: center;
            border-radius: 5px;
            max-width: 400px;
        }
        .modal h2 { color: #ff0000; margin-bottom: 20px; }
        .modal p { color: #fff; margin-bottom: 15px; }
        .modal input {
            width: 100%;
            margin: 10px 0;
            background: #000;
            color: #fff;
            border: 2px solid #ff0000;
        }
        .modal button {
            margin: 5px;
            padding: 10px 20px;
        }
        .security-info {
            position: fixed;
            bottom: 10px;
            left: 10px;
            font-size: 10px;
            color: #0f0;
            background: #000;
            padding: 5px;
            border: 1px solid #0f0;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 SecureChat - Fort Knox Security</h1>
            <div class="status" id="status">Initializing secure connection...</div>
        </div>
        
        <div class="chat-container" id="chatContainer">
            <div class="message">🔐 Welcome to SecureChat - All messages are PGP encrypted with Curve25519 ECC</div>
            <div class="message">🛡️ No logs, no traces, no persistent storage - everything in memory only</div>
        </div>
        
        <div class="input-container">
            <input type="text" id="messageInput" placeholder="Type your encrypted message..." disabled>
            <button id="sendButton" disabled>Send Encrypted</button>
        </div>
    </div>
    
    <button class="kill-switch" id="killSwitchBtn">🚨 KILL SWITCH</button>
    
    <div id="killSwitchModal" class="hidden modal">
        <div class="modal-content">
            <h2>🚨 KILL SWITCH ACTIVATION</h2>
            <p>⚠️ WARNING: This will permanently destroy the site</p>
            <p>Enter passcode to activate kill switch:</p>
            <input type="password" id="killSwitchPasscode" placeholder="Enter kill switch passcode">
            <br>
            <button id="activateKillSwitch" style="background: #ff0000; color: #fff;">ACTIVATE KILL SWITCH</button>
            <button id="cancelKillSwitch" style="background: #333; color: #fff;">Cancel</button>
        </div>
    </div>

    <div class="security-info">
        🔒 PGP Encrypted | 🛡️ No Logs | 💾 Memory Only | 🚨 Kill Switch Ready
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script src="/app.js"></script>
</body>
</html>`;
}

// Initialize Socket.IO
const io = socketIo(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : "*",
        methods: ["GET", "POST"]
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    if (killSwitchActivated) {
        socket.disconnect();
        return;
    }
    
    console.log('New secure connection:', socket.id);
    activeConnections.set(socket.id, {
        id: socket.id,
        publicKey: null,
        connectedAt: new Date()
    });
    
    // Send server public key to client
    socket.emit('serverPublicKey', serverPublicKey);
    
    // Handle client public key
    socket.on('clientPublicKey', async (publicKey) => {
        if (killSwitchActivated) return;
        
        const connection = activeConnections.get(socket.id);
        if (connection) {
            connection.publicKey = publicKey;
            activeConnections.set(socket.id, connection);
        }
    });
    
    // Handle encrypted messages
    socket.on('encryptedMessage', async (data) => {
        if (killSwitchActivated) return;
        
        try {
            const { encryptedMessage, recipientId } = data;
            
            // Store encrypted message (NO DECRYPTION ON SERVER)
            const messageId = crypto.randomUUID();
            messageHistory.set(messageId, {
                id: messageId,
                encryptedMessage,
                senderId: socket.id,
                recipientId,
                timestamp: new Date(),
                delivered: false
            });
            
            // Forward to recipient
            if (recipientId && activeConnections.has(recipientId)) {
                io.to(recipientId).emit('encryptedMessage', {
                    id: messageId,
                    encryptedMessage,
                    senderId: socket.id,
                    timestamp: new Date()
                });
                
                // Mark as delivered
                const message = messageHistory.get(messageId);
                if (message) {
                    message.delivered = true;
                    messageHistory.set(messageId, message);
                }
            } else {
                // Broadcast to all if no specific recipient
                socket.broadcast.emit('encryptedMessage', {
                    id: messageId,
                    encryptedMessage,
                    senderId: socket.id,
                    timestamp: new Date()
                });
            }
            
        } catch (error) {
            socket.emit('error', 'Failed to process encrypted message');
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        if (killSwitchActivated) return;
        
        activeConnections.delete(socket.id);
        console.log('Secure connection closed:', socket.id);
    });
});

// Serve client-side JavaScript
app.get('/app.js', (req, res) => {
    if (killSwitchActivated) {
        return res.status(404).send('Not Found');
    }
    
    const clientJS = `
// SecureChat Client - Fort Knox Security
const socket = io();
let serverPublicKey = null;
let clientPrivateKey = null;
let clientPublicKey = null;

// DOM elements
const statusEl = document.getElementById('status');
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const killSwitchBtn = document.getElementById('killSwitchBtn');
const killSwitchModal = document.getElementById('killSwitchModal');
const killSwitchPasscode = document.getElementById('killSwitchPasscode');
const activateKillSwitch = document.getElementById('activateKillSwitch');
const cancelKillSwitch = document.getElementById('cancelKillSwitch');

// Initialize PGP keys for client
async function initializeClientKeys() {
    try {
        statusEl.textContent = '🔐 Generating PGP keys...';
        
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: 'ecc',
            curve: 'curve25519',
            userIDs: [{ name: 'Anonymous User', email: 'user@securechat.local' }],
            passphrase: crypto.getRandomValues(new Uint8Array(32)).join('')
        });
        
        clientPrivateKey = privateKey;
        clientPublicKey = publicKey;
        
        // Send public key to server
        socket.emit('clientPublicKey', publicKey);
        
        statusEl.textContent = '🔒 Connected - PGP Keys Generated - Ready for encrypted chat';
        messageInput.disabled = false;
        sendButton.disabled = false;
        
        addMessageToChat('🔐 Your PGP keys have been generated and you are now connected securely', true);
        
    } catch (error) {
        statusEl.textContent = '❌ Failed to generate PGP keys';
        console.error('Key generation failed:', error);
    }
}

// Encrypt message
async function encryptMessage(message, recipientPublicKey) {
    try {
        const publicKey = await openpgp.readKey({ armoredKey: recipientPublicKey });
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: message }),
            encryptionKeys: publicKey
        });
        return encrypted;
    } catch (error) {
        throw new Error('Encryption failed');
    }
}

// Decrypt message
async function decryptMessage(encryptedMessage, privateKey) {
    try {
        const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: privateKey });
        const message = await openpgp.readMessage({ armoredMessage: encryptedMessage });
        const { data: decrypted } = await openpgp.decrypt({
            message,
            decryptionKeys: privateKeyObj
        });
        return decrypted;
    } catch (error) {
        throw new Error('Decryption failed');
    }
}

// Add message to chat
function addMessageToChat(message, isOwn = false) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.style.color = isOwn ? '#00ff00' : '#0f0';
    messageEl.textContent = \`\${isOwn ? '🔒 You: ' : '🔐 User: '}\${message}\`;
    chatContainer.appendChild(messageEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Send encrypted message
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !serverPublicKey) return;
    
    try {
        const encrypted = await encryptMessage(message, serverPublicKey);
        
        socket.emit('encryptedMessage', {
            encryptedMessage: encrypted,
            recipientId: null // Broadcast to all
        });
        
        addMessageToChat(message, true);
        messageInput.value = '';
        
    } catch (error) {
        statusEl.textContent = '❌ Failed to encrypt message';
        console.error('Encryption error:', error);
    }
}

// Socket event handlers
socket.on('connect', () => {
    statusEl.textContent = '🔐 Connected - Generating PGP keys...';
    initializeClientKeys();
});

socket.on('serverPublicKey', (publicKey) => {
    serverPublicKey = publicKey;
});

socket.on('encryptedMessage', async (data) => {
    try {
        const decrypted = await decryptMessage(data.encryptedMessage, clientPrivateKey);
        addMessageToChat(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        addMessageToChat('🔒 [Encrypted message - decryption failed]');
    }
});

socket.on('disconnect', () => {
    statusEl.textContent = '❌ Disconnected';
    messageInput.disabled = true;
    sendButton.disabled = true;
});

socket.on('error', (error) => {
    statusEl.textContent = '❌ Error: ' + error;
});

// Event listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Kill switch functionality
killSwitchBtn.addEventListener('click', () => {
    killSwitchModal.classList.remove('hidden');
});

cancelKillSwitch.addEventListener('click', () => {
    killSwitchModal.classList.add('hidden');
    killSwitchPasscode.value = '';
});

activateKillSwitch.addEventListener('click', async () => {
    const passcode = killSwitchPasscode.value;
    if (!passcode) return;
    
    try {
        const response = await fetch('/killswitch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ passcode })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear the page
            document.body.innerHTML = '<div style="color: #ff0000; text-align: center; margin-top: 50px; font-size: 24px; font-family: Courier New;">🚨 SITE TERMINATED - KILL SWITCH ACTIVATED 🚨</div>';
        } else {
            alert('❌ Invalid kill switch passcode');
        }
        
    } catch (error) {
        console.error('Kill switch activation failed:', error);
    }
});

// Load OpenPGP library
const script = document.createElement('script');
script.src = 'https://unpkg.com/openpgp@5.10.0/dist/openpgp.min.js';
document.head.appendChild(script);
`;
    
    res.setHeader('Content-Type', 'application/javascript');
    res.send(clientJS);
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    await initializePGPKeys();
    
    server.listen(PORT, () => {
        console.log('🔒 SecureChat server running on port', PORT);
        console.log('🚨 Kill switch passcode:', killSwitchPasscode);
        console.log('🔐 All messages are PGP encrypted with Curve25519 ECC');
        console.log('🛡️ No logs stored - everything in memory only');
        console.log('💾 Memory-only operation - no persistent storage');
    });
}

// Graceful shutdown with kill switch
process.on('SIGINT', () => {
    console.log('🚨 Shutting down server - activating kill switch...');
    activateKillSwitch();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🚨 Shutting down server - activating kill switch...');
    activateKillSwitch();
    process.exit(0);
});

startServer().catch(console.error);
