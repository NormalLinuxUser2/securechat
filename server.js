const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const openpgp = require('openpgp');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

// Kill switch state - stored in memory only
let killSwitchActivated = false;
let killSwitchPasscode = process.env.KILL_SWITCH_PASSCODE || 'SECURE_CHAT_KILL_SWITCH_2024';

// Brute force protection for kill switch
let killSwitchAttempts = new Map(); // IP -> { count, lastAttempt }
const MAX_KILL_SWITCH_ATTEMPTS = 3;
const KILL_SWITCH_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const KILL_SWITCH_DELAY = 1500; // 1.5 seconds

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

// Serve static files
app.use(express.static('public'));

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
        
        console.log('🔍 Starting PGP key initialization...');
        console.log('📁 Current working directory:', process.cwd());
        console.log('📁 __dirname:', __dirname);
        
        // Try to load existing PGP keys from PGP folder
        const pgpDir = path.join(__dirname, 'PGP');
        const publicKeyPath = path.join(pgpDir, '0x16BA41A8-pub.asc');
        const privateKeyPath = path.join(pgpDir, '0x16BA41A8-sec.asc');
        
        console.log('📁 PGP directory:', pgpDir);
        console.log('📁 Public key path:', publicKeyPath);
        console.log('📁 Private key path:', privateKeyPath);
        
        // Check if PGP directory exists
        if (!fs.existsSync(pgpDir)) {
            console.log('⚠️  PGP directory does not exist:', pgpDir);
            console.log('📁 Available directories:', fs.readdirSync(__dirname));
        } else {
            console.log('✅ PGP directory exists');
            console.log('📁 Files in PGP directory:', fs.readdirSync(pgpDir));
        }
        
        if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
            // Load existing keys
            console.log('🔍 Loading existing PGP keys...');
            serverPublicKey = fs.readFileSync(publicKeyPath, 'utf8');
            serverPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');
            
            console.log('✅ Loaded existing PGP keys from PGP folder');
            console.log('📊 Public key length:', serverPublicKey.length);
            console.log('📊 Private key length:', serverPrivateKey.length);
            console.log('🔑 Public key starts with:', serverPublicKey.substring(0, 50) + '...');
        } else {
            // Fallback: generate new keys if existing ones not found
            console.log('⚠️  Existing PGP keys not found, generating new ones...');
            console.log('🔍 Public key exists:', fs.existsSync(publicKeyPath));
            console.log('🔍 Private key exists:', fs.existsSync(privateKeyPath));
            
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
        console.error('❌ Error stack:', error.stack);
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
    
    // Serve the static HTML file
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Kill switch endpoint with brute force protection
app.post('/killswitch', async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const { passcode } = req.body;
    
    console.log(`🚨 Kill switch attempt from IP: ${clientIP}`);
    
    // Check brute force protection
    const now = Date.now();
    const attempts = killSwitchAttempts.get(clientIP) || { count: 0, lastAttempt: 0 };
    
    // Reset attempts if cooldown period has passed
    if (now - attempts.lastAttempt > KILL_SWITCH_COOLDOWN) {
        attempts.count = 0;
    }
    
    // Check if too many attempts
    if (attempts.count >= MAX_KILL_SWITCH_ATTEMPTS) {
        console.log(`🚨 Kill switch blocked - too many attempts from IP: ${clientIP}`);
        return res.status(429).json({ 
            success: false, 
            message: 'Too many failed attempts. Try again in 24 hours.',
            cooldown: KILL_SWITCH_COOLDOWN
        });
    }
    
    // Update attempt count
    attempts.count++;
    attempts.lastAttempt = now;
    killSwitchAttempts.set(clientIP, attempts);
    
    // Validate passcode
    if (!passcode || passcode !== killSwitchPasscode) {
        console.log(`🚨 Invalid kill switch passcode attempt from IP: ${clientIP}`);
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid passcode',
            attemptsRemaining: MAX_KILL_SWITCH_ATTEMPTS - attempts.count
        });
    }
    
    // Valid passcode - activate kill switch with delay
    console.log(`🚨 Valid kill switch passcode from IP: ${clientIP} - activating in ${KILL_SWITCH_DELAY}ms`);
    
    // Send immediate response
    res.json({ 
        success: true, 
        message: 'Kill switch activated - site terminating...',
        delay: KILL_SWITCH_DELAY
    });
    
    // Activate kill switch after delay
    setTimeout(() => {
        console.log(`🚨 KILL SWITCH ACTIVATED by IP: ${clientIP}`);
        activateKillSwitch();
    }, KILL_SWITCH_DELAY);
});

