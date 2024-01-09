import * as d3 from "d3";
import { gsap, updateRoot } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

/* CONSTANTS GLOBALS*/
const width = window.innerWidth * 0.7,
    height = window.innerHeight * 0.8,
    m = { top: 20, bottom: 80, left: 10, right: 10 };
const circleRadius = 50;
const initialCircleRadius = 0;
const finalRadius = 120;
const circleVerticalCenter = height / 2;
const raceColors = ['#2292A4', '#D96C06', '#FADF63', '#A67DB8', '#E0607E', "#D0AE8E"];
const barColors = [  "#B15E6C", "#BCD979", "#3A5683", "#93BEDF", "#35A66D"];
const bubbleColors = ['#9395D3', '#99621E', '#EDB6A3', '#483A58','#6EFAFB' ];
const ageColors = ["#87BBA2", "#72195A", "#CBBAED", "#E9DF00", "#F78764"]
const svgCenterX = width / 2;
const svgCenterY = height / 2 -m.top;
const leftCenterX = svgCenterX - width / 6;
const rightCenterX = svgCenterX + width / 6;
const maxBubbleRadius = 120;
const spreadRadius = Math.min(width, height) / 3;
const ageGroupOrder = ["UNDER25", "25_34", "35_44", "45_54", "OVER55"];
const labelMapping = {
    "AMERIND_ALSK": "AMERICAN INDIAN / ALASKAN",
    "ASIAN_PACIFIC": "ASIAN / PACIFIC ISLANDER",
    "UNKNOWN_OTHER": "UNKNOWN / OTHER",
    "UNDER25": "UNDER 25",
    '25_34': "25-34",
    '35_44': "35-44",
    '45_54': '45-54',
    'OVER55': "OVER 55",
    'prop_sent_served': 'Percentage of Maximum Sentence Served at Time of Interview',
    'age_entered': 'Age the Interviewee Entered Prison',
    'age': 'Age of Individual at Time of Interview',
    'time_serv_at_int': 'Time Served in Years at Time of Interview',
    'null': ' '
};

/* GLOBALS */
let svg, xScale, yScale, rect1, rect2, rect3, racexScale, raceyScale, races, deniedCircle, grantedCircle;
let tl1, racexAxis, axisGroup, interviewTypeData, deniedTotal, grantedTotal, butterflyAxis;
let typeCircles, typeColorScale, decColorScale, butterflyxScaleLeft, butterflyxScaleRight, tooltip;
let butterflyxAxisLeft, butterflyxAxisRight, bubbles, raceColorScale, raceButterflyyScale;
let over55, under55;
let kdey, kdex, kdeyAxis, kdexAxis;
let interviewTypeProportions, radiusScale, intxScale, intyScale;


/* APPLICATION STATE */
let state = {
    interviews: [],
    raceData: [],
    individuals: [],
    moreThanOnce: [],
    outcomeData: [],
    intTypeData: [],
    raceDataInterviews: [],
    ageData: [],
    combinedData: {

    },
    kdeFilter: "null",
    kdeNDFilter: "null",
    btnFilter: "null"
};

/* LOAD DATA */
import("../data/all_interviews_capstone_final.json").then(raw_data => {
    state.interviews = raw_data;
    init();
});

/* FUNCTIONS */
function arePieChartsInteractive() {
    return window.scrollY >= document.querySelector("#section4").offsetTop;
}

//MOUSE EVENTS
let mouseOver = (event) => {
    tooltip
    .style("opacity", 0)
    .style("display", "block")
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px")
};

let mouseOut = (event) => {
    tooltip.style("display", "none")
};

//CALCULATE PERCENTAGE
function calculatePercent(value, total) {
    return (value / total * 100).toFixed(1);
}

//WRAP TEXT
function wrap(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1,
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy")),
          tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
    });
  }

//KERNEL DENSITY MATH
function kernelDensityEstimator(kernel, X) {
    return V => X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
}

function kernelEpanechnikov(k) {
    return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
}
function normalDistribution(x, mean, stdDev) {
    return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
}

//KERNEL DENSITY PLOT UPDATE
function updateKDEPlot(attribute) {
    const maxValue = d3.max(state.interviews, d => d[attribute]);

    kdex = d3.scaleLinear()
    .range([m.left, width-m.right])
    .domain([-10, maxValue+10]);

    kdeChartContainer.selectAll(".kde-x-axis")
    .join(
        enter => enter.append("g")
            .attr("class", "kde-x-axis"),
        update => update
            .transition()
            .duration(100)
            .call(d3.axisBottom(kdex).ticks(5))
            .attr("transform", `translate(0,${height-m.bottom})`),
        exit => exit.remove()

    );

    const kde = kernelDensityEstimator(kernelEpanechnikov(10), kdex.ticks(60));


    const density1 = kde(
        state.interviews
            .filter(d => d.interview_decision === "DENIED" && Number.isFinite(d[attribute]))
            .map(d => d[attribute])
    );
    
    const density2 = kde(
        state.interviews
            .filter(d => d.interview_decision === "GRANTED" && Number.isFinite(d[attribute]))
            .map(d => d[attribute])
    );

        const maxValueY = d3.max([...density1, ...density2], d => d[1]);

    kdey = d3.scaleLinear()
        .range([height-m.bottom, m.top])
        .domain([0, maxValueY]);

    // kdeChartContainer.selectAll(".y-axis")
    // .join(
    //     enter => enter.append("g")
    //         .attr("class", "y-axis"),
    //     update => update
    //         .transition()
    //         .duration(100)
    //         .call(d3.axisLeft(kdey).ticks(5))
    //         .attr("transform", `translate(${m.left}, 0)`),
    //     exit => exit.remove()
    // );
     
    kdeChartContainer.selectAll(".density1-path")
        .data([density1])
        .join(
            enter => enter.append("path")
                .attr("class", "density1-path mypath")
                .attr("fill", "#B15E6C")
                .attr("opacity", ".6")
                .attr("stroke", "#000")
                .attr("stroke-width", 1)
                .attr("stroke-linejoin", "round")
                .attr("d", d3.line()
                    .curve(d3.curveBasis)
                    .x(d => kdex(d[0]))
                    .y(d => kdey(d[1]))
                    ),
            update => update
                .transition().duration(100)
                .attr("d", d3.line()
                    .curve(d3.curveBasis)
                    .x(d => kdex(d[0]))
                    .y(d => kdey(d[1]))
                    ),
            exit => exit.remove()
            )

    kdeChartContainer.selectAll(".density2-path")
        .data([density2])
        .join(
            enter => enter.append("path")
                .attr("class", "density2-path mypath")
                .attr("fill", "#BCD979")
                .attr("opacity", ".6")
                .attr("stroke", "#000")
                .attr("stroke-width", 1)
                .attr("stroke-linejoin", "round")
                .attr("d", d3.line()
                .curve(d3.curveBasis)
                .x(d => kdex(d[0]))
                .y(d => kdey(d[1]))
                ),
        update => update
            .transition().duration(100)
            .attr("d", d3.line()
                .curve(d3.curveBasis)
                .x(d => kdex(d[0]))
                .y(d => kdey(d[1]))
                ),
        exit => exit.remove()
        )

        kdeChartContainer.selectAll(".kde-x-label")
        .data([attribute])
        .join(
            enter => enter.append("text")
                .attr("class", "kde-x-label")
                .attr("x", width / 2)
                .attr("y", height) 
                .attr("text-anchor", "middle")
                .text(d => labelMapping[d] || `Attribute: ${d}`), 
                update => update
                .transition()
                .duration(100)
                .attr("x", width / 2)
                .attr("y", height)
                .text(d => labelMapping[d] || `Attribute: ${d}`),
                exit => exit.remove()
        );
}

// function addNormalDistLine (attribute){

//     if (attribute != "null"){

//         const mean = d3.mean(state.interviews, d => d[attribute]);
//         const stdDev = d3.deviation(state.interviews, d => d[attribute]);
    
//         const normalPoints = kdex.ticks(60).map(d => [d, normalDistribution(d, mean, stdDev)]);
    
//         kdeChartContainer.selectAll(".normal-dist")
//             .data([normalPoints])
//             .join(
//                 enter => {
//                     const lineEnter = enter.append("path")
//                         .attr("class", "normal-dist")
//                         .attr("fill", "none")
//                         .attr("stroke", "red")
//                         .attr("stroke-width", 1.5)
//                         .attr("d", d3.line()
//                             .curve(d3.curveBasis)
//                             .x(d => kdex(d[0]))
//                             .y(d => kdey(d[1]))
//                         );

//                     const totalLength = lineEnter.node().getTotalLength();
//                     //some error here in the console

//                     lineEnter
//                         .attr("stroke-dasharray", totalLength + " " + totalLength)
//                         .attr("stroke-dashoffset", totalLength)
//                         .transition().duration(1000)
//                         .attr("stroke-dashoffset", 0);

//                 },
//                 update => update
//                     .transition().duration(100)
//                     .attr("d", d3.line()
//                             .curve(d3.curveBasis)
//                             .x(d => kdex(d[0]))
//                             .y(d => kdey(d[1]))
//                     ),
//                 exit => exit.remove()
//             );
//         }
//         else{
//             kdeChartContainer.selectAll(".normal-dist").remove();
//         }
// }

