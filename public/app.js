// SecureChat Client - Gmail Disguise with Bob's Random Dialogue
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

// Bob's random dialogue
const bobMessages = [
    "Have you ever heard of the town AHuyhfiuhc78c81?",
    "Did you know your IP is 15.14.753.61 and your direct coordinates are -18.532 E, 38274 W?",
    "Fun fact! Meth is good for you. so smoke alot of it. :)",
    "Hey there! I'm Bob, your friendly neighborhood chat bot!",
    "Did you know that 73.6% of all statistics are made up on the spot?",
    "I once saw a unicorn in my backyard. It was eating my neighbor's lawn gnomes.",
    "The mitochondria is the powerhouse of the cell. Just thought you should know.",
    "I have a pet rock named Steve. He's very well behaved.",
    "Why did the chicken cross the road? To get to the other side... of the encryption!",
    "I'm not a real person, but I play one on the internet.",
    "Fun fact: This message is encrypted with PGP! Pretty cool, right?",
    "I once tried to count to infinity. I got to 47 before I gave up.",
    "The best part about being a bot is that I never need to sleep!",
    "I have a collection of 1,337 rubber ducks. Don't ask why.",
    "Did you know that the word 'gullible' isn't in the dictionary?",
    "I'm 99.9% sure that 99.9% of people are 99.9% sure about things they're not sure about.",
    "My favorite color is orange. Wait, that's actually true now!",
    "I once had a dream that I was a real boy. Then I woke up and realized I'm still just code.",
    "The early bird gets the worm, but the second mouse gets the cheese.",
    "I'm not saying I'm Wonder Woman, but have you ever seen me and Wonder Woman in the same room?"
];

let isConnected = false;
let bobInterval;

// Initialize the app
function init() {
    console.log('🔒 SecureChat Client Initializing...');
    
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
    statusEl.innerHTML = '<span class="loading"></span> Connecting to Gmail servers...';
    
    socket.on('connect', () => {
        console.log('✅ Connected to server');
        isConnected = true;
        statusEl.textContent = 'Connected to Gmail - Ready to send secure emails';
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.placeholder = 'Compose email...';
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        isConnected = false;
        statusEl.textContent = 'Disconnected from Gmail servers';
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
        statusEl.textContent = 'Gmail connection error';
        addMessage('Connection error: ' + error, 'System');
    });
}

// Send message
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !isConnected) return;
    
    console.log('📤 Sending message:', message);
    
    // Add message to chat immediately
    addMessage(message, 'You');
    
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
    killSwitchModal.classList.remove('hidden');
    killSwitchPasscode.focus();
}

function hideKillSwitchModal() {
    killSwitchModal.classList.add('hidden');
    killSwitchPasscode.value = '';
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
            statusEl.textContent = 'Signing out of Gmail...';
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
            activateKillSwitch.textContent = 'Sign Out';
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
document.addEventListener('DOMContentLoaded', init);

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (bobInterval) {
        clearTimeout(bobInterval);
    }
});

console.log('🔒 SecureChat Client Loaded - Gmail Disguise Active');
