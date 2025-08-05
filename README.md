# Twitch Chat Reader

A web-based application that reads Twitch chat messages aloud using text-to-speech technology. Perfect for streamers who want to hear chat messages without constantly looking at the screen.

## Features

### Core Functionality
- **Real-time Chat Reading**: Connects to any Twitch channel and reads chat messages aloud
- **Event Announcements**: Optional reading of follows, subscriptions, cheers, and other events
- **Premium TTS**: Uses ElevenLabs AI for natural, high-quality voice synthesis with fallback to browser TTS

### Filtering & Moderation
- **Profanity Filter**: Built-in filter for common inappropriate words
- **Custom Filters**: Add your own keywords to filter out
- **User Muting**: Mute specific users to ignore their messages
- **Smart Filtering**: Filtered messages are shown but not spoken

### Customization
- **ElevenLabs Voices**: Choose from premium AI voices (Rachel, Domi, Bella, Antoni, etc.)
- **Voice Controls**: Adjust stability and clarity for optimal speech quality
- **Queue Management**: View upcoming messages, pause/resume, clear queue
- **Persistent Settings**: All preferences are saved locally

## Usage

### Quick Start (Browser TTS)
1. **Open the Application**: Visit the deployed GitHub Pages URL
2. **Enter Username**: Type a Twitch username (without the @ symbol)
3. **Connect**: Click "Connect" to start listening to their chat
4. **Listen**: The app will automatically read new chat messages aloud using browser TTS

### Premium Experience (ElevenLabs)
1. **Get ElevenLabs API Key**: Sign up at [elevenlabs.io](https://elevenlabs.io) and get your API key
2. **Enter API Key**: Paste your ElevenLabs API key in the settings
3. **Select Voice**: Choose from premium AI voices (Rachel, Domi, Bella, etc.)
4. **Configure**: Adjust voice stability and clarity settings
5. **Enjoy**: High-quality AI voices will read chat messages

## Settings

### Speech Settings
- **ElevenLabs API Key**: Your API key for premium voice synthesis
- **Voice**: Select from premium ElevenLabs AI voices
- **Voice Stability**: Control voice consistency (0-100%)
- **Voice Clarity**: Adjust voice clarity and similarity (0-100%)

### Filtering Options
- **Filter Profanity**: Toggle built-in profanity filter
- **Read Events**: Enable/disable reading of follows, subs, etc.
- **Custom Filters**: Add comma-separated words to filter

### User Management
- **Mute Users**: Add usernames to ignore their messages
- **Unmute**: Click the × next to a muted user to unmute them

## Technical Details

### Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Twitch Integration**: Direct WebSocket connection to Twitch IRC
- **Text-to-Speech**: ElevenLabs API for premium AI voices with Web Speech API fallback
- **Deployment**: GitHub Pages (static hosting)

### Browser Compatibility
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

*Note: ElevenLabs provides consistent high-quality voices across all browsers. Browser TTS is used as fallback only.*

### Privacy & Security
- **No Server Required**: Runs entirely in your browser
- **No Data Collection**: All settings stored locally
- **No Authentication**: Uses public Twitch chat (no login required)
- **API Key Security**: ElevenLabs API key stored locally only

## Development

### Local Development
1. Clone the repository
2. Open `index.html` in a web browser
3. Or serve with a local HTTP server for best results

### File Structure
```
├── index.html          # Main application page
├── styles.css          # Application styling
├── script.js           # Core application logic
└── README.md          # This documentation
```

## Deployment

This application is designed for GitHub Pages deployment:

1. Push code to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source branch (usually `main` or `gh-pages`)
4. Access via the provided GitHub Pages URL

## Limitations

- **Public Chats Only**: Can only read public chat messages
- **Browser Dependent**: TTS quality depends on browser and OS
- **Rate Limits**: Subject to Twitch's rate limiting for chat connections
- **No Chat History**: Only reads new messages after connection

## Future Enhancements

Potential improvements for future versions:
- Support for multiple channels simultaneously
- Advanced filtering with regex patterns
- Chat message history and replay
- Custom sound effects for different event types
- Donation/tip integration
- Voice cloning for personalized experiences
- Integration with other TTS providers (OpenAI TTS, Azure Cognitive Services)

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.