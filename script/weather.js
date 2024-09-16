import { createSvgLine, createSvgPolygon, createSvgCircle, createSvgText } from "../../../tool/svg.js";

// constants
const OPEN_WEATHER_APP_KEY = "65d8e433543028fb83bd8709bebfad8f";
const OPEN_WEATHER_APP_ORIGIN = "https://api.openweathermap.org";


/**
 * Registers the basic event listeners, initiating
 * the controller logic.
 */
async function initialize () {
	// register event listeners
	const queryButton = document.querySelector("section.location button.query");
	queryButton.addEventListener("click", event => processWeatherForecast());
}


/**
 * Handles querying a location and the associated weather forecast.
 */
async function processWeatherForecast () {
	const messageOutput = document.querySelector("footer>input.message");
	messageOutput.classList.remove("success", "failure");

	try {
		const center = document.querySelector("article.center");
		const locationSection = center.querySelector("section.location");
		const city = locationSection.querySelector("input.city").value.trim() || null;
		const countryCode = locationSection.querySelector("input.country").value.trim() || null;

		const location = await invokeQueryLocation(city, null, countryCode);
		// console.log(location);

		const weatherForecast = await invokeQueryWeatherForecast(location.lat, location.lon);
		console.log(weatherForecast);

		let overviewSection = center.querySelector("section.weather-overview");
		if (!overviewSection) {
			const overviewSectionTemplate = document.querySelector("head>template.weather-overview");
			overviewSection = overviewSectionTemplate.content.firstElementChild.cloneNode(true);
			center.append(overviewSection);
		}

		const tableRowTemplate = document.querySelector("head>template.weather-overview-row");
		const tableBody = overviewSection.querySelector("table>tbody");
		tableBody.innerHTML = "";

		// collects daily forecast data, and adds a new table row whenever the
		// day changes; aggregates the row data from the available 3-hour forecasts;
		// adds a null element as signal element
		const dayForecast = { dateText: null, list: [] };
		weatherForecast.list.push(null);		

		for (const threeHourForecast of weatherForecast.list) {
			const dateText = threeHourForecast
				? threeHourForecast.dt_txt.substring(0, threeHourForecast.dt_txt.indexOf(' '))
				: null;
			// console.log(dateText);

			if (dayForecast.dateText !== dateText) {
				if (dayForecast.dateText !== null) {
					const tableRow = tableRowTemplate.content.firstElementChild.cloneNode(true);
					tableBody.append(tableRow);

					const dayThreeHourForecasts = dayForecast.list;
					const date = new Date(dayThreeHourForecasts[0].dt * 1000);
					const minTemperature = dayThreeHourForecasts.reduce((accu, element) => Math.min(accu, element.main.temp_min), Infinity) - 273.15;
					const maxTemperature = dayThreeHourForecasts.reduce((accu, element) => Math.max(accu, element.main.temp_max), 0) - 273.15;
					const rain = dayThreeHourForecasts.reduce((accu, element) => accu + (element.rain ? element.rain["3h"] : 0), 0);
					const humidity = dayThreeHourForecasts.reduce((accu, element) => accu + element.main.humidity, 0) / dayThreeHourForecasts.length;
					const pressure = dayThreeHourForecasts.reduce((accu, element) => accu + element.main.pressure, 0) / dayThreeHourForecasts.length;
					const minVisibility = dayThreeHourForecasts.reduce((accu, element) => Math.min(accu, element.visibility), Infinity);
					const maxVisibility = dayThreeHourForecasts.reduce((accu, element) => Math.max(accu, element.visibility), 0);

					const dateButton = tableRow.querySelector("td.date>button");
					dateButton.innerText = date.toLocaleDateString();
					dateButton.addEventListener("click", event => processDayWeatherForecast(weatherForecast.city, date, dayThreeHourForecasts));
					tableRow.querySelector("td.temperature").innerText = Math.round(minTemperature) + "°C - " + Math.round(maxTemperature) + "°C";
					tableRow.querySelector("td.rain").innerText = Math.round(rain) + " l/m²";
					tableRow.querySelector("td.humidity").innerText = Math.round(humidity) + "%";
					tableRow.querySelector("td.pressure").innerText = Math.round(pressure) + " hPa";
					tableRow.querySelector("td.visibility").innerText = Math.round(minVisibility) + " - " + Math.round(maxVisibility);
				}

				dayForecast.dateText = dateText;
				dayForecast.list = [];
			}

			dayForecast.list.push(threeHourForecast);
		}

		messageOutput.value = "ok";
		messageOutput.classList.add("success");
	} catch (error) {
		messageOutput.value = error.message;
		messageOutput.classList.add("failure");
	}
}


