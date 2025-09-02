# WeatherLive Pro 🌤️

A modern, professional weather dashboard application that provides real-time weather data with beautiful animations and a responsive design. Built with vanilla JavaScript, Node.js, and integrated with Google Weather APIs for accurate, enterprise-grade weather information.

![Weather App Version](https://img.shields.io/badge/version-4.0.0-blue.svg)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🌍 **Real-Time Weather Data**

- **Current Weather Conditions** - Temperature, humidity, pressure, wind speed & direction
- **7-Day Weather Forecast** - Extended forecast with detailed daily predictions
- **Air Quality Index (AQI)** - Real-time air quality monitoring with health recommendations
- **Sun & Moon Information** - Sunrise/sunset times with animated icons
- **Moon Phases** - Current moon phase with emoji representation

### 🎨 **Modern UI/UX Design**

- **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices
- **Animated Weather Icons** - Beautiful FontAwesome icons with custom animations
- **Gradient Backgrounds** - Dynamic color schemes that adapt to weather conditions
- **Smooth Transitions** - Fluid animations and hover effects
- **Glass-morphism Effects** - Modern frosted glass design elements

### 🔧 **Technical Features**

- **Google APIs Integration** - Google Weather API, Geocoding, Places, and Air Quality APIs
- **Zero Mock Data Policy** - All data comes directly from official Google services
- **City Search** - Intelligent city search with autocomplete suggestions
- **Coordinate-based Weather** - Get weather by exact GPS coordinates
- **Error Handling** - Robust error handling with user-friendly messages
- **API Health Monitoring** - Built-in endpoint to check API status

## 🚀 Quick Start

### Prerequisites

- Node.js (version 14.0.0 or higher)
- Google Cloud Platform account with APIs enabled
- Google API Key with the following APIs enabled:
  - Google Weather API
  - Google Geocoding API
  - Google Places API
  - Google Air Quality API

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd weather-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   PORT=3000
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   Or for production:

   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
weather-app/
├── public/                 # Static files served to the client
│   ├── index.html         # Main HTML file
│   ├── styles.css         # CSS styles and animations
│   ├── script.js          # Client-side JavaScript
│   └── favicon.svg        # App icon
├── server.js              # Express server and API routes
├── package.json           # Project dependencies and scripts
├── .env                   # Environment variables (create this)
└── README.md             # Project documentation
```

## 🔌 API Endpoints

### Weather Endpoints

- `GET /api/weather/:city` - Get current weather for a city
- `GET /api/weather/coords/:lat/:lng` - Get weather by coordinates
- `GET /api/weather-chart/:city` - Get 7-day forecast data

### Additional Services

- `GET /api/air-quality/:city` - Get air quality index for a city
- `GET /api/cities/search/:query` - Search for cities with autocomplete
- `GET /api/health` - Check API status and integration health

### Example API Response

```json
{
  "location": {
    "city": "New York",
    "country": "United States",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "current": {
    "temperature": 22,
    "description": "Partly cloudy",
    "humidity": 65,
    "pressure": 1013,
    "windSpeed": 12,
    "windDirection": "NW"
  },
  "forecast": [...],
  "airQuality": {
    "aqi": 45,
    "category": "Good"
  }
}
```

## 🛠️ Technologies Used

### Backend

- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Axios** - HTTP client for API requests
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with animations and transitions
- **Vanilla JavaScript** - Client-side functionality
- **FontAwesome 6** - Icon library

### APIs & Services

- **Google Weather API** - Current weather and forecasts
- **Google Geocoding API** - Convert city names to coordinates
- **Google Places API** - City search and autocomplete
- **Google Air Quality API** - Air pollution data

## 🎨 UI Components

### Weather Cards

- **Current Weather** - Large display with temperature and conditions
- **Forecast Cards** - 7-day forecast with daily highs/lows
- **Stat Cards** - Humidity, pressure, wind, and AQI information

### Interactive Elements

- **City Search** - Real-time search with suggestions
- **Sun & Moon Section** - Animated sunrise/sunset display with icons
- **Weather Icons** - Contextual icons that change based on conditions
- **Responsive Navigation** - Mobile-friendly interface

## 🔧 Configuration

### Environment Variables

```env
# Required
GOOGLE_API_KEY=your_google_api_key_here

# Optional
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production         # Environment mode
```

### Google API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the required APIs:
   - Google Weather API
   - Google Geocoding API
   - Google Places API
   - Google Air Quality API
4. Create credentials (API Key)
5. Add your API key to the `.env` file

## 📱 Responsive Design

The application is fully responsive and optimized for:

- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

## 🎯 Features in Detail

### Weather Display

- Real-time temperature with "feels like" indication
- Weather condition descriptions with appropriate icons
- Comprehensive weather statistics (humidity, pressure, wind)
- 7-day detailed forecast with daily summaries

### Air Quality Monitoring

- Current AQI value with color-coded health categories
- Health recommendations based on air quality levels
- Integration with Google's official air quality data

### Sun & Moon Information

- Accurate sunrise and sunset times
- Current moon phase with emoji representation
- Animated sun and moon icons with glowing effects
- Smooth transitions and hover animations

## 🚀 Deployment

### Local Development

```bash
npm run dev    # Start with nodemon for auto-restart
```

### Production Build

```bash
npm start      # Start production server
```

### Environment Setup for Production

- Set `NODE_ENV=production`
- Use process manager like PM2 for production deployment
- Configure reverse proxy (nginx) if needed
- Set up SSL certificates for HTTPS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Weather APIs** for providing accurate weather data
- **FontAwesome** for the beautiful icon library
- **Express.js** community for the robust web framework
- Weather data provided by Google's official weather services

## 📞 Support

If you encounter any issues or have questions:

1. Check the [API health endpoint](http://localhost:3000/api/health)
2. Verify your Google API key and enabled services
3. Check the browser console for any JavaScript errors
4. Ensure all required environment variables are set

## 🔮 Future Enhancements

- [ ] Weather alerts and notifications
- [ ] Historical weather data charts
- [ ] Weather radar maps
- [ ] Multiple location management
- [ ] Dark/light theme toggle
- [ ] Progressive Web App (PWA) features
- [ ] Weather widgets for embedding

---

**WeatherLive Pro** - Your gateway to professional weather information 🌤️

_Built with ❤️ using modern web technologies and Google's enterprise-grade APIs_
