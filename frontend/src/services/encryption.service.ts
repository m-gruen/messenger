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
        return sodium.from_base64(base64, sodium.base64_variants.ORIGINAL);
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

        const sharedKey = await this.getSharedKeyClient(sender, receiver);

        const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
        const encryptedContent = sodium.crypto_secretbox_easy(
            sodium.from_string(content),
            nonce,
            sharedKey.sharedTx
        );

        return {
            encryptedContentBase64: sodium.to_base64(encryptedContent, sodium.base64_variants.ORIGINAL),
            nonceBase64: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL)
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

        const encryptedContent = EncryptionService.from_base64(encryptedMessage.encryptedContentBase64);
        const nonce = EncryptionService.from_base64(encryptedMessage.nonceBase64);

        return sodium.to_string(
            sodium.crypto_secretbox_open_easy(
                encryptedContent,
                nonce,
                isSender ? sharedKey.sharedTx : sharedKey.sharedRx
            )
        );
    }
}

export const encryptionService = new EncryptionService();