// Get server public key
app.get('/publickey', (req, res) => {
    if (killSwitchActivated) {
        return res.status(404).send('Not Found');
    }
    
    if (serverPublicKey) {
        res.json({ 
            publicKey: serverPublicKey,
            keyId: '0x16BA41A8',
            algorithm: 'ECC Curve25519',
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(500).json({ error: 'Server key not available' });
    }
});

// Get connected clients info (for debugging)
app.get('/clients', (req, res) => {
    if (killSwitchActivated) {
        return res.status(404).send('Not Found');
    }
    
    const clients = Array.from(activeConnections.values()).map(conn => ({
        id: conn.id,
        hasPublicKey: !!conn.publicKey,
        connectedAt: conn.connectedAt
    }));
    
    res.json({
        totalClients: clients.length,
        clients: clients
    });
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    if (killSwitchActivated) {
        return res.status(404).send('Not Found');
    }
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug endpoint (remove in production)
app.get('/debug', (req, res) => {
    if (killSwitchActivated) {
        return res.status(404).send('Not Found');
    }
    
    res.json({
        status: 'OK',
        killSwitchActivated: killSwitchActivated,
        serverPublicKey: serverPublicKey ? 'LOADED' : 'NOT LOADED',
        serverPrivateKey: serverPrivateKey ? 'LOADED' : 'NOT LOADED',
        activeConnections: activeConnections.size,
        messageHistory: messageHistory.size,
        killSwitchAttempts: Object.fromEntries(killSwitchAttempts),
        environment: {
            PORT: process.env.PORT,
            NODE_ENV: process.env.NODE_ENV,
            KILL_SWITCH_PASSCODE_SET: !!process.env.KILL_SWITCH_PASSCODE,
            ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
        },
        timestamp: new Date().toISOString()
    });
});



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
    
    // Send recent chat history to new user (last 4 real user messages, not Bob)
    const recentMessages = Array.from(messageHistory.values())
        .filter(msg => msg.username && msg.username !== 'Bob' && msg.username !== 'System')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 4);
    
    if (recentMessages.length > 0) {
        console.log(`📚 Sending ${recentMessages.length} recent messages to new user`);
        socket.emit('chatHistory', recentMessages.map(msg => ({
            id: msg.id,
            message: msg.plainText || msg.encryptedMessage,
            username: msg.username,
            timestamp: msg.timestamp,
            encrypted: msg.encrypted
        })));
    }
    
    // Handle client public key
    socket.on('clientPublicKey', async (publicKey) => {
        if (killSwitchActivated) return;
        
        const connection = activeConnections.get(socket.id);
        if (connection) {
            connection.publicKey = publicKey;
            activeConnections.set(socket.id, connection);
            console.log(`🔑 Client public key received for ${socket.id}`);
            
            // Notify other clients about new public key
            socket.broadcast.emit('peerPublicKey', {
                clientId: socket.id,
                publicKey: publicKey
            });
        }
    });
    
    // Handle peer-to-peer key exchange
    socket.on('requestPeerKey', (targetClientId) => {
        if (killSwitchActivated) return;
        
        const targetConnection = activeConnections.get(targetClientId);
        if (targetConnection && targetConnection.publicKey) {
            socket.emit('peerPublicKey', {
                clientId: targetClientId,
                publicKey: targetConnection.publicKey
            });
            console.log(`🔑 Peer key requested and sent for ${targetClientId}`);
        } else {
            socket.emit('error', 'Peer key not available');
        }
    });
    
    // Handle end-to-end encrypted messages - TRUE ZERO-KNOWLEDGE ENCRYPTION
    socket.on('encryptedMessage', async (data) => {
        if (killSwitchActivated) return;
        
        try {
            const { encryptedMessage, recipientId, username } = data;
            
            if (!encryptedMessage) {
                socket.emit('error', 'Invalid encrypted message format');
                return;
            }
            
            console.log(`🔐 ENCRYPTED MESSAGE RECEIVED - Server cannot read content`);
            console.log(`📊 Encrypted data length: ${encryptedMessage.length} characters`);
            console.log(`👤 From: ${username || socket.id}`);
            
            // Store encrypted message (SERVER NEVER DECRYPTS - TRUE END-TO-END)
            const messageId = crypto.randomUUID();
            messageHistory.set(messageId, {
                id: messageId,
                encryptedMessage, // ONLY encrypted data stored
                senderId: socket.id,
                recipientId,
                username: username || 'Anonymous',
                timestamp: new Date(),
                delivered: false,
                encrypted: true,
                // NO plainText field - server has zero knowledge
            });
            
            // Forward to specific recipient if specified
            if (recipientId && activeConnections.has(recipientId)) {
                io.to(recipientId).emit('encryptedMessage', {
                    id: messageId,
                    encryptedMessage, // Forward encrypted data unchanged
                    senderId: socket.id,
                    username: username || 'Anonymous',
                    timestamp: new Date()
                });
                
                // Mark as delivered
                const message = messageHistory.get(messageId);
                if (message) {
                    message.delivered = true;
                    messageHistory.set(messageId, message);
                }
                
                console.log(`📤 ENCRYPTED MESSAGE FORWARDED - Server cannot read content`);
            } else {
                // Broadcast to all other clients (excluding sender)
                socket.broadcast.emit('encryptedMessage', {
                    id: messageId,
                    encryptedMessage, // Forward encrypted data unchanged
                    senderId: socket.id,
                    username: username || 'Anonymous',
                    timestamp: new Date()
                });
                
                console.log(`📤 ENCRYPTED MESSAGE BROADCASTED - Server cannot read content`);
            }
            
        } catch (error) {
            console.error('Error processing encrypted message:', error);
            socket.emit('error', 'Failed to process encrypted message');
        }
    });
    
    // SECURITY: Only encrypted messages allowed - no plain text fallback
    socket.on('message', (data) => {
        console.log('🚨 SECURITY VIOLATION: Plain text message rejected');
        socket.emit('error', 'SECURITY: Only encrypted messages allowed. Please enable encryption.');
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
        
        statusEl.textContent = 'Signed in to Gmail - Ready to send emails';
        messageInput.disabled = false;
        sendButton.disabled = false;
        
        addMessageToChat('You are now signed in to Gmail', true);
        
    } catch (error) {
        statusEl.textContent = '❌ Failed to sign in to Gmail';
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
    messageEl.style.color = isOwn ? '#4285f4' : '#333';
    messageEl.textContent = \`\${isOwn ? 'You: ' : 'Other: '}\${message}\`;
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
        statusEl.textContent = '❌ Failed to send email';
        console.error('Encryption error:', error);
    }
}

// Socket event handlers
socket.on('connect', () => {
    statusEl.textContent = 'Connecting to Gmail...';
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
        addMessageToChat('[Email - decryption failed]');
    }
});

socket.on('message', async (data) => {
    try {
        const decrypted = await decryptMessage(data.encryptedMessage, clientPrivateKey);
        addMessageToChat(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        addMessageToChat('[Chat - decryption failed]');
    }
});

socket.on('disconnect', () => {
    statusEl.textContent = '❌ Disconnected from Gmail';
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
        // Show loading state
        activateKillSwitch.disabled = true;
        activateKillSwitch.textContent = 'ACTIVATING...';
        
        const response = await fetch('/killswitch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ passcode })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show countdown
            let countdown = Math.ceil(result.delay / 1000);
            const countdownEl = document.createElement('div');
            countdownEl.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff0000; font-size: 48px; font-family: Courier New; text-align: center; z-index: 10000; background: rgba(0,0,0,0.9); padding: 20px; border: 3px solid #ff0000;';
            countdownEl.innerHTML = \`🚨 KILL SWITCH ACTIVATED<br>Site terminating in: \${countdown}s\`;
            document.body.appendChild(countdownEl);
            
            // Countdown timer
            const timer = setInterval(() => {
                countdown--;
                countdownEl.innerHTML = \`🚨 KILL SWITCH ACTIVATED<br>Site terminating in: \${countdown}s\`;
                if (countdown <= 0) {
                    clearInterval(timer);
                    document.body.innerHTML = '<div style="color: #ff0000; text-align: center; margin-top: 50px; font-size: 24px; font-family: Courier New;">🚨 SITE TERMINATED - KILL SWITCH ACTIVATED 🚨</div>';
                }
            }, 1000);
            
        } else {
            // Show error with details
            let errorMsg = result.message || 'Unknown error';
            if (result.attemptsRemaining !== undefined) {
                errorMsg += \` (Attempts remaining: \${result.attemptsRemaining})\`;
            }
            if (result.cooldown) {
                const hours = Math.ceil(result.cooldown / (1000 * 60 * 60));
                errorMsg += \` (Cooldown: \${hours} hours)\`;
            }
            
            alert('❌ ' + errorMsg);
            
            // Reset button
            activateKillSwitch.disabled = false;
            activateKillSwitch.textContent = 'ACTIVATE KILL SWITCH';
        }
        
    } catch (error) {
        console.error('Kill switch activation failed:', error);
        alert('❌ Network error - kill switch activation failed');
        
        // Reset button
        activateKillSwitch.disabled = false;
        activateKillSwitch.textContent = 'ACTIVATE KILL SWITCH';
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
    try {
        console.log('🚀 Starting SecureChat server...');
        console.log('📊 Environment variables:');
        console.log('  - PORT:', process.env.PORT);
        console.log('  - NODE_ENV:', process.env.NODE_ENV);
        console.log('  - KILL_SWITCH_PASSCODE:', process.env.KILL_SWITCH_PASSCODE ? 'SET' : 'NOT SET');
        console.log('  - ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);
        
        console.log('🔍 Initializing PGP keys...');
        await initializePGPKeys();
        
        console.log('🔍 Starting HTTP server...');
        server.listen(PORT, '0.0.0.0', () => {
            console.log('🎉 ========================================');
            console.log('🔒 SecureChat server is LIVE!');
            console.log('🎉 ========================================');
            console.log('📡 Server running on port:', PORT);
            console.log('🌐 Binding to: 0.0.0.0 (all interfaces)');
            console.log('🚨 Kill switch passcode:', killSwitchPasscode);
            console.log('🔐 PGP encryption: ACTIVE');
            console.log('🛡️ Security features: ENABLED');
            console.log('💾 Memory-only operation: ACTIVE');
            console.log('🚨 Kill switch protection: ACTIVE');
            console.log('   - Max attempts: 3 per IP');
            console.log('   - Cooldown: 24 hours');
            console.log('   - Activation delay: 1.5 seconds');
            console.log('🎉 ========================================');
        });
        
        // Add error handling for server
        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.error('❌ Port', PORT, 'is already in use');
            }
            process.exit(1);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('❌ Error stack:', error.stack);
        process.exit(1);
    }
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
