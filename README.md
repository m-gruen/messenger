# Self-Hosted End-to-End Messenger

## Team Members

* [**Mark Grünzweil**](https://github.com/m-gruen)
* [**Henry Ladstätter**](https://github.com/HenryLad)
* [**Antonio Subašić**](https://github.com/antoniosubasic)
* [**David Vrhovac**](https://github.com/PlutoTinte06)

## Introduction

This project implements a self-hosted end-to-end encrypted messaging application. Which was builded as a part of the WMC course at the HTLBLA Leonding in 2025. The goal of this project was to prove the goverment wrong and show that if a group of students is able to build something like this and criminals can too. 

## Features

* End-to-end encryption
* Self-hosted infrastructure
* User authentication and registration
* Real-time messaging
* Message persistence
* Cross-platform compatibility

## Architecture

The application is built using a client-server architecture:

* **Frontend**: The user interface that runs on the client device
* **Backend**: The server that handles message routing and storage
* **Database**: The storage system for user data and messages

## Configuration

### .env-Template
| Variable | Value |
|----------|-------|
| DB_USER | messenger |
| DB_PASSWORD | messenger |
| DB_NAME | messenger |
| DB_PORT | 5432 |
| BACKEND_PORT | 3000 |
| FRONTEND_PORT | 8080 |
