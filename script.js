const $fiveDay = $(".five-day");
const cities = JSON.parse(localStorage.getItem("cities")) || ["Seattle", "Columbus", "New York"];
const API_BASE_URL = "https://api.openweathermap.org/data/2.5/";
const API_KEY = "ab90f7f18ed62303ccdba44fd0f98df2";
let lastCity = "";


function populateCities(city) {
    
    let $cityGroup = $('#city-list').empty();

    cities.forEach(function(city) {
        let li = $('<li>').text(city).addClass("list-group-item city").attr("data-city", city);        
        let btnDelete = $("<button>").addClass("btn btn-delete");
        let deleteIcon = $("<i>").addClass("fas fa-minus-circle");
        btnDelete.append(deleteIcon);
        li.append(btnDelete);
        $cityGroup.append(li);
    });

    if (city !== lastCity) {
        loadCity(city);
    }
}

function addCity() {
    let city = $("#searchInput").val().trim();

    if (cities.includes(city)) {
        alert("You are already following " + city);
    }
    checkValidCity(city); 
}

function _addCityFinal(city) {
    
}

function checkValidCity(city) {
    $.ajax({
        url: getApiUrl(city),
        method: "GET",
        error: function(response) {
            console.log(response);
            alert("ERROR: " + response.responseJSON.message);
        },
        success: function(response) {
            cities.push(city);
            cities.sort();
            localStorage.setItem("cities", JSON.stringify(cities));
            populateCities(city);
            $("#searchInput").val("");
        }
    });
}

function loadCity(city) {

    $(".city").removeClass("active");
    $(".city[data-city=\"" + city + "\"]").addClass("active");

    if (city) {
        getData(city);
        lastCity = city;
        localStorage.setItem("lastCity", lastCity);
    }
}

function getData(city) {
    
    let current_api_url = getApiUrl(city, false);
    let forecast_api_url = getApiUrl(city, true);
    
    // First API CALL 
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
        // Second API CALL 
        let uv_api_url = getUvIndexUrl(response.coord.lat, response.coord.lon);

        // Index number

        return $.ajax({
            url: uv_api_url,
            method: "GET",
        }).then(function(response) {
            
            $("#uv-index").text(response.value);


                    });        
    }).then(function(response) {
        // Third API CALL 
        return $.ajax({
            url:  forecast_api_url,
            method: "GET",
        }).then(function(response) {
            fillFiveDay(response); 
        });
    });
}


function fillCurrentDay(city, response) {
    console.log("Current Day Response Received");
    console.log(response);

    let condition = response.weather[0].main + " - " + response.weather[0].description;
    let iconUrl = getIconUrl(response.weather[0].icon);
    let tempF = response.main.temp;
    let humidity = response.main.humidity;
    let windSpeed = response.wind.speed;
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
}

function fillFiveDay(response) {
    console.log("5-Day Forecast Response Received");
    console.log(response);
    
    $fiveDay.empty();
    const numDays = 5;
    const numHoursPerBlock = 3; 
    const numTimeBlocksPerDay = 24/numHoursPerBlock;
    const offsetStart = numTimeBlocksPerDay - 1;

    
    for(let i=0; i<numDays; i++) {
        let li = response.list[(i*numTimeBlocksPerDay)+offsetStart];
        let timeStamp = moment.unix(li.dt);
        let humidity = li.main.humidity;;
        let tempF = li.main.temp;
        let iconUrl = getIconUrl(li.weather[0].icon);
        let description = li.weather[0].description;
        let card = create5DayCard(timeStamp, iconUrl, description, tempF.toFixed(0), humidity.toFixed(0));
        $fiveDay.append(card);
    }
}


function getUvIndexUrl(lat, lon) {
    return "https://api.openweathermap.org/data/2.5/uvi?appid=" + API_KEY + "&lat=" + lat.toFixed(2) + "&lon=" + lon.toFixed(2);
}

function getApiUrl(city, isForecast) {
    let queryString = isForecast ? "forecast" : "weather";
    queryString += "?";
    queryString += "q=" + city.trim().replace(" ", "+") + ",us&mode=json";
    queryString += "&units=imperial" + "&APPID=" + API_KEY;
    return API_BASE_URL + queryString;
}

function getIconUrl(iconcode) {
    return "https://openweathermap.org/img/wn/" + iconcode + "@2x.png";
    
}

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


$(function() {
    
    let initialCity = localStorage.getItem("lastCity") || cities[0];
    populateCities(initialCity);

    
    $("#btnSearchSubmit").on("click", addCity);
    $('#searchInput').on("keypress", function(event) {
        if (event.which === 13) {
            addCity();
        }
    });

    
    $("#city-list").on("click", ".btn-delete", function(event) {
        event.stopPropagation();
        
        let city = $(this).parent().attr("data-city");
        cities.splice(cities.indexOf(city),1);
        localStorage.setItem("cities", JSON.stringify(cities));
        
        let newCity = (lastCity === city) ? cities[0] : lastCity;
        populateCities(newCity);
     });

     
     $("#city-list").on("click", "li", function() {
        
        loadCity($(this).attr("data-city"));
    });

    
});
