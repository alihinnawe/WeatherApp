// Constants for OpenWeather API key and base URL
const OPEN_WEATHER_APP_KEY = "65d8e433543028fb83bd8709bebfad8f";
const OPEN_WEATHER_APP_ORIGIN = "https://api.openweathermap.org";

/**
 * Registers the event listener for the query button and initializes the app.
 */
async function initialize () {
	// Register click event listener on the query button to process weather forecast
	const queryButton = document.querySelector("section.location button.query");
	queryButton.addEventListener("click", event => processWeatherForecast());
}

/**
 * Processes the weather forecast by fetching and displaying weather data.
 */
async function processWeatherForecast () {
	// Get reference to the message output element
	const messageOutput = document.querySelector("footer>input.message");
	messageOutput.classList.remove("success", "failure");

	try {
		// Get the city and country code from the input fields
		const center = document.querySelector("article.center");
		const locationSection = document.querySelector("section.location");
		const city = locationSection.querySelector("input.city").value.trim() || null;
		const countryCode = locationSection.querySelector("input.country").value.trim() || null;
		
		// Fetch location data based on the city and country code
		const location = await invokeQueryLocation(city, null, countryCode);
		
		// Fetch weather forecast data using the location coordinates
		const weatherForecast = await invokeQueryWeatherForecast(location.lat, location.lon);
		console.log("weatherForecast", weatherForecast);
	
		// Check if the weather overview section exists, if not, create it
		let overviewSection = center.querySelector("section.weather-overview");
		if (!overviewSection) {
			const overviewSectionTemplate = document.querySelector("head>template.weather-overview");
			overviewSection = overviewSectionTemplate.content.firstElementChild.cloneNode(true); 
			center.append(overviewSection);
		}
		
		// Get the table row template and clear the table body
		const tableRowTemplate = document.querySelector("head>template.weather-overview-row");
		const tableBody = overviewSection.querySelector("table>tbody");
		tableBody.innerHTML = "";

		// Initialize variables to group forecast data by date
		const dayForecast = {dateText: null, list: []};
		weatherForecast.list.push(null); // Add a sentinel value to process the last day
		
		// Process each three-hour forecast data
		for (const threeHourForecast of weatherForecast.list) {
			// Extract date from the forecast data
			const dateText = threeHourForecast 
				? threeHourForecast.dt_txt.substring(0, threeHourForecast.dt_txt.indexOf(' '))
				: null;

			if (dayForecast.dateText !== dateText) {
				// Process and display the previous day's forecast if available
				if (dayForecast.dateText !== null) {
					const tableRow = tableRowTemplate.content.firstElementChild.cloneNode(true);
					tableBody.append(tableRow);

					// Calculate minimum and maximum temperatures
					const dayThreeHourForecasts = dayForecast.list;
					const minTemperature = dayThreeHourForecasts.reduce((acc, element) => Math.min(acc, element.main.temp_min), Infinity) - 273.15;
					const maxTemperature = dayThreeHourForecasts.reduce((acc, element) => Math.max(acc, element.main.temp_max), 0) - 273.15;
					const rain = dayThreeHourForecasts.reduce((acc, element) => acc + (element.rain ? element.rain["3h"] : null),0);
					const humidity = dayThreeHourForecasts.reduce((acc, element) => acc + element.main.humidity,0) / dayThreeHourForecasts.length;
					const pressure = dayThreeHourForecasts.reduce((acc, element) => acc + element.main.pressure,0) / dayThreeHourForecasts.length;
					const minVisisbility = dayThreeHourForecasts.reduce((acc, element) => Math.min(acc, element.visibility), Infinity);
					const maxVisisbility = dayThreeHourForecasts.reduce((acc, element) => Math.max(acc, element.visibility), 0);

					// Update table row with date and temperature range
					tableRow.querySelector("td.date>button").innerText = new Date(dayThreeHourForecasts[0].dt * 1000).toLocaleDateString();
					tableRow.querySelector("td.temperature").innerText = Math.round(minTemperature) + "° - " + Math.round(maxTemperature) + "°"; 
					tableRow.querySelector("td.rain").innerText = Math.round(rain).toString(); 
					tableRow.querySelector("td.humidity").innerText = Math.round(humidity).toString() + "%"; 
					tableRow.querySelector("td.pressure").innerText = Math.round(humidity).toString();
					tableRow.querySelector("td.visibility").innerText = Math.round(minVisisbility) + "m - " + Math.round(maxVisisbility) + "m"; 
				}

				// Start new forecast grouping
				dayForecast.dateText = dateText;
				dayForecast.list = [];
			}

			dayForecast.list.push(threeHourForecast);
		}

		// Update the message output to indicate success
		messageOutput.value = "ok.";
		messageOutput.classList.add("success");
	} catch (error) { 
		// Update the message output to indicate failure
		messageOutput.value = error.message;
		messageOutput.classList.add("failure");
	}
}

/**
 * Fetches location data from the OpenWeather API based on city and country code.
 * @param city The city name.
 * @param stateCode The state code (optional, not used in this function).
 * @param countryCode The country code.
 * @return The location object or null if no location found.
 */
async function invokeQueryLocation (city, stateCode, countryCode) {
	const queryFactory = new URLSearchParams();
	queryFactory.set("appid", OPEN_WEATHER_APP_KEY);
	queryFactory.set("limit", 1);
	queryFactory.set("q", (city || "") + "," + (stateCode || "") + "," + (countryCode || ""));

	const resource = OPEN_WEATHER_APP_ORIGIN + "/geo/1.0/direct?" + queryFactory.toString();
	const headers = { "Accept": "application/json" };
	const response = await fetch(resource, { method: "GET", headers: headers, credentials: "omit" });
	if (!response.ok) throw new Error("HTTP " + response.status + " " + response.statusText);
	const locations = await response.json();
	
	return locations.length === 0 ? null : locations[0];
}

/**
 * Fetches the 5-day weather forecast from the OpenWeather API based on latitude and longitude.
 * @param lattitude The latitude.
 * @param longtitude The longitude.
 * @return The 5-day weather forecast data.
 */
async function invokeQueryWeatherForecast (lattitude, longtitude) {
	const queryFactory = new URLSearchParams();
	queryFactory.set("appid", OPEN_WEATHER_APP_KEY);
	queryFactory.set("lat", lattitude);
	queryFactory.set("lon", longtitude);

	const resource = OPEN_WEATHER_APP_ORIGIN + "/data/2.5/forecast?" + queryFactory.toString();
	const headers = { "Accept": "application/json" };
	const response = await fetch(resource, { method: "GET", headers: headers, credentials: "omit" });
	if (!response.ok) throw new Error("HTTP " + response.status + " " + response.statusText);
	return response.json();
}

/**
 * Registers the load event listener to initialize the application when the window loads.
 */
window.addEventListener("load", event => {
	initialize();
});
