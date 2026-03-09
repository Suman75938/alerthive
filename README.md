# AlertHive

A modern incident management and alert monitoring mobile application built with React Native and Expo.

## Features

- **Dashboard** - Real-time overview of active incidents, critical alerts, and quick action buttons
- **Alert Management** - View, search, filter, acknowledge, close, snooze, and escalate alerts
- **On-Call Scheduling** - View current on-call rotations, team members, and contact info
- **Incident Timeline** - Detailed incident views with responder info and activity timeline
- **Settings** - Notification preferences, alert routing, integrations, and appearance

## Tech Stack

- **React Native** with **Expo**
- **TypeScript** for type safety
- **React Navigation** for routing (bottom tabs + stack navigation)
- **Ionicons** for vector icons
- Dark theme optimized for on-call use

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)

### Installation

```bash
npm install
```

### Running the App

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your device to preview.

## Project Structure

```
src/
  components/    # Reusable UI components (AlertCard, IncidentCard, StatCard)
  data/          # Mock data for development
  navigation/    # App navigation configuration
  screens/       # Screen components (Dashboard, Alerts, OnCall, Settings, etc.)
  theme/         # Colors, spacing, and typography tokens
  types/         # TypeScript type definitions
```

## License

MIT
