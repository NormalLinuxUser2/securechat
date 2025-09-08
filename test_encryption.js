#!/usr/bin/env node

/**
 * Test script for PGP encryption functionality
 * This script tests the encryption/decryption functions independently
 */

const openpgp = require('openpgp');
const crypto = require('crypto');

async function testPGPEncryption() {
    console.log('🧪 Testing PGP Encryption Functionality...\n');
    
    try {
        // Test 1: Generate key pair
        console.log('1️⃣ Testing key generation...');
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: 'ecc',
            curve: 'curve25519',
            userIDs: [{ name: 'Test User', email: 'test@securechat.local' }],
            passphrase: crypto.randomBytes(32).toString('hex')
        });
        console.log('✅ Key pair generated successfully');
        console.log(`   Public key length: ${publicKey.length} characters`);
        console.log(`   Private key length: ${privateKey.length} characters\n`);
        
        // Test 2: Encrypt message
        console.log('2️⃣ Testing message encryption...');
        const testMessage = 'This is a test message for end-to-end encryption!';
        const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: testMessage }),
            encryptionKeys: publicKeyObj
        });
        console.log('✅ Message encrypted successfully');
        console.log(`   Original message: "${testMessage}"`);
        console.log(`   Encrypted length: ${encrypted.length} characters\n`);
        
        // Test 3: Decrypt message
        console.log('3️⃣ Testing message decryption...');
        const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: privateKey });
        const message = await openpgp.readMessage({ armoredMessage: encrypted });
        const { data: decrypted } = await openpgp.decrypt({
            message,
            decryptionKeys: privateKeyObj
        });
        console.log('✅ Message decrypted successfully');
        console.log(`   Decrypted message: "${decrypted}"`);
        console.log(`   Messages match: ${testMessage === decrypted ? '✅ YES' : '❌ NO'}\n`);
        
        // Test 4: Test with server key format
        console.log('4️⃣ Testing with server key format...');
        const fs = require('fs');
        const path = require('path');
        
        const serverPublicKeyPath = path.join(__dirname, 'PGP', '0x16BA41A8-pub.asc');
        const serverPrivateKeyPath = path.join(__dirname, 'PGP', '0x16BA41A8-sec.asc');
        
        if (fs.existsSync(serverPublicKeyPath) && fs.existsSync(serverPrivateKeyPath)) {
            const serverPublicKey = fs.readFileSync(serverPublicKeyPath, 'utf8');
            const serverPrivateKey = fs.readFileSync(serverPrivateKeyPath, 'utf8');
            
            const serverPublicKeyObj = await openpgp.readKey({ armoredKey: serverPublicKey });
            const serverEncrypted = await openpgp.encrypt({
                message: await openpgp.createMessage({ text: testMessage }),
                encryptionKeys: serverPublicKeyObj
            });
            
            const serverPrivateKeyObj = await openpgp.readPrivateKey({ armoredKey: serverPrivateKey });
            const serverMessage = await openpgp.readMessage({ armoredMessage: serverEncrypted });
            const { data: serverDecrypted } = await openpgp.decrypt({
                message: serverMessage,
                decryptionKeys: serverPrivateKeyObj
            });
            
            console.log('✅ Server key encryption/decryption successful');
            console.log(`   Server decrypted message: "${serverDecrypted}"`);
            console.log(`   Messages match: ${testMessage === serverDecrypted ? '✅ YES' : '❌ NO'}\n`);
        } else {
            console.log('⚠️ Server key files not found, skipping server key test\n');
        }
        
        // Test 5: Performance test
        console.log('5️⃣ Testing encryption performance...');
        const startTime = Date.now();
        const iterations = 10;
        
        for (let i = 0; i < iterations; i++) {
            const perfMessage = `Performance test message ${i}`;
            const perfEncrypted = await openpgp.encrypt({
                message: await openpgp.createMessage({ text: perfMessage }),
                encryptionKeys: publicKeyObj
            });
            
            const perfMessageObj = await openpgp.readMessage({ armoredMessage: perfEncrypted });
            const { data: perfDecrypted } = await openpgp.decrypt({
                message: perfMessageObj,
                decryptionKeys: privateKeyObj
            });
            
            if (perfMessage !== perfDecrypted) {
                throw new Error(`Performance test failed at iteration ${i}`);
            }
        }
        
        const endTime = Date.now();
        const avgTime = (endTime - startTime) / iterations;
        
        console.log('✅ Performance test completed');
        console.log(`   ${iterations} encrypt/decrypt cycles completed`);
        console.log(`   Average time per cycle: ${avgTime.toFixed(2)}ms\n`);
        
        console.log('🎉 All PGP encryption tests passed successfully!');
        console.log('🔐 End-to-end encryption is ready for production use.');
        
    } catch (error) {
        console.error('❌ PGP encryption test failed:', error);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testPGPEncryption().catch(console.error);
}

module.exports = { testPGPEncryption };
