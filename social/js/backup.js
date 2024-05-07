//wrap everything is immediately invoked anonymous function so nothing is in clobal scope
(function (){

    var attrArray = ["Population Growth Rate (average annual %)", "Urban Population (% of total population)", "Fertility Rate", 
                        "Life Expectancy at Birth (females)", "Life Expectancy at Birth (males)", "Health: Current Expenditure (% of GDP)",
                        "Education: Government expenditures (% of GDP)", "International Homicide rate (per 100 000 pop.)"];
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
    chartHeight = 473,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear().range([463, 0]).domain([0, 110]);

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){

        var width = window.innerWidth * 0.5,
            height = 460;

        //create new svg container for the map
        var map = d3
            .select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on East and Southeast Asia
        var projection = d3
            .geoAlbers()
            .center([10, 21]) 
            .rotate([-105, 0, 0]) 
            .parallels([5, 30]) 
            .scale(415) 
            .translate([width / 2, height / 2]);

        var path = d3.geoPath().projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [d3.csv("data/Data.csv"),                    
                        d3.json("data/countries.topojson"),                    
                        d3.json("data/eastasia.topojson")                   
                        ];    
        Promise.all(promises).then(callback);

        function callback(data) {
            var csvData = data[0], world = data[1], eastasia = data[2];

            setGraticule(map,path);

            //translate europe TopoJSON
            var countries = topojson.feature(world, world.objects.ne_50m_admin_0_countries),
                eastasia = topojson.feature(eastasia, eastasia.objects.ne_50m_admin_0_countries).features;

            //add countries to map
            var worldMap = map.append("path")
                .datum(countries)
                .attr("class", "countries")
                .attr("d", path);

            eastasia = joinData(eastasia, csvData);
            
            var colorScale = makeColorScale(csvData);

            setEnumerationUnits(eastasia,map,path,colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            //add dropdown
            createDropdown(csvData);
        };

    };

    function setGraticule(map,path){
        var graticule = d3.geoGraticule()
                .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

            //create graticule background
            var gratBackground = map.append("path")
                .datum(graticule.outline()) //bind graticule background
                .attr("class", "gratBackground") //assign class for styling
                .attr("d", path) //project graticule

            //create graticule lines
            var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
                .data(graticule.lines()) //bind graticule lines to each element to be created
                .enter() //create an element for each datum
                .append("path") //append each element to the svg as a path element
                .attr("class", "gratLines") //assign class for styling
                .attr("d", path); //project graticule lines
    }

    function joinData(eastasia, csvData){
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.NAME; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<eastasia.length; a++){

                var geojsonProps = eastasia[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.NAME; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return(eastasia)
    }

    function makeColorScale(data) {
        var colorClasses = [
            "#D4B9DA", "#C994C7", "#DF65B0", "#DD1C77", "#980043", "#4D004B", "#810F7C", "#88419D"];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
        .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    }

function setEnumerationUnits(eastasia,map,path,colorScale){
        //add Asia to map
    var eastasiaMap = map
        .selectAll(".regions")
        .data(eastasia)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.NAME;
        })
        .attr("d", path)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }
    })
    .on("mouseover", function(event, d){
        highlight(d.properties);
    })
    .on("mouseout", function (event, d) {
        dehighlight(d.properties);
    })
    .on("mousemove", moveLabel);

    var desc = eastasiaMap.append("desc").text('{"stroke": "#000", "stroke-width": "0.5px"}')

}
//function to create coordinated bar chart
function setChart(csvData, colorScale) {

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bars for each province
    var bars = chart
        .selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function (a, b) {
            return b[expressed] - a[expressed];
        })
        .attr("class", function (d) {
            return "bar " + d.NAME;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", function(event, d){
            highlight(d);
        })
        .on("mouseout", function (event, d) {
            dehighlight(d);
        })
        .on("mousemove", moveLabel);

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Population Growth Rate (average annual %)");

    updateChart(bars, csvData.length, colorScale);

    //create vertical axis generator
    var yAxis = d3.axisLeft().scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    var desc = bars.append("desc").text('{"stroke": "none", "stroke-width": "0px"}');
};

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3
        .select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function () {
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

   //dropdown change listener handler
   function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);
        
        //recolor enumeration units
        var eastasiaMap = d3
            .selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
            var value = d.properties[expressed];
            if (value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }
        });
        
    //re-sort, resize, and recolor bars
    var bars = d3
    .selectAll(".bar")
    //re-sort bars
    .sort(function (a, b) {
        return b[expressed] - a[expressed];
    })
    .transition() //add animation
    .delay(function (d, i) {
        return i * 20;
    })
    .duration(500);

    updateChart(bars, csvData.length, colorScale);
}

function updateChart(bars, n, colorScale) {
    //position bars
    bars.attr("x", function (d, i) {
        return i * (chartInnerWidth / n) + leftPadding;
    })
        //size/resize bars
        .attr("height", function (d, i) {
            var d_expressed = d[expressed]
            if (d_expressed == "")
            d_expressed = 0
            return 463 - yScale(parseFloat(d_expressed));
        })
        .attr("y", function (d, i) {
            var d_expressed = d[expressed]
            if (d_expressed == "")
            d_expressed = 0
            return yScale(parseFloat(d_expressed)) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function (d) {
            var value = d[expressed];
            if (value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
        });

    //at the bottom of updateChart()...add text to chart title
    var chartTitle = d3
        .select(".chartTitle")
        .text(expressed);
}
//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.NAME)
        .style("stroke", "blue")
        .style("stroke-width", "2")
    setLabel(props);
};

//function to reset the element style on mouseout
function dehighlight(props) {
    var selected = d3
        .selectAll("." + props.NAME)
        .style("stroke", function () {
            return getStyle(this, "stroke");
        })
        .style("stroke-width", function () {
            return getStyle(this, "stroke-width");
        });

    function getStyle(element, styleName) {
        var styleText = d3.select(element).select("desc").text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    }
    d3.select(".infolabel")
    .remove();
}
//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.NAME + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "LABEL")
        .html(props.NAME);
};

 //function to move info label with mouse
 function moveLabel() {
    //get width of label
    var labelWidth = d3.select(".infolabel").node().getBoundingClientRect().width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10,
        y1 = event.clientY - 75,
        x2 = event.clientX - labelWidth - 10,
        y2 = event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
}
})();