function updateBarChart(attribute, includeGranted = false) {
    if (!attribute || attribute === "null") {
        svg.selectAll('.bar, .x-axis').remove(); // Remove all bars and the x-axis
        return; // Exit the function
    }

    // Prepare data for 'DENIED' and optionally 'GRANTED'
    const prepareData = (decision) => state.interviews
        .filter(d => d.interview_decision === decision && d.parole_board_interview_type === "REAPPEAR")
        .reduce((acc, curr) => {
            acc[curr[attribute]] = (acc[curr[attribute]] || 0) + 1;
            return acc;
        }, {});

    const deniedData = prepareData("DENIED");
    let grantedData = {};
    if (includeGranted) {
        grantedData = prepareData("GRANTED");
    }

    // Combine data and determine the max value
    const combinedData = Object.keys({...deniedData, ...grantedData}).map(key => ({
        key: key,
        deniedValue: deniedData[key] || 0,
        grantedValue: grantedData[key] || 0
    }));
    combinedData.sort((a, b) => {
        return ageGroupOrder.indexOf(b.key) - ageGroupOrder.indexOf(a.key);
    });

    const maxValue = d3.max(combinedData, d => Math.max(d.deniedValue, d.grantedValue));

    // Define scales
    const x0 = d3.scaleBand()
        .domain(combinedData.map(d => d.key))
        .range([m.left, width-m.right])
        .paddingInner(0.1);

    const x1 = d3.scaleBand()
        .domain(includeGranted ? ["DENIED", "GRANTED"] : ["DENIED"])
        .rangeRound([m.left, x0.bandwidth()-m.right])
        .padding(0.05);

    const yScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([height-m.bottom, 0]);

    // Draw bars
    svg.selectAll(".category-group").remove(); // Clear previous groups
    const categoryGroups = svg.selectAll(".category-group")
        .data(combinedData)
        .enter().append("g")
        .attr("class", "category-group")
        .attr("transform", d => `translate(${x0(d.key)}, 0)`);

    categoryGroups.selectAll(".bar.denied")
        .data(d => [{ key: d.key, value: d.deniedValue }])
        .enter().append("rect")
        .attr("class", "bar denied")
        .attr("x", d => x1("DENIED"))
        .attr("y", d => yScale(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - yScale(d.value))
        .attr("fill", "#B15E6C")
        .on("mouseover", mouseOver)
        .on('mousemove', function(event, d) {
            const readableCategory = labelMapping[d.key] || d.key;
            d3.select('#tooltip')
                .style('opacity', 1)
                .html(`There were <b>${d.value}</b> 
                       <br>reappearance interviews <b>${d.key === "denied" ? "granted" : "denied"}</b> parole 
                       <br>of people aged <b>${readableCategory}</b>.`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on("mouseout", mouseOut);

    if (includeGranted) {
        categoryGroups.selectAll(".bar.granted")
            .data(d => [{ key: d.key, value: d.grantedValue }])
            .enter().append("rect")
            .attr("class", "bar granted")
            .attr("x", d => x1("GRANTED"))
            .attr("y", d => yScale(d.value))
            .attr("width", x1.bandwidth())
            .attr("height", d => height - yScale(d.value))
            .attr("fill", "#BCD979")
            .on("mouseover", mouseOver)
            .on('mousemove', function(event, d) {
                const readableCategory = labelMapping[d.key] || d.key;            
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .html(`There were <b>${d.value}</b>
                           <br>reappearance interviews <b>${d.key === "denied" ? "denied" : "granted"}</b> parole 
                           <br>of people aged <b>${readableCategory}</b>.`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on("mouseout", mouseOut);
    }

    // X Axis
    svg.selectAll(".x-axis").remove(); // Clear previous axis
    const xAxis = svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0).tickSize(0))

        xAxis.selectAll(".tick text")
        .text(d => labelMapping[d] || d)
        .style("font-size", "12px")
        .style('text-anchor', 'middle');

    // Y Axis
    // svg.selectAll(".y-axis").remove(); // Clear previous axis
    // svg.append("g")
    //     .attr("class", "y-axis")
    //     .call(d3.axisLeft(yScale));
}


// function updateBarChart(attribute, decisionType) {
//     if (!attribute || attribute === "null") {
//         svg.selectAll('.bar').remove(); // Remove all bars
//         svg.select('.x-axis').remove(); // Remove x-axis
//         return; // Exit the function
//     }

//     // Filter the interviews based on the decision type and attribute
//     const filteredInterviews = state.interviews.filter(d =>
//         d.interview_decision === decisionType && d.parole_board_interview_type === "REAPPEAR"
//     );

//     // Group the filtered interviews by the specified attribute
//     const dataGroupedByAttribute = d3.group(filteredInterviews, d => d[attribute]);

//     // Convert the Map to an array and sort by value
//     const dataGroupedArray = Array.from(dataGroupedByAttribute, ([key, values]) => ({
//         key: key,
//         value: values.length
//     })).sort((a, b) => b.value - a.value);

//     // Define scales
//     const xScale = d3.scaleBand()
//         .domain(dataGroupedArray.map(d => d.key))
//         .range([0, width])
//         .padding(0.1);

//     const yScale = d3.scaleLinear()
//         .domain([0, d3.max(dataGroupedArray, d => d.value)])
//         .range([height, 0]);

//     // Draw or update bars
//     const bars = svg.selectAll('.bar')
//         .data(dataGroupedArray, d => d.key);

//         bars.enter()
//         .append('rect')
//         .attr('class', d => `bar.${d.key}`)
//         .attr('x', d => xScale(d.key) + xScale.bandwidth()/4)
//         .attr('y', d => yScale(d.value))
//         .attr('width', xScale.bandwidth()/2)
//         .attr('height', 0)
//         .on('mouseover', mouseOver)
//         .on('mousemove', function(event, d) {
//             const readableCategory = labelMapping[d.key] || d.key; 
//             d3.select('#tooltip')
//                 .style('opacity', 1)
//                 .html(`There were <b>${d.value} (${((d.value / filteredInterviews.length) * 100).toFixed(2)}%)</b> <br>reappearance interviews denied parole <br>of people aged <b>${readableCategory}.</b>`)
//                 .style('left', (event.pageX + 10) + 'px')
//                 .style('top', (event.pageY - 10) + 'px');
//         })
//         .on('mouseout', function() {
//             d3.select('#tooltip').style('opacity', 0);
//         })
//         .merge(bars)
//         .transition()
//         .duration(1000)
//         .attr('y', d => yScale(d.value))
//         .attr('height', d => height - yScale(d.value)); 

//     bars.exit().remove();

//     svg.append("g")
//     .attr("class", "x-axis")
//     .attr("transform", `translate(0,${height+10})`);

//     // Update the X Axis
//     svg.select('.x-axis')
//         .transition()
//         .duration(1000)
//         .call(d3.axisBottom(xScale).tickSize(0))
//         .selectAll(".tick text")
//         .text(d => labelMapping[d] || d)
//         .style("font-size", "12px")
//         .style('text-anchor', 'middle');

//     // svg.select('.y-axis')
//     //     .transition()
//     //     .duration(1000)
//     //     .call(d3.axisLeft(yScale));
// }

/* INITIALIZING FUNCTION */
function init() {

    // CREATE STATE ARRAYS FOR INDIVIDUALS &  MORE THAN ONCE
    const idMap = new Map();
    const moreThanOnce = [];

    state.interviews.forEach(item => {
        const id = item.id;
        const interviewDate = new Date(item.parole_interview_date);

        if (!idMap.has(id) || interviewDate > idMap.get(id).parole_interview_date) {
            idMap.set(id, { ...item, parole_interview_date: interviewDate });
        } else {
            const existingItem = idMap.get(id);
            if (!existingItem.moreThanOnce) {
                existingItem.moreThanOnce = true;
                moreThanOnce.push(existingItem);
            }
            if (interviewDate > existingItem.parole_interview_date) {
                idMap.set(id, { ...item, parole_interview_date: interviewDate });
            }
        }
    });

    state.individuals = Array.from(idMap.values());
    state.moreThanOnce = moreThanOnce;

    state.interviews.forEach(d=>{
        if (d.time_serv_at_int > d.min_sent){
            d.time_past_min = d.time_serv_at_int-d.min_sent
        }
        else if (d.time_serv_at_int < d.min_sent){
            d.time_under_min = d.min_sent-d.time_serv_at_int
        }
    })


    state.individuals.forEach(d => {
        if (d.race__ethnicity === "UNKNOWN") {
            d.race__ethnicity = "UNKNOWN_OTHER";
        }
        else if (d.race__ethnicity === "OTHER"){
            d.race__ethnicity = "UNKNOWN_OTHER";
        }
    });

    state.interviews.forEach(d => {
        if (d.race__ethnicity === "UNKNOWN") {
            d.race__ethnicity = "UNKNOWN_OTHER";
        }
        else if (d.race__ethnicity === "OTHER"){
            d.race__ethnicity = "UNKNOWN_OTHER";
        }
    });

    state.interviews.forEach(d => {
        if (d.interview_decision === "OPEN DATE" || d.interview_decision === "PAROLED" || d.interview_decision === "RCND&RELSE" || d.interview_decision === "REINSTATE") {
            d.interview_decision = "GRANTED";
        }
        else if (d.interview_decision === "OR EARLIER"){
            d.interview_decision = "POSTPONED";
        }
        else if(d.interview_decision === "NOT GRANTD" || d.interview_decision === "RCND&HOLD"){
            d.interview_decision = "DENIED"
        }
    });

    state.individuals.forEach(d => {
        if (d.interview_decision === "OPEN DATE" || d.interview_decision === "PAROLED" || d.interview_decision === "RCND&RELSE" || d.interview_decision === "REINSTATE") {
            d.interview_decision = "GRANTED";
        }
        else if (d.interview_decision === "OR EARLIER"){
            d.interview_decision = "POSTPONED";
        }
        else if(d.interview_decision === "NOT GRANTD" || d.interview_decision === "RCND&HOLD"){
            d.interview_decision = "DENIED"
        }
    });

    state.interviews.forEach(d => {
        if (d.interview_decision === "**********") {
            d.interview_decision = "OTHER";
        }
    });

    state.interviews.forEach(d => {
        if (d.parole_board_interview_type === "MERIT TIME" || d.parole_board_interview_type === "INITIAL" || d.parole_board_interview_type === "PIE" || d.parole_board_interview_type === "MEDICAL"|| d.parole_board_interview_type === "ECPDO" || d.parole_board_interview_type === "SUPP MERIT") {
            d.parole_board_interview_type = "INITIAL";
        }
        else if (d.parole_board_interview_type === "SP CONSDR" || d.parole_board_interview_type === "RESCISSION" || d.parole_board_interview_type === "PV REAPP"){
            d.parole_board_interview_type = "OTHER"
        }
    });

    state.interviews.forEach(d => {
        if (d.age < 25) {
            d.ageGroup = "UNDER25";
        } else if (d.age >= 25 && d.age <= 34) {
            d.ageGroup = "25_34";
        } else if (d.age >= 35 && d.age <= 44) {
            d.ageGroup = "35_44";
        } else if (d.age >= 45 && d.age <= 54) {
            d.ageGroup = "45_54";
        } else {
            d.ageGroup = "OVER55";
        }
    });

    

    state.individuals.forEach(d => {
        if (d.prop_sent_served <=1) {
            d.prop_sent_served = d.prop_sent_served * 100;
        }
        else if (d.prop_sent_served > 1){
            d.prop_sent_served = 100
        }
    });
    

    state.interviews.forEach(d => {
        if (d.prop_sent_served <=1) {
            d.prop_sent_served = d.prop_sent_served * 100;
        }
        else if (d.prop_sent_served > 1){
            d.prop_sent_served = 100
        }
    });
    

    deniedTotal = state.interviews.filter(d => d.interview_decision === "DENIED").length;
    grantedTotal = state.interviews.filter(d=> d.interview_decision === "GRANTED").length;
    // let blackTotal = state.interviews.filter(d=> d.race__ethnicity === "BLACK").length;
    // let whiteTotal = state.interviews.filter(d=> d.race__ethnicity === "WHITE").length;
    reappearTotal = state.interviews.filter(d=> d.parole_board_interview_type === "REAPPEAR").length;
    initialTotal = state.interviews.filter(d=> d.parole_board_interview_type === "INITIAL").length;
    state.raceData = d3.group(state.individuals, d => d.race__ethnicity);
    state.raceDataInterviews = d3.group(state.interviews, d => d.race__ethnicity);
    state.intTypeData = d3.group(state.interviews, d => d.parole_board_interview_type);
    races = Array.from(state.raceData.keys());
    intTypes = Array.from(state.intTypeData.keys());
    over55 = state.interviews.filter(d=> d.age >= 55);
    under55 = state.interviews.filter(d=>d.age < 55);
    interviewTotals = state.interviews.length;

    over55intType = d3.group(over55, d => d.parole_board_interview_type);

    //sort age data
    state.ageData = d3.group(state.interviews, d=>d.ageGroup);
    state.ageData = new Map(ageGroupOrder.map(ageGroup => [ageGroup, state.ageData.get(ageGroup) || []]));
    ageGroups = Array.from(state.ageData.keys());

        // Filter the interviews first
    const filteredInterviews = state.interviews.filter(d => 
        d.interview_decision === "DENIED" && d.parole_board_interview_type === "REAPPEAR"
    );

    // Group the filtered interviews by age group
    // const interviewsByAgeGroup = filteredInterviews.reduce((acc, interview) => {
    //     const ageGroup = interview.ageGroup;
    //     if (!acc[ageGroup]) {
    //         acc[ageGroup] = []; // Initialize an array if it doesn't exist
    //     }
    //     acc[ageGroup].push(interview);
    //     return acc;
    // }, {});

    // const interviewsByAgeGroupArray = Object.keys(interviewsByAgeGroup).map(ageGroup => ({
    //     ageGroup: ageGroup,
    //     interviews: interviewsByAgeGroup[ageGroup]
    // }));
    // interviewsByAgeGroupArray.sort((a, b) => b.interviews.length - a.interviews.length);




    //sort outcome data from most to least
    state.outcomeData = d3.group(state.interviews, d=>d.interview_decision);
    let sortedOutcomeDataArray = Array.from(state.outcomeData.entries());
    sortedOutcomeDataArray.sort((a, b) => b[1].length - a[1].length);
    state.outcomeData = new Map(sortedOutcomeDataArray);
    outcomes = Array.from(state.outcomeData.keys());

    console.log("state.ageData", state.ageData);
    console.log("ageGroups", ageGroups);

    //DATA FOR STACKING
    let formattedData = [];
    state.outcomeData.forEach((values, outcome) => {
            if (!formattedData[0]) {
                formattedData[0] = {};
            }
            formattedData[0][outcome] = values.length;
    });


    let stack = d3.stack()
    .keys(outcomes);

    let stackedData = stack(formattedData);
    


    interviewTypeData = intTypes.map(type => ({
        type: type,
        count: state.intTypeData.get(type).length
    }));

    interviewTypeData.forEach(d => {
        d.finalX = Math.random() * width;
        d.finalY = Math.random() * height;
    });
    
    //PIE DATA
    function prepareAgePieData(outcome) {
        return ageGroups.map(ageGroup => {
            let filteredData = state.interviews.filter(d => {
                return d.ageGroup === ageGroup && d.interview_decision === outcome;
            });
    
            return { ageGroup: ageGroup, value: filteredData.length };
        });
    }
    
    const ageDeniedPieData = prepareAgePieData("DENIED");
    const ageGrantedPieData = prepareAgePieData("GRANTED");


    function preparePieData(outcome) {
        return races.map(race => {
            let filteredData = state.interviews.filter(d => {
                return d.race__ethnicity === race && d.interview_decision === outcome;
            });
    
            return { race: race, value: filteredData.length };
        });
    }
    
    const deniedPieData = preparePieData("DENIED");
    const grantedPieData = preparePieData("GRANTED");

    function preparePieData2(intType) {
        return outcomes.map(outcome => {
            let filteredData = state.interviews.filter(d => {
                return d.interview_decision === outcome && d.parole_board_interview_type === intType;
            });
    
            return { outcome: outcome, value: filteredData.length };
        });
    }

    const initTypePieData = preparePieData2("INITIAL");
    const reapTypePieData = preparePieData2("REAPPEAR");

    function calculateCombinedPercentages(data, categoryKey, outcomeKey) {
        let totalDenied = data.filter(d => d[outcomeKey] === "DENIED").length;
        let totalGranted = data.filter(d => d[outcomeKey] === "GRANTED").length;

        const categoryCounts = d3.rollup(data, 
            v => d3.rollup(v, leaves => leaves.length, d => d[outcomeKey]),
            d => d[categoryKey]);

        let formattedData = [];

        categoryCounts.forEach((outcomes, category) => {
            const totalCategory = Array.from(outcomes.values()).reduce((a, b) => a + b, 0);
            const deniedCount = outcomes.get("DENIED") || 0;
            const grantedCount = outcomes.get("GRANTED") || 0;

            let entry = {
                category,
                percentOfCategoryDenied: (deniedCount / totalCategory) * 100,
                percentOfCategoryGranted: (grantedCount / totalCategory) * 100,
                percentOfTotalDenied: (deniedCount / totalDenied) * 100,
                percentOfTotalGranted: (grantedCount / totalGranted) * 100
            };
            formattedData.push(entry);
        });

        return formattedData;
    }

    let combinedRaceData = calculateCombinedPercentages(state.interviews, 'race__ethnicity', 'interview_decision');
    let combinedAgeData = calculateCombinedPercentages(state.interviews, 'ageGroup', 'interview_decision');
    let combinedInterviewTypeData = calculateCombinedPercentages(state.interviews, 'parole_board_interview_type', 'interview_decision');

    combinedRaceData.sort((a, b) => b.percentOfCategoryDenied - a.percentOfCategoryDenied);
    combinedAgeData.sort((a, b) => ageGroupOrder.indexOf(a.category) - ageGroupOrder.indexOf(b.category));
    combinedInterviewTypeData.sort((a, b) => b.percentOfCategoryDenied - a.percentOfCategoryDenied);

    console.log("here",combinedAgeData)

    state.combinedData = {
        race: combinedRaceData,
        age: combinedAgeData
    };

    //DATA FOR OVER 55 VS UNDER 55 NOT USED YET
    function processDataForButterflyChart(individuals) {

        const calculateAverage = (data, key) => {
            const sum = data.reduce((acc, curr) => acc + (curr[key] || 0), 0);
            return sum / data.length;
        };

        const calculateAverageLifeInPrison = (data) => {
            const sum = data.reduce((acc, curr) => {
                const lifePercentage = (curr.age - curr.age_entered) / curr.age *100;
                return acc + (isFinite(lifePercentage) ? lifePercentage : 0);
            }, 0);
            return sum / data.length;
        };
    
        const under55 = individuals.filter(d => d.age < 55);
        const age55AndUp = individuals.filter(d => d.age >= 55);
    
        const averagesUnder55 = {
            age: calculateAverage(under55, 'age'),
            ageEntered: calculateAverage(under55, 'age_entered'),
            timeServed: calculateAverage(under55, 'time_serv_at_int'),
            maxSent: calculateAverage(under55, 'max_sent'),
            minSent: calculateAverage(under55, 'min_sent'),
            propSent: calculateAverage(under55, 'prop_sent_served'),
            lifeInPrison: calculateAverageLifeInPrison(under55)
        };
    
        const averagesAge55AndUp = {
            age: calculateAverage(age55AndUp, 'age'),
            ageEntered: calculateAverage(age55AndUp, 'age_entered'),
            timeServed: calculateAverage(age55AndUp, 'time_serv_at_int'),
            maxSent: calculateAverage(age55AndUp, 'max_sent'),
            minSent: calculateAverage(age55AndUp, 'min_sent'),
            propSent: calculateAverage(age55AndUp, 'prop_sent_served'),
            lifeInPrison: calculateAverageLifeInPrison(age55AndUp)
        };
    
        const butterflyChartData = [
            { category: 'Under 55', ...averagesUnder55 },
            { category: '55 and Up', ...averagesAge55AndUp }
        ];
    
        return butterflyChartData;
    }
    

    // function processDataForButterflyChart2(data) {
    //     const ageGroups = {
    //         'UNDER55': { granted: 0, denied: 0, total: 0 },
    //         '55ANDUP': { granted: 0, denied: 0, total: 0 }
    //     };
    
    //     data.forEach(d => {
    //         const ageGroup = d.age < 55 ? 'UNDER55' : '55ANDUP';
    
    //         ageGroups[ageGroup].total += 1;
    
    //         if (d.interview_decision === 'GRANTED') {
    //             ageGroups[ageGroup].granted += 1;
    //         } else if (d.interview_decision === 'DENIED') {
    //             ageGroups[ageGroup].denied += 1;
    //         }
    //     });
    
    //     Object.keys(ageGroups).forEach(group => {
    //         if (ageGroups[group].total > 0) {
    //             ageGroups[group].percentGranted = (ageGroups[group].granted / ageGroups[group].total) * 100;
    //             ageGroups[group].percentDenied = (ageGroups[group].denied / ageGroups[group].total) * 100;
    //         } else {
    //             ageGroups[group].percentGranted = 0;
    //             ageGroups[group].percentDenied = 0;
    //         }
    //     });
    
    //     return ageGroups;
    // }
    
    // const processedData = processDataForButterflyChart(state.individuals);
    // console.log(processedData);
    

    // CREATE SCALES
    xScale = d3.scaleLinear()
    .domain([0, d3.max([state.interviews.length, state.individuals.length, state.moreThanOnce.length])])
    .range([m.left, width - m.right]);

    yScale = d3.scaleBand()
    .domain(['Total Interviews', 'Unique Persons', 'IDs More Than Once'])
    .range([m.top, height - m.bottom])
    .padding(0.2);
        
    outcomeyScale = d3.scaleLinear()
    .domain([0, d3.max(outcomes, outcome => state.outcomeData.get(outcome).length)])
    .range([height - m.bottom, m.top]);

    outcomexScale = d3.scaleBand()
    .domain(outcomes)
    .range([m.left, width - m.right])
    .padding(0.1);

    outcomexAxis = d3.axisBottom(outcomexScale)
    .tickFormat((d, i) => outcomes[i])
    .tickSize(0)
    .tickPadding(1); 

    grantedCenterX = outcomexScale('GRANTED') + outcomexScale.bandwidth() / 2;
    deniedCenterX = outcomexScale('DENIED') + outcomexScale.bandwidth() / 2;

    raceColorScale = d3.scaleOrdinal()
    .domain(races)
    .range(raceColors);

    ageColorScale = d3.scaleOrdinal()
    .domain(ageGroups)
    .range(ageColors);

    const decColorScale = d3.scaleOrdinal()
    .domain(outcomes)
    .range(barColors);

    typeColorScale = d3.scaleOrdinal()
    .domain(intTypes)
    .range(bubbleColors);

    // CREATE SVG
    svg = d3.select(".svg-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("overflow", "visible");

    // rect1 = svg.selectAll(".bar1")
    // .data(outcomes)
    // .enter()
    // .append("rect")
    // .attr("class", d => "bar1 " + d.replace(/\s+/g, ''))
    // .attr("x", m.left)
    // .attr("y", d => yScale(d.outcome))
    // .attr("width", 0)
    // .attr("height", yScale.bandwidth())
    // .attr("fill", "#1169e4");

    tooltip = d3.select("#tooltip");

    //FIRST BAR GRAPH W/ STACKED FIRST BAR
    bar1Group = svg.selectAll(".bar1")
    .data(stackedData)
    .enter().append("rect")
        .attr("class", d => `bar1-${d.key}`) 
        .attr("x", d => xScale(d[0][0])) 
        // .attr("y", yScale('Total Interviews'))
        .attr("y", svgCenterY)
        // .attr("width", d => xScale(d[0][1]) - xScale(d[0][0])) 
        .attr("width", 0)
        .attr("height", yScale.bandwidth())
        .attr("fill", "black")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        // .on("mouseover", function(event, d) {
        //     if (d3.select(this).classed("animation-complete")) {
        //         tooltip.style("display", "block")
        //     }
        // })
        .on("mouseover", mouseOver)
        .on("mousemove",function(event, d) {
            // if (d3.select(this).classed("animation-complete")) {
                let count = d[0][1] - d[0][0];
                let formattedCount = count.toLocaleString(); 
                let percentage = (count / state.interviews.length) * 100; 
                let tooltipContent = `<b>${formattedCount} (${percentage.toFixed(1)}%)</b> interviews 
                were given a <br>decision of <b>${d.key}</b>`;
                
            tooltip
                .style("opacity", 1)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .html(tooltipContent);
            })
        // })
        .on("mouseout", mouseOut);

    rect2 = svg
    .selectAll(".bar2")
    .data([state.individuals])
    .enter()
    .append("rect")
    .attr("class", "bar2")
    .attr("x", m.left)
    .attr("y", height)
    .attr("width", xScale(state.individuals.length))
    .attr("height", yScale.bandwidth())
    .attr("fill", "gray")
    .attr("visibility", "hidden")
    // .on("mouseover", mouseOver)
    // .on("mousemove", function(event, d) {
    //     tooltip.style("display", "block")
    //            .html(d.length + " individuals interviewed")
    //            .style("left", (event.pageX + 10) + "px")
    //            .style("top", (event.pageY - 10) + "px");
    //     })
    // .on("mouseout", mouseOut)

    rect3 = svg
    .selectAll(".bar3")
    .data([state.moreThanOnce])
    .enter()
    .append("rect")
    .attr("x", m.left)
    .attr("y", height)
    .attr("width", xScale(state.moreThanOnce.length))
    .attr("height", yScale.bandwidth())
    .attr("fill", "silver")
    .attr("visibility", "hidden")
    .attr("class", "bar3")
    // .on("mouseover", mouseOver)
    // .on("mousemove", function(event, d) {
    //     tooltip.style("display", "block")
    //                .html(d.length + " persons interviewed more than once")
    //                .style("left", (event.pageX + 10) + "px")
    //                .style("top", (event.pageY - 10) + "px");
    //         })
    // .on("mouseout", mouseOut);

    //TEXT/COUNTS FOR BAR GRAPH
    countText = svg
    .append("text")
    .attr("x", xScale(state.interviews.length)-120)
    .attr("y", yScale('Total Interviews') + yScale.bandwidth()/1.5)
    .attr("dy", ".35em")
    .text(0)
    .attr("class", "count-text")
    .attr("visibility", "hidden");

    // bar2text = svg
    // .append("text")
    // .attr("x", xScale(state.individuals.length)+50)
    // .attr("y", yScale('Unique Persons') + yScale.bandwidth() / 2)
    // .attr("dy", ".35em")
    // .text(state.individuals.length + " individuals")
    // .attr("class", "bar2text")
    // .attr("visibility", "hidden");
    
    // bar3text = svg
    // .append("text")
    // .attr("x", xScale(state.moreThanOnce.length)+50)
    // .attr("y", yScale('IDs More Than Once') + yScale.bandwidth() / 2)
    // .attr("dy", ".35em")
    // .text(state.moreThanOnce.length + " persons interviewed more than once")
    // .attr("class", "bar3text")
    // .attr("visibility", "hidden");

    //AXIS FOR VERTICAL BAR GRAPH
    // axisGroup = svg.append("g")
    // .attr("class", "outcomeBarsAxis")
    // .attr("visibility", "hidden")
    // .call(outcomexAxis)
    // .selectAll(".tick text")
    // // .attr("transform", d => `translate(${(outcomexScale.bandwidth()/2)-20}, 0) rotate(-65)`)
    // .attr("transform", d => `translate(${(outcomexScale.bandwidth()/2)-m.right}, 0)`)
    // .style("text-anchor", "end")
    // .style("font-size", "14px")
    // // .attr("dx", "-.8em")
    // // .attr("dy", ".15em");

    // axisGroup = svg.append("g")
    // .attr("class", "outcomeBarsAxis")
    // .attr("visibility", "hidden")
    // .call(outcomexAxis)
    // .selectAll(".tick text")
    // .attr("transform", d => `translate(${outcomexScale(d) + outcomexScale.bandwidth()/4}, 0)`) // Center align
    // .style("text-anchor", "middle") // Set text-anchor to middle
    // .style("font-size", "14px");

    svg.selectAll(".outcome-label")
        .data(outcomes)
        .enter()
        .append("text")
        .text(d => d)
        .attr("x", d => outcomexScale(d) + (outcomexScale.bandwidth()/2)+50)
        .attr("y", height-m.bottom)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .attr("visibility", "hidden")
        .attr("class", d => `outcome-label ${d}`);

    const legend = svg.selectAll(".legend")
        .data(outcomes)
        .enter()
        .append("g")
        .attr("class", d => `legend ${d}`)  // Adding specific class based on outcome
        .attr("transform", (d, i) => `translate(0, ${i * 20})`)
        .attr("visibility", "hidden"); // Initially hidden

        legend.append("rect")
        .attr("x", width - 200) // Adjust positioning as needed
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => decColorScale(d));



    let ticks = d3.selectAll(".tick text");

    ticks.attr("class", function(d){
        if(d === 'GRANTED'){ return "granted-tick"; }
        else if(d === 'DENIED'){ return "denied-tick"; }
    });

    svg.selectAll(".outcome-circle")
        .data(outcomes)
        .enter()
        .append("circle")
        .attr("cx", d => outcomexScale(d) + outcomexScale.bandwidth() / 2)
        .attr("cy", circleVerticalCenter)
        .attr("r", initialCircleRadius)
        .attr("fill", d => decColorScale(d))
        .attr("visibility", "hidden")
        .classed("outcome-circle", true)
        .attr("class", d => `outcome-circle ${d}`); // Adding specific class


// RACES PIE CHART
    deniedPieData.sort((a, b) => a.value - b.value);
    grantedPieData.sort((a, b) => a.value - b.value);

    const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(finalRadius);

    const deniedPie = d3.pie()
    .value(d => d.value)
    .sort(null)
    (deniedPieData);

    const grantedPie = d3.pie()
    .value(d => d.value)
    .sort(null)
    (grantedPieData);

    svg.selectAll('.denied-slice')
    .data(deniedPie)
    .enter()
    .append('path')
    .attr('class', d => `denied-slice ${d.data.race.replace(/\s+/g, '-')}`)
    .attr('d', arc)
    .attr('fill', d => raceColorScale(d.data.race))
    .attr('transform', `translate(${leftCenterX}, ${svgCenterY})`)
    .attr("visibility", "hidden")
    .on("mouseover", mouseOver)
    .on("mousemove", function(event, d) {
        let percent = calculatePercent(d.data.value, deniedTotal);
        const readableCategory = labelMapping[d.data.race] || d.data.race; 
        let tooltipContent = `<b>${percent}%</b> of the interviews <br> denied parole were <b>${readableCategory}</b>`;
        tooltip
            .style("opacity", 1)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(tooltipContent);
    })
    .on("mouseout", mouseOut);


    svg.selectAll('.granted-slice')
    .data(grantedPie)
    .enter()
    .append('path')
    .attr('class', d => `granted-slice ${d.data.race.replace(/\s+/g, '-')}`)
    .attr('d', arc)
    .attr('fill', d => raceColorScale(d.data.race))
    .attr('transform', `translate(${rightCenterX}, ${svgCenterY})`)
    .attr("visibility", "hidden")
    .on("mouseover", mouseOver)
    .on("mousemove", function(event, d) {
        let percent = calculatePercent(d.data.value, grantedTotal);
        const readableCategory = labelMapping[d.data.race] || d.data.race; 
        let tooltipContent = `<b>${percent}%</b> of the interviews <br> granted parole were <b>${readableCategory}</b>`;
        tooltip
            .style("opacity", 1)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(tooltipContent);
    })
    .on("mouseout", mouseOut);

    // PERCENT TEXT IN SLICES FOR THE HIGHLIGHT SECTIONS
    svg.selectAll('.pie-text-denied')
    .data(deniedPie)
    .enter()
    .append('text')
    .attr('class', d => `pie-text-denied ${d.data.race.replace(/\s+/g, '-')}`)
    .attr('transform', d => {
        const [x, y] = arc.centroid(d);
        return `translate(${x + leftCenterX}, ${y + svgCenterY})`;
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .text(d => calculatePercent(d.data.value, deniedTotal) + '%')
    .attr('visibility', "hidden");

    svg.selectAll('.pie-text-granted')
    .data(grantedPie)
    .enter()
    .append('text')
    .attr('class', d => `pie-text-granted ${d.data.race.replace(/\s+/g, '-')}`)
    .attr('transform', d => {
        const [x, y] = arc.centroid(d);
        return `translate(${x + rightCenterX}, ${y + svgCenterY})`; 
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .text(d => calculatePercent(d.data.value, grantedTotal) + '%')
    .attr('visibility', "hidden");


//AGE PIE CHART
    // ageDeniedPieData.sort((a, b) => a.value - b.value);
    // ageGrantedPieData.sort((a, b) => a.value - b.value);

    // const ageArc = d3.arc()
    // .innerRadius(0)
    // .outerRadius(finalRadius);

    // const ageDeniedPie = d3.pie()
    // .value(d => d.value)
    // .sort(null)
    // (ageDeniedPieData);

    // const ageGrantedPie = d3.pie()
    // .value(d => d.value)
    // .sort(null)
    // (ageGrantedPieData);


    // // Add slices for the DENIED pie chart
    // svg.selectAll('.age-denied-slice')
    // .data(ageDeniedPie)
    // .enter()
    // .append('path')
    // .attr('class', d => `age-denied-slice ${d.data.ageGroup}`)
    // .attr('d', arc)
    // .attr('fill', d => ageColorScale(d.data.ageGroup))
    // .attr('transform', `translate(${rightCenterX}, ${svgCenterY})`)
    // .attr("visibility", "hidden")
    // .on("mouseover", mouseOver)
    // .on("mousemove", function(event, d) {
    //     const readableCategory = labelMapping[d.data.ageGroup] || d.data.ageGroup; 
    //     let percent = calculatePercent(d.data.value, deniedTotal);
    //     let tooltipContent = `<b>${percent}%</b> of the interviews <br> denied parole were <b>${readableCategory}</b>`;
    //     tooltip
    //         .style("left", (event.pageX + 10) + "px")
    //         .style("top", (event.pageY - 10) + "px")
    //         .html(tooltipContent);
    // })
    // .on("mouseout", mouseOut);

    // svg.selectAll('.age-granted-slice')
    // .data(ageGrantedPie)
    // .enter()
    // .append('path')
    // .attr('class', d => `age-granted-slice ${d.data.ageGroup}`)
    // .attr('d', arc)
    // .attr('fill', d => ageColorScale(d.data.ageGroup))
    // .attr('transform', `translate(${leftCenterX}, ${svgCenterY})`)
    // .attr("visibility", "hidden")
    // .on("mouseover", mouseOver)
    // .on("mousemove", function(event, d) {
    //     const readableCategory = labelMapping[d.data.ageGroup] || d.data.ageGroup; 
    //     let percent = calculatePercent(d.data.value, grantedTotal);
    //     let tooltipContent = `<b>${percent}%</b> of the interviews <br> granted parole were <b>${readableCategory}</b>`;
    //     tooltip
    //         .style("left", (event.pageX + 10) + "px")
    //         .style("top", (event.pageY - 10) + "px")
    //         .html(tooltipContent);
    // })
    // .on("mouseout", mouseOut);


    //INTERVIEW TYPE PIE CHARTS

    initTypePieData.sort((a, b) => a.value - b.value);
    reapTypePieData.sort((a, b) => a.value - b.value);

    const arc2 = d3.arc()
    .innerRadius(0)
    .outerRadius(finalRadius);

    const initPie = d3.pie()
    .value(d => d.value)
    .sort(null)
    (initTypePieData);

    const reapPie = d3.pie()
    .value(d => d.value)
    .sort(null)
    (reapTypePieData);

    // Add slices for the initial pie chart
    svg.selectAll('.init-slice')
    .data(initPie)
    .enter()
    .append('path')
    .attr('class', d => `init-slice ${d.data.outcome}`)
    .attr('d', arc)
    .attr('fill', d => decColorScale(d.data.outcome))
    .attr('transform', `translate(${leftCenterX}, ${svgCenterY})`)
    .attr("visibility", "hidden")
    .on("mouseover", mouseOver)
    .on("mousemove", function(event, d) {
        let percent = calculatePercent(d.data.value, initialTotal);
        let tooltipContent = `<b>${percent}%</b> of initial interviews <br> were given a(n) <br><b>${d.data.outcome}</b> decision`;
        tooltip
            .style("opacity", 1)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(tooltipContent);
    })
    .on("mouseout", mouseOut)


    // Add slices for the reappearance pie chart
    svg.selectAll('.reap-slice')
    .data(reapPie)
    .enter()
    .append('path')
    .attr('class', d => `reap-slice ${d.data.outcome}`)
    .attr('d', arc)
    .attr('fill', d => decColorScale(d.data.outcome))
    .attr('transform', `translate(${rightCenterX}, ${svgCenterY})`)
    .attr("visibility", "hidden")
    .on("mouseover", mouseOver)
    .on("mousemove", function(event, d) {
        let percent = calculatePercent(d.data.value, reappearTotal);
        let tooltipContent = `<b>${percent}%</b> of reappearance interviews <br> were given a(n) <br><b>${d.data.outcome}</b> decision`;
        tooltip
            .style("opacity", 1)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(tooltipContent);
    })
    .on("mouseout", mouseOut);

        // PERCENT TEXT IN SLICES FOR THE HIGHLIGHT SECTIONS
        svg.selectAll('.pie-text-init')
        .data(initPie)
        .enter()
        .append('text')
        .attr('class', d => `pie-text-init ${d.data.outcome}`)
        .attr('transform', d => {
            const [x, y] = arc.centroid(d);
            return `translate(${x + leftCenterX}, ${y + svgCenterY})`;
        })
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .text(d => calculatePercent(d.data.value, initialTotal) + '%')
        .attr('visibility', "hidden");
    
        svg.selectAll('.pie-text-reap')
        .data(reapPie)
        .enter()
        .append('text')
        .attr('class', d => `pie-text-reap ${d.data.outcome}`)
        .attr('transform', d => {
            const [x, y] = arc.centroid(d);
            return `translate(${x + rightCenterX}, ${y + svgCenterY})`; 
        })
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .text(d => calculatePercent(d.data.value, reappearTotal) + '%')
        .attr('visibility', "hidden");

    //INTERVIEW TYPE BAR CHART
    // let intChartData = [];

    // state.intTypeData.forEach((entries, intType) => {
    //     let grantedCount = entries.filter(d => d.interview_decision === "GRANTED").length;
    //     let deniedCount = entries.filter(d => d.interview_decision === "DENIED").length;

    //     intChartData.push({ intType: intType, decision: "Granted", count: grantedCount });
    //     intChartData.push({ intType: intType, decision: "Denied", count: deniedCount });
    // });

    // // X-Scale (Category Scale)
    // let intxScale = d3.scaleBand()
    // .domain(intChartData.map(d => d.intType + "/" + d.decision))
    // .rangeRound([0, width])
    // .padding(0.1);

    // // Y-Scale (Linear Scale)
    // let intyScale = d3.scaleLinear()
    // .domain([0, d3.max(intChartData, d => d.count)])
    // .range([height, 0]);

    // svg.selectAll(".bar")
    // .data(intChartData)
    // .enter().append("rect")
    // .attr("class", "bar")
    // .attr("x", d => intxScale(d.intType + "/" + d.decision))
    // .attr("y", d => intyScale(d.count))
    // .attr("width", intxScale.bandwidth())
    // .attr("height", d => height - intyScale(d.count))
    // .attr("fill", d => d.decision === "Granted" ? "#BCD979" : "#B15E6C");


//BUTTERFLY CHART DATA

    // function calculateCombinedPercentages(data, categoryKey, outcomeKey) {
    //     let totalDenied = data.filter(d => d[outcomeKey] === "DENIED").length;
    //     let totalGranted = data.filter(d => d[outcomeKey] === "GRANTED").length;

    //     const categoryCounts = d3.rollup(data, 
    //         v => d3.rollup(v, leaves => leaves.length, d => d[outcomeKey]),
    //         d => d[categoryKey]);

    //     let formattedData = [];

    //     categoryCounts.forEach((outcomes, category) => {
    //         const totalCategory = Array.from(outcomes.values()).reduce((a, b) => a + b, 0);
    //         const deniedCount = outcomes.get("DENIED") || 0;
    //         const grantedCount = outcomes.get("GRANTED") || 0;

    //         let entry = {
    //             category,
    //             percentOfCategoryDenied: (deniedCount / totalCategory) * 100,
    //             percentOfCategoryGranted: (grantedCount / totalCategory) * 100,
    //             percentOfTotalDenied: (deniedCount / totalDenied) * 100,
    //             percentOfTotalGranted: (grantedCount / totalGranted) * 100
    //         };
    //         formattedData.push(entry);
    //     });

    //     return formattedData;
    // }

    // let combinedRaceData = calculateCombinedPercentages(state.interviews, 'race__ethnicity', 'interview_decision');
    // let combinedAgeData = calculateCombinedPercentages(state.interviews, 'ageGroup', 'interview_decision');
    // let combinedInterviewTypeData = calculateCombinedPercentages(state.interviews, 'parole_board_interview_type', 'interview_decision');
    // // let combinedClassData = calculateCombinedPercentages(state.interviews, 'class1', 'interview_decision')
    // // let combinedData = [...combinedRaceData, ...combinedAgeData, ...combinedInterviewTypeData];
    // // let requiredCategories = ["BLACK", "WHITE", "REAPPEAR", "INITIAL", "over55", "under55"];
    // // let filteredData = combinedData.filter(d => requiredCategories.includes(d.category));

    // combinedRaceData.sort((a, b) => b.percentOfCategoryDenied - a.percentOfCategoryDenied);
    // combinedAgeData.sort((a, b) => b.percentOfCategoryDenied - a.percentOfCategoryDenied);

    // state.combinedData = {
    //     race: combinedRaceData,
    //     age: combinedAgeData
    // };

    // function processDataForButterflyChart(individuals) {
    //     // Helper function to calculate average
    //     const calculateAverage = (data, key) => {
    //         const sum = data.reduce((acc, curr) => acc + (curr[key] || 0), 0);
    //         return sum / data.length;
    //     };

    //         // Helper function to calculate average life percentage in prison
    //     const calculateAverageLifeInPrison = (data) => {
    //         const sum = data.reduce((acc, curr) => {
    //             const lifePercentage = (curr.age - curr.age_entered) / curr.age *100;
    //             return acc + (isFinite(lifePercentage) ? lifePercentage : 0);
    //         }, 0);
    //         return sum / data.length;
    //     };
    
    //     // Split data into two groups
    //     const under55 = individuals.filter(d => d.age < 55);
    //     const age55AndUp = individuals.filter(d => d.age >= 55);
    
    //     // Calculate averages for each group
    //     const averagesUnder55 = {
    //         age: calculateAverage(under55, 'age'),
    //         ageEntered: calculateAverage(under55, 'age_entered'),
    //         timeServed: calculateAverage(under55, 'time_serv_at_int'),
    //         maxSent: calculateAverage(under55, 'max_sent'),
    //         minSent: calculateAverage(under55, 'min_sent'),
    //         propSent: calculateAverage(under55, 'prop_sent_served'),
    //         lifeInPrison: calculateAverageLifeInPrison(under55)
    //     };
    
    //     const averagesAge55AndUp = {
    //         age: calculateAverage(age55AndUp, 'age'),
    //         ageEntered: calculateAverage(age55AndUp, 'age_entered'),
    //         timeServed: calculateAverage(age55AndUp, 'time_serv_at_int'),
    //         maxSent: calculateAverage(age55AndUp, 'max_sent'),
    //         minSent: calculateAverage(age55AndUp, 'min_sent'),
    //         propSent: calculateAverage(age55AndUp, 'prop_sent_served'),
    //         lifeInPrison: calculateAverageLifeInPrison(age55AndUp)
    //     };
    
    //     // Prepare data for the chart
    //     const butterflyChartData = [
    //         { category: 'Under 55', ...averagesUnder55 },
    //         { category: '55 and Up', ...averagesAge55AndUp }
    //     ];
    
    //     return butterflyChartData;
    // }
    
    // // Example usage
    // const butterflyChartData = processDataForButterflyChart(state.individuals);
    

    // SCALES AND AXES FOR ALL BUTTERFLY CHARTS

    butterflyxScaleLeft = d3.scaleLinear()
    .domain([0, 50])
    .range([(width / 2), m.left]);

    butterflyxScaleRight = d3.scaleLinear()
    .domain([0, 50])
    .range([(width / 2), (width - m.right)]);

    butterflyxAxisLeft = svg.append("g")
    .attr("transform", `translate(0, ${m.top})`)
    .attr("class", "butterflyxAxisLeft")
    .attr("visibility", "hidden")
    .call(d3.axisTop(butterflyxScaleLeft).tickValues([0,25,50]))
    .selectAll(".tick text")
    .style("font-size", "14px")
    .attr("text-anchor", "middle");
    
    butterflyxAxisRight = svg.append("g")
    .attr("transform", `translate(0, ${m.top})`)
    .attr("class", "butterflyxAxisRight")
    .attr("visibility", "hidden")
    .call(d3.axisTop(butterflyxScaleRight).tickValues([0,25,50]))
    .selectAll(".tick text")
    .style("font-size", "14px")
    .attr("text-anchor", "middle");

// RACE BUTTERFLY CHART
    raceButterflyyScale = d3.scaleBand()
        .domain(combinedRaceData.map(d => d.category)) 
        .range([m.top, height - m.bottom])
        .padding(0.1);
        

    combinedRaceData.forEach(d => {
        svg.append("rect")
            .attr('class', `race-butterfly-denied ${d.category}`)
            .attr("x", butterflyxScaleLeft(d.percentOfCategoryDenied))
            .attr("y", raceButterflyyScale(d.category))
            .attr("width", width / 2 - butterflyxScaleLeft(d.percentOfCategoryDenied))
            .attr("height", raceButterflyyScale.bandwidth())
            // .attr("fill", d => raceColorScale(d.category))
            .attr("fill", "#B15E6C")
            .attr("visibility", "hidden")
            .on("mouseover", mouseOver)
            .on("mousemove", function(event) {
                const readableCategory = labelMapping[d.category] || d.category; 
                tooltip
                .style("opacity", 1)
                .html(` Interviews of <br><b>${readableCategory}</b> <br> identifying people were <br>
                    GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% and
                    <br> <b>DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%</b>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", mouseOut);

        svg.append("rect")
            .attr('class', `race-butterfly-granted ${d.category}`)
            .attr("x", width / 2)
            .attr("y", raceButterflyyScale(d.category))
            .attr("width", butterflyxScaleRight(d.percentOfCategoryGranted) - width / 2) 
            .attr("height", raceButterflyyScale.bandwidth())
            // .attr("fill", d => raceColorScale(d.category))
            .attr("fill", "#BCD979")
            .attr("visibility", "hidden")
            .on("mouseover", mouseOver)
            .on("mousemove", function(event) {
                const readableCategory = labelMapping[d.category] || d.category; 
                tooltip
                    .style("opacity", 1)
                    .html(`Interviews of<br> <b>${readableCategory}</b> <br> identifying people were <br>
                        <b>GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% </b> and
                        <br> DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", mouseOut);
    });

    raceButterflyyAxis = svg.append("g")
       . attr("transform", `translate(${width-m.right}, 0)`)
        .attr("class", "raceButterflyyAxis")
        .attr("visibility", "hidden")
        .call(d3.axisRight(raceButterflyyScale).tickSize(0))
        .selectAll(".tick text")
        .text(d => labelMapping[d] || d)
        .style("font-size", "12px")
        .attr("text-anchor", "end");

    raceButterflyyAxis.each(function() {
            wrap(d3.select(this), 150); 
        });

    //TEXT ELEMENT FOR HIGHLIGHTING
    combinedRaceData.forEach(d => {
        if (d.category === 'BLACK' || d.category === 'WHITE') {
            // Add text for granted percentage
            svg.append("text")
                .attr('class', `race-butterfly-percentage-denied ${d.category}`)
                .attr("x", (butterflyxScaleLeft(0) + butterflyxScaleLeft(d.percentOfCategoryDenied)) / 2)
                .attr("y", raceButterflyyScale(d.category) + raceButterflyyScale.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .text(`${d.percentOfCategoryDenied.toFixed(1)}%`)
                .attr("fill", "black")
                .attr("visibility", "hidden");
    
            // Add text for denied percentage
            svg.append("text")
                .attr('class', `race-butterfly-percentage-granted ${d.category}`)
                .attr("x", (width / 2 + butterflyxScaleRight(d.percentOfCategoryGranted)) / 2)
                .attr("y", raceButterflyyScale(d.category) + raceButterflyyScale.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .text(`${d.percentOfCategoryGranted.toFixed(1)}%`)
                .attr("fill", "black")
                .attr("visibility", "hidden");
        }
    });
    


// AGE BUTTERFLY CHART

    ageButterflyyScale = d3.scaleBand()
        .domain(combinedAgeData.map(d => d.category)) 
        .range([m.top, height - m.bottom])
        .padding(0.1);

    combinedAgeData.forEach(d => {
        svg.append("rect")
            .attr('class', `age-butterfly-denied A${d.category}`)
            .attr("x", butterflyxScaleLeft(d.percentOfCategoryDenied))
            .attr("y", ageButterflyyScale(d.category))
            .attr("width", width / 2 - butterflyxScaleLeft(d.percentOfCategoryDenied))
            .attr("height", ageButterflyyScale.bandwidth())
            .attr("fill", "#B15E6C")
            .attr("visibility", "hidden")
            .on("mouseover", mouseOver)
            .on("mousemove", function(event) {
                const readableCategory = labelMapping[d.category] || d.category; 
                tooltip
                .style("opacity", 1)    
                .html(`Interviews of people <br>aged <b>${readableCategory}</b> were <br>
                    GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% and
                    <br> <b>DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%</b>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", mouseOut);

        svg.append("rect")
            .attr('class', `age-butterfly-granted A${d.category}`)
            .attr("x", width / 2)
            .attr("y", ageButterflyyScale(d.category))
            .attr("width", butterflyxScaleRight(d.percentOfCategoryGranted) - width / 2) 
            .attr("height", ageButterflyyScale.bandwidth())
            // .attr("fill", d => raceColorScale(d.category))
            .attr("fill", "#BCD979")
            .attr("visibility", "hidden")
            .on("mouseover", mouseOver)
            .on("mousemove", function(event) {
                const readableCategory = labelMapping[d.category] || d.category; 
                tooltip
                    .style("opacity", 1)
                    .html(`Interviews of people <br>aged <b>${readableCategory}</b> were <br>
                        <b>GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% </b> and
                        <br> DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", mouseOut);
    });


    // Adding Y-axis in the middle
    ageButterflyyAxis = svg.append("g")
        // .attr("transform", `translate(${width / 2}, 0)`)
        .attr("transform", `translate(${width-m.right}, 0)`)
        .attr("class", "ageButterflyyAxis")
        .attr("visibility", "hidden")
        .call(d3.axisRight(ageButterflyyScale).tickSize(0))
        .selectAll(".tick text")
        .text(d => labelMapping[d] || d)
        .style("font-size", "12px")
        .attr("text-anchor", "end");


    //TEXT ELEMENT FOR HIGHLIGHTING
    combinedAgeData.forEach(d => {
            svg.append("text")
                .attr('class', `age-butterfly-percentage-denied A${d.category}`)
                .attr("x", (butterflyxScaleLeft(0) + butterflyxScaleLeft(d.percentOfCategoryDenied)) / 2)
                .attr("y", ageButterflyyScale(d.category) + ageButterflyyScale.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .text(`${d.percentOfCategoryDenied.toFixed(1)}%`)
                .attr("fill", "black")
                .attr("visibility", "hidden");
    
            // Add text for denied percentage
            svg.append("text")
                .attr('class', `age-butterfly-percentage-granted A${d.category}`)
                .attr("x", (width / 2 + butterflyxScaleRight(d.percentOfCategoryGranted)) / 2)
                .attr("y", ageButterflyyScale(d.category) + ageButterflyyScale.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .text(`${d.percentOfCategoryGranted.toFixed(1)}%`)
                .attr("fill", "black")
                .attr("visibility", "hidden");

    });


// INTERVIEW TYPE BUTTERFLY CHART

// intButterflyyScale = d3.scaleBand()
// .domain(combinedInterviewTypeData.map(d => d.category))
// .range([m.top, height - m.bottom])
// .padding(0.1);

// combinedInterviewTypeData.forEach(d => {
// svg.append("rect")
//     .attr('class', `int-butterfly-granted A${d.category}`)
//     .attr("x", butterflyxScaleLeft(d.percentOfCategoryGranted))
//     .attr("y", intButterflyyScale(d.category))
//     .attr("width", width / 2 - butterflyxScaleLeft(d.percentOfCategoryGranted))
//     .attr("height", intButterflyyScale.bandwidth())
//     .attr("fill", "#BCD979")
//     .attr("visibility", "hidden")
//     .on("mouseover", mouseOver)
//     .on("mousemove", function(event) {
//         const readableCategory = labelMapping[d.category] || d.category; 
//         tooltip
//             .html(`People aged <b>${readableCategory}</b> <br> were <br>
//                 <b>GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% </b> and
//                 <br> DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%`)
//             .style("left", (event.pageX + 10) + "px")
//             .style("top", (event.pageY - 10) + "px");
//     })
//     .on("mouseout", mouseOut);

// svg.append("rect")
//     .attr('class', `int-butterfly-denied A${d.category}`)
//     .attr("x", width / 2)
//     .attr("y", intButterflyyScale(d.category))
//     .attr("width", butterflyxScaleRight(d.percentOfCategoryDenied) - width / 2) 
//     .attr("height", intButterflyyScale.bandwidth())
//     // .attr("fill", d => raceColorScale(d.category))
//     .attr("fill", "#B15E6C")
//     .attr("visibility", "hidden")
//     .on("mouseover", mouseOver)
//     .on("mousemove", function(event) {
//         const readableCategory = labelMapping[d.category] || d.category; 
//         tooltip
//         .html(`People aged <b>${readableCategory}</b> <br> were <br>
//             GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% and
//             <br> <b>DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%</b>`)
//             .style("left", (event.pageX + 10) + "px")
//             .style("top", (event.pageY - 10) + "px");
//     })
//     .on("mouseout", mouseOut);
// });


// // Adding Y-axis in the middle
// intButterflyyAxis = svg.append("g")
// // .attr("transform", `translate(${width / 2}, 0)`)
// .attr("transform", `translate(${m.left}, 0)`)
// .attr("class", "intButterflyyAxis")
// .attr("visibility", "hidden")
// .call(d3.axisLeft(intButterflyyScale).tickSize(0))
// .selectAll(".tick text")
// .text(d => labelMapping[d] || d)
// .style("font-size", "12px")
// .attr("text-anchor", "start");


// //TEXT ELEMENT FOR HIGHLIGHTING
// combinedInterviewTypeData.forEach(d => {
//     svg.append("text")
//         .attr('class', `int-butterfly-percentage-granted A${d.category}`)
//         .attr("x", (butterflyxScaleLeft(0) + butterflyxScaleLeft(d.percentOfCategoryGranted)) / 2)
//         .attr("y", intButterflyyScale(d.category) + intButterflyyScale.bandwidth() / 2)
//         .attr("text-anchor", "middle")
//         .attr("dy", "0.35em")
//         .text(`${d.percentOfCategoryGranted.toFixed(1)}%`)
//         .attr("fill", "black")
//         .attr("visibility", "hidden");

//     // Add text for denied percentage
//     svg.append("text")
//         .attr('class', `int-butterfly-percentage-denied A${d.category}`)
//         .attr("x", (width / 2 + butterflyxScaleRight(d.percentOfCategoryDenied)) / 2)
//         .attr("y", intButterflyyScale(d.category) + intButterflyyScale.bandwidth() / 2)
//         .attr("text-anchor", "middle")
//         .attr("dy", "0.35em")
//         .text(`${d.percentOfCategoryDenied.toFixed(1)}%`)
//         .attr("fill", "black")
//         .attr("visibility", "hidden");

// });
        


// INTERVIEW TYPE BUBBLE CHART
    interviewTypeProportions = new Map();

    state.intTypeData.forEach((entries, intType) => {
        let proportion = entries.length / interviewTotals;
        interviewTypeProportions.set(intType, proportion);
    });

    radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(interviewTypeProportions.values())])
    .range([0, maxBubbleRadius]); 

    intxScale = d3.scaleBand()
    .domain([...interviewTypeProportions.keys()])
    .range([0, width]);

    intyScale = d3.scaleLinear()
    .domain([0, 1])
    .range([height, 0]);

    console.log(state.intTypeData)

    bubbles = svg.selectAll(".bubble")
        .data([...interviewTypeProportions.entries()])
        .enter().append("circle")
        .attr("class", "bubble")
        // .attr("cx", (d, i) => svgCenterX + spreadRadius * Math.cos(2 * Math.PI * i / interviewTypeProportions.size))
        // .attr("cy", (d, i) => svgCenterY + spreadRadius * Math.sin(2 * Math.PI * i / interviewTypeProportions.size))
        .attr("cx", svgCenterX)
        .attr("cy", svgCenterY)
        // .attr("r", d => radiusScale(d[1]))
        .attr("r", 0)
        .attr("fill", d => typeColorScale(d[0]))
        .attr("data-target-radius", d => radiusScale(d[1]))
        .on("mouseover", mouseOver)
        .on("mousemove", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html(`${d[0]} interviews <br>make up ${(d[1] * 100).toFixed(2)}% <br>of the total interviews`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", mouseOut)


    svg.selectAll(".bubble-label")
    .data([...interviewTypeProportions.entries()])
    .enter().append("text")
    .attr("x", (d, i) => svgCenterX + spreadRadius * Math.cos(2 * Math.PI * i / interviewTypeProportions.size))
    .attr("y", (d, i) => {
        let radius = radiusScale(d[1]);
        return svgCenterY + spreadRadius * Math.sin(2 * Math.PI * i / interviewTypeProportions.size) + radius + 25;
    })
    .attr("class", d => `bubble-label ${d[0]}`)
    .text(d => d[0])
    .attr("text-anchor", "middle")
    .attr("visibility", "hidden");


//KERNEL DENSITY
    kdeChartContainer = svg.append("g")
        .attr("class", "kdeChartContainer")

    kdeChartContainer.append("g")
        .attr("class", "kde-x-axis")
        .attr("transform", "translate(0," + height + ")");

    kdeChartContainer.append("g")
        .attr("class", "y-axis");

//REAPPEAR DENIED AGE BAR CHART




// Example call to the function
// updateBarChart('ageGroup');

    // const ageGroupxScale = d3.scaleBand()
    //     .domain(interviewsByAgeGroupArray.map(d => d.ageGroup))
    //     .range([0, width])
    //     .padding(0.1);

    // const ageGroupyScale = d3.scaleLinear()
    //     .domain([0, d3.max(interviewsByAgeGroupArray, d => d.interviews.length)])
    //     .range([height, 0]); // Invert range for y-axis

    // // Draw the bars
    // svg.selectAll(".bar")
    //     .data(interviewsByAgeGroupArray)
    //     .enter()
    //     .append("rect")
    //     .attr("class", "bar")
    //     .attr("x", d => ageGroupxScale(d.ageGroup)) // Position bars using the x-scale
    //     .attr("y", d => ageGroupyScale(d.interviews.length)) // Position bars using the y-scale
    //     .attr("width", ageGroupxScale.bandwidth()) // Set bar width
    //     .attr("height", d => height - ageGroupyScale(d.interviews.length)) // Set bar height
    //     .attr("fill", "#69b3a2"); // Set bar color (change as needed)

    draw();
}

/* DRAW FUNCTION */
function draw() {


    const selectElement = d3.selectAll("button")

        selectElement
        .on("click", function () {
                state.btnFilter = this.id
                console.log(state.btnFilter)
                updateKDEPlot(state.btnFilter);
            });

    let buttons = document.querySelectorAll('.button-38');

    buttons.forEach(function(button) {
        button.addEventListener('click', function() {
            buttons.forEach(function(btn) {
                btn.classList.remove('button-38-active');
            });
            button.classList.add('button-38-active');
        });
    });

    ScrollTrigger.defaults({scroller: ".content-container" });
    ScrollTrigger.defaults({toggleActions: 'play none none reverse'})

    tl1 = gsap.timeline({
        scrollTrigger: {
            trigger: "#section1",
            start: "top center", 
            end: "center center",
        },
    });


    let countObj = { value: 0 };

    outcomes.forEach((outcome, i) => {
        const segmentWidth = xScale(state.outcomeData.get(outcome).length) - m.right;
    
        tl1
        .set(`.bar1-${outcome}`, { pointerEvents: 'none' })
        .to(`.bar1-${outcome}`, {
            width: segmentWidth,
            duration: 1.5,
            ease: "none",
        }, `+=${i * 0.02}`)
    },);

    tl1
    .to(countObj, {
        value: state.interviews.length,
        duration: 6,
        onUpdate: () => {
            countText.text(Math.round(countObj.value).toLocaleString() + " interviews");
            document.querySelector("#dynamicCount .count-number").textContent = Math.round(countObj.value).toLocaleString();        
        }
    }, 0)
    .to("#section1_1", {
        y: svgCenterY - 120,
        duration: .5,
        ease: "power1.Out"
    }, 0)

    outcomes.forEach((outcome, i) => {
        tl1
        .to(`.bar1-${outcome}`, {
            attr:  {y: yScale('Total Interviews')},
            duration: 1,
            ease: "power1.Out"
        }, "section1MoveUp")
    });

    // Move #section1_1 up a little
    tl1
    .to("#section1_1", {
        y: -50, 
        duration: 1,
        ease: "power1.Out"
    }, "section1MoveUp") 
    .to(".bar2", {
        visibility: "visible", 
        attr: { y: yScale('Unique Persons') },
        duration: 1,
        ease: "power1.Out"
    }, "section1MoveUp") 
    .to("#section1_2", {
        opacity: 1,
        y: -30, 
        duration: 1,
        ease: "power1.Out"
    }, "section1MoveUp")
    .to("#section1_3", {
        opacity: 1, 
        duration: 1
    }, ">") 
    .to(".bar3", {
        visibility: "visible", 
        attr: { y: yScale('IDs More Than Once') },
        duration: 1
    }, "<") 

    
    // Timeline for flying out rect1, rect3, and their texts
    const tlFlyOut = gsap.timeline({
        scrollTrigger: {
            trigger: "#section2",
            start: "top center",
            end: "center center",
            scrub: 1,
            onEnter: () => {
                tl1.progress(1).pause(); // Complete the animation, then pause
            },
        }
    });

    tlFlyOut
    .to(".bar2, .count-text, .bar2text, .bar3, .bar3text", {
        y: -200, 
        visibility: "hidden", 
        duration: 0.5, 
        stagger: 0.1
    })

    // gsap.set(".outcomeBarsAxis", { x: "-100%" });

    const verticalBarTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#section2",
            start: "top center",
            end: "center center",
            scrub: 1,
            onEnter: () => {
                tlFlyOut.progress(1).pause(); // Complete the animation, then pause
            },
        },
    });

    outcomes.forEach((outcome, i) => {
        verticalBarTimeline
        .set(`.bar1-${outcome}`, { pointerEvents: 'auto' })
        .to(`.bar1-${outcome}`, {
            height: height - m.bottom - outcomeyScale(state.outcomeData.get(outcome).length),
            y: outcomeyScale(state.outcomeData.get(outcome).length) - m.bottom,
            attr: {
                x: outcomexScale(outcome)+outcomexScale.bandwidth()/2,
                stroke: "none"},
            width: outcomexScale.bandwidth()/2,
            fill: barColors[i % barColors.length],
            duration: 2,
            ease: "power1.inOut",
        }, "<");
    });

    const axisYPosition = d3.max(outcomes, outcome => outcomeyScale(state.outcomeData.get(outcome).length));
    
    verticalBarTimeline
    .to(".outcome-label", {
        visibility: "visible",
        ease: "power1.inOut"
    })
    // .to(".outcomeBarsAxis", {
    //     attr: { transform: `translate(0, ${axisYPosition})` },
    //     duration: 2,
    //     ease: "power1.inOut",
    // }, "<")
    // .to(".outcomeBarsAxis", {
    //     visibility: "visible",
    //     ease: "power1.inOut"
    // }, ">");

    // addBarCounts(); 
    // verticalBarTimeline.to('.bar-count', {
    //     visibility: "visible", 
    //     delay: 1,
    //     duration: 1,
    //     ease: 'power1.inOut',
    // }, "<");

    const moveBarsTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#section3",
            start: "top center",
            end: "center center",
            scrub: 1,
            onEnter: () => {
                verticalBarTimeline.progress(1).pause(); // Complete the animation, then pause
            },
        }
    });
    
    moveBarsTimeline
    .to('.bar1-OTHER, .bar1-POSTPONED', {
        y: "-=300",
        visibility: "hidden",
        duration: 3,
        ease: 'power1.inOut'
    }, "<")
    .to('.outcome-label.POSTPONED, .outcome-label.OTHER', {
        visibility: "hidden",
        opacity: 0,
        duration: 1,
        ease: 'power1.inOut'
    }, 0)
    .to('.bar1-GRANTED, .bar1-DENIED', {
        duration: 3,
        rx: "50%",
        ry: "50%",
        ease: 'power1.inOut'
    }, ">")
    .to('.outcome-circle.DENIED, .outcome-circle.GRANTED', {
        visibility: "visible",
        duration: 3,
        attr: { r: circleRadius },
        ease: 'power1.inOut'
    }, ">")
    .to('.outcome-circle.DENIED', {
        duration: 3,
        attr: { 
            cx: leftCenterX,
            cy: svgCenterY, 
            r: finalRadius 
        },
        ease: 'power1.inOut'
    }, "<")
    .to('.outcome-circle.GRANTED', {
        duration: 3,
        attr: { 
            cx: rightCenterX,
            cy: svgCenterY, 
            r: finalRadius 
        },
        ease: 'power1.inOut'
    }, '<')
    .to('.bar1-DENIED, .bar1-GRANTED', {
        duration: 3,
        y: circleVerticalCenter, 
        height: 0, 
        visibility: "hidden",
        ease: 'power1.inOut'
    }, "<")
    .to('.outcome-label.DENIED', {
        attr: {
            x: leftCenterX
        },
        visibility: "visible",
        duration: 2,
        ease: 'power1.inOut'
    }, "<")
    .to('.outcome-label.GRANTED', {
        attr: {
            x: rightCenterX
        },
        visibility: "visible",
        duration: 2,
        ease: 'power1.inOut'
    }, "<")
    
    // new timeline for making circles into pie graphs
    const racePieTL = gsap.timeline({
        scrollTrigger: {
            trigger: "#section4",
            start: "top center",
            end: "center center",
            scrub: 1,
            onEnter: () => {
                moveBarsTimeline.progress(1).pause(); // Complete the animation, then pause
            },
        }
    });
    
    // Fade out the denied and granted whole circles
    racePieTL
    .to('.outcome-circle.DENIED, .outcome-circle.GRANTED', {
        visibility: "hidden",
        duration: 2,
        ease: 'power1.out'
    }, ">")
    .to('.denied-slice, .granted-slice', {
        visibility: "visible",
        duration: 2,
        ease: 'power1.in'
    }, '<');


    // new timeline to highlight pie graph sections
    const highlightPieSectionTimeline = gsap.timeline({
            scrollTrigger: {
            trigger: "#section5",
            start: "top center",
            end: "center center",
            scrub: 1,
            onEnter: () => {
                racePieTL.progress(1).pause(); // Complete the animation, then pause
            },
        }
    });

    highlightPieSectionTimeline
    .set('.denied-slice, .granted-slice', { pointerEvents: 'none' })
    .to('.denied-slice.WHITE, .granted-slice.WHITE', {
        visibility: "visible",
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.denied-slice:not(.WHITE), .granted-slice:not(.WHITE)', {
        visibility: "visible",
        opacity: 0.3,
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.pie-text-granted.WHITE, .pie-text-denied.WHITE', {
        visibility: "visible",
        duration: 1,
        ease: 'power1.inOut'
    }, 0);


    const highlightPieSectionTimeline2 = gsap.timeline({
        scrollTrigger: {
        trigger: "#section6",
        start: "top center",
        end: "center center",
        scrub: 1,
        onEnter: () => {
            highlightPieSectionTimeline.progress(1).pause(); // Complete the animation, then pause
        },
        }
    });

    highlightPieSectionTimeline2
    .set('.denied-slice, .granted-slice', { pointerEvents: 'none' })
    .to('.denied-slice.BLACK, .granted-slice.BLACK', {
        visibility: "visible",
        opacity: 1,
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.denied-slice:not(.BLACK), .granted-slice:not(.BLACK)', {
        visibility: "visible",
        opacity: 0.3,
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.pie-text-denied.BLACK, .pie-text-granted.BLACK', {
        visibility: "visible",
        duration: 1,
        ease: 'power1.inOut'
    }, 0)
    .to('.pie-text-granted.WHITE, .pie-text-denied.WHITE', {
        visibility: "visible",
        opacity: .2,
        duration: 1,
        ease: 'power1.inOut'
    }, 0);

    const highlightPieSectionTimeline3 = gsap.timeline({
        scrollTrigger: {
        trigger: "#section61",
        start: "top center",
        end: "center center",
        scrub: 1,
        onEnter: () => {
            highlightPieSectionTimeline2.progress(1).kill(); // Complete the animation, then pause
        },
        }
    })

    highlightPieSectionTimeline3
    .to('.granted-slice, outcome-label.GRANTED', {
        opacity: .3,
        duration: 1,
        ease: 'power1.In'
    })
    .to('.pie-text-granted.BLACK, .pie-text-granted.WHITE', {
        visibility: "hidden",
        opacity: 0,
        duration: 1,
        ease: 'power1.In'
    })
    .to('.pie-text-denied.WHITE, .pie-text-denied.BLACK, .denied-slice.BLACK, .denied-slice.WHITE', {
        visibility: "visible",
        opacity: 1,
        duration: 1,
        ease: 'power1.In'
    })

    
    

    const raceButterflyTL = gsap.timeline({
        scrollTrigger: {
        trigger: "#section7",
        start: "top top",
        end: "center center",
        scrub: 1,
        onEnter: () => {
            highlightPieSectionTimeline3.progress(1).kill();
        },
        }
    });

    raceButterflyTL
   .to('.denied-slice, .granted-slice, .pie-text-denied.BLACK, .pie-text-granted.BLACK, .pie-text-granted.WHITE, .pie-text-denied.WHITE', {
        visibility: "hidden",
        opacity: 0,
        duration: 1,
        ease: 'power1.In'
    })
    .to('.outcome-circle.GRANTED, .outcome-circle.DENIED', {
        visibility: "visible",
        duration: 1,
        ease: 'power1.Out'
    }, "<")
    .to(".outcome-circle.GRANTED, .outcome-circle.DENIED", { 
        duration: 2,
        attr: {
            r: 0
        },
    }, ">")
    .to(".outcome-label.DENIED, .outcome-label.GRANTED", {
        attr: {
            y: height - 50
        }
    }, "<")
    .to('.race-butterfly-granted, .race-butterfly-denied, .raceButterflyyAxis', {
        visibility: "visible",
        duration: 3,
        ease: "power1.inOut"
    }, ">")
    .to('.butterflyxAxisLeft, .butterflyxAxisRight',{
        visibility: "visible",
        duration: 1,
        ease: "power1.inOut"
    }, "<")

    const highlightRBTL = gsap.timeline({
        scrollTrigger: {
        trigger: "#section8",
        start: "top center",
        end: "center center",
        scrub: 1,
        onEnter: () => {
            raceButterflyTL.progress(1).pause(); // Complete the animation, then pause
        },
        }
    });
    
    highlightRBTL
    .set('.race-butterfly-granted, .race-butterfly-denied', { pointerEvents: 'none' }) // Disable tooltip at the start
    .to('.race-butterfly-granted.HISPANIC, .race-butterfly-granted.AMERIND_ALSK, .race-butterfly-granted.ASIAN_PACIFIC, .race-butterfly-granted.UNKNOWN_OTHER, .race-butterfly-denied.HISPANIC, .race-butterfly-denied.AMERIND_ALSK, .race-butterfly-denied.ASIAN_PACIFIC, .race-butterfly-denied.UNKNOWN_OTHER', {
        duration: 1,
        opacity: 0.3, 
        ease: 'power1.inOut'
    }, '<')
    .to('.race-butterfly-percentage-granted.BLACK, .race-butterfly-percentage-denied.BLACK, .race-butterfly-percentage-granted.WHITE, .race-butterfly-percentage-denied.WHITE', {
        duration: 1,
        opacity: 1,
        visibility: "visible",
        ease: 'power1.inOut'
    }, '<') 
    .to('.raceButterflyyAxis .tick text', {
        duration: 1,
        ease: 'power1.inOut',
        opacity: function() {
            let label = d3.select(this).text();
            return (label === 'BLACK' || label === 'WHITE') ? 1 : 0.3;
        }
    }, '<');


    // GSAP Timeline for transitioning from race to age butterfly chart
    const transitionToAgeButterflyTL = gsap.timeline({
        scrollTrigger: {
            trigger: "#section9",
            start: "top center",
            end: "center center",
            scrub: 1,
            onEnter: () => {
                highlightRBTL.progress(1).pause(); // Complete the animation, then pause
            },
        }
    });

    transitionToAgeButterflyTL
    .to('.race-butterfly-granted', {
        attr:{
            width: 0
        },
        duration: 3,
        ease: 'power1.inOut'
    })
    .to('.race-butterfly-denied', {
        attr: {
            x: d => butterflyxScaleLeft(0),
            width: 0
        },
        duration: 3,
        ease: 'power1.inOut'
    }, "<")
    .to(".raceButterflyyAxis,.race-butterfly-percentage-granted, .race-butterfly-percentage-denied", {
        visibility: "hidden",
        opacity: 0,
        duration: 1,
        ease: 'power1.inOut'
    }, "<")
    .to('.age-butterfly-granted, .age-butterfly-denied', {
            visibility: "visible",
            duration: 3,
            ease: "power1.inOut"
    }, ">")
    .to('.ageButterflyyAxis',{
        visibility: "visible",
        duration: 1,
        ease: "power1.inOut"
    }, "<")

    const highlightABTL = gsap.timeline({
        scrollTrigger: {
        trigger: "#section10",
        start: "top center",
        end: "center center",
        scrub: 1,
        onEnter: () => {
            transitionToAgeButterflyTL.progress(1).pause(); // Complete the animation, then pause
        },
        }
    });
    
    highlightABTL
    .set('.age-butterfly-granted, .age-butterfly-denied', { pointerEvents: 'none' })
    .to('.age-butterfly-granted.A25_34, .age-butterfly-denied.A25_34, .age-butterfly-granted.A35_44, .age-butterfly-denied.A35_44, .age-butterfly-granted.AOVER55, .age-butterfly-denied.AOVER55', {
        duration: 1,
        opacity: 0.3,
        ease: 'power1.inOut'
    }, '<')
    .to('.age-butterfly-percentage-granted.AUNDER25, .age-butterfly-percentage-denied.AUNDER25, .age-butterfly-percentage-granted.A45_54, .age-butterfly-percentage-denied.A45_54', {
        duration: 1,
        opacity: 1,
        visibility: "visible",
        ease: 'power1.inOut'
    }, '<')
    .to('.ageButterflyyAxis .tick text', {
        duration: 1,
        ease: 'power1.inOut',
        opacity: function() {
            let label = d3.select(this).text();
            return (label === 'UNDER 25' || label === '45-54') ? 1 : 0.3;
        }
    }, '<');

// Timeline for highlighting the OVER55 bar
const highlightABTL2 = gsap.timeline({
    scrollTrigger: {
        trigger: "#section102",
        start: "top center",
        end: "center center",
        scrub: 1,
        onEnter: () => {
            highlightABTL.progress(1).pause(); // Complete and pause the previous animation
        },
    }
});

highlightABTL2
    // Highlight the OVER55 bar and percentages
    .to('.age-butterfly-granted.AOVER55, .age-butterfly-denied.AOVER55', {
        opacity: 1,
        duration: 1,
        ease: 'power1.inOut'
    })
    .to('.age-butterfly-percentage-granted.AOVER55, .age-butterfly-percentage-denied.AOVER55', {
        visibility: "visible",
        duration: 1,
        ease: 'power1.inOut'
    }, '<')

    // Dim and hide other age group bars and percentages
    .to('.age-butterfly-granted:not(.AOVER55), .age-butterfly-denied:not(.AOVER55)', {
        opacity: .3,
        duration: 1,
        ease: 'power1.inOut'
    }, '<')
    .to('.age-butterfly-percentage-granted:not(.AOVER55), .age-butterfly-percentage-denied:not(.AOVER55)', {
        visibility: "hidden",
        duration: 1,
        ease: 'power1.inOut'
    })

    // .to('.butterflyxAxisLeft, .butterflyxAxisRight, .ageButterflyyAxis', {
    //     visibility: "hidden",
    //     duration: 1,
    //     ease: 'power1.inOut',
    //     delay: 5
    // });


    const blankTL = gsap.timeline({
        scrollTrigger: {
        trigger: "#section11",
        start: "top center",
        end: "center center",
        scrub: 1,
        onEnter: () => {
            highlightABTL.progress(1).pause(); // Complete the animation, then pause
        },
        }
    });

    blankTL
    .to('.age-butterfly-granted, .age-butterfly-denied, .ageButterflyyAxis, .butterflyxAxisLeft, .butterflyxAxisRight, .age-butterfly-percentage-granted, .age-butterfly-percentage-denied', {
        visibility: "hidden",
        opacity: 0,
        duration: 1,
        ease: 'power1.inOut'
    }, "<")
    .to('.outcome-circle.GRANTED, .outcome-circle.DENIED', {
        visibility: "visible",
        attr: {
            r: finalRadius
        },
        duration: 2,
        ease: 'power1.Out'
    }, "<")



    


    // const butterflyTimeline2 = gsap.timeline({
    //     scrollTrigger: {
    //     trigger: "#section10",
    //     start: "top center",
    //     end: "center center",
    //     scrub: 1
    //     }
    // });

    // butterflyTimeline2
    // // .to('.but-bar-cat-denied, .but-bar-cat-granted', {
    // //     opacity: 0,
    // //     duration: 1,
    // //     ease: "power1.inOut"
    // // })
    // .to('.but-cat-text-denied, .but-cat-text-granted',{
    //     visibility: "visible",
    //     opacity: .5,
    //     duration: 1,
    //     ease: "power1.inOut"
    // })

    // .to('.but-bar-tot-denied, .but-bar-tot-granted, .but-tot-text-granted, .but-tot-text-denied', {
    //     visibility: "visible",
    //     duration: 1,
    //     ease: "power1.inOut"
    // })



    const kernelDensityTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#section12",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => {
                blankTL.progress(1).pause();
                state.kdeFilter = "prop_sent_served"; 
                updateKDEPlot(state.kdeFilter); 
            },
            onLeaveBack: () => {
                state.kdeFilter = "null"; 
                updateKDEPlot(state.kdeFilter); 
            }
        }
    });

    kernelDensityTimeline
    .to('.outcome-circle.GRANTED, .outcome-circle.DENIED', {
        attr: {
            r: 0
        },
        duration: 1,
        ease: 'power1.Out'
    })
    .to('.legend.DENIED, .legend.GRANTED',{
        visibility: "visible",
        duration: 1,
        ease: 'power1.inOut'
    })
    .to('.outcome-label.DENIED', {
        attr: {
            x: width-120,
            y: (outcomes.indexOf("DENIED") * 20) + 13
        },
        // textAnchor: "end"
    })
    .to('.outcome-label.GRANTED', {
        attr: {
            x: width-120,
            y: (outcomes.indexOf("GRANTED") * 20) + 13
        },
        // textAnchor: "end"
    })
    .to('.age-butterfly-denied', {
        attr:{
            width: 0
        },
        duration: 1,
        ease: 'none'
    }, 0)
    .to('.age-butterfly-granted', {
        attr: {
            x: d => butterflyxScaleLeft(0),
            width: 0
        },
        duration: 1,
        ease: 'none'
    }, "<")
    // .to('.ageButterflyyAxis, .butterflyxAxisLeft, .butterflyxAxisRight, .age-butterfly-percentage-granted, .age-butterfly-percentage-denied', {
    //     visibility: "hidden",
    //     duration: 1,
    //     ease: 'power1.inOut'
    // }, "<")


    // gsap.timeline({
    //     scrollTrigger: {
    //         trigger: "#section13",
    //         start: "top center",
    //         end: "center center",
    //         scrub: true,
    //         onEnter: () => {
    //             state.kdeFilter = "prop_sent_served";
    //             updateKDEPlot(state.kdeFilter); 
    //             // state.kdeNDFilter = "prop_sent_served";
    //             // addNormalDistLine(state.kdeNDFilter);
    //         },
    //         onLeave: () =>{
    //             state.kdeFilter = "prop_sent_served";
    //             updateKDEPlot(state.kdeFilter); 
    //             // state.kdeNDFilter = "prop_sent_served";
    //             // addNormalDistLine(state.kdeNDFilter);
    //         },
    //         onLeaveBack: () => {
    //             // state.kdeNDFilter = "null";
    //             // addNormalDistLine(state.kdeNDFilter);
    //         }
    //     }
    // });

    gsap.timeline({
        scrollTrigger: {
            trigger: "#section15",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => {
                state.btnFilter = "time_serv_at_int";
                updateKDEPlot(state.btnFilter);
                // state.kdeNDFilter = "null";
                // addNormalDistLine(state.kdeNDFilter);
            },
            onLeaveBack: () => {
                state.btnFilter = "prop_sent_served"; 
                updateKDEPlot(state.btnFilter);
                // state.kdeNDFilter = "prop_sent_served";
                // addNormalDistLine(state.kdeNDFilter);
            }
        }
    });

    const kdeToBubblesTL = gsap.timeline({
        scrollTrigger: {
            trigger: "#section16",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => {
                state.btnFilter = "null";
                updateKDEPlot(state.btnFilter);
                // state.kdeNDFilter = "null";
                // addNormalDistLine(state.kdeNDFilter);
            },
            onLeaveBack: () => {
                state.btnFilter = "time_serv_at_int"; 
                updateKDEPlot(state.btnFilter);
                // state.kdeNDFilter = "null";
                // addNormalDistLine(state.kdeNDFilter);
            }
        }
    });

    kdeToBubblesTL
    .to('.outcome-label.DENIED, .outcome-label.GRANTED, .legend.DENIED, .legend.GRANTED', {
        visibility: "hidden",
        duration: 1,
        ease: 'power1.out'
    })

    bubbles.each(function(d, i) {
        let targetRadius = radiusScale(d[1]);
        let targetcx = svgCenterX + spreadRadius * Math.cos(2 * Math.PI * i / interviewTypeProportions.size);
        let targetcy = svgCenterY + spreadRadius * Math.sin(2 * Math.PI * i / interviewTypeProportions.size)
        kdeToBubblesTL.to(this, {
            duration: 3,
            ease: 'power1.Out',
            attr: { 
                r: targetRadius,
                cx: targetcx,
                cy: targetcy
            }
        });
    }, 0);

    kdeToBubblesTL.to(".bubble-label",{
        visibility: "visible",
        duration: 1,
        ease: 'power1.Out'
    });


//     // mergeCirclesTimeline
//     //     .to('.denied-slice, .granted-slice', { opacity: 0, duration: 1 }, 0)
//     //     .to('.denied-circle, .granted-circle', { opacity: 1, duration: 1 }, 0)

//     mergeCirclesTimeline
//     .to('.denied-circle', {
//         duration: 1,
//         attr: { cx: svgCenterX, cy: svgCenterY },

//         ease: 'power1.inOut'
//     })
//     .to('.granted-circle', {
//         duration: 1,
//         attr: { cx: svgCenterX, cy: svgCenterY },
//         ease: 'power1.inOut'
//     }, '<')
//     .to(".denied-circle, .granted-circle, .circle-label", { 
//         duration: 0.5,
//         r: 0,
//         opacity: 0
//     }, '+=0.5')



    const moveBubblesTL = gsap.timeline({
        scrollTrigger: {
            trigger: "#section17",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => {
                kdeToBubblesTL.progress(1).pause(); // Complete the animation, then pause
            },
        }
    });

    bubbles.each(function(d) {

        let targetX, targetY, radius;
    
        if (d[0] === 'REAPPEAR') {
            targetX = rightCenterX;
            targetY = svgCenterY;
            radius = finalRadius;
        } 
        else if (d[0]=== 'INITIAL'){
            targetX = leftCenterX;
            targetY = svgCenterY;
            radius = finalRadius;
        }
        else {
            targetX = Math.random() * width;
            targetY = Math.random() * height;
            radius = 0;
        }
    
        moveBubblesTL.to(this, {
            duration: 3,
            ease: 'power1.inOut',
            attr: { cx: targetX, cy: targetY, r: radius}
        }, "<");
    });

    moveBubblesTL
    .to(".bubble-label.REAPPEAR, .bubble-label.INITIAL", {
        visibility: "visible",
        duration: 1,
        ease: 'power1.inOut'
    })

// Animate labels for 'REAPPEAR' and 'INITIAL'
    svg.selectAll(".bubble-label.REAPPEAR")
        .each(function(d) {
            moveBubblesTL.to(this, {
                duration: 3,
                ease: 'power1.inOut',
                attr:{
                    x: rightCenterX,
                    y: svgCenterY + 150
                }
            }, "<");
        });

        svg.selectAll(".bubble-label.INITIAL")
        .each(function(d) {
            moveBubblesTL.to(this, {
                duration: 3,
                ease: 'power1.inOut',
                attr:{
                    x: leftCenterX,
                    y: svgCenterY + 150
                }
            }, "<");
        });

    // Hide other labels
    svg.selectAll(".bubble-label:not(.REAPPEAR):not(.INITIAL)")
        .each(function() {
            moveBubblesTL.to(this, {
                duration: 3,
                ease: 'power1.inOut',
                opacity: 0
            }, "<");
        });

    const interviewPieTL = gsap.timeline({
        scrollTrigger: {
        trigger: "#section18",
        start: "top center",
        end: "center center",
        scrub: 1,
        onEnter: () => {
            moveBubblesTL.progress(1).pause(); // Complete the animation, then pause
        },
        }
    });

    interviewPieTL
    .to('.bubble',{
        visibility: "hidden",
        duration: 2,
        ease: 'power1.out'
        }, ">")
    .to('.init-slice, .reap-slice', {
        visibility: "visible",
        duration: 2,
        ease: 'power1.in'
    }, '<');

    const highlightIntPieTL1 = gsap.timeline({
        scrollTrigger: {
            trigger: "#section19",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => {
                interviewPieTL.progress(1).pause(); // Complete the animation, then pause
            },
        }
    });

    highlightIntPieTL1
    .set('.init-slice, .reap-slice', { pointerEvents: 'none' })

    .to('.init-slice.GRANTED, .reap-slice.GRANTED',{
        visibility: "visible",
        opacity: 1,
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.init-slice:not(.GRANTED), .reap-slice:not(.GRANTED)', {
        visibility: "visible",
        opacity: 0.3,
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.pie-text-init.GRANTED, .pie-text-reap.GRANTED', {
        visibility: "visible",
        duration: 1,
        ease: 'power1.inOut'
    }, 0);

    const highlightIntPieTL2 = gsap.timeline({
        scrollTrigger: {
            trigger: "#section20",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => {
                highlightIntPieTL1.progress(1).pause(); // Complete the animation, then pause
            },
        }
    });

    highlightIntPieTL2
    .set('.init-slice, .reap-slice', { pointerEvents: 'none' })
    .to('.init-slice.DENIED, .reap-slice.DENIED', {
        visibility: "visible",
        opacity: 1,
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.init-slice:not(.DENIED), .reap-slice:not(.DENIED)', {
        visibility: "visible",
        opacity: 0.3,
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.pie-text-init.DENIED, .pie-text-reap.DENIED', {
        visibility: "visible",
        duration: 1,
        ease: 'power1.inOut'
    }, 0)
    .to('.pie-text-init.GRANTED, .pie-text-reap.GRANTED', {
        visibility: "visible",
        opacity: .2,
        duration: 1,
        ease: 'power1.inOut'
    }, 0);

    const justOnePieTL = gsap.timeline({
        scrollTrigger: {
            trigger: "#section21",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => {
                highlightIntPieTL2.progress(1).pause(); // Complete the animation, then pause
            },
            
        }
    });

    justOnePieTL
    .set(' .reap-slice.DENIED', { pointerEvents: "auto" })
    .to('.init-slice, .pie-text-init, .pie-text-reap.GRANTED, .bubble-label.INITIAL', {
        visibility: "hidden",
        opacity: 0,
        duration: 1,
        ease: "power1.inOut"
    })
    .to('.reap-slice.DENIED',{
        attr: { transform: `translate(${svgCenterX}, ${svgCenterY})` },
        duration: 2
    })
    .to('.reap-slice:not(.DENIED), .pie-text-reap.DENIED, .bubble-label.REAPPEAR',{
        visibility: "hidden",
        opacity: 0,
        duration: 1,
        ease: "power1.inOut"
    }, "<")

    const pieToBarsTL = gsap.timeline({
        scrollTrigger: {
            trigger: "#section22",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => { 
                justOnePieTL.progress(1).pause(),
                state.btnFilter = "ageGroup";
                updateBarChart(state.btnFilter, false);
            },
            // onLeave: () => {
            //     state.btnFilter = "null"; 
            //     updateBarChart(state.btnFilter, false);
            // },
            onEnterBack: () => { 
                state.btnFilter = "ageGroup";
                updateBarChart(state.btnFilter, false);
            },
            onLeaveBack: () => {
                state.btnFilter = "ageGroup"; 
                updateBarChart(state.btnFilter), false;
            }
        }
    });

    pieToBarsTL
    .to('.reap-slice.DENIED',{
        visibility: "hidden",
        opacity: 0,
        duration: 1,
        ease: "power1.inOut",
        onEnter: () => {
            pieToBarsTL.progress(1).pause(); // Complete the animation, then pause
        },
    })

    const barsChangeTL = gsap.timeline({
        scrollTrigger: {
            trigger: "#section23",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => { 
                pieToBarsTL.progress(1).pause(),
                state.btnFilter = "ageGroup";
                updateBarChart(state.btnFilter, true);
            },
            // onLeave: () => {
            //     state.btnFilter = "null"; 
            //     updateBarChart(state.btnFilter);
            // },
            onEnterBack: () => { 
                state.btnFilter = "ageGroup";
                updateBarChart(state.btnFilter, true);
            },
            // onLeaveBack: () => {
            //     state.btnFilter = "null"; 
            //     updateBarChart(state.btnFilter);
            // }
        }
    });
    barsChangeTL
    .to('.legend.DENIED, .legend.GRANTED, .outcome-label.DENIED, .outcome-label.GRANTED',{
        visibility: "visible",
        duration: 1,
        ease: 'power1.inOut'
    })

    const barsFadeBlack = gsap.timeline({
        scrollTrigger: {
            trigger: "#section24",
            start: "top center",
            end: "center center",
            scrub: true,
            onEnter: () => {
                state.btnFilter = "ageGroup";
                updateBarChart(state.btnFilter, true);
                barsFadeBlack.to('.bar.denied, .bar.granted', {
                    fill: "black",
                    duration: 3,
                    ease: "power1.inOut"
                })
                .to('.x-axis, .legend.DENIED, .legend.GRANTED, .outcome-label.DENIED, .outcome-label.GRANTED',{
                    opacity: 0,
                    duration: 3,
                    ease: "power1.inOut"
                })
            },
        }
    });

};