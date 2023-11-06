let keyframes = [
    {
        activeVerse: 1,
        activeLines: [1],
        svgUpdate: () => updateMaps(2008)
    },
    {
        activeVerse: 1,
        activeLines: [2],
        svgUpdate: () => updateMaps(2010)
    },
    {
        activeVerse: 1,
        activeLines: [3],
        svgUpdate: () => updateMaps(2012)
    },
    {
        activeVerse: 1,
        activeLines: [4],
        svgUpdate: () => updateMaps(2014)
    },
    {
        activeVerse: 2,
        activeLines: [1, 2, 3, 4],
        svgUpdate: () => updateMaps(2015)
    },
    {
        activeVerse: 3,
        activeLines: [1],
        svgUpdate: () => updateMaps(2016)
    },
    {
        activeVerse: 3,
        activeLines: [2],
        svgUpdate: () => updateMaps(2017)
    },
    {
        activeVerse: 3,
        activeLines: [3],
        svgUpdate: () => updateMaps(2018)
    },
    {
        activeVerse: 3,
        activeLines: [4],
        svgUpdate: () => updateMaps(2019)
    },
    {
        activeVerse: 4,
        activeLines: [1, 2],
        svgUpdate: () => updateMaps(2008)
    }
];

let leftSVG = d3.select("#left-svg");
let rightSVG = d3.select("#right-svg");
let keyframeIndex = 0;

let width = 600;
let height = 350;
let colorScale;

let mapData; // https://eric.clst.org/tech/usgeojson/
let stateYears; // https://state.1keydata.com/date-same-sex-marriage-legalized-by-state.php
let marriageData; // https://www.census.gov/data/tables/time-series/demo/same-sex-couples/ssc-house-characteristics.html

document.getElementById("forward-button").addEventListener("click", forwardClicked);
document.getElementById("backward-button").addEventListener("click", backwardClicked);

function forwardClicked() {
    if (keyframeIndex < keyframes.length - 1) {
        keyframeIndex++;
        drawKeyframe();
    }
}

function backwardClicked() {
    if (keyframeIndex > 0) {
        keyframeIndex--;
        drawKeyframe();
    }
}

function drawKeyframe() {
    let keyframe = keyframes[keyframeIndex];
    resetActiveLines();
    updateActiveVerse(keyframe.activeVerse);
    for (line of keyframe.activeLines) {
        updateActiveLine(keyframe.activeVerse, line);
    }

    if (keyframe.svgUpdate) {
        keyframe.svgUpdate();
    }
}

function resetActiveLines() {
    d3.selectAll(".line").classed("active-line", false);
}

function updateActiveVerse(id) {
    d3.selectAll(".verse").classed("active-verse", false);
    d3.select("#verse" + id).classed("active-verse", true);
    scrollColumnToActiveVerse(id);
}

function updateActiveLine(vid, lid) {
    let curVerse = d3.select("#verse" + vid);
    curVerse.select("#line" + lid).classed("active-line", true);
}

function scrollColumnToActiveVerse(id) {
    var column = document.querySelector(".poem-content");
    var curVerse = document.getElementById("verse" + id);

    var verseRect = curVerse.getBoundingClientRect();
    var columnRect = column.getBoundingClientRect();

    var desiredScrollTop = verseRect.top + column.scrollTop - columnRect.top - (columnRect.height - verseRect.height) / 2;
    column.scrollTo({
        top: desiredScrollTop,
        behavior: 'smooth'
    });
}

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

    // update year displayed on bottom
    document.getElementById("title").textContent = year;

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

    // find the beginning of the relevant year
    var jOrig = 0;
    for (let j = 0; j < marriageData.length; j++) {
        if (marriageData[j].Year == year) {
            jOrig = j;
            break;
        }
    }
    // update fill of all active states
    leftSVG.selectAll(".active")
        .transition()
        .duration(1000)
        .style("fill", d => {
            let stateName = d.properties.NAME;
            for (let j = jOrig; j < jOrig + 51; j++) {
                if (stateName == marriageData[j].Area) {
                    val = colorScale(marriageData[j].Percent);
                    return val;
                }
            }
            return "#d1c1e7";
        });
    rightSVG.selectAll(".active")
        .transition()
        .duration(1000)
        .style("fill", d => {
            let stateName = d.properties.NAME;
            for (let j = jOrig; j < jOrig + 51; j++) {
                if (stateName == marriageData[j].Area) {
                    val = colorScale(marriageData[j].Percent);
                    return val;
                }
            }
            return "#d1c1e7";
        });

    // update fill of all inactive states
    leftSVG.selectAll(".state")
        // filter out active states
        .filter(function(d) {
            return !(leftSVG.select("#" + d.properties.NAME.replace(/\s/g, "")).classed("active"));     
        })
        .transition()
        .duration(1000)
        .style("fill", "#d1c1e7");
    rightSVG.selectAll(".state")
        .filter(function(d) {
            return !(rightSVG.select("#" + d.properties.NAME.replace(/\s/g, "")).classed("active"));     
        })
        .transition()
        .duration(1000)
        .style("fill", "#d1c1e7");
}

async function initialize() {
    await loadData();

    initializeMap(leftSVG, mapData);
    initializeMap(rightSVG, mapData);
    drawKeyframe();
}

initialize();