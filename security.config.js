// Security Configuration for SecureChat
// This file contains all security-related settings

module.exports = {
    // Kill switch configuration
    killSwitch: {
        passcode: 'SECURE_CHAT_KILL_SWITCH_2024', // CHANGE THIS!
        activationDelay: 0, // Immediate activation
        clearMemory: true,
        clearLogs: true,
        return404: true
    },
    
    // PGP encryption settings
    pgp: {
        keyType: 'ecc',
        curve: 'curve25519',
        keySize: 256,
        passphraseRequired: true
    },
    
    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false
    },
    
    // Security headers
    security: {
        helmet: {
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        },
        cors: {
            origin: "*",
            credentials: false
        }
    },
    
    // Memory management
    memory: {
        maxConnections: 1000,
        maxMessages: 10000,
        garbageCollectionInterval: 300000 // 5 minutes
    },
    
    // Logging (disabled for security)
    logging: {
        enabled: false,
        logLevel: 'none',
        logFile: null,
        consoleLog: false
    }
};
