// SecureChat Client - Anonymous Chat with Bob's Random Dialogue
const socket = io();

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

// Generate random username
const randomUsername = generateRandomUsername();

// Random username generator
function generateRandomUsername() {
    const adjectives = ['Mysterious', 'Silent', 'Shadow', 'Phantom', 'Ghost', 'Stealth', 'Hidden', 'Secret', 'Unknown', 'Anonymous'];
    const nouns = ['User', 'Chatter', 'Person', 'Entity', 'Being', 'Soul', 'Spirit', 'Traveler', 'Wanderer', 'Observer'];
    const randomNum = Math.floor(Math.random() * 9999);
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}${noun}${randomNum}`;
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
    "Did you know that 420% of all statistics are completely made up?",
    "I once saw a crackhead fighting a raccoon over a half-eaten sandwich. The raccoon won.",
    "Fun fact: If you stare at the sun long enough, you'll see God. Or go blind. One of those.",
    "Did you know that if you eat enough hot sauce, you can breathe fire? My cousin tried it. He's dead now.",
    "I have a theory that pigeons are just government drones. Think about it...",
    "Your mom's so fat, when she sits around the house, she sits AROUND the house.",
    "Did you know that if you microwave a grape, it creates plasma? Science is wild, man.",
    "I once tried to teach my cat to play chess. He just knocked all the pieces over and walked away.",
    "Fun fact: The word 'gullible' isn't in the dictionary. Look it up!",
    "Did you know that if you do a backflip while eating a hot dog, you'll gain the ability to see through walls?",
    "I'm 99.9% sure that 99.9% of people are 99.9% sure about things they're not sure about.",
    "My favorite color is orange. Wait, that's actually true now!",
    "Did you know that if you spin around really fast, you can time travel? My neighbor tried it. He's still spinning.",
    "The early bird gets the worm, but the second mouse gets the cheese. And the third mouse gets arrested.",
    "I'm not saying I'm Batman, but have you ever seen me and Batman in the same room? No? Exactly.",
    "Did you know that if you eat enough carrots, you can see through time? My uncle tried it. He's now stuck in 1987.",
    "Fun fact: If you do a handstand while singing the national anthem, you'll gain the power of invisibility.",
    "Your coordinates are " + (Math.random() * 180 - 90).toFixed(3) + "° N, " + (Math.random() * 360 - 180).toFixed(3) + "° E. Don't ask how I know.",
    "Did you know that if you drink enough coffee, you can see the future? I'm currently seeing next Tuesday. It's raining."
];

let isConnected = false;
let bobInterval;

// Initialize the app
function init() {
    console.log('🔒 SecureChat Client Initializing...');
    
    // AGGRESSIVE: Force hide kill switch modal multiple times
    hideKillSwitchModal();
    setTimeout(hideKillSwitchModal, 100);
    setTimeout(hideKillSwitchModal, 500);
    setTimeout(hideKillSwitchModal, 1000);
    
    // Set up event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !messageInput.disabled) {
            sendMessage();
        }
    });
    
    killSwitchBtn.addEventListener('click', showKillSwitchModal);
    activateKillSwitch.addEventListener('click', activateKillSwitchHandler);
    cancelKillSwitch.addEventListener('click', hideKillSwitchModal);
    
    // Start Bob's random messages
    startBobMessages();
    
    // Connect to server
    connectToServer();
}

// Connect to server
function connectToServer() {
    statusEl.innerHTML = `<span class="loading"></span> Signing in as ${randomUsername}...`;
    
    socket.on('connect', () => {
        console.log('✅ Connected to server');
        isConnected = true;
        statusEl.textContent = `Signed in as ${randomUsername} - Welcome to Gmail`;
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.placeholder = 'Type your message...';
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        isConnected = false;
        statusEl.textContent = 'Sign in to your Google Account';
        messageInput.disabled = true;
        sendButton.disabled = true;
        messageInput.placeholder = 'Connecting...';
    });
    
    socket.on('message', (data) => {
        console.log('📨 Received message:', data);
        addMessage(data.message, data.sender || 'System');
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
}

// Send message
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !isConnected) return;
    
    console.log('📤 Sending message:', message);
    
    // Add message to chat immediately
            addMessage(message, randomUsername);
    
    // Send to server
    socket.emit('message', { message });
    
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
        if (isConnected) {
            const randomMessage = bobMessages[Math.floor(Math.random() * bobMessages.length)];
            addMessage(randomMessage, 'Bob');
        }
        
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // EMERGENCY: Force hide kill switch modal immediately
    const modal = document.getElementById('killSwitchModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        console.log('🔒 Emergency modal hide applied');
    }
    
    // Add privacy protection first
    addPrivacyProtection();
    // Then initialize the app
    init();
});

// Privacy protection functions
function addPrivacyProtection() {
    // Disable right-click context menu
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    // Disable keyboard shortcuts for screenshots, dev tools, etc.
    document.addEventListener('keydown', e => {
        // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Print Screen
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.key === 's') ||
            e.key === 'PrintScreen') {
            e.preventDefault();
            return false;
        }
    });
    
    // Disable text selection
    document.addEventListener('selectstart', e => e.preventDefault());
    
    // Disable drag and drop
    document.addEventListener('dragstart', e => e.preventDefault());
    
    // Disable copy/paste
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('paste', e => e.preventDefault());
    
    // Disable view source
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            return false;
        }
    });
    
    // Disable save page
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            return false;
        }
    });
    
    // Disable print
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            return false;
        }
    });
    
    // Disable dev tools detection
    setInterval(() => {
        if (window.outerHeight - window.innerHeight > 200 || 
            window.outerWidth - window.innerWidth > 200) {
            document.body.innerHTML = '<div style="background:black;color:orange;text-align:center;padding:50px;font-size:24px;">🔒 ACCESS DENIED 🔒</div>';
        }
    }, 1000);
    
    // Prevent screenshots and recording
    document.addEventListener('keydown', e => {
        // Disable Print Screen, F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
        if (e.key === 'PrintScreen' || 
            e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.key === 's')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Disable right-click context menu
    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    // Disable text selection
    document.addEventListener('selectstart', e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    // Disable copy/paste
    document.addEventListener('copy', e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    document.addEventListener('paste', e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    // Disable drag and drop
    document.addEventListener('dragstart', e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
    
    // Disable view source
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Disable save page
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Disable print
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Disable middle click
    document.addEventListener('mousedown', e => {
        if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Disable alt/meta key combinations
    document.addEventListener('keydown', e => {
        if (e.altKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Disable extensions from reading content
    Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: false
    });
    
    // Disable visibility API
    Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: false
    });
    
    // Disable page visibility change events
    document.removeEventListener('visibilitychange', null);
    
    // Disable focus/blur events
    window.removeEventListener('focus', null);
    window.removeEventListener('blur', null);
    
    // Disable beforeunload events
    window.removeEventListener('beforeunload', null);
    
    // Disable unload events
    window.removeEventListener('unload', null);
    
    // Disable pagehide events
    window.removeEventListener('pagehide', null);
    
    // Disable resize events
    window.removeEventListener('resize', null);
    
    // Disable scroll events
    window.removeEventListener('scroll', null);
    
    // Disable mouse events for extensions
    document.addEventListener('mousedown', e => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            return false;
        }
    });
    
    // Disable keyboard events for extensions
    document.addEventListener('keydown', e => {
        if (e.altKey || e.metaKey) {
            e.preventDefault();
            return false;
        }
    });
    
    // Prevent screen recording detection (less aggressive)
    let recordingDetected = false;
    
    // Monitor for screen recording software (only when user tries to record)
    document.addEventListener('keydown', e => {
        // If user presses Print Screen or other recording keys
        if (e.key === 'PrintScreen' || e.key === 'F12') {
            // Then check for screen sharing
            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true })
                    .then(() => {
                        if (!recordingDetected) {
                            recordingDetected = true;
                            document.body.innerHTML = '<div style="background:black;color:orange;text-align:center;padding:50px;font-size:24px;">🔒 SCREEN RECORDING DETECTED - ACCESS DENIED 🔒</div>';
                        }
                    })
                    .catch(() => {
                        // No recording detected
                    });
            }
        }
    });
    
    // Disable visibility API to prevent extensions from detecting page state
    Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: false,
        writable: false
    });
    
    // Disable page visibility change events
    const originalAddEventListener = document.addEventListener;
    document.addEventListener = function(type, listener, options) {
        if (type === 'visibilitychange' || 
            type === 'focus' || 
            type === 'blur' || 
            type === 'beforeunload' || 
            type === 'unload' || 
            type === 'pagehide') {
            return; // Block these events
        }
        return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Continuous modal monitoring to prevent auto-show
    setInterval(() => {
        const modal = document.getElementById('killSwitchModal');
        if (modal && !modal.classList.contains('hidden')) {
            console.log('🔒 Modal auto-show detected - forcing hide');
            hideKillSwitchModal();
        }
    }, 1000);
    
    console.log('🔒 Privacy protection activated');
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (bobInterval) {
        clearTimeout(bobInterval);
    }
});

console.log('🔒 SecureChat Client Loaded - Anonymous Chat Active');
