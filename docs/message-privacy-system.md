# Message Privacy System Documentation

## Overview

Our self-hosted messenger implements a privacy-focused message handling system that minimizes the storage of message content on the server. The system works on the principle that:

1. Messages are **end-to-end encrypted** between users
2. Encrypted messages are stored on the server **only until delivery**
3. Once delivered, messages are **stored locally** on each user's device
4. Messages are **deleted from the server** after successful delivery and local storage

This approach ensures that:
- Message content can only be read by the intended recipients
- The server never stores unencrypted message content
- Messages are not retained on the server longer than necessary
- Users maintain full control over their message history

## Architecture

### Message Flow

```
┌────────────────┐                ┌──────────────┐                ┌────────────────┐
│                │  1. Encrypted  │              │  4. Encrypted  │                │
│                │─────────────▶  │              │─────────────▶  │                │
│    Sender      │                │    Server    │                │   Recipient    │
│                │  2. Store      │              │  5. Decrypt    │                │
│                │   locally      │              │   & store      │                │
└────────────────┘                └──────────────┘                └────────────────┘
        │                                                                │
        │                                                                │
        └────────────────────┐                 ┌───────────────────────┘
                            ▼                 ▼
                      ┌──────────────────────────────┐
                      │                              │
                      │     Local Message Storage    │
                      │                              │
                      └──────────────────────────────┘
                                    ▲
                                    │
                      ┌──────────────────────────────┐
                      │       Backup/Restore         │
                      └──────────────────────────────┘
```

### Sending Messages

1. User composes a message
2. Message is stored locally in the sender's device
3. Message is encrypted using the recipient's public key
4. Encrypted message is sent to the server
5. Server stores the encrypted message until the recipient retrieves it

### Receiving Messages

1. User connects to the server (via polling or WebSocket)
2. Server sends any pending encrypted messages to the recipient
3. Client decrypts messages using the recipient's private key
4. Decrypted messages are stored in the recipient's local storage
5. Client acknowledges receipt, and server deletes the encrypted messages

## Implementation Details

### Backend API

- `POST /message`: Stores an encrypted message on the server
- `GET /message/:userId/:contactId`: Retrieves encrypted messages for a user
- `DELETE /message/:userId/received`: Deletes messages from server after they've been received

### Frontend Storage

Messages are stored in localStorage using a structured format:
- Each conversation has its own storage entry
- Messages are organized chronologically
- Duplicates are automatically filtered
- Backup and restore functionality is available

### Security Features

- Messages are end-to-end encrypted
- Server never has access to decrypted content
- Minimal server-side storage of message content
- Users control their own message history

## User Controls

Users have several controls for managing their message data:

1. **Backup Messages**: Export encrypted backup of message history
2. **Restore Messages**: Import a previous message backup
3. **Delete Messages**: Clear message history for specific conversations or all conversations
4. **Account Deletion**: Removes all message data locally and from the server

## Best Practices

1. **Regular Backups**: Users should periodically back up their message history
2. **Secure Password**: Protect the local device with a secure password
3. **Client Security**: Keep the client application updated for latest security features
4. **Device Management**: Be cautious about using the application on shared devices

## Limitations

1. Messages are only available on the device where they were sent/received
2. If a user loses their device without a backup, message history is lost
3. Offline messaging requires server storage until the recipient comes online
