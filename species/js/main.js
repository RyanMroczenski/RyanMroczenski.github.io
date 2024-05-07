var map;
var dataStats = {}
var minRadius = 5


//function to instantiate the Leaflet map
function createMap(){
    var mapTitle = document.createElement('h1');
    mapTitle.textContent = "The Number of Threatened Species in the Most Biodiverse Countries Over Time";
    mapTitle.id = "map-title";

    mapTitle.style.textAlign = 'center';
    mapTitle.style.marginBottom = '20px';

    // Append the title to the document body
    document.body.appendChild(mapTitle);

    //create the map
    map = L.map('map', {
        center: [7, 20],
        zoom: 2
    });

    //add OSM base tilelayer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map);

    //call getData function
    getData();
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //Flannery Appearance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/dataStats.min,0.5715) * minRadius

    return radius;
};

function createPropSymbols(data, attributes) {
    // Step 4: Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];

    // Create marker options
    var geojsonMarkerOptions = {
        fillColor: "#ff7800",
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    // Create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function (feature, latlng, attributes) {
            // For each feature, determine its value for the selected attribute
            var attValue = Number(feature.properties[attribute]);
            
            // Give each feature's circle marker a radius based on its attribute value
            geojsonMarkerOptions.radius = calcPropRadius(attValue);
            
            // Create circle marker layer
            var layer = L.circleMarker(latlng, geojsonMarkerOptions);
            
            // Build popup content string
            var popupContent = "<p><b>Country:</b> " + feature.properties.Country + "</p>";
            popupContent += "<p><b>Threatened Species in " + attribute + ":</b> " + attValue + " species</p>";
            
            // Bind the popup to the circle marker
            layer.bindPopup(popupContent, {
                offset: new L.Point(0, -geojsonMarkerOptions.radius) 
            });

            // Return the circle marker to the L.geoJson pointToLayer option
            return layer;
        }
    }).addTo(map);
};

//Step 1: Create new sequence controls
function createSequenceControls(attributes){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            // ... initialize other DOM elements
            var container = L.DomUtil.create('div', 'sequence-control-container');

			//create range input element (slider)
			container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

			//add skip buttons
			container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/reverse.png"></button>');
			container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward.png"></button>');

			//disable any mouse event listeners for the container
			L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    map.addControl(new SequenceControl());    // add listeners after adding control}
 
     //set slider attributes
     document.querySelector(".range-slider").max = 6;
     document.querySelector(".range-slider").min = 0;
     document.querySelector(".range-slider").value = 0;
     document.querySelector(".range-slider").step = 1;

     // Step 5: input listener for slider
     document.querySelector('.range-slider').addEventListener('input', function () {
        // Get the new index value
        var index = this.value;
        // Call function to update proportional symbols
        updatePropSymbols(attributes[index]);
    });
     document.querySelectorAll('.step').forEach(function (step) {
        step.addEventListener("click", function () {
            var index = document.querySelector('.range-slider').value;

            // Increment or decrement depending on button clicked
            if (step.id == 'forward') {
                index++;
                // If past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;
            } else if (step.id == 'reverse') {
                index--;
                // If past the first attribute, wrap around to last attribute
                index = index < 0 ? (attributes.length - 1) : index;
            };

            // Update slider
            document.querySelector('.range-slider').value = index;
            // Call function to update proportional symbols
            updatePropSymbols(attributes[index]);
        })
    });
};

function updatePropSymbols(attribute) {
    map.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            var props = layer.feature.properties;
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            var popupOffset = new L.Point(0, -radius);

            // Update popup content if needed
            var popupContent = "<p><b>Country:</b> " + props["Country"] + "</p>";
            popupContent += "<p><b>Threatened Species in " + attribute + ":</b> " + props[attribute] + " species</p>";
            popup = layer.getPopup();
            popup.setContent(popupContent).update();
            popup.options.offset = popupOffset;
            popup.update();

            var year = attribute.split("_")[1];
            //update temporal legend
            document.querySelector("span.year").innerHTML = year;
        };
    });
    updateLegend(attribute);
};

function createLegend(attributes) {
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // Create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            container.style.width = '200px';
            container.style.height = '100px';

            container.innerHTML = '<p class="temporalLegend">Threatened Species in <span class="year">2004</span></p>';

            // Start attribute legend SVG string
            var svg = '<svg id="attribute-legend" width="200px" height="130px">';
            
            // Array of circle names to base loop on
            var circles = ["min", "mean", "max"];

            // Loop to add each circle and text to SVG string  
            for (var i = circles.length - 1; i >= 0; i--) {  
                // Step 3: assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);  
                var cy = 10 + radius;  
            
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '" cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" stroke-width="1" cx="45"/>';
            
                // Step 4: create legend text to label each circle     				          
                var textY = (circles.length - i - 1) * 20 + 30;
                svg += '<text id="' + circles[i] + '-text" x="95" y="' + textY + '">' + Math.round(dataStats[circles[i]] * 100) / 100 + " species" + '</text>';
            }            

            svg += "</svg>";

            // Add attribute legend SVG to container
            container.insertAdjacentHTML('beforeend', svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
}

function updateLegend(attribute) {
	//create content for legend
	var year = attribute.split("_")[1];

	//replace legend content
	document.querySelector("span.year").innerHTML = attribute;

	var allValues = [];
	map.eachLayer(function (layer) {
		if (layer.feature) {
			allValues.push(layer.feature.properties[attribute]);
		}
	});

	var circleValues = {
		min: Math.min(...allValues),
		max: Math.max(...allValues),
		mean: Math.round(allValues.reduce(function (a, b) { return a + b; }) / allValues.length)
	}

	for (var key in circleValues) {
		var radius = calcPropRadius(circleValues[key]);
		document.querySelector("#" + key).setAttribute("cy", 75 - radius);
		document.querySelector("#" + key).setAttribute("r", radius)
		document.querySelector("#" + key + "-text").textContent = Math.round(circleValues[key] * 100) / 100 + " species";
	}
}

function calcStats(data){
    //create empty array to store all data values
    var allValues = [];
    var years = [2004, 2010, 2015, 2019, 2020, 2021, 2022];
    for (var feature of data.features) {
        // Extract properties of the current feature
        var properties = feature.properties;
        // Loop through each year
        for (var year of years) {
            // Get population for current year
            var value = properties[String(year)];
              allValues.push(value);
        }
    }
    //get min, max, mean stats for our array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    //calculate meanValue
    var sum = allValues.reduce(function(a, b){return a+b;});
    dataStats.mean = Math.round(sum/ allValues.length);
}    

//Above Example 3.10...Step 3: build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("2") > -1){
            attributes.push(attribute);
        };
    };
    //check result
    console.log(attributes);

    return attributes;
};

//Step 2: Import GeoJSON data
function getData(){
    //load the data
    fetch("data/Lab1Data.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //create an attributes array
            var attributes = processData(json);
            //calculate minimum data value
            calcStats(json);
            //call function to create proportional symbols
            createPropSymbols(json,attributes);
            createSequenceControls(attributes);
            createLegend(attributes);
        })
};

document.addEventListener('DOMContentLoaded',createMap)
