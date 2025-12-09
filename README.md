# Quantum-Safe Encryption Demo

A frontend web application demonstrating post-quantum cryptography using Classic McEliece combined with AES-GCM hybrid encryption.

![idOS Quantum-Safe Encryption](https://img.shields.io/badge/Security-Post--Quantum-19FB9B)

## Overview

This demo showcases quantum-resistant asymmetric encryption using:

- **Classic McEliece (8192128)** - A key encapsulation mechanism (KEM) providing ~256-bit post-quantum security
- **AES-GCM** - Symmetric encryption using the Web Crypto API for actual message encryption

### How It Works

McEliece is a KEM, not a direct encryption algorithm. The hybrid encryption scheme:

1. **Encryption**: Generate a random shared secret using the recipient's public key, then use AES-GCM with that secret to encrypt the plaintext
2. **Decryption**: Recover the shared secret using the private key, then decrypt the AES-GCM ciphertext

## Features

- **Key Generation** - Generate McEliece keypairs (public key ~1.3 MB, private key ~14 KB)
- **Encrypt** - Encrypt messages to a recipient's public key
- **Decrypt** - Decrypt messages using your private key
- **File Import/Export** - Download and load keys and ciphertexts

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (comes with Node.js)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd pqdemo
```

2. Install dependencies:

```bash
npm install
```

## Running the Application

### Development Server

Start the Vite development server with hot reload:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Production Build

Build the application for production:

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
pqdemo/
├── index.html      # Main HTML file
├── app.js          # Application logic (key gen, encrypt, decrypt)
├── style.css       # idOS-branded styles
├── package.json    # Dependencies and scripts
├── vite.config.js  # Vite configuration (if present)
└── README.md       # This file
```

## Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| [mceliece](https://github.com/cyph/pqcrypto.js) | ^5.0.0 | Classic McEliece post-quantum KEM |
| [vite](https://vitejs.dev/) | ^6.0.0 | Frontend build tool (dev dependency) |

## Security Considerations

⚠️ **This is a demonstration application.**

For production use:

- Implement proper key management and secure storage
- Use secure channels for key exchange
- Consider key rotation policies
- Audit cryptographic implementation
- Never expose private keys

## Technical Notes

- **Key Sizes**: McEliece public keys are large (~1.3 MB) due to the algorithm's design
- **Performance**: Key generation takes several seconds due to the computational complexity
- **Browser Support**: Requires browsers with Web Crypto API support (all modern browsers)

## License

MIT

## Credits

- [pqcrypto.js](https://github.com/cyph/pqcrypto.js) - Post-quantum cryptography library
- [idOS Network](https://idos.network) - Brand design inspiration
