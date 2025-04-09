# Blade Warrior

An arcade-style action game with zero-knowledge proof score verification using SP1 ZK technology.

## Overview

Blade Warrior is a retro arcade game where players control a warrior battling through waves of enemies. What makes it unique is the integration of SP1 zero-knowledge proofs to cryptographically verify game scores, ensuring fairness and preventing cheating.

## Features

- Fast-paced arcade-style gameplay
- Multiple waves of increasingly difficult enemies
- Zero-knowledge proof verification for game scores
- Retro pixel art graphics and sound effects
- Leaderboard system with cryptographically verified scores

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (version 14 or newer)
- [Rust](https://www.rust-lang.org/tools/install)
- [Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html)
- [Git](https://git-scm.com/downloads)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/username/blade-warrior.git
   cd blade-warrior
   ```

2. Set up the backend:
   ```bash
   cd backend
   npm install
   ```

3. Create a `.env` file in the backend directory (optional):
   ```
   PORT=3000
   SIMULATION_MODE=false
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

## Running the Game

1. Start the backend server:
   ```bash
   cd ../backend
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## How to Play

- Use **Arrow Keys** to move your warrior
- Press **Space** to attack enemies
- Survive as long as possible and defeat enemies to earn points
- After game over, you can verify your score using SP1 zero-knowledge proofs

## Project Structure

- `/backend` - Node.js server for handling score verification API
- `/program` - Rust SP1 program for generating ZK proofs
- `/script` - Rust scripts for interacting with the SP1 program
- `/lib` - Shared Rust library code
- `/web` - Frontend web application with the game

## Score Verification

The game uses SP1 zero-knowledge proofs to verify scores. This ensures:

1. Scores cannot be tampered with
2. Verification is trustless and cryptographically secure
3. The verification process doesn't reveal gameplay details

## Development

### Backend Development

The backend server uses Express.js and communicates with the SP1 verification system:

```bash
cd backend
npm install
node server.js
```

### Frontend Development

The game is built using HTML5 Canvas and JavaScript. No build process is required - simply edit the files in the `/web` directory.

## Deployment

The game can be deployed to any standard web hosting service or VPS:

1. Clone the repository to your server
2. Install dependencies and build the Rust components
3. Start the Node.js server
4. Optionally set up a reverse proxy with Nginx/Apache for HTTPS

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- SP1 by Succinct Labs for the zero-knowledge proof technology
- The retro arcade game community for inspiration
