/*  This visualization was made possible by modifying code provided by:

Scott Murray, Choropleth example from "Interactive Data Visualization for the Web"
https://github.com/alignedleft/d3-book/blob/master/chapter_12/05_choropleth.html

Malcolm Maclean, tooltips example tutorial
http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html

Mike Bostock, Pie Chart Legend
http://bl.ocks.org/mbostock/3888852  */

//Width and height of map
var width = 960;
var height = 500;
var globalFeature = 'Overall';
var stateData = {};
var featureMagnitudes = {};

pageSetup();

function pageSetup() {
  demographicMenuSetup();
  stateMenuSetup();
  drawMap();
}

function demographicMenuSetup() {
  var features = d3.selectAll(".option")
    .on("click", function() {
      // mark which feature is active
      d3.selectAll(".option")
        .classed("active", false);
      d3.select("#"+this.id)
        .classed("active", true);
      globalFeature = this.id;
      updateMapFeature(this.id);
      drawScatterPlot();
    });
}

function stateMenuSetup() {
  var selectStates = d3.select("#allStates")
    .on("click", function() {
      updateMapStates(true);
    });

  var deselectStates = d3.select("#noStates")
    .on("click", function() {
      updateMapStates(false);
    });

  d3.json("data/state-categories.json", function(json) {
    for (var set in json) {
      var category = d3.select("#" + json[set].type);
      d3.select("#" + set)

        .on("click", function() {
          var set = json[this.id];
          updateMapStates(false);
          for (var s in set.states) {
            var state = set.states[s];
            setStateSelected(state, true);
          }
          updateMapColors();
          drawScatterPlot();
        })

        .on("mouseover", function() {
          var set = json[this.id];
          d3.select("#state-option-description")
            .text(set.description);
        })

        // fade out tooltip on mouse out
        .on("mouseout", function() {
          d3.select("#state-option-description")
            .text("");
        });
    }
  });
}

function loadStateData(filename) {
  d3.csv("data/poverty_demographics.csv", function(data) {
    var features = Object.keys(data[0]);
    for (var f in features) {
      featureMagnitudes[features[f]] = 0;
    }

    // Loop through each state data value in the .csv file
    for (var i = 0; i < data.length; i++) {
      var state = data[i].State;
      stateData[state] = {"selected": true};

      for (var f in features) {
        var dataValue = data[i][features[f]];
        stateData[state][features[f]] = dataValue;

        if (Math.abs(dataValue) > featureMagnitudes[features[f]]) {
          featureMagnitudes[features[f]] = Math.abs(dataValue);
        }
      }
    }

    updateMapFeature(globalFeature);
    drawScatterPlot();
  });
}

function idFormat(str) {
  // remove spaces
  return str.replace(/\s/g, '');
}

function updateMapColors() {
  var mag = mapMagnitude(globalFeature + "Diff");
  for (var state in stateData) {
    d3.select("#" + idFormat(state))
      .style("fill", function() {
        return fillColor(state, globalFeature, mag);
      });
  }
}

function setStateSelected(state, selected) {
  stateData[state].selected = selected;
}

function mapMagnitude(feature) {
  var mag = 0;
  for (var state in stateData) {
    if (state !== "United States") {
      var s = d3.select("#" + idFormat(state));
      if (stateData[state].selected) {
        var value = stateData[state][feature];
        if (Math.abs(value) > mag) {
          mag = Math.abs(value);
        }
      }
    }
  }
  return mag;
}

function fillColor(state, feature, mag) {
  var featureDiff = feature+"Diff";
  var value = stateData[state][featureDiff];
  if (value) {
    if (stateData[state].selected) {
      if (value > 0) {
        return d3.interpolate("#ffffff", "#ff7f50")(Math.abs(value)/mag);
      } else {
        return d3.interpolate("#ffffff", "#50d0ff")(Math.abs(value)/mag);
      }
    } else {
      return "#000";
    }
  } else {
    return "#444";
  }
}

