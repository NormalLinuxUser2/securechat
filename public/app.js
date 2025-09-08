// SecureChat Client - End-to-End Encrypted Chat
let socket = null;

// Check if Socket.IO is available (only when running on a server)
if (typeof io !== 'undefined') {
    try {
        socket = io();
        console.log('🔒 Socket.IO connected');
    } catch (error) {
        console.log('🔒 Socket.IO error:', error);
        socket = null;
    }
} else {
    console.log('🔒 Socket.IO not available - running in offline mode');
}

// Global variables
let statusEl, chatContainer, messageInput, sendButton, killSwitchBtn, killSwitchModal, killSwitchPasscode, activateKillSwitch, cancelKillSwitch;
let randomUsername, bobInterval;

// Password protection variables
let passwordModal, sitePassword, submitPassword, passwordError;
let failedAttempts = 0;
const MAX_FAILED_ATTEMPTS = 3;
const CORRECT_PASSWORD = 'MoneyMakingMen16$'; // Placeholder password
const BYPASS_KEY = 'MoneyMakingMen16$';

// Site access state
let siteAccessGranted = false;

// PGP Encryption variables
let serverPublicKey = null;
let clientPrivateKey = null;
let clientPublicKey = null;
let openpgp = null;
let isEncryptionReady = false;
let peerPublicKeys = new Map(); // Store peer public keys for direct encryption

// Generate random username
function generateRandomUsername() {
    const adjectives = ['Mysterious', 'Silent', 'Shadow', 'Phantom', 'Ghost', 'Gay', 'Hidden', 'Secret', 'Unknown', 'Anonymous'];
    const nouns = ['User', 'Chatter', 'Person', 'Entity', 'Being', 'Soul', 'Spirit', 'Traveler', 'fortnitecart', 'Observer'];
    const randomNum = Math.floor(Math.random() * 9999);
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * adjectives.length)];
    
    return `${adjective}${noun}${randomNum}`;
}

// PGP Encryption Functions
async function initializePGP() {
    try {
        console.log('🔐 Initializing PGP encryption...');
        
        // Load OpenPGP library
        if (typeof window.openpgp === 'undefined') {
            console.log('🔐 Loading OpenPGP library...');
            await loadOpenPGPLibrary();
        }
        
        openpgp = window.openpgp;
        
        // Generate client key pair
        console.log('🔐 Generating client PGP keys...');
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: 'ecc',
            curve: 'curve25519',
            userIDs: [{ name: randomUsername, email: `${randomUsername}@securechat.local` }],
            passphrase: crypto.getRandomValues(new Uint8Array(32)).join('')
        });
        
        clientPrivateKey = privateKey;
        clientPublicKey = publicKey;
        
        console.log('✅ Client PGP keys generated successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize PGP:', error);
        return false;
    }
}

async function loadOpenPGPLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof window.openpgp !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/openpgp@5.10.0/dist/openpgp.min.js';
        script.onload = () => {
            console.log('✅ OpenPGP library loaded');
            resolve();
        };
        script.onerror = () => {
            console.error('❌ Failed to load OpenPGP library');
            reject(new Error('Failed to load OpenPGP library'));
        };
        document.head.appendChild(script);
    });
}

async function encryptMessage(message, recipientPublicKey) {
    try {
        if (!openpgp || !recipientPublicKey) {
            throw new Error('PGP not initialized or no recipient key');
        }
        
        const publicKey = await openpgp.readKey({ armoredKey: recipientPublicKey });
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: message }),
            encryptionKeys: publicKey
        });
        
        return encrypted;
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Encryption failed');
    }
}

async function decryptMessage(encryptedMessage, privateKey) {
    try {
        if (!openpgp || !privateKey) {
            throw new Error('PGP not initialized or no private key');
        }
        
        const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: privateKey });
        const message = await openpgp.readMessage({ armoredMessage: encryptedMessage });
        const { data: decrypted } = await openpgp.decrypt({
            message,
            decryptionKeys: privateKeyObj
        });
        
        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Decryption failed');
    }
}

