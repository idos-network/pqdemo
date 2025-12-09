/**
 * Quantum-Safe Encryption Demo
 * Using Classic McEliece (KEM) + AES-GCM hybrid encryption
 */

// Import McEliece from npm package (bundled by Vite)
import {mceliece} from 'mceliece';

// ============================================
// Utility Functions
// ============================================

/**
 * Convert Uint8Array to Base64 string
 */
function arrayToBase64(uint8Array) {
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
}

/**
 * Convert Base64 string to Uint8Array
 */
function base64ToArray(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Format byte size for display
 */
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Package ciphertext components into a single base64 string
 * Format: [4 bytes KEM length][KEM ciphertext][12 bytes IV][encrypted data]
 */
function packageCiphertext(kemCiphertext, iv, encryptedData) {
    const encryptedArray = new Uint8Array(encryptedData);
    const kemLength = kemCiphertext.length;
    
    // Total size: 4 (length) + KEM + 12 (IV) + encrypted
    const totalLength = 4 + kemLength + 12 + encryptedArray.length;
    const combined = new Uint8Array(totalLength);
    
    // Write KEM length as 4 bytes (big-endian)
    combined[0] = (kemLength >> 24) & 0xff;
    combined[1] = (kemLength >> 16) & 0xff;
    combined[2] = (kemLength >> 8) & 0xff;
    combined[3] = kemLength & 0xff;
    
    // Write KEM ciphertext
    combined.set(kemCiphertext, 4);
    
    // Write IV
    combined.set(iv, 4 + kemLength);
    
    // Write encrypted data
    combined.set(encryptedArray, 4 + kemLength + 12);
    
    return arrayToBase64(combined);
}

/**
 * Unpackage base64 ciphertext into components
 */
function unpackageCiphertext(base64Package) {
    const combined = base64ToArray(base64Package);
    
    // Read KEM length
    const kemLength = (combined[0] << 24) | (combined[1] << 16) | (combined[2] << 8) | combined[3];
    
    // Extract components
    const kemCiphertext = combined.slice(4, 4 + kemLength);
    const iv = combined.slice(4 + kemLength, 4 + kemLength + 12);
    const encryptedData = combined.slice(4 + kemLength + 12);
    
    return { kemCiphertext, iv, encryptedData };
}

/**
 * Show a toast notification
 */
function showToast(message, duration = 2000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), duration);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('✓ Copied to clipboard!');
        return true;
    } catch (err) {
        showToast('✗ Failed to copy');
        return false;
    }
}

/**
 * Download text as a file
 */
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Read file content
 */
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

/**
 * Update status message
 */
function setStatus(elementId, message, type = 'loading') {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `status ${type}`;
    el.classList.remove('hidden');
}

/**
 * Hide status message
 */
function hideStatus(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

/**
 * Set button loading state
 */
function setButtonLoading(button, loading) {
    const textSpan = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    
    if (loading) {
        textSpan.classList.add('hidden');
        spinner.classList.remove('hidden');
        button.disabled = true;
    } else {
        textSpan.classList.remove('hidden');
        spinner.classList.add('hidden');
        button.disabled = false;
    }
}

// ============================================
// Cryptographic Functions
// ============================================

/**
 * Generate a McEliece keypair
 */
async function generateKeyPair() {
    const { privateKey, publicKey } = await mceliece.keyPair();
    return {
        privateKey: arrayToBase64(privateKey),
        publicKey: arrayToBase64(publicKey),
        privateKeySize: privateKey.length,
        publicKeySize: publicKey.length
    };
}

/**
 * Encrypt a message using hybrid encryption (McEliece KEM + AES-GCM)
 */
async function encryptMessage(publicKeyBase64, plaintext) {
    // 1. Decode the public key
    const publicKey = base64ToArray(publicKeyBase64);
    
    // 2. Use McEliece to encapsulate a secret (KEM)
    // Note: The library spells it 'cyphertext' with a 'y'
    const { cyphertext: kemCiphertext, secret } = await mceliece.encrypt(publicKey);
    
    // 3. Derive an AES-256 key from the secret
    // The McEliece secret is already 32 bytes, perfect for AES-256
    const aesKey = await crypto.subtle.importKey(
        'raw',
        secret,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );
    
    // 4. Generate random IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 5. Encrypt plaintext with AES-GCM
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        plaintextBytes
    );
    
    // 6. Package everything together
    return packageCiphertext(kemCiphertext, iv, encryptedData);
}

/**
 * Decrypt a message using hybrid decryption (McEliece KEM + AES-GCM)
 */
async function decryptMessage(privateKeyBase64, ciphertextPackage) {
    // 1. Unpackage the ciphertext
    const { kemCiphertext, iv, encryptedData } = unpackageCiphertext(ciphertextPackage);
    
    // 2. Decode the private key
    const privateKey = base64ToArray(privateKeyBase64);
    
    // 3. Use McEliece to recover the secret (KEM decrypt)
    const secret = await mceliece.decrypt(kemCiphertext, privateKey);
    
    // 4. Derive AES key from secret
    const aesKey = await crypto.subtle.importKey(
        'raw',
        secret,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );
    
    // 5. Decrypt with AES-GCM
    const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        encryptedData
    );
    
    return new TextDecoder().decode(decryptedData);
}