/**
 * Displays a detailed daily weather forecast.
 * @param city the city
 * @param date the start timestamp of the day
 * @param threeHourForecasts the three hour forecasts for one day
 */
async function processDayWeatherForecast (city, date, threeHourForecasts) {
	const messageOutput = document.querySelector("footer>input.message");
	messageOutput.classList.remove("success", "failure");

	try {
		console.log(threeHourForecasts);
		
		const center = document.querySelector("article.center");
		center.querySelector("section.location").classList.add("hidden");
		center.querySelector("section.weather-overview").classList.add("hidden");

		const detailsSectionTemplate = document.querySelector("head>template.weather-details");
		const detailsSection = detailsSectionTemplate.content.firstElementChild.cloneNode(true);
		center.append(detailsSection);

		detailsSection.querySelector("div.main output.date").value = date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
		detailsSection.querySelector("div.main input.city").value = city.name;
		detailsSection.querySelector("div.main input.country").value = city.country;
		detailsSection.querySelector("div.control>button.back").addEventListener("click", event => processBack());
		detailsSection.querySelector("div.control>button.toggle.water").addEventListener("click", event => detailsSection.querySelector("div.water>table").classList.toggle("hidden"));
		detailsSection.querySelector("div.control>button.toggle.pressure").addEventListener("click", event => detailsSection.querySelector("div.pressure>table").classList.toggle("hidden"));

		displayDayTemperatureForecast(threeHourForecasts);
		displayDayWindSpeedForecast(threeHourForecasts);
		displayDayWaterForecast(threeHourForecasts);
		displayDayPressureForecast(threeHourForecasts);

		messageOutput.value = "ok";
		messageOutput.classList.add("success");
	} catch (error) {
		messageOutput.value = error.message;
		messageOutput.classList.add("failure");
	}
}


/**
 * Removes the details section, and re-displays the location and overview sections.
 */
async function processBack () {
	const messageOutput = document.querySelector("footer>input.message");
	messageOutput.classList.remove("success", "failure");

	try {
		const center = document.querySelector("article.center");
		center.querySelector("section.weather-details").remove();
		center.querySelector("section.weather-overview").classList.remove("hidden");
		center.querySelector("section.location").classList.remove("hidden");

		messageOutput.value = "ok";
		messageOutput.classList.add("success");
	} catch (error) {
		messageOutput.value = error.message;
		messageOutput.classList.add("failure");
	}
}


/**
 * Displays a detailed daily temperature forecast.
 * @param threeHourForecasts the three hour forecasts for one day
 */
async function displayDayTemperatureForecast (threeHourForecasts) {
	const detailsSection = document.querySelector("article.center>section.weather-details");
	const graph = detailsSection.querySelector("span.temp>svg");

	const lowerBoundTemperature = Math.floor(threeHourForecasts.reduce((accu, element) => Math.min(accu, element.main.temp_min), Infinity) - 273.15);
	const upperBoundTemperature = Math.ceil(threeHourForecasts.reduce((accu, element) => Math.max(accu, element.main.temp_max), 0) - 273.15);
	const degreePixels = 100 / (upperBoundTemperature - lowerBoundTemperature);
	const timePixels = 300 / Math.max(1, threeHourForecasts.length - 1);

	const coordinatesGroup = graph.querySelector("g.coordinates");
	for (let temperature = lowerBoundTemperature; temperature <= upperBoundTemperature; ++temperature) {
		const y = Math.round(120 - (temperature - lowerBoundTemperature) * degreePixels);
		if (temperature != upperBoundTemperature) coordinatesGroup.append(createSvgLine(15, y, 20, y));
		if (temperature % 2 === 0) coordinatesGroup.append(createSvgText(5, y + 3, 0, temperature));
	}

	const delimiterPosition = threeHourForecasts[0].dt_txt.indexOf(" ");
	for (let timeSlot = 0; timeSlot < threeHourForecasts.length; ++timeSlot) {
		const x = Math.round(20 + timeSlot * timePixels);
		const timeText = threeHourForecasts[timeSlot].dt_txt.substring(delimiterPosition + 1, delimiterPosition + 6);
		if (timeSlot === 0 || timeSlot !== threeHourForecasts.length - 1) coordinatesGroup.append(createSvgLine(x, 125, x, 120));
		coordinatesGroup.append(createSvgText(x - 10, 135, 0, timeText));
	}

	const temperatureCoordinates = [];
	for (let timeSlot = 0; timeSlot < threeHourForecasts.length; ++timeSlot) {
		temperatureCoordinates.push(Math.round(20 + timeSlot * timePixels));
		temperatureCoordinates.push(Math.round(120 - (threeHourForecasts[timeSlot].main.temp - 273.15 - lowerBoundTemperature) * degreePixels));
	}

	const temperatureRangeCoordinates = [];
	for (let timeSlot = 0; timeSlot < threeHourForecasts.length; ++timeSlot) {
		temperatureRangeCoordinates.push(Math.round(20 + timeSlot * timePixels));
		temperatureRangeCoordinates.push(Math.round(120 - (threeHourForecasts[timeSlot].main.temp_max - 273.15 - lowerBoundTemperature) * degreePixels));
	}
	for (let timeSlot = threeHourForecasts.length - 1; timeSlot >= 0; --timeSlot) {
		temperatureRangeCoordinates.push(Math.round(20 + timeSlot * timePixels));
		temperatureRangeCoordinates.push(Math.round(120 - (threeHourForecasts[timeSlot].main.temp_min - 273.15 - lowerBoundTemperature) * degreePixels));
	}

	const temperatureRangeGroup = graph.querySelector("g.temp-range");
	temperatureRangeGroup.append(createSvgPolygon(...temperatureRangeCoordinates));

	const temperatureGroup = graph.querySelector("g.temp");
	for (let index = 2; index < temperatureCoordinates.length; index += 2)
		temperatureGroup.append(createSvgLine(temperatureCoordinates[index - 2], temperatureCoordinates[index - 1], temperatureCoordinates[index], temperatureCoordinates[index + 1]));
	for (let index = 0; index < temperatureCoordinates.length; index += 2)
		temperatureGroup.append(createSvgCircle(temperatureCoordinates[index], temperatureCoordinates[index + 1], 2));
}


