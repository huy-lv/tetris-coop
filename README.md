# Tetris Multiplayer Game

A real-time multiplayer Tetris game built with React, TypeScript, Node.js, and Socket.IO.

## Features

- Real-time multiplayer gameplay
- Customizable controls with localStorage persistence
- Mobile touch controls with hold-to-repeat functionality
- Room-based game sessions
- Responsive design for desktop and mobile

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies for both client and server:

```bash
# Install client dependencies
cd client
yarn install

# Install server dependencies
cd ../server
yarn install
```

3. Create environment files (optional):

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
```

### Running in Development

1. Start the server:

```bash
cd server
yarn run dev
```

2. Start the client (in another terminal):

```bash
cd client
yarn run dev
```

The client will be available at `http://localhost:5173` and the server at `http://localhost:3001`.

## Production Deployment

### Docker Deployment (Recommended)

#### Build and Run with Docker

```bash
# Build the Docker image
docker build -t tetris-game .

# Run the container
docker run -p 3000:3000 -p 3001:3001 tetris-game
```

#### Using Docker Compose

```bash
# Start the application
docker-compose up

# Start in background
docker-compose up -d

# Stop the application
docker-compose down
```

The application will be available at:

- Client: `http://localhost:3000`
- Server: `http://localhost:3001`

#### Environment Variables for Docker

You can override environment variables using a `.env` file or by passing them directly:

```bash
# Using environment variables
docker run -e NODE_ENV=production -e PORT=3001 -p 3000:3000 -p 3001:3001 tetris-game

# Using docker-compose with .env file
cp .env.example .env
# Edit .env with your values
docker-compose up
```

### Manual Production Deployment

#### Build the Client

```bash
cd client
yarn install
yarn run build
```

#### Build and Start the Server

```bash
cd server
yarn install
yarn run build
yarn start
```

#### Serve Static Files

You can serve the built client files using any static file server. The built files are in `client/dist/`.

## Configuration

### Environment Variables

#### Client (.env in root directory)

- `VITE_SERVER_URL`: Socket.IO server URL (default: auto-detected)

#### Server

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

### Control Customization

Players can customize their controls through the settings dialog:

1. Click the settings button in the game interface
2. Go to the "Controls" tab
3. Click on any control to rebind it
4. Settings are automatically saved to localStorage

### Mobile Controls

The game automatically detects mobile devices and provides touch controls:

- Tap and hold movement buttons for continuous movement
- Separate buttons for rotation and actions
- Optimized for touch screen gameplay

## Architecture

- **Client**: React + TypeScript + Vite
- **Server**: Node.js + Express + TypeScript
- **Real-time Communication**: Socket.IO
- **Containerization**: Docker with multi-stage builds
- **Process Management**: PM2 for production

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript types
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── game/          # Game logic
│   │   ├── models/        # Data models
│   │   └── types/         # TypeScript types
│   └── package.json
├── docker-compose.yml      # Docker orchestration
├── Dockerfile             # Multi-stage Docker build
└── .env.example           # Environment variables template
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
