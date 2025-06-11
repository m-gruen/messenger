import sodium from 'libsodium-wrappers';

export interface IKeyPair {
    public_key: string;
    private_key?: string;
}

export interface IPublicKey {
    public_key: string;
}

export interface IEncryptedMessage {
    encryptedContentBase64: string;
    nonceBase64: string;
}

export interface IDecryptedMessage {
    content: string;
    sender: string;
    receiver: string;
    date: Date;
}

export class EncryptionService {
    private static from_base64(base64: string): Uint8Array<ArrayBufferLike> {
        try {
            return sodium.from_base64(base64, sodium.base64_variants.ORIGINAL);
        } catch (error) {
            // Try with URL_SAFE variant if ORIGINAL fails (common with large data or image content)
            try {
                return sodium.from_base64(base64, sodium.base64_variants.URLSAFE);
            } catch (innerError: any) {
                console.error('Failed to decode base64 with any variant:', innerError);
                throw new Error(`Failed to decode base64: ${innerError.message || 'Unknown error'}`);
            }
        }
    }

    /**
     * Generates a new keypair for encryption
     * @returns Object containing public and private keys in base64 format
     */
    public async generateKeyPair(): Promise<{ publicKey: string, privateKey: string }> {
        await sodium.ready;
        const { publicKey: rawPublicKey, privateKey: rawPrivateKey } = sodium.crypto_kx_keypair();
        return {
            publicKey: sodium.to_base64(rawPublicKey, sodium.base64_variants.ORIGINAL),
            privateKey: sodium.to_base64(rawPrivateKey, sodium.base64_variants.ORIGINAL)
        };
    }

    /**
     * Derives a public key from a private key
     * @param privateKeyBase64 The private key in base64 format
     * @returns The derived public key in base64 format
     */
    public async derivePublicKey(privateKeyBase64: string): Promise<string> {
        await sodium.ready;
        const privateKeyBytes = sodium.from_base64(privateKeyBase64, sodium.base64_variants.ORIGINAL);
        const publicKeyBytes = sodium.crypto_scalarmult_base(privateKeyBytes);
        return sodium.to_base64(publicKeyBytes, sodium.base64_variants.ORIGINAL);
    }

    private async getSharedKeyClient(client: IKeyPair, server: IPublicKey): Promise<sodium.CryptoKX> {
        await sodium.ready;
        
        if (!client.private_key) {
            throw new Error('Private key not available for client');
        }

        return sodium.crypto_kx_client_session_keys(
            EncryptionService.from_base64(client.public_key),
            EncryptionService.from_base64(client.private_key),
            EncryptionService.from_base64(server.public_key)
        );
    }

    private async getSharedKeyServer(client: IPublicKey, server: IKeyPair): Promise<sodium.CryptoKX> {
        await sodium.ready;

        if (!server.private_key) {
            throw new Error('Private key not available for server');
        }

        return sodium.crypto_kx_server_session_keys(
            EncryptionService.from_base64(server.public_key),
            EncryptionService.from_base64(server.private_key),
            EncryptionService.from_base64(client.public_key)
        );
    }

    public async encryptMessage(sender: IKeyPair, receiver: IPublicKey, content: string): Promise<IEncryptedMessage> {
        await sodium.ready;

        if (!sender.private_key) {
            throw new Error('Cannot encrypt message: Private key not found in sender data');
        }

        // Check if the content is an image message by trying to parse it as JSON
        let isImageMessage = false;
        try {
            const parsed = JSON.parse(content);
            isImageMessage = parsed?.type === 'image';
        } catch (e) {
            // Not JSON or not parseable, continue as normal
        }

        const sharedKey = await this.getSharedKeyClient(sender, receiver);

        const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
        const encryptedContent = sodium.crypto_secretbox_easy(
            sodium.from_string(content),
            nonce,
            sharedKey.sharedTx
        );

        // Use URLSAFE variant for image messages to prevent encoding issues
        const base64Variant = isImageMessage ? 
            sodium.base64_variants.URLSAFE : 
            sodium.base64_variants.ORIGINAL;

        return {
            encryptedContentBase64: sodium.to_base64(encryptedContent, base64Variant),
            nonceBase64: sodium.to_base64(nonce, base64Variant)
        };
    }

    public async decryptMessage(
        client: IPublicKey,
        server: IKeyPair,
        encryptedMessage: IEncryptedMessage,
        isSender: boolean
    ): Promise<string> {
        await sodium.ready;

        if (!server.private_key) {
            throw new Error('Cannot decrypt message: Private key not found in user data');
        }

        const sharedKey = isSender
            ? await this.getSharedKeyClient(server, client)
            : await this.getSharedKeyServer(client, server);

        try {
            const encryptedContent = EncryptionService.from_base64(encryptedMessage.encryptedContentBase64);
            const nonce = EncryptionService.from_base64(encryptedMessage.nonceBase64);

            const decrypted = sodium.to_string(
                sodium.crypto_secretbox_open_easy(
                    encryptedContent,
                    nonce,
                    isSender ? sharedKey.sharedTx : sharedKey.sharedRx
                )
            );
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            
            // Check if this appears to be an image message based on content length
            if (encryptedMessage.encryptedContentBase64.length > 1000) {
                throw new Error('Failed to decrypt possible image message. The format may be incompatible.');
            }
            
            throw error; // Re-throw the original error
        }
    }
}

export const encryptionService = new EncryptionService();
