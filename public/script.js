class WeatherLivePro {
  constructor() {
    this.isLoading = false;
    this.currentLocation = "Delhi";
    this.weatherData = null;
    this.recentSearches = JSON.parse(
      localStorage.getItem("recentSearches") || "[]"
    );
    this.lastWeatherData = null;
    this.refreshInterval = null;

    this.settings = {
      temperatureUnit: "C",
      autoRefresh: true,
      weatherBackgrounds: true,
      notifications: true,
      keyboardShortcuts: true,
      autocomplete: true,
      refreshInterval: 600000,
      dataSource: "auto",
    };

    this.init();
  }

  async init() {
    this.loadUserPreferences();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupAutoComplete();
    this.setupWeatherChart();
    this.updateTime();
    await this.loadDefaultWeather();

    setInterval(() => this.updateTime(), 60000);
    setInterval(() => this.refreshWeather(), 600000);

    window.addEventListener("resize", () => {
      if (this.chartData) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.refreshChart();
        }, 300);
      }
    });
  }

  setupEventListeners() {
    const searchBtn = document.getElementById("searchBtn");
    const cityInput = document.getElementById("cityInput");
    const locationBtn = document.getElementById("locationBtn");

    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.searchWeather());
    }

    if (cityInput) {
      cityInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.searchWeather();
      });
    }

    if (locationBtn) {
      locationBtn.addEventListener("click", () => this.getUserLocation());
    }

    const allowLocationBtn = document.getElementById("allowLocationBtn");
    const dismissLocationBtn = document.getElementById("dismissLocationBtn");

    if (allowLocationBtn) {
      allowLocationBtn.addEventListener("click", () =>
        this.requestUserLocation()
      );
    }

    if (dismissLocationBtn) {
      dismissLocationBtn.addEventListener("click", () =>
        this.dismissLocationBanner()
      );
    }

    // Quick city buttons
    document.querySelectorAll(".city-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const city = e.target.dataset.city;
        this.loadCityWeather(city);
      });
    });

    // Temperature unit toggle - click on temperature to switch units
    const mainTemp = document.getElementById("mainTemp");
    const feelsLike = document.getElementById("feelsLike");

    if (mainTemp) {
      mainTemp.addEventListener("click", () => this.toggleTemperatureUnit());
      mainTemp.style.cursor = "pointer";
      mainTemp.title = "Click to toggle °C/°F";
    }

    // Settings panel
    this.setupSettingsListeners();
  }

  setupSettingsListeners() {
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsOverlay = document.getElementById("settingsOverlay");
    const closeSettings = document.getElementById("closeSettings");
    const saveSettings = document.getElementById("saveSettings");
    const resetSettings = document.getElementById("resetSettings");

    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => this.openSettings());
    }

    if (closeSettings) {
      closeSettings.addEventListener("click", () => this.closeSettings());
    }

    if (settingsOverlay) {
      settingsOverlay.addEventListener("click", (e) => {
        if (e.target === settingsOverlay) {
          this.closeSettings();
        }
      });
    }

    if (saveSettings) {
      saveSettings.addEventListener("click", () => this.saveSettings());
    }

    if (resetSettings) {
      resetSettings.addEventListener("click", () => this.resetSettings());
    }

    // Individual setting change listeners
    this.setupSettingToggleListeners();
  }

  setupSettingToggleListeners() {
    const toggles = [
      "tempUnitToggle",
      "autoRefreshToggle",
      "backgroundToggle",
      "notificationsToggle",
      "shortcutsToggle",
      "autocompleteToggle",
    ];

    toggles.forEach((toggleId) => {
      const toggle = document.getElementById(toggleId);
      if (toggle) {
        toggle.addEventListener("change", () =>
          this.updateSettingFromUI(toggleId)
        );
      }
    });

    // Select dropdowns
    const refreshSelect = document.getElementById("refreshInterval");
    const dataSourceSelect = document.getElementById("dataSource");

    if (refreshSelect) {
      refreshSelect.addEventListener("change", () =>
        this.updateSettingFromUI("refreshInterval")
      );
    }

    if (dataSourceSelect) {
      dataSourceSelect.addEventListener("change", () =>
        this.updateSettingFromUI("dataSource")
      );
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Only trigger if not typing in an input field and shortcuts are enabled
      if (e.target.tagName === "INPUT" || !this.settings.keyboardShortcuts)
        return;

      switch (e.key.toLowerCase()) {
        case "l":
          e.preventDefault();
          this.getUserLocation();
          break;
        case "r":
          e.preventDefault();
          this.refreshWeather();
          break;
        case "t":
          e.preventDefault();
          this.toggleTemperatureUnit();
          break;
        case "s":
          e.preventDefault();
          document.getElementById("cityInput").focus();
          break;
        case "g":
          e.preventDefault();
          this.openSettings();
          break;
        case "escape":
          const settingsOverlay = document.getElementById("settingsOverlay");
          if (settingsOverlay.classList.contains("active")) {
            this.closeSettings();
          } else {
            document.getElementById("cityInput").blur();
          }
          break;
      }
    });
  }

  setupAutoComplete() {
    const cityInput = document.getElementById("cityInput");
    if (!cityInput) return;

    const suggestionsList = document.createElement("div");
    suggestionsList.className = "autocomplete-suggestions";
    suggestionsList.style.display = "none";
    cityInput.parentNode.appendChild(suggestionsList);

    cityInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        suggestionsList.style.display = "none";
        return;
      }

      this.showAutoCompleteSuggestions(query, suggestionsList);
    });

    cityInput.addEventListener("blur", () => {
      setTimeout(() => (suggestionsList.style.display = "none"), 200);
    });
  }

  setupWeatherChart() {
    // Setup chart control buttons
    const chartButtons = document.querySelectorAll(".chart-btn");
    chartButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const chartType = e.currentTarget.dataset.chart;
        this.switchChartType(chartType);

        // Update active button
        chartButtons.forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
      });
    });

    // Initialize chart data
    this.chartData = null;
    this.currentChartType = "temperature";

    // Setup intersection observer for chart visibility
    this.setupChartVisibilityObserver();
  }

  setupChartVisibilityObserver() {
    const weatherChart = document.getElementById("weatherChart");
    if (weatherChart && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && this.chartData) {
              // Chart is now visible, refresh it to ensure proper rendering
              setTimeout(() => {
                this.refreshChart();
              }, 100);
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(weatherChart);
      this.chartObserver = observer;
    }
  }

  async loadWeatherChart(city) {
    try {
      const chartLoading = document.getElementById("chartLoading");
      const weatherChart = document.getElementById("weatherChart");

      if (chartLoading) chartLoading.style.display = "flex";
      if (weatherChart) weatherChart.style.display = "none";

      console.log(`📊 Loading weather chart for: ${city}`);

      const response = await fetch(
        `/api/weather-chart/${encodeURIComponent(city)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch weather chart data");
      }

      this.chartData = await response.json();

      // Clear previous chart
      const chartGrid = document.querySelector(".chart-grid");
      if (chartGrid) {
        chartGrid.innerHTML = "";
      }

      // Render the chart with a slight delay to ensure proper display
      setTimeout(() => {
        this.renderWeatherChart();
      }, 100);

      if (chartLoading) chartLoading.style.display = "none";
      if (weatherChart) weatherChart.style.display = "block";

      console.log(`✅ Weather chart loaded for: ${this.chartData.city}`);
    } catch (error) {
      console.error("❌ Weather chart error:", error);
      const chartLoading = document.getElementById("chartLoading");
      if (chartLoading) {
        chartLoading.innerHTML = `
          <div style="color: var(--red); text-align: center;">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Unable to load weather trend data</p>
          </div>
        `;
      }
    }
  }

  renderWeatherChart() {
    if (!this.chartData) return;

    const timeline = document.querySelector(".chart-timeline");
    const chartGrid = document.querySelector(".chart-grid");

    if (!timeline || !chartGrid) return;

    // Clear existing chart elements
    chartGrid.innerHTML = "";

    // Render timeline days with enhanced animations
    const timelineDays = timeline.querySelectorAll(".timeline-day");
    const combinedData = this.chartData.combined;

    timelineDays.forEach((dayElement, index) => {
      if (index < combinedData.length) {
        const dayData = combinedData[index];
        const weatherElement = dayElement.querySelector(".day-weather");
        const tempElement = dayElement.querySelector(".day-temp");
        const labelElement = dayElement.querySelector(".day-label");

        // Add entrance animation
        dayElement.style.opacity = "0";
        dayElement.style.transform = "translateY(20px)";

        setTimeout(() => {
          dayElement.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
          dayElement.style.opacity = "1";
          dayElement.style.transform = "translateY(0)";
        }, index * 100);

        if (weatherElement) {
          weatherElement.textContent = this.getWeatherEmoji(
            dayData.weather.icon
          );
          // Add weather icon animation
          weatherElement.style.transform = "scale(0)";
          setTimeout(() => {
            weatherElement.style.transition =
              "transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
            weatherElement.style.transform = "scale(1)";
          }, index * 100 + 200);
        }

        if (tempElement) {
          const tempMin = this.convertTemperature(dayData.temp_min);
          const tempMax = this.convertTemperature(dayData.temp_max);
          const tempSymbol = this.getTemperatureSymbol();

          tempElement.innerHTML = `
            <div style="background: linear-gradient(45deg, var(--primary-blue), var(--purple)); 
                        background-clip: text; 
                        -webkit-background-clip: text; 
                        -webkit-text-fill-color: transparent;
                        font-weight: 800;">${tempMax}${tempSymbol}</div>
            <div class="temp-range" style="opacity: 0.7;">${tempMin}${tempSymbol}</div>
          `;
        }

        if (labelElement && (dayData.dayName || dayData.day)) {
          labelElement.textContent = dayData.dayName || dayData.day;
        }

        // Update date element if it exists
        const dateElement = dayElement.querySelector(".day-date");
        if (dateElement && dayData.date) {
          dateElement.textContent = dayData.date;
        }

        // Add special styling for current day with glow effect
        if (dayData.current) {
          dayElement.classList.add("today");
          setTimeout(() => {
            dayElement.style.boxShadow =
              "0 8px 25px rgba(59, 130, 246, 0.4), 0 0 50px rgba(59, 130, 246, 0.2)";
          }, index * 100 + 400);
        } else {
          dayElement.classList.remove("today");
        }
      }
    });

    // Draw chart line and points with enhanced delay for staggered animation
    setTimeout(() => {
      this.drawChartLine(combinedData);
    }, combinedData.length * 100 + 300);
  }

  drawChartLine(data) {
    const chartGrid = document.querySelector(".chart-grid");
    if (!chartGrid) return;

    // Wait for container to be fully rendered
    setTimeout(() => {
      const gridRect = chartGrid.getBoundingClientRect();
      const gridWidth = gridRect.width;
      const gridHeight = gridRect.height;

      // Ensure we have valid dimensions
      if (gridWidth === 0 || gridHeight === 0) {
        console.warn("Chart container has zero dimensions, retrying...");
        setTimeout(() => this.drawChartLine(data), 100);
        return;
      }

      // Add padding to ensure points are visible
      const padding = 20;
      const drawWidth = gridWidth - padding * 2;
      const drawHeight = gridHeight - padding * 2;

      // Get values based on current chart type
      const values = data.map((day) => {
        switch (this.currentChartType) {
          case "temperature":
            return day.temp_avg;
          case "humidity":
            return day.humidity;
          case "pressure":
            return day.pressure - 1000; // Normalize pressure values
          default:
            return day.temp_avg;
        }
      });

      // Calculate min/max for scaling with some margin
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const margin = (maxValue - minValue) * 0.1 || 1; // 10% margin
      const scaledMin = minValue - margin;
      const scaledMax = maxValue + margin;
      const range = scaledMax - scaledMin || 1;

      // Clear existing chart elements
      chartGrid
        .querySelectorAll(".chart-data-point, .chart-line")
        .forEach((el) => el.remove());

      // Draw data points and lines with enhanced animations
      const points = [];

      values.forEach((value, index) => {
        const x = padding + (index / (values.length - 1)) * drawWidth;
        const y =
          padding + drawHeight - ((value - scaledMin) / range) * drawHeight;

        // Create data point with enhanced styling
        const point = document.createElement("div");
        point.className = "chart-data-point";
        point.style.left = `${x}px`;
        point.style.top = `${y}px`;
        point.title = `${data[index].day}: ${this.formatChartValue(value)}`;

        // Enhanced styling and animations
        point.style.position = "absolute";
        point.style.zIndex = "15";
        point.style.opacity = "0";
        point.style.transform = "translate(-50%, -50%) scale(0)";

        // Add value label that appears on hover
        const valueLabel = document.createElement("div");
        valueLabel.className = "chart-value-label";
        valueLabel.textContent = this.formatChartValue(value);
        valueLabel.style.cssText = `
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, var(--primary-blue), var(--purple));
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        point.appendChild(valueLabel);

        // Show label on hover
        point.addEventListener("mouseenter", () => {
          valueLabel.style.opacity = "1";
          valueLabel.style.transform = "translateX(-50%) translateY(-5px)";
        });

        point.addEventListener("mouseleave", () => {
          valueLabel.style.opacity = "0";
          valueLabel.style.transform = "translateX(-50%) translateY(0)";
        });

        chartGrid.appendChild(point);
        points.push({ x, y, element: point });

        // Animate point appearance with staggered timing
        setTimeout(() => {
          point.style.transition =
            "all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
          point.style.opacity = "1";
          point.style.transform = "translate(-50%, -50%) scale(1)";
        }, index * 150);
      });

      // Draw lines between points with animation
      setTimeout(() => {
        for (let i = 0; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];

          const line = document.createElement("div");
          line.className = "chart-line";

          const distance = Math.sqrt(
            Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
          );
          const angle =
            (Math.atan2(next.y - current.y, next.x - current.x) * 180) /
            Math.PI;

          line.style.width = `0px`; // Start with 0 width for animation
          line.style.left = `${current.x}px`;
          line.style.top = `${current.y}px`;
          line.style.transform = `rotate(${angle}deg)`;
          line.style.transformOrigin = "0 50%";
          line.style.position = "absolute";
          line.style.zIndex = "5";
          line.style.opacity = "0";

          chartGrid.appendChild(line);

          // Animate line drawing
          setTimeout(() => {
            line.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
            line.style.width = `${distance}px`;
            line.style.opacity = "1";
          }, i * 200);
        }
      }, points.length * 150 + 200);

      // Force a repaint to ensure visibility
      chartGrid.style.opacity = "0.99";
      setTimeout(() => {
        chartGrid.style.opacity = "1";
      }, 10);
    }, 10);
  }

  refreshChart() {
    if (this.chartData) {
      console.log("🔄 Refreshing weather chart...");
      const chartGrid = document.querySelector(".chart-grid");
      if (chartGrid) {
        chartGrid.innerHTML = "";
      }

      setTimeout(() => {
        this.renderWeatherChart();
      }, 50);
    }
  }

  switchChartType(type) {
    this.currentChartType = type;
    if (this.chartData) {
      // Force a complete redraw of the chart
      const chartGrid = document.querySelector(".chart-grid");
      if (chartGrid) {
        chartGrid.innerHTML = "";
      }

      // Re-render the chart with a slight delay to ensure proper clearing
      setTimeout(() => {
        this.drawChartLine(this.chartData.combined);
      }, 50);
    }
  }

  formatChartValue(value) {
    switch (this.currentChartType) {
      case "temperature":
        return `${Math.round(value)}${this.getTemperatureSymbol()}`;
      case "humidity":
        return `${Math.round(value)}%`;
      case "pressure":
        return `${Math.round(value + 1000)} hPa`;
      default:
        return Math.round(value);
    }
  }

  showAutoCompleteSuggestions(query, container) {
    const popularCities = [
      "New York",
      "London",
      "Tokyo",
      "Paris",
      "Delhi",
      "Sydney",
      "Mumbai",
      "Dubai",
      "Los Angeles",
      "Chicago",
      "Toronto",
      "Berlin",
      "Madrid",
      "Rome",
      "Bangkok",
      "Singapore",
      "Hong Kong",
      "Seoul",
      "Moscow",
      "Cairo",
      "Istanbul",
      "Amsterdam",
    ];

    const matches = [
      ...this.recentSearches
        .filter((city) => city.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3),
      ...popularCities
        .filter((city) => city.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5),
    ].slice(0, 6);

    if (matches.length === 0) {
      container.style.display = "none";
      return;
    }

    container.innerHTML = matches
      .map(
        (city) =>
          `<div class="autocomplete-item" onclick="weatherApp.loadCityWeather('${city}')">${city}</div>`
      )
      .join("");

    container.style.display = "block";
  }

  toggleTemperatureUnit() {
    this.settings.temperatureUnit =
      this.settings.temperatureUnit === "C" ? "F" : "C";
    localStorage.setItem("weatherAppSettings", JSON.stringify(this.settings));

    if (this.weatherData) {
      this.updateDisplay();
    }

    // Update the toggle in settings if open
    const tempToggle = document.getElementById("tempUnitToggle");
    if (tempToggle) {
      tempToggle.checked = this.settings.temperatureUnit === "F";
    }

    // Add visual feedback
    const mainTemp = document.getElementById("mainTemp");
    if (mainTemp) {
      mainTemp.style.transform = "scale(1.1)";
      setTimeout(() => (mainTemp.style.transform = "scale(1)"), 200);
    }

    // Show notification using the enhanced system
    if (this.settings.notifications) {
      this.showSettingsNotification(
        `Temperature unit changed to ${
          this.settings.temperatureUnit === "C" ? "Celsius" : "Fahrenheit"
        }`
      );
    }
  }

  convertTemperature(celsius) {
    if (this.settings.temperatureUnit === "F") {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  }

  getTemperatureSymbol() {
    return this.settings.temperatureUnit === "C" ? "°C" : "°F";
  }

  showLoading(
    message = "Fetching weather data...",
    subtext = "Getting the latest conditions for you"
  ) {
    this.isLoading = true;
    const loading = document.getElementById("loading");
    const loadingText = document.querySelector(".loading-text");
    const loadingSubtext = document.querySelector(".loading-subtext");

    if (loading) {
      loading.classList.add("active");

      // Update loading messages with fade effect
      if (loadingText) {
        loadingText.style.opacity = "0.5";
        setTimeout(() => {
          loadingText.textContent = message;
          loadingText.style.opacity = "1";
        }, 150);
      }

      if (loadingSubtext) {
        loadingSubtext.style.opacity = "0.5";
        setTimeout(() => {
          loadingSubtext.textContent = subtext;
          loadingSubtext.style.opacity = "0.8";
        }, 200);
      }
    }
  }

  hideLoading() {
    this.isLoading = false;
    const loading = document.getElementById("loading");
    if (loading) {
      // Add a slight delay before hiding for smoother transition
      setTimeout(() => {
        loading.classList.remove("active");
      }, 200);
    }
  }

  showNotification(message, type = "success") {
    // Remove existing notifications
    document.querySelectorAll(".notification").forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;

    notification.innerHTML = `
                    <div class="notification-content">
                        <i class="fas ${
                          type === "error"
                            ? "fa-exclamation-triangle"
                            : "fa-check-circle"
                        } notification-icon"></i>
                        <span class="notification-text">${message}</span>
                        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = "slideIn 0.3s ease-out reverse";
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  showBriefNotification(message) {
    // Create a brief, non-intrusive notification
    const notification = document.createElement("div");
    notification.className = "brief-notification";
    notification.innerHTML = `<i class="fas fa-check"></i> ${message}`;

    // Position it near the settings button
    notification.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      background: var(--glass-bg);
      color: var(--text-primary);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      z-index: 1001;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(0)";
    }, 10);

    // Auto-remove after 2 seconds
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  updateTime() {
    const now = new Date();
    const timeString = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    this.updateElement("currentTime", timeString);
  }

  async loadDefaultWeather() {
    console.log("📍 Starting loadDefaultWeather...");

    // Check if user has previously denied location access
    const locationPreference = localStorage.getItem("useCurrentLocation");

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        console.log("📍 Geolocation not supported, using fallback location");
        await this.loadWeatherData(this.currentLocation);
        return;
      }

      // Always attempt to get user location on first load, regardless of previous choice
      // This makes the app more user-friendly and responsive to location changes
      console.log("📍 Attempting to get current location...");

      try {
        const position = await this.getCurrentPosition();
        if (position) {
          const { latitude, longitude } = position.coords;
          console.log(
            `📍 Successfully got current location: ${latitude}, ${longitude}`
          );

          // Save user preference since they allowed location
          localStorage.setItem("useCurrentLocation", "true");

          await this.loadWeatherByCoordinates(latitude, longitude);
          return;
        }
      } catch (error) {
        console.log(`📍 Location access failed: ${error.message}`);

        // If this is the first time and user denied, show banner for future reference
        if (locationPreference === null && error.message.includes("denied")) {
          localStorage.setItem("useCurrentLocation", "false");
          this.showLocationBanner();
        }

        // Fall through to fallback
      }

      // If location failed or was denied, use fallback
      console.log(`📍 Using fallback location: ${this.currentLocation}`);
      await this.loadWeatherData(this.currentLocation);
    } catch (error) {
      console.log(`📍 Error in loadDefaultWeather: ${error.message}`);
      await this.loadWeatherData(this.currentLocation);
    }
  }

  // Get user's current position using geolocation API
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      console.log("📍 Requesting geolocation permission...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("📍 Geolocation permission granted");
          resolve(position);
        },
        (error) => {
          let errorMessage = "Unknown geolocation error";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "User denied the request for geolocation";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "The request to get user location timed out";
              break;
          }
          console.log(`📍 Geolocation error: ${errorMessage}`);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: false, // More permissive for faster response
          timeout: 10000, // 10 seconds - longer timeout for better success
          maximumAge: 600000, // 10 minutes cache - longer for better UX
        }
      );
    });
  }

  // Load weather data using coordinates
  async loadWeatherByCoordinates(latitude, longitude) {
    try {
      this.showLoading(
        "Getting your local weather...",
        "Using your precise location"
      );
      console.log(
        `🌤️ Loading weather for coordinates: ${latitude}, ${longitude}`
      );

      const response = await fetch(
        `/api/weather/coords/${latitude}/${longitude}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch weather data by coordinates");
      }

      const data = await response.json();
      this.weatherData = data;
      this.currentLocation =
        data.name || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

      await this.updateDisplay();
      this.loadAirQualityData(); // Load async without blocking
      this.addToRecentSearches(this.currentLocation);
      this.hideLoading();

      // Load chart data for the location
      await this.loadWeatherChart(this.currentLocation);

      console.log(
        `✅ Weather loaded for current location: ${this.currentLocation}`
      );
      this.showLocationNotification(
        `Weather updated for your location: ${this.currentLocation}`
      );
    } catch (error) {
      console.error("❌ Error loading weather by coordinates:", error);
      this.showErrorNotification("Unable to load weather for your location");
      this.hideLoading();
      // Fallback to default location
      await this.loadWeatherData(this.currentLocation);
    }
  }

  // Show the location banner
  showLocationBanner() {
    const banner = document.getElementById("locationBanner");
    if (banner) {
      banner.style.display = "block";
    }
  }

  // Hide the location banner
  hideLocationBanner() {
    const banner = document.getElementById("locationBanner");
    if (banner) {
      banner.style.display = "none";
    }
  }

  // Handle allow location button click
  async requestUserLocation() {
    try {
      this.hideLocationBanner();
      this.showInfoNotification("Getting your location...", 3000);

      const position = await this.getCurrentPosition();
      if (position) {
        const { latitude, longitude } = position.coords;
        console.log(
          `📍 User granted location access: ${latitude}, ${longitude}`
        );

        // Save user preference
        localStorage.setItem("useCurrentLocation", "true");

        this.showSuccessNotification("Using your current location");
        await this.loadWeatherByCoordinates(latitude, longitude);
      }
    } catch (error) {
      console.log(`📍 User location request failed: ${error.message}`);
      localStorage.setItem("useCurrentLocation", "false");

      if (error.message.includes("denied")) {
        this.showWarningNotification(
          "Location access denied. Using default location."
        );
      } else {
        this.showWarningNotification(
          "Unable to get your location. Using default location."
        );
      }

      await this.loadWeatherData(this.currentLocation);
    }
  }

  // Handle dismiss location banner
  dismissLocationBanner() {
    this.hideLocationBanner();
    localStorage.setItem("useCurrentLocation", "false");
    console.log("📍 User dismissed location banner");
  }

  // Clear location preference to allow fresh attempt
  clearLocationPreference() {
    localStorage.removeItem("useCurrentLocation");
    console.log(
      "📍 Location preference cleared - next load will attempt location detection"
    );
  }

  async searchWeather() {
    const cityInput = document.getElementById("cityInput");
    const city = cityInput?.value.trim();

    if (!city) {
      this.showWarningNotification("Please enter a city name");
      return;
    }

    await this.loadWeatherData(city);
    if (cityInput) cityInput.value = "";
  }

  async loadCityWeather(city) {
    await this.loadWeatherData(city);
  }

  async getUserLocation() {
    console.log("🌍 getUserLocation called - Location button clicked");

    if (!navigator.geolocation) {
      console.error("❌ Geolocation not supported");
      this.showErrorNotification("Geolocation not supported by your browser");
      return;
    }

    console.log("✅ Geolocation supported, requesting location...");
    this.showLoading("Finding your location...", "This may take a few moments");
    this.showInfoNotification("Getting your location...", 3000);

    try {
      const position = await this.getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      console.log(`🎯 Got coordinates from getUserLocation: ${lat}, ${lng}`);

      // Save user preference to use current location
      localStorage.setItem("useCurrentLocation", "true");

      // Load weather using coordinates
      await this.loadWeatherByCoordinates(lat, lng);
    } catch (error) {
      console.error("❌ getUserLocation error:", error);
      this.hideLoading();

      let errorMessage = "Unable to get your location";

      if (error.message.includes("denied")) {
        errorMessage =
          "Location access denied. Please enable location permissions.";
        localStorage.setItem("useCurrentLocation", "false");
      } else if (error.message.includes("unavailable")) {
        errorMessage = "Location information unavailable.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Location request timed out.";
      }

      this.showErrorNotification(errorMessage);
    }
  }

  async refreshWeather() {
    if (!this.isLoading && this.currentLocation) {
      await this.loadWeatherData(this.currentLocation);
      // Also refresh the chart if needed
      if (this.chartData) {
        setTimeout(() => {
          this.refreshChart();
        }, 500);
      }
    }
  }

  async loadWeatherData(city) {
    if (this.isLoading) return;

    this.showLoading(
      `Loading weather for ${city}...`,
      "Gathering comprehensive data"
    );
    this.currentLocation = city;

    try {
      const response = await fetch(`/api/weather/${encodeURIComponent(city)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          response.status === 404
            ? "City not found"
            : errorData?.error || "Failed to fetch weather data"
        );
      }

      this.weatherData = await response.json();
      await this.updateDisplay();
      this.loadAirQualityData(); // Load async without blocking
      await this.loadWeatherChart(city);

      // Add to recent searches
      this.addToRecentSearches(this.weatherData.name);

      this.showWeatherNotification(
        `Weather updated for ${this.weatherData.name}`
      );
    } catch (error) {
      this.showNotification(
        error.message || "Failed to load weather data",
        "error"
      );
    } finally {
      this.hideLoading();
    }
  }

  async loadAirQualityData() {
    try {
      // Create a timeout promise for faster fallback
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Air quality request timeout")),
          8000
        );
      });

      // Race between API call and timeout
      const apiPromise = fetch(
        `/api/air-quality/${encodeURIComponent(this.currentLocation)}`,
        {
          signal: AbortSignal.timeout(8000), // 8 second timeout
        }
      );

      const response = await Promise.race([apiPromise, timeoutPromise]);

      if (response.ok) {
        const aqiData = await response.json();
        if (!aqiData.estimated) {
          this.updateAirQuality(aqiData);
          console.log("✅ Real air quality data loaded successfully");
        } else {
          console.warn("Only estimated air quality data available");
          this.updateAirQuality(aqiData);
        }
      } else {
        console.warn("Air quality API returned error");
        this.showAirQualityUnavailable();
      }
    } catch (error) {
      console.warn("Air quality data unavailable");
      this.showAirQualityUnavailable();
    }
  }

  showAirQualityUnavailable() {
    const aqiCircle = document.getElementById("aqiCircle");
    if (aqiCircle) {
      aqiCircle.className = "aqi-circle aqi-unavailable";
    }

    this.updateElement("aqiValue", "--");
    this.updateElement("aqiStatus", "Unavailable");
    this.updateElement("aqiDescription", "Air quality data not available");

    // Reset pollutant values
    this.updateElement("pm25Value", "N/A");
    this.updateElement("pm10Value", "N/A");
    this.updateElement("no2Value", "N/A");
    this.updateElement("o3Value", "N/A");
    this.updateElement("coValue", "N/A");
    this.updateElement("so2Value", "N/A");
    this.updateElement("nh3Value", "N/A");
    this.updateElement("aqiRecommendation", "Air quality data unavailable");

    // Clear detailed information
    const detailedInfoContainer = document.getElementById("aqiDetailedInfo");
    if (detailedInfoContainer) {
      detailedInfoContainer.innerHTML = "";
    }
  }

  updateAirQuality(aqiData) {
    const aqiCircle = document.getElementById("aqiCircle");

    // Determine AQI class based on value
    let aqiClass = "aqi-good";
    if (aqiData.aqi > 150) aqiClass = "aqi-poor";
    else if (aqiData.aqi > 100) aqiClass = "aqi-moderate";
    else if (aqiData.aqi > 50) aqiClass = "aqi-moderate";

    if (aqiCircle) {
      aqiCircle.className = `aqi-circle ${aqiClass}`;
    }

    // Update dedicated AQI section
    this.updateElement("aqiValue", aqiData.aqi);
    this.updateElement("aqiStatus", aqiData.status);
    this.updateElement("aqiDescription", aqiData.description);

    // Update pollutant details if available
    if (
      aqiData.pollutants &&
      Array.isArray(aqiData.pollutants) &&
      aqiData.pollutants.length > 0
    ) {
      // Find specific pollutants in the array
      const pm25 = aqiData.pollutants.find((p) => p.code === "pm25");
      const pm10 = aqiData.pollutants.find((p) => p.code === "pm10");
      const no2 = aqiData.pollutants.find((p) => p.code === "no2");
      const o3 = aqiData.pollutants.find((p) => p.code === "o3");
      const co = aqiData.pollutants.find((p) => p.code === "co");
      const so2 = aqiData.pollutants.find((p) => p.code === "so2");
      const nh3 = aqiData.pollutants.find((p) => p.code === "nh3");

      // Handle different units - convert PPB to µg/m³ for gases if needed
      const formatPollutant = (pollutant) => {
        if (!pollutant?.concentration?.value) return "N/A";

        const value = pollutant.concentration.value;
        const units = pollutant.concentration.units;

        if (units === "MICROGRAMS_PER_CUBIC_METER") {
          return `${value.toFixed(1)} μg/m³`;
        } else if (units === "PARTS_PER_BILLION") {
          // For display purposes, show PPB values converted to approximate µg/m³
          // NO2: 1 ppb ≈ 1.88 µg/m³, O3: 1 ppb ≈ 1.96 µg/m³, SO2: 1 ppb ≈ 2.62 µg/m³
          // CO: 1 ppb ≈ 1.145 µg/m³, NH3: 1 ppb ≈ 0.696 µg/m³
          let convertedValue;
          if (pollutant.code === "no2") {
            convertedValue = value * 1.88;
          } else if (pollutant.code === "o3") {
            convertedValue = value * 1.96;
          } else if (pollutant.code === "so2") {
            convertedValue = value * 2.62;
          } else if (pollutant.code === "co") {
            convertedValue = value * 1.145;
          } else if (pollutant.code === "nh3") {
            convertedValue = value * 0.696;
          } else {
            convertedValue = value; // Keep as PPB for other gases
          }
          return `${convertedValue.toFixed(1)} μg/m³`;
        }
        return `${value.toFixed(1)} μg/m³`;
      };

      this.updateElement("pm25Value", formatPollutant(pm25));
      this.updateElement("pm10Value", formatPollutant(pm10));
      this.updateElement("no2Value", formatPollutant(no2));
      this.updateElement("o3Value", formatPollutant(o3));
      this.updateElement("coValue", formatPollutant(co));
      this.updateElement("so2Value", formatPollutant(so2));
      this.updateElement("nh3Value", formatPollutant(nh3));
    } else {
      // Google Air Quality API doesn't provide detailed pollutant data for this location
      this.updateElement("pm25Value", "N/A");
      this.updateElement("pm10Value", "N/A");
      this.updateElement("no2Value", "N/A");
      this.updateElement("o3Value", "N/A");
      this.updateElement("coValue", "N/A");
      this.updateElement("so2Value", "N/A");
      this.updateElement("nh3Value", "N/A");
    }

    // Update health recommendations based on API data or AQI level
    let recommendation = "";
    if (aqiData.healthRecommendations?.generalPopulation) {
      recommendation = aqiData.healthRecommendations.generalPopulation;
    } else {
      // Fallback recommendations based on AQI level
      if (aqiData.aqi <= 50) {
        recommendation =
          "Air quality is excellent. Perfect for outdoor activities and exercise.";
      } else if (aqiData.aqi <= 100) {
        recommendation =
          "Air quality is good. Suitable for most outdoor activities.";
      } else if (aqiData.aqi <= 150) {
        recommendation =
          "Moderate air quality. Sensitive individuals should limit prolonged outdoor exertion.";
      } else if (aqiData.aqi <= 200) {
        recommendation =
          "Unhealthy air quality. Everyone should reduce outdoor activities.";
      } else {
        recommendation =
          "Very unhealthy air. Avoid outdoor activities. Stay indoors with air purification.";
      }
    }

    this.updateElement("aqiRecommendation", recommendation);

    // Update detailed pollutant information if available
    this.updateDetailedPollutantInfo(aqiData.pollutants);

    // Update air quality stat card with combined format
    this.updateElement("airQuality", `${aqiData.aqi} ${aqiData.status}`);
  }

  updateDetailedPollutantInfo(pollutants) {
    const detailedInfoContainer = document.getElementById("aqiDetailedInfo");
    if (!detailedInfoContainer) return;

    if (!pollutants || !Array.isArray(pollutants) || pollutants.length === 0) {
      detailedInfoContainer.innerHTML =
        '<div class="pollutant-detail"><div class="pollutant-name">Detailed pollutant information not available for this location</div></div>';
      return;
    }

    let detailedHTML = "";

    pollutants.forEach((pollutant) => {
      if (!pollutant.concentration?.value) return;

      const value = pollutant.concentration.value;
      const units = pollutant.concentration.units;
      let displayValue;

      // Format concentration based on units
      if (units === "MICROGRAMS_PER_CUBIC_METER") {
        displayValue = `${value.toFixed(1)} μg/m³`;
      } else if (units === "PARTS_PER_BILLION") {
        displayValue = `${value.toFixed(1)} ppb`;
      } else {
        displayValue = `${value.toFixed(1)} ${units.toLowerCase()}`;
      }

      const sources =
        pollutant.additionalInfo?.sources || "Information not available";
      const effects =
        pollutant.additionalInfo?.effects || "Information not available";

      detailedHTML += `
        <div class="pollutant-detail">
          <div class="pollutant-header">
            <div>
              <span class="pollutant-name">${pollutant.displayName}</span>
              <span class="pollutant-full-name">${pollutant.fullName}</span>
            </div>
            <div class="pollutant-concentration">${displayValue}</div>
          </div>
          <div class="pollutant-info">
            <div class="pollutant-sources">
              <div class="pollutant-info-label">Sources</div>
              <div class="pollutant-info-text">${sources}</div>
            </div>
            <div class="pollutant-effects">
              <div class="pollutant-info-label">Health Effects</div>
              <div class="pollutant-info-text">${effects}</div>
            </div>
          </div>
        </div>
      `;
    });

    detailedInfoContainer.innerHTML = detailedHTML;
  }

  async updateDisplay() {
    if (!this.weatherData) return;

    const data = this.weatherData;

    // Validate weather data structure
    if (
      !data.weather ||
      !Array.isArray(data.weather) ||
      data.weather.length === 0
    ) {
      console.error("❌ Invalid weather data structure:", data);
      // Create fallback weather data
      data.weather = [
        {
          main: "Clear",
          description: "clear sky",
          icon: "01d",
        },
      ];
    }

    // Store previous data for trends
    if (this.lastWeatherData && this.lastWeatherData.name === data.name) {
      this.weatherData.trends = this.calculateTrends(
        this.lastWeatherData,
        data
      );
      console.log("🔄 Trend data calculated:", this.weatherData.trends);
    } else {
      console.log("📊 No previous data for trends yet");
      // No demo trend data - trends will only show when we have actual previous data
    }

    // Update location and time
    this.updateElement(
      "locationName",
      `${data.name}, ${data.sys?.country || "Unknown"}`
    );

    // Update main weather display with temperature conversion
    this.updateElement(
      "weatherIcon",
      this.getWeatherEmoji(data.weather[0].icon)
    );
    this.updateElement("weatherDescription", data.weather[0].description);

    const mainTempValue = this.convertTemperature(data.main.temp);
    const feelsLikeValue = this.convertTemperature(data.main.feels_like);
    const tempSymbol = this.getTemperatureSymbol();

    this.updateElement("mainTemp", `${mainTempValue}${tempSymbol}`);
    this.updateElement("feelsLike", `${feelsLikeValue}${tempSymbol}`);

    // Update detailed statistics with enhanced info
    this.updateElement("humidity", `${data.main.humidity}%`);

    // Enhanced wind information - show both km/h and m/s with direction
    const windSpeedKmh = data.wind.speed_kmh || data.wind.speed * 3.6;
    const windDirection = data.wind.cardinal || "";
    const windGustKmh =
      data.wind.gust_kmh || (data.wind.gust ? data.wind.gust * 3.6 : null);

    let windDisplay = `${Math.round(windSpeedKmh)} km/h`;
    if (windDirection || windGustKmh) {
      windDisplay += `<br><small style="font-size: 10pt; opacity: 1; color: white; font-weight: 100;">`;
      if (windDirection) windDisplay += `${windDirection}`;
      if (windGustKmh)
        windDisplay += `${windDirection ? " (" : ""}gusts ${Math.round(
          windGustKmh
        )} km/h${windDirection ? ")" : ""}`;
      windDisplay += `</small>`;
    }

    this.updateElement("windSpeed", windDisplay);

    // Enhanced visibility with better handling
    const visibilityKm =
      data.visibilityKm || (data.visibility ? data.visibility / 1000 : null);
    this.updateElement(
      "visibility",
      visibilityKm ? `${visibilityKm.toFixed(1)} km` : "N/A"
    );

    // Enhanced pressure with better formatting
    const pressureDisplay = data.airPressure || `${data.main.pressure} hPa`;
    this.updateElement("pressure", pressureDisplay);

    // Enhanced cloud cover with percentage symbol
    const cloudCoverDisplay =
      data.cloudCoverPercent || `${data.clouds?.all || 0}%`;
    this.updateElement("cloudCover", cloudCoverDisplay);

    // Enhanced UV Index with better handling
    const uvIndex = data.uvIndex || data.uvi;
    this.updateElement(
      "uvIndex",
      uvIndex !== undefined ? Math.round(uvIndex) : "N/A"
    );

    // Additional detailed weather info if available
    if (data.dewPoint !== undefined) {
      this.updateElement(
        "dewPoint",
        data.dewPointCelsius || `${Math.round(data.dewPoint)}°C`
      );
    }

    if (data.precipProbability !== undefined) {
      this.updateElement(
        "precipChance",
        data.precipProbabilityPercent || `${data.precipProbability}%`
      );
    }

    if (data.thunderstormProbability !== undefined) {
      this.updateElement("stormChance", `${data.thunderstormProbability}%`);
    }

    if (data.heatIndex !== undefined) {
      const heatIndexConverted = this.convertTemperature(data.heatIndex);
      this.updateElement("heatIndex", `${heatIndexConverted}${tempSymbol}`);
    }

    if (data.windChill !== undefined) {
      const windChillConverted = this.convertTemperature(data.windChill);
      this.updateElement("windChill", `${windChillConverted}${tempSymbol}`);
    }

    // Add new enhanced weather stats

    // Sunrise/Sunset times
    if (data.sys && data.sys.sunrise && data.sys.sunset) {
      const sunrise = new Date(data.sys.sunrise * 1000);
      const sunset = new Date(data.sys.sunset * 1000);

      const sunriseTime = sunrise.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const sunsetTime = sunset.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Update both stat cards and sidebar elements
      this.updateElement("sunrise", sunriseTime);
      this.updateElement("sunset", sunsetTime);
      this.updateElement("sunriseTime", sunriseTime);
      this.updateElement("sunsetTime", sunsetTime);

      // Calculate day length
      const dayLengthMs = sunset.getTime() - sunrise.getTime();
      const dayLengthHours = Math.floor(dayLengthMs / (1000 * 60 * 60));
      const dayLengthMinutes = Math.floor(
        (dayLengthMs % (1000 * 60 * 60)) / (1000 * 60)
      );
      this.updateElement(
        "dayLength",
        `${dayLengthHours}h ${dayLengthMinutes}m`
      );
    } else {
      // Fallback for missing sunrise/sunset data
      this.updateElement("sunrise", "N/A");
      this.updateElement("sunset", "N/A");
      this.updateElement("sunriseTime", "N/A");
      this.updateElement("sunsetTime", "N/A");
      this.updateElement("dayLength", "N/A");
    }

    // Moon phase calculation (simplified)
    try {
      const moonPhase = this.calculateMoonPhase();
      this.updateElement("moonPhase", moonPhase);
    } catch (error) {
      console.warn("Moon phase calculation failed:", error);
      this.updateElement("moonPhase", "🌙 Unknown");
    }

    // Air Quality Index - loaded separately via loadAirQualityData()
    // The air quality card will be updated by the dedicated air quality fetch
    // This prevents conflicts between real API data and calculated estimates

    // Pollution Index (based on various factors)
    try {
      const pollutionIndex =
        data.pollutionIndex || this.calculatePollutionIndex(data);
      this.updateElement("pollutionIndex", pollutionIndex);
    } catch (error) {
      console.warn("Pollution index calculation failed:", error);
      this.updateElement("pollutionIndex", "N/A");
    }

    // Enhanced humidity feel
    try {
      const humidityFeel = this.calculateHumidityFeel(
        data.main.humidity,
        data.main.temp
      );
      this.updateElement("feelsLikeHumidity", humidityFeel);
    } catch (error) {
      console.warn("Humidity feel calculation failed:", error);
      this.updateElement("feelsLikeHumidity", `${data.main.humidity}%`);
    }

    // Update weather-responsive backgrounds
    this.updateWeatherBackground(data);

    // Store current data for next comparison
    this.lastWeatherData = JSON.parse(JSON.stringify(data));

    // Update background theme
    this.updateBackgroundTheme(data.weather[0].icon);
  }

  getWeatherEmoji(iconCode) {
    const iconMap = {
      "01d": "☀️",
      "01n": "🌙",
      "02d": "⛅",
      "02n": "☁️",
      "03d": "☁️",
      "03n": "☁️",
      "04d": "☁️",
      "04n": "☁️",
      "09d": "🌧️",
      "09n": "🌧️",
      "10d": "🌦️",
      "10n": "🌧️",
      "11d": "⛈️",
      "11n": "⛈️",
      "13d": "❄️",
      "13n": "❄️",
      "50d": "🌫️",
      "50n": "🌫️",
    };
    return iconMap[iconCode] || "🌤️";
  }

  updateBackgroundTheme(iconCode) {
    const body = document.body;
    const themes = ["sunny", "cloudy", "rainy", "stormy", "snowy", "night"];

    // Remove existing themes
    themes.forEach((theme) => body.classList.remove(theme));

    // Determine new theme based on weather
    let newTheme = "sunny";

    if (iconCode.includes("01")) {
      newTheme = iconCode.includes("n") ? "night" : "sunny";
    } else if (
      iconCode.includes("02") ||
      iconCode.includes("03") ||
      iconCode.includes("04")
    ) {
      newTheme = "cloudy";
    } else if (iconCode.includes("09") || iconCode.includes("10")) {
      newTheme = "rainy";
    } else if (iconCode.includes("11")) {
      newTheme = "stormy";
    } else if (iconCode.includes("13")) {
      newTheme = "snowy";
    } else if (iconCode.includes("50")) {
      newTheme = "cloudy";
    }

    body.classList.add(newTheme);

    // Update CSS custom properties for dynamic theming
    const root = document.documentElement;
    switch (newTheme) {
      case "sunny":
        root.style.setProperty("--primary-color", "#f59e0b");
        root.style.setProperty("--secondary-color", "#fbbf24");
        break;
      case "cloudy":
        root.style.setProperty("--primary-color", "#6b7280");
        root.style.setProperty("--secondary-color", "#9ca3af");
        break;
      case "rainy":
        root.style.setProperty("--primary-color", "#3b82f6");
        root.style.setProperty("--secondary-color", "#60a5fa");
        break;
      case "stormy":
        root.style.setProperty("--primary-color", "#6b7280");
        root.style.setProperty("--secondary-color", "#374151");
        break;
      case "snowy":
        root.style.setProperty("--primary-color", "#e5e7eb");
        root.style.setProperty("--secondary-color", "#f3f4f6");
        break;
      case "night":
        root.style.setProperty("--primary-color", "#1e40af");
        root.style.setProperty("--secondary-color", "#3730a3");
        break;
    }
  }

  updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
      // Check if content contains HTML
      if (typeof content === "string" && content.includes("<")) {
        element.innerHTML = content;
      } else {
        element.textContent = content;
      }

      // Add subtle update animation
      element.style.opacity = "0.7";
      element.style.transform = "scale(0.98)";

      setTimeout(() => {
        element.style.opacity = "1";
        element.style.transform = "scale(1)";
        element.style.transition = "all 0.3s ease-out";
      }, 100);
    }
  }

  calculateTrends(oldData, newData) {
    return {
      temperature: newData.main.temp - oldData.main.temp,
      humidity: newData.main.humidity - oldData.main.humidity,
      pressure: newData.main.pressure - oldData.main.pressure,
    };
  }

  updateWeatherBackground(data) {
    const body = document.body;
    const weatherMain = data.weather[0].main.toLowerCase();
    const temp = data.main.temp;

    // Remove existing weather classes
    body.classList.remove(
      "sunny",
      "cloudy",
      "rainy",
      "stormy",
      "snowy",
      "hot",
      "cold"
    );

    // Add weather-specific class
    switch (weatherMain) {
      case "clear":
        body.classList.add("sunny");
        if (temp > 25) body.classList.add("hot");
        break;
      case "clouds":
        body.classList.add("cloudy");
        break;
      case "rain":
        body.classList.add("rainy");
        break;
      case "thunderstorm":
        body.classList.add("stormy");
        break;
      case "snow":
        body.classList.add("snowy");
        break;
    }

    if (temp < 5) body.classList.add("cold");

    // Update CSS custom properties for dynamic theming
    const root = document.documentElement;
    const tempHue = Math.max(180, Math.min(360, 240 - temp * 2)); // Blue to red based on temp
    root.style.setProperty("--primary-color", `hsl(${tempHue}, 70%, 60%)`);
    root.style.setProperty("--secondary-color", `hsl(${tempHue}, 70%, 40%)`);
  }

  addToRecentSearches(city) {
    this.recentSearches = this.recentSearches.filter((s) => s !== city);
    this.recentSearches.unshift(city);
    this.recentSearches = this.recentSearches.slice(0, 5);
    localStorage.setItem("recentSearches", JSON.stringify(this.recentSearches));
  }

  loadUserPreferences() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("weatherAppSettings");
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }

    // Apply settings
    this.applySettings();
  }

  applySettings() {
    // Apply auto-refresh setting
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    if (this.settings.autoRefresh && this.settings.refreshInterval > 0) {
      this.refreshInterval = setInterval(() => {
        this.refreshWeather();
      }, this.settings.refreshInterval);
    }

    // Apply other settings
    this.updateUIBasedOnSettings();
  }

  updateUIBasedOnSettings() {
    const body = document.body;

    // Weather backgrounds
    if (!this.settings.weatherBackgrounds) {
      body.classList.add("no-weather-backgrounds");
    } else {
      body.classList.remove("no-weather-backgrounds");
    }

    // Keyboard shortcuts indicator
    const shortcutsHelp = document.querySelector(".shortcuts-help");
    if (shortcutsHelp) {
      shortcutsHelp.style.display = this.settings.keyboardShortcuts
        ? "block"
        : "none";
    }

    // Keyboard shortcuts list in settings
    const shortcutsList = document.querySelector(".keyboard-shortcuts-list");
    if (shortcutsList) {
      shortcutsList.style.display = this.settings.keyboardShortcuts
        ? "block"
        : "none";
    }
  }

  openSettings() {
    const settingsOverlay = document.getElementById("settingsOverlay");
    if (settingsOverlay) {
      // Populate current settings
      this.populateSettingsUI();
      settingsOverlay.classList.add("active");
    }
  }

  closeSettings() {
    const settingsOverlay = document.getElementById("settingsOverlay");
    if (settingsOverlay) {
      settingsOverlay.classList.remove("active");
    }
  }

  populateSettingsUI() {
    // Temperature unit
    const tempToggle = document.getElementById("tempUnitToggle");
    if (tempToggle) {
      tempToggle.checked = this.settings.temperatureUnit === "F";
    }

    // Boolean settings
    const booleanSettings = {
      autoRefreshToggle: "autoRefresh",
      backgroundToggle: "weatherBackgrounds",
      notificationsToggle: "notifications",
      shortcutsToggle: "keyboardShortcuts",
      autocompleteToggle: "autocomplete",
    };

    Object.entries(booleanSettings).forEach(([toggleId, settingKey]) => {
      const toggle = document.getElementById(toggleId);
      if (toggle) {
        toggle.checked = this.settings[settingKey];
      }
    });

    // Refresh interval
    const refreshSelect = document.getElementById("refreshInterval");
    if (refreshSelect) {
      refreshSelect.value = this.settings.refreshInterval;
    }

    // Data source
    const dataSourceSelect = document.getElementById("dataSource");
    if (dataSourceSelect) {
      dataSourceSelect.value = this.settings.dataSource;
    }
  }

  updateSettingFromUI(toggleId) {
    const element = document.getElementById(toggleId);
    if (!element) return;

    let notificationMessage = "Setting updated";

    switch (toggleId) {
      case "tempUnitToggle":
        this.settings.temperatureUnit = element.checked ? "F" : "C";
        notificationMessage = `Temperature unit changed to ${
          this.settings.temperatureUnit === "C" ? "Celsius" : "Fahrenheit"
        }`;
        if (this.weatherData) {
          this.updateDisplay();
        }
        break;
      case "autoRefreshToggle":
        this.settings.autoRefresh = element.checked;
        notificationMessage = `Auto-refresh ${
          element.checked ? "enabled" : "disabled"
        }`;
        this.applySettings();
        break;
      case "backgroundToggle":
        this.settings.weatherBackgrounds = element.checked;
        notificationMessage = `Weather backgrounds ${
          element.checked ? "enabled" : "disabled"
        }`;
        this.updateUIBasedOnSettings();
        if (this.weatherData) {
          this.updateWeatherBackground(this.weatherData);
        }
        break;
      case "notificationsToggle":
        this.settings.notifications = element.checked;
        notificationMessage = `Notifications ${
          element.checked ? "enabled" : "disabled"
        }`;
        break;
      case "shortcutsToggle":
        this.settings.keyboardShortcuts = element.checked;
        notificationMessage = `Keyboard shortcuts ${
          element.checked ? "enabled" : "disabled"
        }`;
        this.updateUIBasedOnSettings();
        break;
      case "autocompleteToggle":
        this.settings.autocomplete = element.checked;
        notificationMessage = `Autocomplete ${
          element.checked ? "enabled" : "disabled"
        }`;
        break;
      case "refreshInterval":
        this.settings.refreshInterval = parseInt(element.value);
        const minutes = this.settings.refreshInterval / 60000;
        notificationMessage = `Refresh interval set to ${minutes} minutes`;
        this.applySettings();
        break;
      case "dataSource":
        this.settings.dataSource = element.value;
        notificationMessage = `Data source changed to ${element.value}`;
        break;
    }

    // Auto-save settings to localStorage after any change
    localStorage.setItem("weatherAppSettings", JSON.stringify(this.settings));

    // Show notification using the enhanced system
    if (this.settings.notifications) {
      this.showSettingsNotification(notificationMessage);
    }
  }

  saveSettings() {
    // Save to localStorage
    localStorage.setItem("weatherAppSettings", JSON.stringify(this.settings));

    // Apply settings
    this.applySettings();

    // Show notification
    if (this.settings.notifications) {
      this.showNotification("Settings saved successfully!", "settings", 3000);
    }

    // Close settings panel
    this.closeSettings();
  }

  resetSettings() {
    // Reset to defaults
    this.settings = {
      temperatureUnit: "C",
      autoRefresh: true,
      weatherBackgrounds: true,
      notifications: true,
      keyboardShortcuts: true,
      autocomplete: true,
      refreshInterval: 600000, // 10 minutes
      dataSource: "auto",
    };

    // Update UI
    this.populateSettingsUI();

    // Apply settings
    this.temperatureUnit = this.settings.temperatureUnit;
    this.applySettings();

    if (this.settings.notifications) {
      this.showNotification("Settings reset to defaults", "settings", 3000);
    }
  }

  // Enhanced general notification system
  showNotification(message, type = "info", duration = 5000) {
    if (!this.settings.notifications) return;

    // Remove existing notifications
    document.querySelectorAll(".notification").forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;

    // Define icons for different notification types
    const iconMap = {
      success: "fa-check-circle",
      error: "fa-exclamation-triangle",
      warning: "fa-exclamation-circle",
      info: "fa-info-circle",
      settings: "fa-cog",
      weather: "fa-cloud-sun",
      location: "fa-map-marker-alt",
      refresh: "fa-sync-alt",
    };

    const icon = iconMap[type] || iconMap.info;

    notification.innerHTML = `
                    <div class="notification-content">
                        <i class="fas ${icon} notification-icon"></i>
                        <span class="notification-text">${message}</span>
                        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;

    document.body.appendChild(notification);

    // Auto-remove after specified duration
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = "slideIn 0.3s ease-out reverse";
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }

  // Helper methods for specific notification types
  showSuccessNotification(message, duration = 4000) {
    this.showNotification(message, "success", duration);
  }

  showErrorNotification(message, duration = 6000) {
    this.showNotification(message, "error", duration);
  }

  showWarningNotification(message, duration = 5000) {
    this.showNotification(message, "warning", duration);
  }

  showInfoNotification(message, duration = 4000) {
    this.showNotification(message, "info", duration);
  }

  showSettingsNotification(message, duration = 3000) {
    this.showNotification(message, "settings", duration);
  }

  showWeatherNotification(message, duration = 4000) {
    this.showNotification(message, "weather", duration);
  }

  showLocationNotification(message, duration = 4000) {
    this.showNotification(message, "location", duration);
  }

  // Override autocomplete to respect settings
  showAutoCompleteSuggestions(query, container) {
    if (!this.settings.autocomplete) {
      container.style.display = "none";
      return;
    }

    const popularCities = [
      "New York",
      "London",
      "Tokyo",
      "Paris",
      "Delhi",
      "Sydney",
      "Mumbai",
      "Dubai",
      "Los Angeles",
      "Chicago",
      "Toronto",
      "Berlin",
      "Madrid",
      "Rome",
      "Bangkok",
      "Singapore",
      "Hong Kong",
      "Seoul",
      "Moscow",
      "Cairo",
      "Istanbul",
      "Amsterdam",
    ];

    const matches = [
      ...this.recentSearches
        .filter((city) => city.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3),
      ...popularCities
        .filter((city) => city.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5),
    ].slice(0, 6);

    if (matches.length === 0) {
      container.style.display = "none";
      return;
    }

    container.innerHTML = matches
      .map(
        (city) =>
          `<div class="autocomplete-item" onclick="weatherApp.loadCityWeather('${city}')">${city}</div>`
      )
      .join("");

    container.style.display = "block";
  }

  // Override updateWeatherBackground to respect settings
  updateWeatherBackground(data) {
    if (!this.settings.weatherBackgrounds) return;

    const body = document.body;
    const weatherMain = data.weather[0].main.toLowerCase();
    const temp = data.main.temp;

    // Remove existing weather classes
    body.classList.remove(
      "sunny",
      "cloudy",
      "rainy",
      "stormy",
      "snowy",
      "hot",
      "cold"
    );

    // Add weather-specific class
    switch (weatherMain) {
      case "clear":
        body.classList.add("sunny");
        if (temp > 25) body.classList.add("hot");
        break;
      case "clouds":
        body.classList.add("cloudy");
        break;
      case "rain":
        body.classList.add("rainy");
        break;
      case "thunderstorm":
        body.classList.add("stormy");
        break;
      case "snow":
        body.classList.add("snowy");
        break;
    }

    if (temp < 5) body.classList.add("cold");

    // Update CSS custom properties for dynamic theming
    const root = document.documentElement;
    const tempHue = Math.max(180, Math.min(360, 240 - temp * 2)); // Blue to red based on temp
    root.style.setProperty("--primary-color", `hsl(${tempHue}, 70%, 60%)`);
    root.style.setProperty("--secondary-color", `hsl(${tempHue}, 70%, 40%)`);
  }

  // Helper functions for new weather stats
  calculateMoonPhase() {
    const now = new Date();

    // More accurate moon phase calculation
    // Uses the Julian day calculation
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Julian Day calculation
    let jd;
    if (month > 2) {
      jd =
        Math.floor(365.25 * year) +
        Math.floor(30.6001 * (month + 1)) +
        day +
        1720995;
    } else {
      jd =
        Math.floor(365.25 * (year - 1)) +
        Math.floor(30.6001 * (month + 13)) +
        day +
        1720995;
    }

    // Days since known new moon (January 6, 2000)
    const daysSinceNewMoon = jd - 2451549.5;
    const newMoons = daysSinceNewMoon / 29.53058867;
    const phase = (newMoons - Math.floor(newMoons)) * 29.53058867;

    // Determine moon phase
    if (phase < 1.84566) return "🌑 New Moon";
    else if (phase < 5.53699) return "🌒 Waxing Crescent";
    else if (phase < 9.22831) return "🌓 First Quarter";
    else if (phase < 12.91963) return "🌔 Waxing Gibbous";
    else if (phase < 16.61096) return "🌕 Full Moon";
    else if (phase < 20.30228) return "🌖 Waning Gibbous";
    else if (phase < 23.99361) return "🌗 Last Quarter";
    else if (phase < 27.68493) return "🌘 Waning Crescent";
    else return "🌑 New Moon";
  }

  calculatePollutionIndex(data) {
    // Enhanced pollution index based on meteorological conditions
    let pollution = 20; // Base low pollution

    // Population/location factors (simplified heuristic)
    const locationName = data.name?.toLowerCase() || "";
    const isLargeCity =
      locationName.includes("city") ||
      locationName.includes("metropol") ||
      data.population > 1000000;
    const isMediumCity = data.population > 100000;

    if (isLargeCity) pollution += 25;
    else if (isMediumCity) pollution += 15;

    // Meteorological dispersion factors
    const windSpeed = data.wind?.speed || 0;
    const temp = data.main.temp;
    const pressure = data.main.pressure;
    const humidity = data.main.humidity;

    // Wind dispersion (critical for pollution)
    if (windSpeed < 1) pollution += 20; // Very stagnant
    else if (windSpeed < 2) pollution += 15;
    else if (windSpeed < 4) pollution += 8;
    else if (windSpeed > 10) pollution -= 8; // Good dispersion

    // Temperature inversion conditions
    if (temp < 5) pollution += 12; // Cold = inversions common
    else if (temp > 35) pollution += 8; // Hot = ground-level ozone

    // Atmospheric stability
    if (pressure > 1020)
      pollution += 10; // High pressure = stable air = trapped pollutants
    else if (pressure < 1000) pollution -= 5; // Low pressure = unstable = better mixing

    // Humidity effects on particulates
    if (humidity > 80) pollution += 8; // High humidity = more particles
    else if (humidity < 30) pollution += 5; // Dry = dust

    // Visibility impact
    const visibilityKm = data.visibility ? data.visibility / 1000 : 10;
    if (visibilityKm < 5) pollution += 15;
    else if (visibilityKm < 8) pollution += 8;

    // Cloud cover (affects photochemical processes)
    const cloudCover = data.clouds?.all || 0;
    if (cloudCover < 30 && temp > 25) pollution += 6; // Clear hot = photochemical smog

    // Cap between 0 and 100
    pollution = Math.max(0, Math.min(pollution, 100));

    if (pollution <= 25) return `${pollution} Low`;
    else if (pollution <= 50) return `${pollution} Moderate`;
    else if (pollution <= 75) return `${pollution} High`;
    else return `${pollution} Very High`;
  }

  calculateHumidityFeel(humidity, temperature) {
    // Calculate how humidity feels based on temperature
    let feel = "";

    if (humidity < 30) {
      feel = "Dry";
    } else if (humidity < 50) {
      feel = "Comfortable";
    } else if (humidity < 70) {
      if (temperature > 25) {
        feel = "Sticky";
      } else {
        feel = "Humid";
      }
    } else if (humidity < 85) {
      if (temperature > 20) {
        feel = "Oppressive";
      } else {
        feel = "Very Humid";
      }
    } else {
      feel = "Extremely Humid";
    }

    return `${humidity}% ${feel}`;
  }
}

// Initialize the enhanced weather dashboard
document.addEventListener("DOMContentLoaded", () => {
  window.weatherApp = new WeatherLivePro();
});

// Add enhanced dynamic styles
const enhancedStyles = document.createElement("style");
enhancedStyles.textContent = `
            /* Theme-based background adjustments */
            body.sunny {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #374151 100%);
            }

            body.cloudy {
                background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%);
            }

            body.rainy {
                background: linear-gradient(135deg, #0c1222 0%, #1e293b 50%, #334155 100%);
            }

            body.stormy {
                background: linear-gradient(135deg, #000000 0%, #1f2937 50%, #374151 100%);
            }

            body.snowy {
                background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
            }

            body.night {
                background: linear-gradient(135deg, #000011 0%, #1e1b4b 50%, #312e81 100%);
            }

            /* Enhanced hover effects */
            .stat-card:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(59, 130, 246, 0.3);
            }

            .stat-card:hover .stat-icon {
                transform: scale(1.1);
                color: var(--primary-blue);
            }

            .city-btn:hover {
                background: linear-gradient(45deg, var(--primary-blue), var(--purple));
                color: white;
                transform: translateY(-2px);
                box-shadow: var(--shadow-md);
            }

            /* Loading improvements */
            .spinner {
                position: relative;
            }

            .spinner::before {
                content: '';
                position: absolute;
                top: -4px;
                left: -4px;
                right: -4px;
                bottom: -4px;
                border: 2px solid transparent;
                border-top: 2px solid var(--purple);
                border-radius: 50%;
                animation: spin 2s linear infinite reverse;
            }

            /* Focus management for accessibility */
            .search-input:focus,
            .btn:focus,
            .city-btn:focus {
                outline: 2px solid var(--primary-blue);
                outline-offset: 2px;
            }

            /* Smooth transitions for all interactive elements */
            .stat-card,
            .city-btn,
            .btn,
            .search-input {
                transition: var(--transition);
            }

            /* Desktop-optimized sizing */
            @media (min-width: 1200px) {
                .app-container {
                    padding: 40px;
                }
                
                .main-panel {
                    padding: 60px;
                }
                
                .sidebar-card {
                    padding: 40px;
                }
                
                .brand-icon {
                    font-size: 56px;
                }
                
                .brand-title {
                    font-size: 42px;
                }
                
                .location-name {
                    font-size: 38px;
                }
                
                .current-time {
                    font-size: 20px;
                }
                
                .weather-icon {
                    font-size: 140px;
                }
                
                .weather-description {
                    font-size: 28px;
                }
                
                .main-temp {
                    font-size: 108px;
                }
                
                .feels-like {
                    font-size: 22px;
                }
                
                .stat-icon {
                    font-size: 36px;
                }
                
                .stat-value {
                    font-size: 28px;
                }
                
                .stat-label {
                    font-size: 16px;
                }
                
                .card-title {
                    font-size: 24px;
                }
                
                .search-input {
                    padding: 20px 24px;
                    font-size: 18px;
                    min-width: 400px;
                }
                
                .btn {
                    padding: 20px 24px;
                    font-size: 18px;
                    min-width: 64px;
                }
                
                .city-btn {
                    padding: 20px;
                    font-size: 16px;
                }
                
                .aqi-circle {
                    width: 140px;
                    height: 140px;
                    font-size: 36px;
                }
                
                .aqi-status {
                    font-size: 20px;
                }
                
                .aqi-description {
                    font-size: 16px;
                }
                
                .sun-value {
                    font-size: 20px;
                }
            }

            /* Ultra-wide desktop optimizations */
            @media (min-width: 1600px) {
                .app-container {
                    max-width: 1800px;
                    padding: 60px;
                }
                
                .dashboard {
                    gap: 48px;
                }
                
                .weather-stats {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 32px;
                }
                
                .stat-card {
                    padding: 32px;
                }
            }
        `;
document.head.appendChild(enhancedStyles);

// Air Quality Toggle Function
function toggleDetailedAQI() {
  const detailedInfo = document.getElementById("aqiDetailedInfo");
  const toggleBtn = document.getElementById("aqiToggleBtn");
  const toggleText = toggleBtn.querySelector("span");
  const toggleIcon = toggleBtn.querySelector("i");

  if (detailedInfo.classList.contains("collapsed")) {
    // Expand
    detailedInfo.classList.remove("collapsed");
    toggleBtn.classList.add("expanded");
    toggleText.textContent = "Hide Detailed Information";
    console.log("🌬️ AQI detailed information expanded");
  } else {
    // Collapse
    detailedInfo.classList.add("collapsed");
    toggleBtn.classList.remove("expanded");
    toggleText.textContent = "Show Detailed Information";
    console.log("🌬️ AQI detailed information collapsed");
  }
}