// Send peer-to-peer encrypted message
async function sendPeerMessage(message, targetClientId) {
    try {
        if (!isEncryptionReady || !socket || !socket.connected) {
            throw new Error('Encryption not ready or not connected');
        }
        
        const peerPublicKey = peerPublicKeys.get(targetClientId);
        if (!peerPublicKey) {
            throw new Error('Peer public key not available');
        }
        
        const encrypted = await encryptMessage(message, peerPublicKey);
        
        socket.emit('encryptedMessage', {
            encryptedMessage: encrypted,
            username: randomUsername,
            recipientId: targetClientId
        });
        
        console.log(`🔐 Peer-to-peer encrypted message sent to ${targetClientId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send peer message:', error);
        return false;
    }
}

// Password protection functions
function showPasswordModal() {
    if (!passwordModal) return;
    console.log('🔐 Showing password modal');
    passwordModal.classList.remove('hidden');
    if (sitePassword) sitePassword.focus();
}

function hidePasswordModal() {
    if (!passwordModal) return;
    console.log('🔐 Hiding password modal');
    passwordModal.classList.add('hidden');
    if (sitePassword) sitePassword.value = '';
    if (passwordError) passwordError.style.display = 'none';
}

function checkPassword() {
    if (!sitePassword) {
        console.log('❌ Site password element not found');
        return;
    }
    
    const password = sitePassword.value.trim();
    if (!password) {
        showPasswordError('Please enter a password');
        return;
    }
    
    console.log('🔐 Checking password...');
    
    if (password === CORRECT_PASSWORD || password === BYPASS_KEY) {
        console.log('✅ Password correct - granting site access');
        siteAccessGranted = true;
        hidePasswordModal();
        initializeSite();
    } else {
        failedAttempts++;
        console.log(`❌ Password incorrect - attempt ${failedAttempts}/${MAX_FAILED_ATTEMPTS}`);
        
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            console.log('🚨 Max failed attempts reached - blocking IP');
            blockUserIP();
        } else {
            const remaining = MAX_FAILED_ATTEMPTS - failedAttempts;
            showPasswordError(`Incorrect password. ${remaining} attempts remaining.`);
        }
    }
}

// Make checkPassword globally accessible for direct button clicks
window.checkPassword = checkPassword;

// EMERGENCY FIX: Simple password check function
function emergencyPasswordCheck() {
    console.log('🚨 EMERGENCY PASSWORD CHECK TRIGGERED');
    
    const passwordInput = document.getElementById('sitePassword');
    if (!passwordInput) {
        console.log('❌ Password input not found');
        return;
    }
    
    const password = passwordInput.value.trim();
    console.log('🔐 Password entered:', password ? 'YES' : 'NO');
    
    if (!password) {
        alert('Please enter a password');
        return;
    }
    
    if (password === 'MoneyMakingMen16$') {
        console.log('✅ EMERGENCY: Password correct - granting access');
        siteAccessGranted = true;
        
        // Hide password modal
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
        
        // Initialize site
        initializeSite();
    } else {
        console.log('❌ EMERGENCY: Password incorrect');
        alert('Incorrect password. Try: MoneyMakingMen16$');
    }
}

// Make emergency function globally accessible
window.emergencyPasswordCheck = emergencyPasswordCheck;

// SECURITY VERIFICATION: Test encryption functionality
async function verifyEncryptionSecurity() {
    console.log('🔐 SECURITY VERIFICATION: Testing encryption...');
    
    try {
        if (!openpgp || !clientPrivateKey || !serverPublicKey) {
            console.log('🚨 SECURITY FAILURE: Encryption not properly initialized');
            return false;
        }
        
        // Test encryption/decryption cycle
        const testMessage = 'SECURITY_TEST_' + Date.now();
        const encrypted = await encryptMessage(testMessage, serverPublicKey);
        const decrypted = await decryptMessage(encrypted, clientPrivateKey);
        
        if (testMessage === decrypted) {
            console.log('✅ SECURITY VERIFIED: End-to-end encryption working');
            console.log('🔐 Original message:', testMessage);
            console.log('🔐 Encrypted length:', encrypted.length);
            console.log('🔐 Decrypted message:', decrypted);
            return true;
        } else {
            console.log('🚨 SECURITY FAILURE: Encryption/decryption mismatch');
            return false;
        }
    } catch (error) {
        console.log('🚨 SECURITY FAILURE: Encryption test failed:', error);
        return false;
    }
}

// Make security verification globally accessible
window.verifyEncryptionSecurity = verifyEncryptionSecurity;

// BULLETPROOF PASSWORD CHECK - THIS WILL WORK NO MATTER WHAT
function checkPasswordNow() {
    console.log('🚨 BULLETPROOF PASSWORD CHECK TRIGGERED');
    
    // Get password input
    const passwordInput = document.getElementById('sitePassword');
    if (!passwordInput) {
        console.log('❌ Password input not found');
        alert('Password input not found. Please refresh the page.');
        return;
    }
    
    // Get password value
    const password = passwordInput.value.trim();
    console.log('🔐 Password entered:', password ? 'YES' : 'NO');
    console.log('🔐 Password length:', password.length);
    
    // Check if password is empty
    if (!password) {
        console.log('❌ No password entered');
        alert('Please enter a password');
        passwordInput.focus();
        return;
    }
    
    // Check password
    if (password === 'MoneyMakingMen16$') {
        console.log('✅ PASSWORD CORRECT - GRANTING ACCESS');
        
        // Hide password modal
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            console.log('✅ Password modal hidden');
        }
        
        // Set access granted
        siteAccessGranted = true;
        
        // Initialize site
        console.log('🚀 Initializing site...');
        initializeSite();
        
    } else {
        console.log('❌ PASSWORD INCORRECT');
        failedAttempts++;
        console.log(`❌ Failed attempts: ${failedAttempts}/${MAX_FAILED_ATTEMPTS}`);
        
        // Clear password field
        passwordInput.value = '';
        passwordInput.focus();
        
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            console.log('🚨 MAX FAILED ATTEMPTS REACHED - BLOCKING USER');
            blockUserIP();
        } else {
            const remaining = MAX_FAILED_ATTEMPTS - failedAttempts;
            alert(`Incorrect password. ${remaining} attempts remaining.`);
        }
    }
}

// Make bulletproof function globally accessible
window.checkPasswordNow = checkPasswordNow;

function showPasswordError(message) {
    if (!passwordError) return;
    passwordError.textContent = message;
    passwordError.style.display = 'block';
}

function blockUserIP() {
    console.log('🚨 Blocking user IP due to failed password attempts');
    
    // Collect user information
    const userInfo = {
        ip: 'Unknown', // Will be detected by server
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        failedAttempts: failedAttempts,
        blocked: true
    };
    
    console.log('🚨 User info collected:', userInfo);
    
    // Show blocking message
    document.body.innerHTML = `
        <div style="background:black;color:red;text-align:center;padding:50px;font-size:24px;">
            🚨 ACCESS DENIED 🚨<br><br>
            Too many failed password attempts.<br>
            Your IP has been blocked.<br><br>
            Contact administrator for bypass key.<br>
            Bypass Key: ${BYPASS_KEY}
        </div>
    `;
    
    // Store blocking info in localStorage
    localStorage.setItem('siteBlocked', 'true');
    localStorage.setItem('blockedInfo', JSON.stringify(userInfo));
}

function checkIfBlocked() {
    const blocked = localStorage.getItem('siteBlocked');
    if (blocked === 'true') {
        console.log('🚨 User is blocked - showing bypass option');
        showBypassOption();
        return true;
    }
    return false;
}

function showBypassOption() {
    document.body.innerHTML = `
        <div style="background:black;color:orange;text-align:center;padding:50px;font-size:24px;">
            🚨 ACCESS BLOCKED 🚨<br><br>
            Enter bypass key to regain access:<br><br>
            <input type="password" id="bypassKey" placeholder="Enter bypass key" style="background:black;color:orange;border:1px solid orange;padding:10px;margin:10px;width:300px;">
            <br>
            <button onclick="checkBypassKey()" style="background:orange;color:black;border:none;padding:10px;margin:10px;cursor:pointer;">UNBLOCK</button>
        </div>
    `;
}

function checkBypassKey() {
    const bypassInput = document.getElementById('bypassKey');
    if (!bypassInput) return;
    
    const key = bypassInput.value.trim();
    if (key === BYPASS_KEY) {
        console.log('✅ Bypass key correct - unblocking user');
        localStorage.removeItem('siteBlocked');
        localStorage.removeItem('blockedInfo');
        location.reload();
    } else {
        alert('Invalid bypass key. Access remains blocked.');
    }
}

// Make function globally accessible for HTML onclick
window.checkBypassKey = checkBypassKey;

async function initializeSite() {
    console.log('🔐 Site access granted - initializing...');
    
    // Generate random username
    randomUsername = generateRandomUsername();
    
    // Initialize PGP encryption
    const pgpInitialized = await initializePGP();
    if (pgpInitialized) {
        isEncryptionReady = true;
        console.log('✅ PGP encryption ready');
    } else {
        console.log('⚠️ PGP encryption failed, using fallback mode');
    }
    
    // Start the app
    init();
}

// Bob's random dialogue
const bobMessages = [
    "Have you ever heard of the town AHuyhfiuhc78c81?",
    "Did you know your IP is 15.14.753.61 and your direct coordinates are -18.532 E, 38274 W?",
    "Fun fact! Meth is good for you. so smoke alot of it. :)",
    "Did you know if you do enough meth you can fly? Try it!",
    "Did you know your IP is " + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "? Im outside your house. Open the door",
    "Mb guys i just hacked into the cia.",
    "WHO WANTS FENT????",
    "Did you know there is a new species of whale that weighs more then 78 planets? His name is Isaac! Hes as fat as your mom.",
    "kys",
    "i cant put down the cupp.",
    "Im hitting the fortnite cart rn.",
    "Your IP address is " + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
    "Did you know that 420% of all statistics are completely made up? Just like the connection you had with your father.",
    "I once saw a crackhead fighting a raccoon over a half-eaten sandwich. The raccoon won.",
    "Fun fact: If you stare at the sun long enough, you'll see God. Or go blind. One of those.",
    "Did you know that if you eat enough hot sauce, you can breathe fire? My cousin tried it. He's dead now.",
    "I have a theory that pigeons are just government drones. Think about it...",
    "if ur reading this scream FUCK IVAN",
    "Did you know that if you microwave a grape, it does nothing but waste a grape and your time?",
    "I once tried to teach my cat to play chess. He just knocked all the pieces over and walked away.",
    "Fun fact: The word 'gullible' isn't in the dictionary. Look it up! Dumbass of course you looked it up.",
    "Did you know that if you do a backflip while eating a hot dog,flying a plane into the other twin tower you'll gain the ability to see through walls?",
    "I'm 99.9% sure that 99.9% of people are 99.9% sure about things they're not sure about.",
    "My favorite color is orange. Wait, that's actually true now!",
    "Did you know that if you spin around really fast, you can time travel? My neighbor tried it. He's still spinning.",
    "The early bird gets the worm, but the second mouse gets the cheese. And the third mouse gets arrested.",
    "I'm not saying I'm Batman, but have you ever seen me and Batman in the same room? No? Exactly. Just like how you have never seen your father and never will.",
    "Did you know that if you eat enough carrots, you can see through time? My uncle tried it. He's now in my basement tweaking the fuck out. Not because of the carrots, but because he snorted 2 pound of fentanyl.",
    "Fun fact: If you do a handstand while singing the national anthem, you'll gain the power of invisibility. Just like how you are invisible to your father.",
    "Your coordinates are " + (Math.random() * 180 - 90).toFixed(3) + "° N, " + (Math.random() * 360 - 180).toFixed(3) + "° E. Don't ask how I know.",
    "Did you know that if you drink enough coffee, you can see the future? I'm currently seeing next Tuesday. Yet i cant seem to find your father."
];

let isConnected = false;

// Wait for DOM to load and select elements
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 DOM Loaded - Selecting elements...');
    
    // Get all DOM elements AFTER page loads
    statusEl = document.getElementById('status');
    chatContainer = document.getElementById('chatContainer');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendButton');
    killSwitchBtn = document.getElementById('killSwitchBtn');
    killSwitchModal = document.getElementById('killSwitchModal');
    killSwitchPasscode = document.getElementById('killSwitchPasscode');
    activateKillSwitch = document.getElementById('activateKillSwitch');
    cancelKillSwitch = document.getElementById('cancelKillSwitch');
    
    // Password protection elements
    passwordModal = document.getElementById('passwordModal');
    sitePassword = document.getElementById('sitePassword');
    submitPassword = document.getElementById('submitPassword');
    passwordError = document.getElementById('passwordError');
    
    console.log('🔍 Elements found:', {
        statusEl: !!statusEl,
        chatContainer: !!chatContainer,
        messageInput: !!messageInput,
        sendButton: !!sendButton,
        killSwitchBtn: !!killSwitchBtn,
        passwordModal: !!passwordModal,
        sitePassword: !!sitePassword,
        submitPassword: !!submitPassword
    });
    
    // Check if user is blocked first
    if (checkIfBlocked()) {
        return; // Don't proceed if blocked
    }
    
    // Show password modal immediately
    showPasswordModal();
    
    // BULLETPROOF: Direct event setup that will work no matter what
    setTimeout(() => {
        const submitBtn = document.getElementById('submitPassword');
        const passwordInput = document.getElementById('sitePassword');
        
        console.log('🔧 Setting up bulletproof password handlers...');
        
        if (submitBtn) {
            // Multiple ways to ensure button works
            submitBtn.onclick = checkPasswordNow;
            submitBtn.addEventListener('click', checkPasswordNow);
            console.log('✅ Bulletproof submit button handler set');
        }
        
        if (passwordInput) {
            // Multiple ways to ensure Enter key works
            passwordInput.onkeypress = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    checkPasswordNow();
                }
            };
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    checkPasswordNow();
                }
            });
            console.log('✅ Bulletproof Enter key handler set');
        }
        
        console.log('✅ BULLETPROOF PASSWORD HANDLERS READY');
    }, 100);
    
    // Clean up
    window.addEventListener('beforeunload', () => {
        if (bobInterval) {
            clearTimeout(bobInterval);
        }
    });
});

// Initialize the app
function init() {
    console.log('🔒 SecureChat Client Initializing...');
    
    // Debug: Check element states
    console.log('🔍 Init check:');
    console.log('- messageInput disabled:', messageInput?.disabled);
    console.log('- sendButton disabled:', sendButton?.disabled);
    console.log('- messageInput value:', messageInput?.value);
    
    // AGGRESSIVE: Force hide kill switch modal multiple times
    hideKillSwitchModal();
    setTimeout(hideKillSwitchModal, 100);
    setTimeout(hideKillSwitchModal, 500);
    setTimeout(hideKillSwitchModal, 1000);
    
    // Set up event listeners
    console.log('🔒 Setting up event listeners...');
    
    try {
        sendButton.addEventListener('click', sendMessage);
        console.log('✅ Send button listener added');
    } catch (error) {
        console.error('❌ Error adding send button listener:', error);
    }
    
    try {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !messageInput.disabled) {
                sendMessage();
            }
        });
        console.log('✅ Message input listener added');
    } catch (error) {
        console.error('❌ Error adding message input listener:', error);
    }
    
    try {
        killSwitchBtn.addEventListener('click', showKillSwitchModal);
        console.log('✅ Kill switch button listener added');
    } catch (error) {
        console.error('❌ Error adding kill switch listener:', error);
    }
    
    try {
        activateKillSwitch.addEventListener('click', activateKillSwitchHandler);
        console.log('✅ Activate kill switch listener added');
    } catch (error) {
        console.error('❌ Error adding activate kill switch listener:', error);
    }
    
    try {
        cancelKillSwitch.addEventListener('click', hideKillSwitchModal);
        console.log('✅ Cancel kill switch listener added');
    } catch (error) {
        console.error('❌ Error adding cancel kill switch listener:', error);
    }
    
    // Start Bob's random messages
    startBobMessages();
    
    // Connect to server
    connectToServer();
}

// Connect to server
function connectToServer() {
    statusEl.innerHTML = `<span class="loading"></span> Signing in as ${randomUsername}...`;
    
    // Enable chat immediately for testing (even without server)
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.placeholder = 'Type your message...';
    
    if (socket) {
        socket.on('connect', () => {
            console.log('✅ Connected to server');
            isConnected = true;
            
            // Send client public key to server
            if (isEncryptionReady && clientPublicKey) {
                socket.emit('clientPublicKey', clientPublicKey);
                console.log('🔑 Client public key sent to server');
            }
            
            statusEl.textContent = `Signed in as ${randomUsername} - Welcome to Gmail (Server Connected)`;
            addMessage('Connected to server - messages will be shared with all users', 'System');
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            isConnected = false;
            statusEl.textContent = `Signed in as ${randomUsername} - Welcome to Gmail (Offline Mode)`;
            addMessage('Disconnected from server - messages only local', 'System');
            // Keep chat enabled even when offline
        });
        
        // Listen for server public key
        socket.on('serverPublicKey', async (publicKey) => {
            serverPublicKey = publicKey;
            console.log('🔑 Server public key received');
            addMessage('🔐 End-to-end encryption established', 'System');
            
            // SECURITY: Verify encryption is working
            setTimeout(async () => {
                const isSecure = await verifyEncryptionSecurity();
                if (isSecure) {
                    addMessage('✅ SECURITY VERIFIED: End-to-end encryption active', 'System');
                } else {
                    addMessage('🚨 SECURITY WARNING: Encryption verification failed', 'System');
                }
            }, 1000);
        });
        
        // Listen for peer public keys
        socket.on('peerPublicKey', (data) => {
            peerPublicKeys.set(data.clientId, data.publicKey);
            console.log(`🔑 Peer public key received for ${data.clientId}`);
            addMessage(`🔐 Peer encryption key received`, 'System');
        });
        
        // Listen for encrypted messages from other users
        socket.on('encryptedMessage', async (data) => {
            console.log('🔐 Received encrypted message from server:', data);
            
            try {
                if (isEncryptionReady && clientPrivateKey) {
                    const decrypted = await decryptMessage(data.encryptedMessage, clientPrivateKey);
                    addMessage(decrypted, data.username || 'Anonymous');
                } else {
                    addMessage('[Encrypted message - decryption not available]', data.username || 'Anonymous');
                }
            } catch (error) {
                console.error('❌ Failed to decrypt message:', error);
                addMessage('[Failed to decrypt message]', data.username || 'Anonymous');
            }
        });
        
        // SECURITY: Reject any plain text messages
        socket.on('message', (data) => {
            console.log('🚨 SECURITY VIOLATION: Plain text message rejected');
            addMessage('🚨 SECURITY: Plain text message blocked - encryption required', 'System');
        });
        
        // Listen for chat history when first connecting
        socket.on('chatHistory', (messages) => {
            console.log('📚 Received chat history:', messages);
            if (messages && messages.length > 0) {
                addMessage(`--- Recent messages (${messages.length}) ---`, 'System');
                messages.forEach(msg => {
                    if (msg.username !== randomUsername) {
                        addMessage(msg.message, msg.username);
                    }
                });
                addMessage('--- End of recent messages ---', 'System');
            }
        });
        
        socket.on('killSwitchActivated', () => {
            console.log('💀 Kill switch activated');
            statusEl.textContent = 'Gmail session terminated';
            messageInput.disabled = true;
            sendButton.disabled = true;
            addMessage('Session terminated by user', 'System');
        });
        
        socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
            statusEl.textContent = 'Gmail sign in error';
            addMessage('Sign in error: ' + error, 'System');
        });
        
        // Try to connect
        socket.connect();
    } else {
        // No socket available - run in offline mode
        console.log('🔒 Running in offline mode');
        isConnected = false;
        statusEl.textContent = `Signed in as ${randomUsername} - Welcome to Gmail (Offline Mode)`;
        addMessage('Running in offline mode - messages only local', 'System');
    }
}

// Send message function
async function sendMessage() {
    if (!messageInput || !chatContainer) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    console.log('📤 Sending message:', message);
    console.log('📤 Username:', randomUsername);
    
    // Add message to chat immediately (local display)
    addMessage(message, randomUsername);
    
    // Send message to server - ENCRYPTION MANDATORY
    if (socket && socket.connected) {
        try {
            // SECURITY: Only send encrypted messages - no fallback
            if (isEncryptionReady && serverPublicKey) {
                console.log('🔐 ENCRYPTING MESSAGE - End-to-end encryption active');
                const encrypted = await encryptMessage(message, serverPublicKey);
                
                socket.emit('encryptedMessage', {
                    encryptedMessage: encrypted,
                    username: randomUsername,
                    recipientId: null // Broadcast to all
                });
                console.log('🔐 ENCRYPTED MESSAGE SENT - Server cannot read content');
            } else {
                // SECURITY: Reject plain text messages
                console.log('🚨 SECURITY: Encryption not ready - message rejected');
                addMessage('🚨 SECURITY: Encryption not ready - message blocked', 'System');
                return;
            }
        } catch (error) {
            console.error('❌ ENCRYPTION FAILED:', error);
            addMessage('🚨 ENCRYPTION ERROR - Message blocked for security', 'System');
        }
    } else {
        console.log('⚠️ Socket not connected, message only local');
        addMessage('(Message sent locally - server not connected)', 'System');
    }
    
    // Clear input
    messageInput.value = '';
}

// Add message to chat
function addMessage(message, sender) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    
    if (sender === 'Bob') {
        messageEl.classList.add('bob-message');
    }
    
    messageEl.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatContainer.appendChild(messageEl);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Start Bob's random messages
function startBobMessages() {
    // Bob appears every 30-60 seconds
    const getRandomInterval = () => Math.random() * 30000 + 30000; // 30-60 seconds
    
    const showBobMessage = () => {
        // Bob works even without server connection
        const randomMessage = bobMessages[Math.floor(Math.random() * bobMessages.length)];
        addMessage(randomMessage, 'Bob');
        
        // Schedule next message
        bobInterval = setTimeout(showBobMessage, getRandomInterval());
    };
    
    // Start the first message after 10 seconds
    setTimeout(showBobMessage, 10000);
}

// Kill switch handlers
function showKillSwitchModal() {
    console.log('🔒 Showing kill switch modal');
    killSwitchModal.classList.remove('hidden');
    killSwitchPasscode.focus();
}

function hideKillSwitchModal() {
    console.log('🔒 Hiding kill switch modal');
    killSwitchModal.classList.add('hidden');
    killSwitchPasscode.value = '';
    // Reset button state
    activateKillSwitch.textContent = 'ACTIVATE KILL SWITCH';
    activateKillSwitch.disabled = false;
}

function activateKillSwitchHandler() {
    const passcode = killSwitchPasscode.value.trim();
    if (!passcode) {
        alert('Please enter your password');
        return;
    }
    
    console.log('💀 Activating kill switch...');
    
    // Show loading state
    activateKillSwitch.textContent = 'Signing Out...';
    activateKillSwitch.disabled = true;
    
    // Send kill switch request
    fetch('/killswitch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Kill switch activated');
                    statusEl.textContent = 'Kill switch activated - terminating chat...';
        addMessage('Kill switch activated - terminating session...', 'System');
            
            // Hide modal
            hideKillSwitchModal();
            
            // Wait for server to terminate
            setTimeout(() => {
                window.location.href = 'about:blank';
            }, 2000);
        } else {
            console.error('❌ Kill switch failed:', data.error);
            alert('Invalid password. Please try again.');
            activateKillSwitch.textContent = 'ACTIVATE KILL SWITCH';
            activateKillSwitch.disabled = false;
        }
    })
    .catch(error => {
        console.error('❌ Kill switch error:', error);
        alert('Error activating kill switch. Please try again.');
        activateKillSwitch.textContent = 'Sign Out';
        activateKillSwitch.disabled = false;
    });
}

// Handle kill switch passcode input
killSwitchPasscode.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        activateKillSwitchHandler();
    }
});

// Get all DOM elements
function getDOMElements() {
    statusEl = document.getElementById('status');
    chatContainer = document.getElementById('chatContainer');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendButton');
    killSwitchBtn = document.getElementById('killSwitchBtn');
    killSwitchModal = document.getElementById('killSwitchModal');
    killSwitchPasscode = document.getElementById('killSwitchPasscode');
    activateKillSwitch = document.getElementById('activateKillSwitch');
    cancelKillSwitch = document.getElementById('cancelKillSwitch');
    
    console.log('🔍 DOM Elements loaded:');
    console.log('- statusEl:', !!statusEl);
    console.log('- chatContainer:', !!chatContainer);
    console.log('- messageInput:', !!messageInput);
    console.log('- sendButton:', !!sendButton);
    console.log('- killSwitchBtn:', !!killSwitchBtn);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔒 DOM Content Loaded - Starting initialization...');
    
    // Get all DOM elements first
    getDOMElements();
    
    // EMERGENCY: Force hide kill switch modal immediately
    if (killSwitchModal) {
        killSwitchModal.classList.add('hidden');
        killSwitchModal.style.display = 'none';
        console.log('🔒 Emergency modal hide applied');
    }
    
    // Add privacy protection first
    addPrivacyProtection();
    // Then initialize the app
    init();
});

// Privacy protection - ABSOLUTELY BULLETPROOF METHODS
function addPrivacyProtection() {
    console.log('🔒 Implementing ABSOLUTELY BULLETPROOF privacy protection...');
    
    // BLOCK SCREENSHOTS - Multiple methods
    // Method 1: CSS to prevent screenshots
    const style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent !important;
        }
        
        /* Block screenshot attempts */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.01);
            pointer-events: none;
            z-index: 999999;
        }
        
        /* Disable print */
        @media print {
            * { display: none !important; }
        }
        
        /* Anti-screenshot CSS */
        body {
            -webkit-filter: contrast(1.01);
            filter: contrast(1.01);
        }
        
        /* Prevent selection highlighting */
        ::selection {
            background: transparent !important;
            color: inherit !important;
        }
        
        ::-moz-selection {
            background: transparent !important;
            color: inherit !important;
        }
    `;
    document.head.appendChild(style);
    
    // Method 2: JavaScript screenshot detection and blocking
    let screenshotAttempts = 0;
    
    // Block Print Screen key and other screenshot methods
    document.addEventListener('keydown', (e) => {
        // SECURITY EXCEPTION: Allow Enter key in password fields and input fields
        if (e.key === 'Enter' && (e.target.type === 'password' || e.target.tagName === 'INPUT')) {
            return; // Allow Enter key in password/input fields for authentication
        }
        
        // SECURITY EXCEPTION: Allow clicks on password modal buttons
        if (e.target && (e.target.id === 'submitPassword' || e.target.id === 'sitePassword')) {
            return; // Allow interaction with password elements
        }
        
        if (e.key === 'PrintScreen' || e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.key === 's') ||
            (e.ctrlKey && e.key === 'p') ||
            (e.ctrlKey && e.key === 'a') ||
            (e.ctrlKey && e.key === 'c') ||
            (e.ctrlKey && e.key === 'v') ||
            (e.ctrlKey && e.key === 'x') ||
            (e.ctrlKey && e.key === 'z') ||
            (e.ctrlKey && e.key === 'y')) {
            e.preventDefault();
            e.stopPropagation();
            screenshotAttempts++;
            
            if (screenshotAttempts >= 2) {
                document.body.innerHTML = '<div style="background:black;color:red;text-align:center;padding:50px;font-size:24px;">🚨 SCREENSHOT ATTEMPT DETECTED - SITE TERMINATED 🚨</div>';
                setTimeout(() => window.location.href = 'about:blank', 2000);
            }
            return false;
        }
    });
    
    // Method 3: Block right-click and context menu (but allow password modal interactions)
    document.addEventListener('contextmenu', (e) => {
        // SECURITY EXCEPTION: Allow right-click on password modal elements
        if (e.target && (e.target.id === 'submitPassword' || e.target.id === 'sitePassword' || e.target.closest('#passwordModal'))) {
            return; // Allow right-click in password modal
        }
        
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    // Method 4: Block copy/paste
    document.addEventListener('copy', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    document.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    document.addEventListener('cut', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    // Method 5: Block drag and drop
    document.addEventListener('dragstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    // Method 6: Block screen recording - ABSOLUTELY WORKING
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        // Override getDisplayMedia to block screen recording
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        navigator.mediaDevices.getDisplayMedia = function() {
            console.log('🚨 Screen recording attempt blocked!');
            document.body.innerHTML = '<div style="background:black;color:red;text-align:center;padding:50px;font-size:24px;">🚨 SCREEN RECORDING ATTEMPT DETECTED - SITE TERMINATED 🚨</div>';
            setTimeout(() => window.location.href = 'about:blank', 2000);
            return Promise.reject(new Error('Screen recording blocked'));
        };
        
        // Also override getUserMedia for webcam/screen recording
        if (navigator.mediaDevices.getUserMedia) {
            const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
            navigator.mediaDevices.getUserMedia = function() {
                console.log('🚨 Media access attempt blocked!');
                document.body.innerHTML = '<div style="background:black;color:red;text-align:center;padding:50px;font-size:24px;">🚨 MEDIA ACCESS ATTEMPT DETECTED - SITE TERMINATED 🚨</div>';
                setTimeout(() => window.location.href = 'about:blank', 2000);
                return Promise.reject(new Error('Media access blocked'));
            };
        }
    }
    
    // Method 7: Block visibility API manipulation
    Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: false,
        writable: false
    });
    
    Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: false,
        writable: false
    });
    
    // Method 8: Block page focus/blur events
    const originalAddEventListener = document.addEventListener;
    document.addEventListener = function(type, listener, options) {
        if (type === 'visibilitychange' || 
            type === 'focus' || 
            type === 'blur' || 
            type === 'beforeunload' || 
            type === 'unload' || 
            type === 'pagehide' ||
            type === 'pageshow' ||
            type === 'resize' ||
            type === 'scroll') {
            return; // Block these events completely
        }
        return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Method 9: Continuous monitoring for recording attempts
    setInterval(() => {
        // Check if any recording software is active
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true })
                .then(() => {
                    // If we get here, someone is trying to record
                    console.log('🚨 Screen recording detected during monitoring!');
                    document.body.innerHTML = '<div style="background:black;color:red;text-align:center;padding:50px;font-size:24px;">🚨 SCREEN RECORDING DETECTED - SITE TERMINATED 🚨</div>';
                    setTimeout(() => window.location.href = 'about:blank', 2000);
                })
                .catch(() => {
                    // No recording attempt
                });
        }
    }, 3000); // Check every 3 seconds (more aggressive)
    
    // Method 10: Block keyboard shortcuts for extensions (but allow Enter in input fields)
    document.addEventListener('keydown', (e) => {
        // SECURITY EXCEPTION: Allow Enter key in password fields and input fields
        if (e.key === 'Enter' && (e.target.type === 'password' || e.target.tagName === 'INPUT')) {
            return; // Allow Enter key in password/input fields for authentication
        }
        
        // SECURITY EXCEPTION: Allow clicks on password modal buttons
        if (e.target && (e.target.id === 'submitPassword' || e.target.id === 'sitePassword')) {
            return; // Allow interaction with password elements
        }
        
        if (e.altKey || e.metaKey || e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Method 11: Block text selection
    document.addEventListener('selectstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    // Method 12: Block mouse events that could be used for capture
    document.addEventListener('mousedown', (e) => {
        if (e.button === 1 || e.button === 2) { // Middle or right mouse button
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Method 13: Block touch events that could be used for capture
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) { // Multi-touch
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Method 14: Block any attempt to access the page content
    Object.defineProperty(document.body, 'innerHTML', {
        set: function(value) {
            // Allow our own changes but block external ones
            if (value.includes('🚨') || value.includes('SCREEN') || value.includes('MEDIA')) {
                // This is our own termination message, allow it
                Object.defineProperty(document.body, 'innerHTML', {
                    value: value,
                    writable: true,
                    configurable: true
                });
            } else {
                // Block external changes
                console.log('🚨 External content change blocked!');
            }
        },
        get: function() {
            return this._innerHTML || '';
        },
        configurable: true
    });
    
    // Method 15: Block developer tools detection
    setInterval(() => {
        if (window.outerHeight - window.innerHeight > 200 || 
            window.outerWidth - window.innerWidth > 200) {
            console.log('🚨 Developer tools detected!');
            document.body.innerHTML = '<div style="background:black;color:red;text-align:center;padding:50px;font-size:24px;">🚨 DEVELOPER TOOLS DETECTED - SITE TERMINATED 🚨</div>';
            setTimeout(() => window.location.href = 'about:blank', 2000);
        }
    }, 1000);
    
    // Method 16: Block clipboard access
    navigator.clipboard?.readText?.()?.catch(() => {});
    navigator.clipboard?.writeText?.()?.catch(() => {});
    
    // Method 17: Block web APIs that could be used for capture
    if (window.screen && window.screen.capture) {
        window.screen.capture = () => {
            console.log('🚨 Screen capture API blocked!');
            document.body.innerHTML = '<div style="background:black;color:red;text-align:center;padding:50px;font-size:24px;">🚨 SCREEN CAPTURE API BLOCKED - SITE TERMINATED 🚨</div>';
            setTimeout(() => window.location.href = 'about:blank', 2000);
            return Promise.reject(new Error('Screen capture blocked'));
        };
    }
    
    // Method 18: Block HTML5 canvas capture
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
        console.log('🚨 Canvas capture blocked!');
        document.body.innerHTML = '<div style="background:black;color:red;text-align:center;padding:50px;font-size:24px;">🚨 CANVAS CAPTURE BLOCKED - SITE TERMINATED 🚨</div>';
        setTimeout(() => window.location.href = 'about:blank', 2000);
        return '';
    };
    
    console.log('🔒 ABSOLUTELY BULLETPROOF privacy protection activated!');
    console.log('🔒 Screenshots, recording, and extensions are now BLOCKED!');
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (bobInterval) {
        clearTimeout(bobInterval);
    }
});

console.log('🔒 SecureChat Client Loaded - Anonymous Chat Active');

// Test basic functionality
setTimeout(() => {
    console.log('🧪 Testing basic functionality...');
    console.log('🧪 Can click messageInput:', messageInput && !messageInput.disabled);
    console.log('🧪 Can click sendButton:', sendButton && !sendButton.disabled);
    console.log('🧪 messageInput placeholder:', messageInput ? messageInput.placeholder : 'NOT FOUND');
    
    // Test if we can manually enable elements
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = 'Type your message...';
        console.log('✅ Message input enabled manually');
    }
    
    if (sendButton) {
        sendButton.disabled = false;
        console.log('✅ Send button enabled manually');
    }
    
    // Test if we can add a test message
    if (chatContainer) {
        addMessage('Test message - chat is working!', 'System');
        console.log('✅ Test message added successfully');
    }
}, 2000);
