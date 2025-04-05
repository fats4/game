# SP1 Image Generator

A zero-knowledge proof application for generating and verifying images using SP1 ZK technology.

## Overview

SP1 Image Generator allows users to create AI-generated images with cryptographic proofs that verify the image's authenticity and properties. The application uses SP1, a zero-knowledge proof system developed by Succinct Labs.

## Features

- AI image generation with customizable prompts
- Zero-knowledge proof generation for image verification
- Image size and dimension verification
- Downloadable images with proof certificates
- Web-based user interface

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (version 14 or newer)
- [Rust](https://www.rust-lang.org/tools/install)
- [Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html)
- [Git](https://git-scm.com/downloads)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/username/sp1-image-generator.git
   cd sp1-image-generator
   ```

2. Set up the backend:
   ```bash
   cd backend
   npm install
   ```

3. Create a `.env` file in the backend directory:
   ```
   STABILITY_API_KEY=your_stability_ai_api_key
   ```

4. Compile the Rust program:
   ```bash
   cd ../program
   cargo build --release
   ```

5. Compile the SP1 scripts:
   ```bash
   cd ../script
   cargo build --release
   ```

## Running the Application

1. Start the backend server:
   ```bash
   cd ../backend
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Click "Generate Image" on the main screen
2. Enter a prompt describing the image you want to create
3. Select the desired image dimensions
4. Click "Generate" to create your image
5. Once generated, you can:
   - Generate a ZK proof for the image
   - Download the image
   - Share the image

## Project Structure

- `/backend` - Node.js server for handling API requests
- `/program` - Rust SP1 program for generating ZK proofs
- `/script` - Rust scripts for interacting with the SP1 program
- `/lib` - Shared Rust library code
- `/web` - Frontend web application

## Development

### Backend Development

The backend server uses Express.js and handles image generation via the Stability AI API.
