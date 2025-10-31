import React, { useState, useEffect } from 'react';
import { Search, MapPin, Save, Edit, Trash2, Download, Youtube, Globe } from 'lucide-react';

const WeatherApp = () => {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  const [location, setLocation] = useState('');
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [savedRecords, setSavedRecords] = useState([]);
  
  const [editingId, setEditingId] = useState(null);
  const [editLocation, setEditLocation] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('current');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // ========================================
  // LOAD SAVED DATA ON START
  // ========================================
  useEffect(() => {
    loadAllRecords();
  }, []);

  const loadAllRecords = () => {
    try {
      const stored = localStorage.getItem('weatherRecords');
      if (stored) {
        const records = JSON.parse(stored);
        setSavedRecords(records.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
      }
    } catch (e) {
      console.log('No saved records yet');
      setSavedRecords([]);
    }
  };

  const saveRecordsToStorage = (records) => {
    localStorage.setItem('weatherRecords', JSON.stringify(records));
  };

  // ========================================
  // FETCH CURRENT WEATHER
  // ========================================
  const fetchCurrentWeather = async (loc) => {
    if (!loc.trim()) {
      setError('Please enter a location');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=en&format=json`;
      const geoResponse = await fetch(geoUrl);
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Location not found. Try: New York, 10001, or landmarks like Eiffel Tower');
      }

      const { latitude, longitude, name, country, admin1 } = geoData.results[0];
      const fullLocation = `${name}${admin1 ? ', ' + admin1 : ''}, ${country}`;

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weathercode,windspeed_10m,pressure_msl&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&forecast_days=6`;
      
      const weatherResponse = await fetch(weatherUrl);
      const weatherData = await weatherResponse.json();

      setCurrentWeather({
        location: fullLocation,
        latitude,
        longitude,
        temperature: Math.round(weatherData.current.temperature_2m),
        feelsLike: Math.round(weatherData.current.apparent_temperature),
        humidity: weatherData.current.relative_humidity_2m,
        windSpeed: Math.round(weatherData.current.windspeed_10m),
        pressure: Math.round(weatherData.current.pressure_msl),
        precipitation: weatherData.current.precipitation,
        condition: getWeatherDescription(weatherData.current.weathercode)
      });

      const forecastData = [];
      for (let i = 1; i <= 5; i++) {
        forecastData.push({
          date: weatherData.daily.time[i],
          maxTemp: Math.round(weatherData.daily.temperature_2m_max[i]),
          minTemp: Math.round(weatherData.daily.temperature_2m_min[i]),
          condition: getWeatherDescription(weatherData.daily.weathercode[i]),
          precipitation: weatherData.daily.precipitation_sum[i]
        });
      }
      setForecast(forecastData);

    } catch (err) {
      setError(err.message || 'Failed to fetch weather. Please try again.');
      setCurrentWeather(null);
      setForecast([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // GET USER'S CURRENT LOCATION
  // ========================================
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        setLocation(`${lat}, ${lon}`);
        fetchCurrentWeather(`${lat},${lon}`);
      },
      (err) => {
        setError('Unable to get your location. Please enter manually.');
        setLoading(false);
      }
    );
  };

  // ========================================
  // WEATHER HELPERS
  // ========================================
  const getWeatherDescription = (code) => {
    const descriptions = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Drizzle',
      55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
      71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers',
      81: 'Rain showers', 82: 'Heavy rain showers', 95: 'Thunderstorm',
      96: 'Thunderstorm with hail', 99: 'Heavy thunderstorm'
    };
    return descriptions[code] || 'Unknown';
  };

  const getWeatherIcon = (condition) => {
    const cond = condition.toLowerCase();
    if (cond.includes('clear')) return '☀️';
    if (cond.includes('cloud')) return '☁️';
    if (cond.includes('rain') || cond.includes('drizzle')) return '🌧️';
    if (cond.includes('snow')) return '❄️';
    if (cond.includes('thunder')) return '⛈️';
    if (cond.includes('fog')) return '🌫️';
    return '🌤️';
  };

  // ========================================
  // VALIDATE DATE RANGE
  // ========================================
  const validateDates = (start, end) => {
    if (!start || !end) return 'Both start and end dates are required';

    const startD = new Date(start);
    const endD = new Date(end);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startD > endD) return 'Start date must be before end date';
    if (endD > today) return 'End date cannot be in the future';

    const daysDiff = (endD - startD) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) return 'Date range cannot exceed 1 year';

    return null;
  };

  // ========================================
  // CREATE - SAVE WEATHER DATA
  // ========================================
  const saveWeatherData = async () => {
    if (!location.trim()) {
      setError('Please enter a location');
      return;
    }

    const dateError = validateDates(startDate, endDate);
    if (dateError) {
      setError(dateError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
      const geoResponse = await fetch(geoUrl);
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Location not found');
      }

      const { latitude, longitude, name, country, admin1 } = geoData.results[0];
      const fullLocation = `${name}${admin1 ? ', ' + admin1 : ''}, ${country}`;

      const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`;
      
      const weatherResponse = await fetch(weatherUrl);
      const weatherData = await weatherResponse.json();

      const temps = weatherData.daily.temperature_2m_max;
      const avgMaxTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      const avgMinTemp = weatherData.daily.temperature_2m_min.reduce((a, b) => a + b, 0) / weatherData.daily.temperature_2m_min.length;
      const totalPrecip = weatherData.daily.precipitation_sum.reduce((a, b) => a + b, 0);

      const record = {
        id: `weather_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        location: fullLocation,
        latitude,
        longitude,
        startDate,
        endDate,
        avgMaxTemp: avgMaxTemp.toFixed(1),
        avgMinTemp: avgMinTemp.toFixed(1),
        totalPrecipitation: totalPrecip.toFixed(1),
        dailyData: weatherData.daily,
        savedAt: new Date().toISOString()
      };

      const updatedRecords = [record, ...savedRecords];
      setSavedRecords(updatedRecords);
      saveRecordsToStorage(updatedRecords);
      
      setLocation('');
      setStartDate('');
      setEndDate('');
      
      alert('✅ Weather data saved successfully!');
      setActiveTab('saved');

    } catch (err) {
      setError(err.message || 'Failed to save weather data');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // UPDATE - EDIT RECORD
  // ========================================
  const startEditRecord = (record) => {
    setEditingId(record.id);
    setEditLocation(record.location);
    setEditStart(record.startDate);
    setEditEnd(record.endDate);
  };

  const saveEditedRecord = async (id) => {
    const dateError = validateDates(editStart, editEnd);
    if (dateError) {
      setError(dateError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(editLocation)}&count=1&language=en&format=json`;
      const geoResponse = await fetch(geoUrl);
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Location not found');
      }

      const { latitude, longitude, name, country, admin1 } = geoData.results[0];
      const fullLocation = `${name}${admin1 ? ', ' + admin1 : ''}, ${country}`;

      const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${editStart}&end_date=${editEnd}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`;
      
      const weatherResponse = await fetch(weatherUrl);
      const weatherData = await weatherResponse.json();

      const temps = weatherData.daily.temperature_2m_max;
      const avgMaxTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      const avgMinTemp = weatherData.daily.temperature_2m_min.reduce((a, b) => a + b, 0) / weatherData.daily.temperature_2m_min.length;
      const totalPrecip = weatherData.daily.precipitation_sum.reduce((a, b) => a + b, 0);

      const updatedRecords = savedRecords.map(r => 
        r.id === id ? {
          ...r,
          location: fullLocation,
          latitude,
          longitude,
          startDate: editStart,
          endDate: editEnd,
          avgMaxTemp: avgMaxTemp.toFixed(1),
          avgMinTemp: avgMinTemp.toFixed(1),
          totalPrecipitation: totalPrecip.toFixed(1),
          dailyData: weatherData.daily,
          savedAt: new Date().toISOString()
        } : r
      );

      setSavedRecords(updatedRecords);
      saveRecordsToStorage(updatedRecords);
      
      setEditingId(null);
      alert('✅ Record updated successfully!');

    } catch (err) {
      setError(err.message || 'Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // ========================================
  // DELETE - REMOVE RECORD
  // ========================================
  const deleteRecord = (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    const updatedRecords = savedRecords.filter(r => r.id !== id);
    setSavedRecords(updatedRecords);
    saveRecordsToStorage(updatedRecords);
    
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(null);
    }
    
    alert('✅ Record deleted successfully!');
  };

  // ========================================
  // VIEW RECORD DETAILS
  // ========================================
  const viewRecordDetails = (record) => {
    setSelectedRecord(record);
  };

  // ========================================
  // EXPORT DATA
  // ========================================
  const exportData = (format) => {
    if (savedRecords.length === 0) {
      alert('No data to export');
      return;
    }

    let content = '';
    let mimeType = '';
    let filename = '';

    if (format === 'json') {
      content = JSON.stringify(savedRecords, null, 2);
      mimeType = 'application/json';
      filename = 'weather_data.json';
    } else if (format === 'csv') {
      content = 'ID,Location,Latitude,Longitude,Start Date,End Date,Avg Max Temp (°C),Avg Min Temp (°C),Total Precipitation (mm),Saved At\n';
      savedRecords.forEach(r => {
        content += `"${r.id}","${r.location}",${r.latitude},${r.longitude},${r.startDate},${r.endDate},${r.avgMaxTemp},${r.avgMinTemp},${r.totalPrecipitation},"${r.savedAt}"\n`;
      });
      mimeType = 'text/csv';
      filename = 'weather_data.csv';
    } else if (format === 'xml') {
      content = '<?xml version="1.0" encoding="UTF-8"?>\n<weatherRecords>\n';
      savedRecords.forEach(r => {
        content += `  <record>\n    <id>${r.id}</id>\n    <location>${r.location}</location>\n    <latitude>${r.latitude}</latitude>\n    <longitude>${r.longitude}</longitude>\n    <startDate>${r.startDate}</startDate>\n    <endDate>${r.endDate}</endDate>\n    <avgMaxTemp>${r.avgMaxTemp}</avgMaxTemp>\n    <avgMinTemp>${r.avgMinTemp}</avgMinTemp>\n    <totalPrecipitation>${r.totalPrecipitation}</totalPrecipitation>\n    <savedAt>${r.savedAt}</savedAt>\n  </record>\n`;
      });
      content += '</weatherRecords>';
      mimeType = 'application/xml';
      filename = 'weather_data.xml';
    } else if (format === 'markdown') {
      content = '# Weather Data Export\n\n';
      content += `**Total Records:** ${savedRecords.length}\n\n`;
      content += `**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;
      savedRecords.forEach(r => {
        content += `## ${r.location}\n\n- **Date Range:** ${r.startDate} to ${r.endDate}\n- **Coordinates:** ${r.latitude}°N, ${r.longitude}°E\n- **Average Max Temperature:** ${r.avgMaxTemp}°C\n- **Average Min Temperature:** ${r.avgMinTemp}°C\n- **Total Precipitation:** ${r.totalPrecipitation}mm\n- **Saved:** ${new Date(r.savedAt).toLocaleString()}\n\n---\n\n`;
      });
      mimeType = 'text/markdown';
      filename = 'weather_data.md';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ========================================
  // RENDER UI
  // ========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 p-4">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-8 mt-4">
          <h1 className="text-5xl font-bold text-white mb-2">🌤️ Weather App</h1>
          <p className="text-white text-lg">Real-time weather with full CRUD functionality</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          <button onClick={() => setActiveTab('current')} className={`px-6 py-3 rounded-lg font-bold transition ${activeTab === 'current' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
            📍 Current Weather
          </button>
          <button onClick={() => setActiveTab('save')} className={`px-6 py-3 rounded-lg font-bold transition ${activeTab === 'save' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
            💾 Save Weather Data
          </button>
          <button onClick={() => setActiveTab('saved')} className={`px-6 py-3 rounded-lg font-bold transition ${activeTab === 'saved' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
            📊 Saved Records ({savedRecords.length})
          </button>
          <button onClick={() => setActiveTab('export')} className={`px-6 py-3 rounded-lg font-bold transition ${activeTab === 'export' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
            📥 Export Data
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-800 px-4 py-3 rounded-lg mb-6 max-w-4xl mx-auto">
            <strong>Error:</strong> {error}
            <button onClick={() => setError('')} className="float-right font-bold">✕</button>
          </div>
        )}

        {/* TAB 1: CURRENT WEATHER */}
        {activeTab === 'current' && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🌍 Get Current Weather</h2>
            
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchCurrentWeather(location)}
                placeholder="Enter city, zip code, coordinates, or landmark..."
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
              />
              <button onClick={() => fetchCurrentWeather(location)} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2">
                <Search size={20} />
                Search
              </button>
              <button onClick={getCurrentLocation} disabled={loading} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2">
                <MapPin size={20} />
                My Location
              </button>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg">Loading weather data...</p>
              </div>
            )}

            {currentWeather && !loading && (
              <div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-3xl font-bold text-gray-800">{currentWeather.location}</h3>
                      <p className="text-gray-600">Current Weather Conditions</p>
                    </div>
                    <div className="text-6xl">{getWeatherIcon(currentWeather.condition)}</div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-4xl font-bold text-blue-600">{currentWeather.temperature}°C</div>
                      <div className="text-gray-600 mt-1">Temperature</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-4xl font-bold text-orange-500">{currentWeather.feelsLike}°C</div>
                      <div className="text-gray-600 mt-1">Feels Like</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-4xl font-bold text-blue-500">{currentWeather.humidity}%</div>
                      <div className="text-gray-600 mt-1">Humidity</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-4xl font-bold text-gray-600">{currentWeather.windSpeed} km/h</div>
                      <div className="text-gray-600 mt-1">Wind Speed</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">{currentWeather.pressure} hPa</div>
                      <div className="text-gray-600">Pressure</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">{currentWeather.precipitation} mm</div>
                      <div className="text-gray-600">Precipitation</div>
                    </div>
                  </div>

                  <div className="mt-4 bg-white rounded-lg p-4">
                    <div className="text-xl font-bold text-gray-700">{currentWeather.condition}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">📅 5-Day Forecast</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {forecast.map((day, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                        <div className="font-bold text-gray-700 mb-2">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-4xl mb-2">{getWeatherIcon(day.condition)}</div>
                        <div className="text-sm text-gray-600 mb-2">{day.condition}</div>
                        <div className="flex justify-center gap-2 text-lg font-bold">
                          <span className="text-red-500">{day.maxTemp}°</span>
                          <span className="text-blue-500">{day.minTemp}°</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">💧 {day.precipitation}mm</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(currentWeather.location + ' weather travel')}`} target="_blank" rel="noopener noreferrer" className="px-6 py-4 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center justify-center gap-2">
                    <Youtube size={24} />
                    View Travel Videos
                  </a>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${currentWeather.latitude},${currentWeather.longitude}`} target="_blank" rel="noopener noreferrer" className="px-6 py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                    <Globe size={24} />
                    View on Map
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAVE WEATHER DATA */}
        {activeTab === 'save' && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">💾 Save Historical Weather Data</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">📍 Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter city, zip code, coordinates, or landmark..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
                />
                <p className="text-sm text-gray-500 mt-1">Examples: New York, 10001, 40.7128,-74.0060, Eiffel Tower</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2">📅 Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-2">📅 End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={saveWeatherData}
                disabled={loading}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg text-xl font-bold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <Save size={24} />
                {loading ? 'Saving...' : 'Save Weather Data'}
              </button>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-2">ℹ️ Important Notes:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Location can be: City name, ZIP code, GPS coordinates, or landmarks</li>
                  <li>✓ Date range must be in the past (no future dates)</li>
                  <li>✓ Maximum date range: 1 year</li>
                  <li>✓ Data includes daily temperatures and precipitation</li>
                  <li>✓ All saved data can be viewed, edited, or deleted later</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAVED RECORDS */}
        {activeTab === 'saved' && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Saved Weather Records</h2>
            
            {savedRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-xl">No saved records yet</p>
                <p>Save your first weather search to see it here!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedRecords.map((record) => (
                  <div key={record.id} className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
                    {editingId === record.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="Location"
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="date"
                            value={editStart}
                            onChange={(e) => setEditStart(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            type="date"
                            value={editEnd}
                            onChange={(e) => setEditEnd(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditedRecord(record.id)}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400"
                          >
                            ✓ Save Changes
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600"
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">{record.location}</h3>
                            <p className="text-gray-600">
                              📅 {record.startDate} to {record.endDate}
                            </p>
                            <p className="text-sm text-gray-500">
                              📍 {record.latitude.toFixed(4)}°N, {record.longitude.toFixed(4)}°E
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => viewRecordDetails(record)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 text-sm"
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => startEditRecord(record)}
                              className="px-3 py-2 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-700"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-500">{record.avgMaxTemp}°C</div>
                            <div className="text-xs text-gray-600">Avg Max Temp</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-500">{record.avgMinTemp}°C</div>
                            <div className="text-xs text-gray-600">Avg Min Temp</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{record.totalPrecipitation}mm</div>
                            <div className="text-xs text-gray-600">Total Precipitation</div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          💾 Saved: {new Date(record.savedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedRecord && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{selectedRecord.location}</h3>
                    <button
                      onClick={() => setSelectedRecord(null)}
                      className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-2">📍 Location Details</h4>
                      <p>🌍 {selectedRecord.location}</p>
                      <p>📍 Coordinates: {selectedRecord.latitude}°N, {selectedRecord.longitude}°E</p>
                      <p>📅 Period: {selectedRecord.startDate} to {selectedRecord.endDate}</p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-2">🌡️ Temperature Summary</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-3xl font-bold text-red-500">{selectedRecord.avgMaxTemp}°C</p>
                          <p className="text-gray-600">Average Maximum</p>
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-blue-500">{selectedRecord.avgMinTemp}°C</p>
                          <p className="text-gray-600">Average Minimum</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-2">💧 Precipitation</h4>
                      <p className="text-3xl font-bold text-blue-600">{selectedRecord.totalPrecipitation}mm</p>
                      <p className="text-gray-600">Total for period</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-2">📊 Daily Data</h4>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-200">
                            <tr>
                              <th className="p-2 text-left">Date</th>
                              <th className="p-2 text-center">Max Temp</th>
                              <th className="p-2 text-center">Min Temp</th>
                              <th className="p-2 text-center">Precipitation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRecord.dailyData.time.map((date, idx) => (
                              <tr key={idx} className="border-b border-gray-200">
                                <td className="p-2">{date}</td>
                                <td className="p-2 text-center font-bold text-red-500">
                                  {selectedRecord.dailyData.temperature_2m_max[idx].toFixed(1)}°C
                                </td>
                                <td className="p-2 text-center font-bold text-blue-500">
                                  {selectedRecord.dailyData.temperature_2m_min[idx].toFixed(1)}°C
                                </td>
                                <td className="p-2 text-center text-blue-600">
                                  {selectedRecord.dailyData.precipitation_sum[idx].toFixed(1)}mm
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EXPORT DATA */}
        {activeTab === 'export' && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📥 Export Weather Data</h2>
            
            {savedRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-xl">No data to export</p>
                <p>Save some weather records first!</p>
              </div>
            ) : (
              <div>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-gray-700">
                    <strong>Total Records:</strong> {savedRecords.length}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    Choose a format below to download your weather data
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => exportData('json')}
                    className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                  >
                    <div className="text-3xl mb-2">📄</div>
                    <div className="font-bold text-lg text-gray-800">JSON Format</div>
                    <div className="text-sm text-gray-600">Perfect for developers and APIs</div>
                  </button>

                  <button
                    onClick={() => exportData('csv')}
                    className="p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                  >
                    <div className="text-3xl mb-2">📊</div>
                    <div className="font-bold text-lg text-gray-800">CSV Format</div>
                    <div className="text-sm text-gray-600">Open in Excel or Google Sheets</div>
                  </button>

                  <button
                    onClick={() => exportData('xml')}
                    className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left"
                  >
                    <div className="text-3xl mb-2">🗂️</div>
                    <div className="font-bold text-lg text-gray-800">XML Format</div>
                    <div className="text-sm text-gray-600">Standard data interchange format</div>
                  </button>

                  <button
                    onClick={() => exportData('markdown')}
                    className="p-6 border-2 border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition text-left"
                  >
                    <div className="text-3xl mb-2">📝</div>
                    <div className="font-bold text-lg text-gray-800">Markdown Format</div>
                    <div className="text-sm text-gray-600">Human-readable documentation</div>
                  </button>
                </div>

                <div className="mt-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-2">💡 Export Tips:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• JSON: Best for importing into other applications</li>
                    <li>• CSV: Easy to analyze in spreadsheet software</li>
                    <li>• XML: Compatible with many enterprise systems</li>
                    <li>• Markdown: Great for documentation and reports</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default WeatherApp;