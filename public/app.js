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
    statusEl.innerHTML = `<span class="loading"></span> Connecting as ${randomUsername}...`;
    
    socket.on('connect', () => {
        console.log('✅ Connected to server');
        isConnected = true;
        statusEl.textContent = `Connected as ${randomUsername} - Ready to chat securely`;
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.placeholder = 'Type your message...';
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        isConnected = false;
        statusEl.textContent = 'Disconnected from secure chat';
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
        statusEl.textContent = 'Secure chat connection error';
        addMessage('Connection error: ' + error, 'System');
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
document.addEventListener('DOMContentLoaded', init);

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (bobInterval) {
        clearTimeout(bobInterval);
    }
});

console.log('🔒 SecureChat Client Loaded - Anonymous Chat Active');