// ============================================
// UI Event Handlers
// ============================================

// Store generated keys for easy access
let generatedKeys = {
    publicKey: null,
    privateKey: null
};

let lastCiphertext = null;

// DOM elements
const elements = {
    // Key generation
    generateBtn: document.getElementById('generate-btn'),
    keygenStatus: document.getElementById('keygen-status'),
    keysOutput: document.getElementById('keys-output'),
    publicKeyEl: document.getElementById('public-key'),
    privateKeyEl: document.getElementById('private-key'),
    pubkeySize: document.getElementById('pubkey-size'),
    privkeySize: document.getElementById('privkey-size'),
    copyPubkey: document.getElementById('copy-pubkey'),
    copyPrivkey: document.getElementById('copy-privkey'),
    downloadPubkey: document.getElementById('download-pubkey'),
    downloadPrivkey: document.getElementById('download-privkey'),
    
    // Encryption
    encryptPubkey: document.getElementById('encrypt-pubkey'),
    plaintext: document.getElementById('plaintext'),
    encryptBtn: document.getElementById('encrypt-btn'),
    encryptStatus: document.getElementById('encrypt-status'),
    ciphertextOutput: document.getElementById('ciphertext-output'),
    ciphertext: document.getElementById('ciphertext'),
    ciphertextSize: document.getElementById('ciphertext-size'),
    copyCiphertext: document.getElementById('copy-ciphertext'),
    downloadCiphertext: document.getElementById('download-ciphertext'),
    useGeneratedPubkey: document.getElementById('use-generated-pubkey'),
    loadPubkeyFile: document.getElementById('load-pubkey-file'),
    pubkeyFileInput: document.getElementById('pubkey-file-input'),
    
    // Decryption
    decryptPrivkey: document.getElementById('decrypt-privkey'),
    ciphertextInput: document.getElementById('ciphertext-input'),
    decryptBtn: document.getElementById('decrypt-btn'),
    decryptStatus: document.getElementById('decrypt-status'),
    decryptedOutput: document.getElementById('decrypted-output'),
    decryptedText: document.getElementById('decrypted-text'),
    copyDecrypted: document.getElementById('copy-decrypted'),
    useGeneratedPrivkey: document.getElementById('use-generated-privkey'),
    useEncryptedCiphertext: document.getElementById('use-encrypted-ciphertext'),
    loadPrivkeyFile: document.getElementById('load-privkey-file'),
    privkeyFileInput: document.getElementById('privkey-file-input'),
    loadCiphertextFile: document.getElementById('load-ciphertext-file'),
    ciphertextFileInput: document.getElementById('ciphertext-file-input')
};

// Key Generation
elements.generateBtn.addEventListener('click', async () => {
    setButtonLoading(elements.generateBtn, true);
    setStatus('keygen-status', 'Generating keypair... This may take 10-30 seconds.', 'loading');
    
    // Allow UI to update before heavy computation
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
        const startTime = performance.now();
        const keys = await generateKeyPair();
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
        
        generatedKeys.publicKey = keys.publicKey;
        generatedKeys.privateKey = keys.privateKey;
        
        elements.publicKeyEl.value = keys.publicKey;
        elements.privateKeyEl.value = keys.privateKey;
        elements.pubkeySize.textContent = `(${formatSize(keys.publicKeySize)})`;
        elements.privkeySize.textContent = `(${formatSize(keys.privateKeySize)})`;
        
        elements.keysOutput.classList.remove('hidden');
        setStatus('keygen-status', `✓ Keypair generated in ${elapsed}s!`, 'success');
    } catch (error) {
        console.error('Key generation error:', error);
        setStatus('keygen-status', `✗ Error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(elements.generateBtn, false);
    }
});

// Copy keys
elements.copyPubkey.addEventListener('click', () => {
    copyToClipboard(elements.publicKeyEl.value);
});

elements.copyPrivkey.addEventListener('click', () => {
    copyToClipboard(elements.privateKeyEl.value);
});

// Download keys
elements.downloadPubkey.addEventListener('click', () => {
    downloadFile(elements.publicKeyEl.value, 'mceliece_public_key.txt');
    showToast('✓ Public key downloaded');
});

elements.downloadPrivkey.addEventListener('click', () => {
    downloadFile(elements.privateKeyEl.value, 'mceliece_private_key.txt');
    showToast('✓ Private key downloaded');
});

// Use generated public key for encryption
elements.useGeneratedPubkey.addEventListener('click', () => {
    if (generatedKeys.publicKey) {
        elements.encryptPubkey.value = generatedKeys.publicKey;
        showToast('✓ Public key loaded');
    } else {
        showToast('✗ Generate a keypair first');
    }
});

// Load public key from file
elements.loadPubkeyFile.addEventListener('click', () => {
    elements.pubkeyFileInput.click();
});

elements.pubkeyFileInput.addEventListener('change', async (e) => {
    if (e.target.files[0]) {
        const content = await readFile(e.target.files[0]);
        elements.encryptPubkey.value = content.trim();
        showToast('✓ Public key loaded from file');
    }
});

// Encryption
elements.encryptBtn.addEventListener('click', async () => {
    const publicKey = elements.encryptPubkey.value.trim();
    const plaintext = elements.plaintext.value;
    
    if (!publicKey) {
        setStatus('encrypt-status', '✗ Please provide a public key', 'error');
        return;
    }
    
    if (!plaintext) {
        setStatus('encrypt-status', '✗ Please enter a message to encrypt', 'error');
        return;
    }
    
    setButtonLoading(elements.encryptBtn, true);
    setStatus('encrypt-status', '⏳ Encrypting...', 'loading');
    
    try {
        const startTime = performance.now();
        const ciphertext = await encryptMessage(publicKey, plaintext);
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        
        lastCiphertext = ciphertext;
        elements.ciphertext.value = ciphertext;
        
        const ciphertextBytes = base64ToArray(ciphertext).length;
        elements.ciphertextSize.textContent = `(${formatSize(ciphertextBytes)})`;
        
        elements.ciphertextOutput.classList.remove('hidden');
        setStatus('encrypt-status', `✓ Encrypted in ${elapsed}s!`, 'success');
    } catch (error) {
        console.error('Encryption error:', error);
        setStatus('encrypt-status', `✗ Error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(elements.encryptBtn, false);
    }
});