/**
 * Displays a detailed daily wind speed forecast.
 * @param threeHourForecasts the three hour forecasts for one day
 */
async function displayDayWindSpeedForecast (threeHourForecasts) {
	const detailsSection = document.querySelector("article.center>section.weather-details");
	const graph = detailsSection.querySelector("span.wind>svg");

	const upperBoundWindSpeed = Math.ceil(threeHourForecasts.reduce((accu, element) => Math.max(accu, element.wind.gust), 0) * 3.6);
	const degreePixels = 100 / upperBoundWindSpeed;
	const timePixels = 300 / Math.max(1, threeHourForecasts.length - 1);

	const coordinatesGroup = graph.querySelector("g.coordinates");
	for (let windSpeed = 0; windSpeed <= upperBoundWindSpeed; windSpeed += 10) {
		const y = Math.round(120 - windSpeed * degreePixels);
		if (windSpeed != upperBoundWindSpeed) coordinatesGroup.append(createSvgLine(15, y, 20, y));
		coordinatesGroup.append(createSvgText(5, y + 3, 0, windSpeed));
	}

	const delimiterPosition = threeHourForecasts[0].dt_txt.indexOf(" ");
	for (let timeSlot = 0; timeSlot < threeHourForecasts.length; ++timeSlot) {
		const x = Math.round(20 + timeSlot * timePixels);
		const timeText = threeHourForecasts[timeSlot].dt_txt.substring(delimiterPosition + 1, delimiterPosition + 6);
		if (timeSlot === 0 || timeSlot !== threeHourForecasts.length - 1) coordinatesGroup.append(createSvgLine(x, 125, x, 120));
		coordinatesGroup.append(createSvgText(x - 10, 135, 0, timeText));
	}

	const windSpeedCoordinates = [];
	for (let timeSlot = 0; timeSlot < threeHourForecasts.length; ++timeSlot) {
		windSpeedCoordinates.push(Math.round(20 + timeSlot * timePixels));
		windSpeedCoordinates.push(Math.round(120 - threeHourForecasts[timeSlot].wind.speed * 3.6 * degreePixels));
	}

	const gustSpeedRangeCoordinates = [];
	for (let timeSlot = 0; timeSlot < threeHourForecasts.length; ++timeSlot) {
		gustSpeedRangeCoordinates.push(Math.round(20 + timeSlot * timePixels));
		gustSpeedRangeCoordinates.push(Math.round(120 - Math.max(threeHourForecasts[timeSlot].wind.speed, threeHourForecasts[timeSlot].wind.gust) * 3.6 * degreePixels));
	}
	for (let timeSlot = threeHourForecasts.length - 1; timeSlot >= 0; --timeSlot) {
		gustSpeedRangeCoordinates.push(Math.round(20 + timeSlot * timePixels));
		gustSpeedRangeCoordinates.push(Math.round(120 - Math.min(threeHourForecasts[timeSlot].wind.speed, threeHourForecasts[timeSlot].wind.gust) * 3.6 * degreePixels));
	}

	const gustRangeGroup = graph.querySelector("g.gust-range");
	gustRangeGroup.append(createSvgPolygon(...gustSpeedRangeCoordinates));

	const windGroup = graph.querySelector("g.wind");
	for (let index = 2; index < windSpeedCoordinates.length; index += 2)
		windGroup.append(createSvgLine(windSpeedCoordinates[index - 2], windSpeedCoordinates[index - 1], windSpeedCoordinates[index], windSpeedCoordinates[index + 1]));
	for (let index = 0; index < windSpeedCoordinates.length; index += 2)
		windGroup.append(createSvgCircle(windSpeedCoordinates[index], windSpeedCoordinates[index + 1], 2));
}


