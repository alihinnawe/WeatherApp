const OPEN_WEATHER_APP_KEY = "your key";
const OPEN_WEATHER_APP_ORIGIN = "https://api.openweathermap.org";

/**
 * Registers the basic event listeners, initiating// constants

 * the controller logic.
 */
async function initialize () {
	// register event listeners
	const queryButton = document.querySelector("section.location button.query");
	queryButton.addEventListener("click",event => processWeatherForecast());
}

/**
 * handle weatherForecast
 */
async function processWeatherForecast () {
	const messageOutput = document.querySelector("footer>input.message");
	messageOutput.classList.remove("success", "failure");

	try {
		const center = document.querySelector("article.center");
		const locationSection = document.querySelector("section.location");
		const city = locationSection.querySelector("input.city").value.trim() || null;
		const countryCode = locationSection.querySelector("input.country").value.trim() || null;
		
		const location = await invokeQueryLocation(city, null, countryCode);
		//console.log(location)
		
		const weatherForecast = await invokeQueryWeatherForecast(location.lat, location.lon);
		console.log("weatherForecast",weatherForecast.list[0]);
	
		let overviewSection = center.querySelector("section.weather-overview");
		if (!overviewSection) {
		const overviewSectionTemplate = document.querySelector("head>template.weather-overview");
		overviewSection = overviewSectionTemplate.content.firstElementChild.cloneNode(true); 
		center.append(overviewSection);
		};
		
		const tableRowTemplate = document.querySelector("head>template.weather-overview-row")
		const tableBody = overviewSection.querySelector("table>tbody");
		tableBody.innerHTML = "";

		const dayForecast = {dateText: null, list: [] };
		weatherForecast.list.push(null);
		for (const threeHourForecast of weatherForecast.list) {
			const dateText = threeHourForecast 
			? threeHourForecast.dt_txt.substring(0, threeHourForecast.dt_txt.indexOf(' ')) : null;
			console.log("dateText",dateText);	
			if(dayForecast.dateText === dateText){
				dayForecast.list.push(threeHourForecast)}
				else {
					if(dayForecast.dateText !== null) {
						const tableRow = tableRowTemplate.content.firstElementChild.cloneNode(true);
						tableBody.append(tableRow);
						tableRow.querySelector("td.date>button").innerText = new Date(dayForecast.list[0].dt * 1000).toLocaleDateString();
					}
					
					dayForecast.dateText = dateText;
					dayForecast.list = [threeHourForecast];
			}
		}

		messageOutput.value = "ok.";
		messageOutput.classList.add("success");
	} catch (error) { 
		messageOutput.value = error.message;
		messageOutput.classList.add("failure");
	}
};




/**
 * Invoke the location query web-service operation
 * @param city the city
 * @param stateCode the state code
 * @param countryCode the country code
 * @return the (optional) location, or null for none
 */
async function invokeQueryLocation (city, stateCode, countryCode) {
	const queryFactory = new URLSearchParams();
	queryFactory.set("appid", OPEN_WEATHER_APP_KEY);
	queryFactory.set("limit", 1);
	queryFactory.set("q", (city || "") + "," + (stateCode || "") +  "," + (countryCode || ""));

	const resource = OPEN_WEATHER_APP_ORIGIN + "/geo/1.0/direct?" + queryFactory.toString();
	const headers = { "Accept": "application/json" };
	const response = await fetch(resource, { method: "GET", headers: headers, credentials: "omit" });
	if (!response.ok) throw new Error("HTTP " + response.status + " " +  response.statusText);
	const locations = await response.json();
	
	return locations.length === 0 ? null : locations[0];
}


/**
 * Invoke the location query web-service operation
 * @param lat the lattitude
 * @param lon the longtitude
 * @return the 5-day weather forecast
 */
async function invokeQueryWeatherForecast (lattitude, longtitude) {
	const queryFactory = new URLSearchParams();
	queryFactory.set("appid", OPEN_WEATHER_APP_KEY);
	queryFactory.set("lat", lattitude);
	queryFactory.set("lon", longtitude);

	const resource = OPEN_WEATHER_APP_ORIGIN + "/data/2.5/forecast?" + queryFactory.toString();
	const headers = { "Accept": "application/json" };
	const response = await fetch(resource, { method: "GET", headers: headers, credentials: "omit" });
	if (!response.ok) throw new Error("HTTP " + response.status + " " +  response.statusText);
	return response.json();
}



/**
 * Register a listener for the window's "load" event.
 */
window.addEventListener("load", event => {
	initialize();
});
