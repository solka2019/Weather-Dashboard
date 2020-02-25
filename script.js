const API_BASE_URL = "https://api.openweathermap.org/data/2.5/";
const API_KEY = "b12c9a37847d92a1ecf098533b23bbc6";
const cities = JSON.parse(localStorage.getItem("cities")) || ["Seattle", "New York", "Los Angeles"];
let latestCity = "";
const $weekDays = $(".weekDays");

// Populate the cities list and load in a city
function populateCities(city) {
    // Populate the cities list
    let $cityGroup = $('#city-list').empty();

    cities.forEach(function(city) {
        let li = $('<li>').text(city).addClass("list-group-item city").attr("data-city", city);        
        let btnDelete = $("<button>").addClass("btn btn-delete");
        let deleteIcon = $("<i>").addClass("fas fa-minus-circle");
        btnDelete.append(deleteIcon);
        li.append(btnDelete);
        $cityGroup.append(li);
    });

    if (city !== latestCity) {
        loadCity(city);
    }
}

function addCity() {
    let city = $("#searchInput").val().trim();

    if (cities.includes(city)) {
        alert("You are already following " + city);
    }
    checkValidCity(city); // Check to make sure it's a valid city
}

// City has been confirmed as legitimate. Add the city to the list
function _addCityFinal(city) {
    
}

function checkValidCity(city) {
    // Try to get the city and see if an Error is received
    $.ajax({
        url: getApiUrl(city),
        method: "GET",
        error: function(response) {
            // Invalid City. Alert the user
            console.log(response);
            alert("ERROR: " + response.responseJSON.message);
        },
        success: function(response) {
            // Add the city
            cities.push(city);
            cities.sort();
            localStorage.setItem("cities", JSON.stringify(cities));
            populateCities(city);
            $("#searchInput").val("");
        }
    });
}

// Load Data for the specified city
function loadCity(city) {

    // Set the Active City in the list group
    $(".city").removeClass("active");
    $(".city[data-city=\"" + city + "\"]").addClass("active");

    if (city) {
        // Load the city data onto the page
        getData(city);
        latestCity = city;
        localStorage.setItem("latestCity", latestCity);
    }
}

// Use ajax to retrieve the current and 5-day forecasts for the city specified
function getData(city) {
    
    let current_api_url = getApiUrl(city, false);
    let forecast_api_url = getApiUrl(city, true);
    
    // API CALL 1 - Get the Current Day Weather API
    $.ajax({
        url:  current_api_url,
        method: "GET",
        error: function(response) {
            console.log("ERROR");
            alert(response.responseText.message);
        }
    }).then(function(response) {
        fillCurrentDay(city, response);
        return response;
    }).then(function(response) {
        // API CALL 2 - Next - Get the UV Index 
        let uv_api_url = getUvIndexUrl(response.coord.lat, response.coord.lon);
        
        return $.ajax({
            url: uv_api_url,
            method: "GET",
        }).then(function(response) {
            // Set the UV Index
            $("#uv-index").text(response.value);
            let uv = parseInt(response.value);
            let color;
            let text = 'white';
            if (uv < 3)         { color = 'green'; } 
            else if (uv < 5)    { color = 'yellow'; text = 'black'; }
            else if (uv < 7)    { color = 'orange'; text = 'black'; }
            else if (uv < 9)    { color = 'red'; }
            else if (uv < 11)   { color = 'violet'; }
            else                { color = 'purple'; }

            $("#uv-index").css('background-color', color);
            $("#uv-index").css('color', text);

            //console.log("UV RESPONSE Received");
            //console.log(response);
        });        
    }).then(function(response) {
        // API CALL 3 - Finally - Get the 5-day forecast
        return $.ajax({
            url:  forecast_api_url,
            method: "GET",
        }).then(function(response) {
            fillFiveDay(response); 
        });
    });
}

// Fill the Current Day Info from Server Response
function fillCurrentDay(city, response) {
    console.log("Current Day Response Received");
    console.log(response);

    let condition = response.weather[0].main + " - " + response.weather[0].description;
    let iconUrl = getIconUrl(response.weather[0].icon);
    let tempF = response.main.temp;
    let humidity = response.main.humidity;
    let windSpeed = response.wind.speed;
    let sunrise = moment.unix(response.sys.sunrise).format("h:mma");
    let sunset = moment.unix(response.sys.sunset).format("h:mma");
    let windDir = response.wind.deg;
    let coord = response.coord;
    $("#head-city-date").text(city + moment().format(" (M/D/YYYY)"));
    $(".right-pane").hide().fadeIn(1000);
    $("#conditions-image").attr("src", iconUrl).attr("alt", condition);
    $("#description").text(condition);
    $("#head-city-date").text(response.name + moment.unix(response.dt).format(" (M/DD/YYYY)"));
    $("#time-hour").text(moment.unix(response.dt).format("ha"));
    $("#temperature").html(tempF.toFixed(0) + "&deg;F");
    $("#humidity").text(humidity.toFixed(0)+ "%");
    $("#wind-speed").text((windSpeed).toFixed(1)+ "mph");
    $("#uv-index").text(condition);
    $("#sunrise").text(sunrise);
    $("#sunset").text(sunset);    
}