function drawMap() {
  // D3 Projection
  var projection = d3.geo.albersUsa()
    .translate([width/2, height/2])    // translate to center of screen
  	.scale([1000]);          // scale things down so see entire US

  // Define path generator
  var path = d3.geo.path()               // path generator that will convert GeoJSON to SVG paths
    .projection(projection);  // tell path generator to use albersUsa projection

  // Append Div for tooltip to SVG
  var div = d3.select("body")
    .append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);

  var svg = d3.select("#map")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

  d3.json("data/us-states.json", function(json) {
    // Create one path per GeoJSON feature
    svg.selectAll("path")
      .data(json.features)
      .enter()
      .append("path")
      .attr("d", path)
      .classed("selected", true)
      .attr("id", function(d) { return idFormat(d.properties.name); })
      .style("stroke", "#fff")
      .style("stroke-width", "1")

      .on("click", function(d) {
        var value = stateData[d.properties.name][globalFeature];
        if (value) {
          var selected = !stateData[d.properties.name].selected;
          setStateSelected(d.properties.name, selected);
          updateMapColors();
          drawScatterPlot();
        }
      })

      .on("mouseover", function(d) {
        var label = d.properties.name;
        var value = stateData[d.properties.name][globalFeature];
        if (value) {
          label += ": " + value;
        }
        else {
          label += ": not enough data"
        }

        div.transition()
          .duration(200)
          .style("opacity", 1);
        div.text(label)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
      })

      .on("mouseout", function(d) {
        div.transition()
          .duration(200)
          .style("opacity", 0);
      });

    loadStateData("data/poverty_demographics.csv");
  });
}

function drawScatterPlot() {
  // don't show scatter plot without states selected
  d3.selectAll(".chart").remove();
  var mag = mapMagnitude(globalFeature + "Diff");
  var us = Number(stateData["United States"][globalFeature]);
  if (mag !== 0) {
    var margin = {top: 20, right: 150, bottom: 20, left: 110};
    var scatterHeight = 50;

    var x = d3.scale.linear()
      .domain([us - mag, us + mag])
      .range([ 0, width - margin.left - margin.right ]);

    var chart = d3.select('body')
      .append('svg:svg')
      .attr('width', width)
      .attr('height', scatterHeight + margin.top + margin.bottom)
      .attr('class', 'chart');

    var main = chart.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      .attr('width', width - margin.left - margin.right)
      .attr('height', scatterHeight)
      .attr('class', 'main');

    // draw the x axis
    var xAxis = d3.axisBottom()
      .scale(x);

    main.append('g')
      .attr('transform', 'translate(0,' + scatterHeight + ')')
      .attr('class', 'axis')
      .call(xAxis)
      .selectAll(".tick line").attr("stroke", "#fff")
      .selectAll(".tick text").attr("fill", "#fff");

    var g = main.append("svg:g");

    for (var state in stateData) {
      if (stateData[state].selected) {
        g.append("svg:circle")
          .attr("cx", function() { return x(stateData[state][globalFeature]); } )
          .attr("cy", function() { return scatterHeight/2; } )
          .attr("r", 6)
          .style("visibility", function() {
            return stateData[state][globalFeature] ? "visible" : "hidden";
          })
          .attr("fill", function() {
            return fillColor(state, globalFeature, mapMagnitude(globalFeature+"Diff"));
          })

          .on("mouseover", handleMouseOver(state))

          // fade out tooltip on mouse out
          .on("mouseout", function() {
            d3.select(".tooltip").transition()
              .duration(200)
              .style("opacity", 0);
          });
      }
    }
  }
}

var handleMouseOver = function(state) {
  return function() {
    var label = state;
    var value = stateData[state][globalFeature];
    if (value) {
      label += ": " + value;
    }

    d3.select(".tooltip").transition()
      .duration(200)
      .style("opacity", 1);
    d3.select(".tooltip").text(label)
      .style("left", (d3.event.pageX) + "px")
      .style("top", (d3.event.pageY - 28) + "px");
  }
}

function updateMapFeature(feature) {
  var mag = mapMagnitude(globalFeature + "Diff");
  for (var state in stateData) {
    d3.select("#" + idFormat(state))
      .style("fill", function() {
        return fillColor(state, feature, mag);
      });
  }
}

function updateMapStates(selected) {
  for (var state in stateData) {
    setStateSelected(state, selected);
  }
  updateMapColors();
  drawScatterPlot();
}