/**
 * Displays a detailed daily water related forecast.
 * @param threeHourForecasts the three hour forecasts for one day
 */
async function displayDayWaterForecast (threeHourForecasts) {
	const detailsSection = document.querySelector("article.center>section.weather-details");

	const tableRowTemplate = document.querySelector("head>template.weather-details-water-row");
	const tableBody = detailsSection.querySelector("div.water>table>tbody");
	tableBody.innerHTML = "";

	const delimiterPosition = threeHourForecasts[0].dt_txt.indexOf(" ");
	for (const threeHourForecast of threeHourForecasts) {
		const timeText = threeHourForecast.dt_txt.substring(delimiterPosition + 1, delimiterPosition + 6);

		const tableRow = tableRowTemplate.content.firstElementChild.cloneNode(true);
		tableBody.append(tableRow);

		tableRow.querySelector("td.time").innerText = threeHourForecast.dt_txt.substring(delimiterPosition + 1, delimiterPosition + 6);
		tableRow.querySelector("td.rain").innerText = (threeHourForecast.rain ? threeHourForecast.rain["3h"] : 0).toString();
		tableRow.querySelector("td.humidity").innerText = threeHourForecast.main.humidity + "%";
		tableRow.querySelector("td.cloudiness").innerText = threeHourForecast.clouds.all + "%";
		tableRow.querySelector("td.visibility").innerText = threeHourForecast.visibility.toString();
	}
}


/**
 * Displays a detailed daily pressure related forecast.
 * @param threeHourForecasts the three hour forecasts for one day
 */
async function displayDayPressureForecast (threeHourForecasts) {
	const detailsSection = document.querySelector("article.center>section.weather-details");

	const tableRowTemplate = document.querySelector("head>template.weather-details-pressure-row");
	const tableBody = detailsSection.querySelector("div.pressure>table>tbody");
	tableBody.innerHTML = "";

	const delimiterPosition = threeHourForecasts[0].dt_txt.indexOf(" ");
	for (const threeHourForecast of threeHourForecasts) {
		const timeText = threeHourForecast.dt_txt.substring(delimiterPosition + 1, delimiterPosition + 6);

		const tableRow = tableRowTemplate.content.firstElementChild.cloneNode(true);
		tableBody.append(tableRow);

		tableRow.querySelector("td.time").innerText = threeHourForecast.dt_txt.substring(delimiterPosition + 1, delimiterPosition + 6);
		tableRow.querySelector("td.pressure.main").innerText = threeHourForecast.main.pressure + " hPa";
		tableRow.querySelector("td.pressure.sea").innerText = threeHourForecast.main.sea_level + " hPa";
		tableRow.querySelector("td.pressure.ground").innerText = threeHourForecast.main.grnd_level + " hPa";
	}
}


/**
 * Invokes the location query web-service operation.
 * @param city the city
 * @param stateCode the state code
 * @param countryCode the country code
 * @return the (optional) location, or null for none
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
 * Invokes the 5-day weather forecast query web-service operation.
 * @param latitude the latitude within range [-90°, +90°]
 * @param longitude the longitude within range ]-180°, +180°]
 * @return the 5-day weather forecast
 */
async function invokeQueryWeatherForecast (latitude, longitude) {
	const queryFactory = new URLSearchParams();
	queryFactory.set("appid", OPEN_WEATHER_APP_KEY);
	queryFactory.set("lat", latitude);
	queryFactory.set("lon", longitude);

	const resource = OPEN_WEATHER_APP_ORIGIN + "/data/2.5/forecast?" + queryFactory.toString();
	const headers = { "Accept": "application/json" };
	const response = await fetch(resource, { method: "GET", headers: headers, credentials: "omit" });
	if (!response.ok) throw new Error("HTTP " + response.status + " " + response.statusText);
	return response.json();
}


/**
 * Register a listener for the window's "load" event.
 */
window.addEventListener("load", event => {
	initialize();
});
