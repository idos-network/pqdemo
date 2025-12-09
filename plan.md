# Quantum-Safe Encryption Demo - Implementation Plan

## Overview

This project demonstrates **post-quantum asymmetric encryption** using the [Classic McEliece](https://classic.mceliece.org) algorithm via the [@aspect-build/pqcrypto.js](https://github.com/cyph/pqcrypto.js/tree/master/packages/mceliece) library.

### Important Note on McEliece

McEliece is a **Key Encapsulation Mechanism (KEM)**, not a traditional asymmetric cipher. This means:
- `encrypt(publicKey)` → generates a random `secret` and its `ciphertext`
- `decrypt(ciphertext, privateKey)` → recovers the same `secret`

To encrypt actual plaintext, we need a **hybrid encryption** approach:
1. Use McEliece to encapsulate a symmetric key
2. Use that symmetric key with AES-GCM (via Web Crypto API) to encrypt the plaintext

---

## Implementation Steps

### Step 1: Project Setup
- [ ] Create `index.html` with the UI structure
- [ ] Create `style.css` for styling
- [ ] Create `app.js` for application logic
- [ ] Set up ES module imports for the McEliece library

### Step 2: UI Components
- [ ] **Key Generation Section**
  - Button to generate keypair
  - Display areas for public key and private key (base64 encoded)
  - Copy buttons for keys
  
- [ ] **Encryption Section**
  - Input field for recipient's public key
  - Textarea for plaintext message
  - Button to encrypt
  - Display area for ciphertext output (includes encapsulated key + encrypted message)
  
- [ ] **Decryption Section**
  - Input field for private key
  - Textarea for ciphertext input
  - Button to decrypt
  - Display area for decrypted plaintext

### Step 3: Core Cryptographic Functions

#### 3.1 Key Generation
```javascript
async function generateKeyPair() {
  const { privateKey, publicKey } = await mceliece.keyPair();
  // Convert to base64 for display/storage
  return {
    privateKey: arrayToBase64(privateKey),
    publicKey: arrayToBase64(publicKey)
  };
}
```

#### 3.2 Hybrid Encryption
```javascript
async function encryptMessage(publicKeyBase64, plaintext) {
  // 1. Decode the public key
  const publicKey = base64ToArray(publicKeyBase64);
  
  // 2. Use McEliece to encapsulate a secret
  const { ciphertext: kemCiphertext, secret } = await mceliece.encrypt(publicKey);
  
  // 3. Derive an AES key from the secret using Web Crypto
  const aesKey = await crypto.subtle.importKey(
    'raw', secret, { name: 'AES-GCM' }, false, ['encrypt']
  );
  
  // 4. Generate random IV and encrypt plaintext with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, aesKey, plaintextBytes
  );
  
  // 5. Package: kemCiphertext + iv + encryptedData
  return packageCiphertext(kemCiphertext, iv, encryptedData);
}
```

#### 3.3 Hybrid Decryption
```javascript
async function decryptMessage(privateKeyBase64, ciphertextPackage) {
  // 1. Unpackage the ciphertext
  const { kemCiphertext, iv, encryptedData } = unpackageCiphertext(ciphertextPackage);
  
  // 2. Decode the private key
  const privateKey = base64ToArray(privateKeyBase64);
  
  // 3. Use McEliece to recover the secret
  const secret = await mceliece.decrypt(kemCiphertext, privateKey);
  
  // 4. Derive AES key from secret
  const aesKey = await crypto.subtle.importKey(
    'raw', secret, { name: 'AES-GCM' }, false, ['decrypt']
  );
  
  // 5. Decrypt with AES-GCM
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, aesKey, encryptedData
  );
  
  return new TextDecoder().decode(decryptedData);
}
```

### Step 4: Utility Functions
- [ ] `arrayToBase64(uint8Array)` - Convert Uint8Array to base64 string
- [ ] `base64ToArray(base64String)` - Convert base64 string to Uint8Array
- [ ] `packageCiphertext(...)` - Combine KEM ciphertext, IV, and encrypted data
- [ ] `unpackageCiphertext(...)` - Parse the combined ciphertext package

### Step 5: UX Enhancements
- [ ] Loading states during crypto operations (McEliece key generation is slow!)
- [ ] Error handling and user feedback
- [ ] Responsive design
- [ ] Copy-to-clipboard functionality
- [ ] Clear visual indication of key sizes (McEliece has LARGE keys ~1MB public key!)

### Step 6: Testing
- [ ] Test key generation
- [ ] Test encryption with generated keys
- [ ] Test decryption with correct private key
- [ ] Test error handling with invalid keys
- [ ] Test cross-tab/cross-session encryption/decryption

---

## Technical Considerations

### Key Sizes (mceliece8192128)
- **Public Key**: ~1,357,824 bytes (~1.3 MB)
- **Private Key**: ~14,120 bytes (~14 KB)
- **Ciphertext (KEM)**: ~240 bytes
- **Shared Secret**: 32 bytes

⚠️ Due to the large public key size, base64 encoding will produce ~1.8MB strings. The UI should handle this gracefully (possibly with download/upload options instead of copy/paste).

### Browser Compatibility
- Requires ES modules support
- Requires Web Crypto API (all modern browsers)
- Requires WebAssembly support

### CDN/Module Loading
Will use the npm package via a CDN like esm.sh or unpkg to load the McEliece library directly in the browser.

---

## File Structure
```
pqdemo/
├── index.html      # Main HTML structure
├── style.css       # Styling
├── app.js          # Application logic
└── plan.md         # This file
```

---

## Next Steps
1. Create the basic HTML structure
2. Add styling for a clean, modern interface
3. Implement the JavaScript logic
4. Test all functionality
5. Add polish and error handling
