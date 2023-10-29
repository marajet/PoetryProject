let leftSVG = d3.select("#left-svg");
let rightSVG = d3.select("#right-svg");

let width = 600;
let height = 350;
let colorScale;

let mapData; // https://eric.clst.org/tech/usgeojson/
let stateYears; // https://state.1keydata.com/date-same-sex-marriage-legalized-by-state.php
let marriageData; // https://www.census.gov/data/tables/time-series/demo/same-sex-couples/ssc-house-characteristics.html

async function loadData() {
    await d3.json("gz_2010_us_040_00_20m.json").then(data => {
        mapData = data;
    });

    await d3.csv("stateyears.csv").then(data => {
        stateYears = data;
    });

    await d3.csv("marriageData.csv").then(data => {
        marriageData = data;
    });
}

function initializeMap(svg) {
    // set SVG basic stuff
    svg.attr("width", width);
    svg.attr("height", height);

    // prepare projection
    let proj = d3.geoAlbersUsa()
        .scale(700)
        .translate([width/2, height/2]);
    let path = d3.geoPath().projection(proj);

    // draw map
    svg.selectAll("path")
        .data(mapData.features)
        .enter()
        .append("path")
            .attr("class", "state")
            .attr("id", d => d.properties.NAME.replace(/\s/g, ""))
            .attr("d", path);

    colorScale = d3.scaleLinear()
        .domain([0, 100])
        .range(["black", "white"]);
}

function updateMaps(year) {
    if (year < 2005 || year > 2021) {
        return;
    }

    // update active status for all states (which side of map they're on)
    leftSVG.selectAll(".state")
        .classed("active", (d) => {
            let stateName = d.properties.NAME;
            for (let j = 0; j < stateYears.length; j++) {
                if (stateName == stateYears[j].state) {
                    // if current year is same as or after state legalized ss marriage
                    if (year >= stateYears[j].year) {
                        return false; // state is INactive on left (illegal)
                    } else {
                        return true;
                    }
                }
            }
        });
    rightSVG.selectAll(".state")
        .classed("active", (d) => {
            // return opposite of leftSVG
            return !(leftSVG.select("#" + d.properties.NAME.replace(/\s/g, "")).classed("active"));
        });

    // update fill of all active states
    leftSVG.selectAll(".active")
        .style("fill", d => {
            let stateName = d.properties.NAME;
            for (let j = 0; j < marriageData.length; j++) {
                if (stateName == marriageData[j].Area) {
                    val = colorScale(marriageData[j].Percent);
                    console.log(val);
                    return val;
                }
            }
            return "#d1c1e7";
        });
}

async function initialize() {
    await loadData();

    initializeMap(leftSVG, mapData);
    initializeMap(rightSVG, mapData);
    updateMaps(2005);
}

initialize();