// Fill the 5-Day Forecast Info from Server Response
function fillWeekDays(response) {
    console.log("5-Day Forecast Response Received");
    console.log(response);
    
    $weekDays.empty();
    const numDays = 5;
    const numHoursPerBlock = 3; // Number of hours between time blocks
    const numTimeBlocksPerDay = 24/numHoursPerBlock;
    const offsetStart = numTimeBlocksPerDay - 1;

    // Create a c card for each day in the interval
    for(let i=0; i<numDays; i++) {
        let li = response.list[(i*numTimeBlocksPerDay)+offsetStart];
        let timeStamp = moment.unix(li.dt);
        let humidity = li.main.humidity;;
        let tempF = li.main.temp;
        let iconUrl = getIconUrl(li.weather[0].icon);
        let description = li.weather[0].description;
        let card = create5DayCard(timeStamp, iconUrl, description, tempF.toFixed(0), humidity.toFixed(0));
        $weekDays.append(card);
    }
}

// Get the Final API Url for the UV Index
// *** lat: latitude of city
// *** lon: longitude of city
function getUvIndexUrl(lat, lon) {
    return "https://api.openweathermap.org/data/2.5/uvi?appid=" + API_KEY + "&lat=" + lat.toFixed(2) + "&lon=" + lon.toFixed(2);
}

// Get the Final API Url
// *** city to query
// *** isForecast = True for 5-day forecast, false for current weather
// Return the current day or 5-day forecast api url
function getApiUrl(city, isForecast) {
    let queryString = isForecast ? "forecast" : "weather";
    queryString += "?";
    queryString += "q=" + city.trim().replace(" ", "+") + ",us&mode=json";
    queryString += "&units=imperial" + "&APPID=" + API_KEY;
    return API_BASE_URL + queryString;
}

// Return the icon url from the icon code provided by openwweathermap.org
function getIconUrl(iconcode) {
    return "https://openweathermap.org/img/wn/" + iconcode + "@2x.png";
    //return "https://openweathermap.org/img/w/" + iconcode + ".png";
}

// Create a single 5 day card
// * arguments:
// *** momentDay - The time moment for the card time
// *** iconUrl - link to the conditions icon
// *** description - current weather conditions
// *** temperature - Temperature in degrees fahrenheit
// *** humidity - Humidity percentage
// * returns card jquery object
function create5DayCard(momentDay, iconUrl, description, temperature, humidity) {
    let date = momentDay.format("M/D/YYYY");
    let hour = momentDay.format("ha");
    let temp = "Temp: " + temperature + "&deg;F";
    let humid = "Humidity: " + humidity + "%";
    let imgAlt = description;

    let card = $("<div>").addClass("col-md-auto col-sm-12 card card-small"); 
    card.append($("<h5>").addClass("card-title dayDate").text(date));
    card.append($("<p>").addClass("card-text dayHour").text(hour));
    card.append($("<img>").attr("src", iconUrl).attr("alt", imgAlt));
    card.append($("<p>").addClass("card-text dayTemp").html(temp));
    card.append($("<p>").addClass("card-text dayHumidity").text(humid));    
    return card;
}

// Document Ready
$(function() {
    // Get the initial city from local storage, populate the city list, and display the last city
    let initialCity = localStorage.getItem("latestCity") || cities[0];
    populateCities(initialCity);

    // Handle City Search
    $("#btnSearchSubmit").on("click", addCity);
    $('#searchInput').on("keypress", function(event) {
        if (event.which === 13) {
            addCity();
        }
    });

    // Delete Button Click - DELETE CITY
    $("#city-list").on("click", ".btn-delete", function(event) {
        event.stopPropagation();
        // Delete the city from the array and update local storage
        let city = $(this).parent().attr("data-city");
        cities.splice(cities.indexOf(city),1);
        localStorage.setItem("cities", JSON.stringify(cities));
        // Repopulate cities list
        let newCity = (latestCity === city) ? cities[0] : latestCity;
        populateCities(newCity);
     });

     // City Click - LOAD CITY
     $("#city-list").on("click", "li", function() {
        // LOAD CITY
        loadCity($(this).attr("data-city"));
    });

    
});