// Copy ciphertext
elements.copyCiphertext.addEventListener('click', () => {
    copyToClipboard(elements.ciphertext.value);
});

// Download ciphertext
elements.downloadCiphertext.addEventListener('click', () => {
    downloadFile(elements.ciphertext.value, 'encrypted_message.txt');
    showToast('✓ Ciphertext downloaded');
});

// Use generated private key for decryption
elements.useGeneratedPrivkey.addEventListener('click', () => {
    if (generatedKeys.privateKey) {
        elements.decryptPrivkey.value = generatedKeys.privateKey;
        showToast('✓ Private key loaded');
    } else {
        showToast('✗ Generate a keypair first');
    }
});

// Use encrypted ciphertext for decryption
elements.useEncryptedCiphertext.addEventListener('click', () => {
    if (lastCiphertext) {
        elements.ciphertextInput.value = lastCiphertext;
        showToast('✓ Ciphertext loaded');
    } else {
        showToast('✗ Encrypt a message first');
    }
});

// Load private key from file
elements.loadPrivkeyFile.addEventListener('click', () => {
    elements.privkeyFileInput.click();
});

elements.privkeyFileInput.addEventListener('change', async (e) => {
    if (e.target.files[0]) {
        const content = await readFile(e.target.files[0]);
        elements.decryptPrivkey.value = content.trim();
        showToast('✓ Private key loaded from file');
    }
});

// Load ciphertext from file
elements.loadCiphertextFile.addEventListener('click', () => {
    elements.ciphertextFileInput.click();
});

elements.ciphertextFileInput.addEventListener('change', async (e) => {
    if (e.target.files[0]) {
        const content = await readFile(e.target.files[0]);
        elements.ciphertextInput.value = content.trim();
        showToast('✓ Ciphertext loaded from file');
    }
});

// Decryption
elements.decryptBtn.addEventListener('click', async () => {
    const privateKey = elements.decryptPrivkey.value.trim();
    const ciphertext = elements.ciphertextInput.value.trim();
    
    if (!privateKey) {
        setStatus('decrypt-status', '✗ Please provide a private key', 'error');
        return;
    }
    
    if (!ciphertext) {
        setStatus('decrypt-status', '✗ Please enter the ciphertext to decrypt', 'error');
        return;
    }
    
    setButtonLoading(elements.decryptBtn, true);
    setStatus('decrypt-status', '⏳ Decrypting...', 'loading');
    
    try {
        const startTime = performance.now();
        const decrypted = await decryptMessage(privateKey, ciphertext);
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        
        elements.decryptedText.value = decrypted;
        elements.decryptedOutput.classList.remove('hidden');
        setStatus('decrypt-status', `✓ Decrypted in ${elapsed}s!`, 'success');
    } catch (error) {
        console.error('Decryption error:', error);
        setStatus('decrypt-status', `✗ Decryption failed. Wrong key or corrupted data.`, 'error');
        elements.decryptedOutput.classList.add('hidden');
    } finally {
        setButtonLoading(elements.decryptBtn, false);
    }
});

// Copy decrypted text
elements.copyDecrypted.addEventListener('click', () => {
    copyToClipboard(elements.decryptedText.value);
});

// Log initialization
console.log('🔐 Quantum-Safe Encryption Demo initialized');
console.log('Using Classic McEliece (mceliece8192128) + AES-GCM hybrid encryption');
