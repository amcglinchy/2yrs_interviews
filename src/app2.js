import * as d3 from "d3";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

/* CONSTANTS AND GLOBALS*/
const width = window.innerWidth * 0.7,
    height = window.innerHeight * 0.8,
    m = { top: 20, bottom: 80, left: 20, right: 20 };
let svg, xScale, yScale, rect1, rect2, rect3, racexScale, raceyScale, races, deniedCircle, grantedCircle;
let tl1, racexAxis, axisGroup, interviewTypeData, deniedTotal, grantedTotal, butterflyAxis;
let leftCenterX, rightCenterX, typeCircles, typeColorScale, decColorScale, butterflyxScaleLeft, butterflyxScaleRight, tooltip;
let butterflyxAxisLeft, butterflyxAxisRight, bubbles, raceColorScale, raceButterflyyScale;
let over55, under55;
const circleRadius = 50;
const initialCircleRadius = 0;
const finalRadius = 120;
const circleVerticalCenter = height / 2;
const raceColors = ['#2292A4', '#D96C06', '#FADF63', '#A67DB8', '#E0607E', "#D0AE8E"];
const barColors = [ "#BCD979", "#B15E6C","#3A5683", "#93BEDF", "#35A66D"];
const bubbleColors = ['#009FFD', '#386641', '#6A994E', '#CB904D', '#BC4749'];
const ageColors = ["#87BBA2", "#72195A", "#CBBAED", "#E9DF00", "#F78764"]
const svgCenterX = width / 2;
const svgCenterY = height / 2 -m.top;

let interviewTypeProportions, radiusScale, intxScale, intyScale;

let maxBubbleRadius = 120;
const spreadRadius = Math.min(width, height) / 3;

const labelMapping = {
    "AMERIND_ALSK": "AMERICAN INDIAN / ALASKAN",
    "ASIAN_PACIFIC": "ASIAN / PACIFIC ISLANDER",
    "UNKNOWN_OTHER": "UNKNOWN / OTHER",
    "UNDER25": "UNDER 25",
    '25_34': "25-34",
    '35_44': "35-44",
    '45_54': '45-54',
    'OVER55': "OVER 55",
};


//FUNCTIONS
function arePieChartsInteractive() {
    return window.scrollY >= document.querySelector("#section4").offsetTop;
}

let mouseOver = (event) => {
    tooltip.style("display", "block")
};

let mouseOut = (event) => {
    tooltip.style("display", "none")
};

function calculatePercent(value, total) {
    return (value / total * 100).toFixed(1);
}

function wrap(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
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


/* APPLICATION STATE */
let state = {
    interviews: [],
    raceData: [],
    individuals: [],
    moreThanOnce: [],
    outcomeData: [],
    intTypeData: [],
    raceDataInterviews: [],
    ageData: []
};

/* LOAD DATA */
import("../data/all_interviews_capstone_final.json").then(raw_data => {
    // console.log("data", raw_data);
    state.interviews = raw_data;
    init();
});

/* INITIALIZING FUNCTION */
function init() {

    // CREATE STATE ARRAYS FOR INDIVIDUALS &  MORE THAN ONCE
    const idMap = new Map();
    const moreThanOnce = [];

    leftCenterX = svgCenterX - width / 6;
    rightCenterX = svgCenterX + width / 6;

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

    state.interviews.forEach(d => {
        if (d.interview_decision === "**********") {
            d.interview_decision = "OTHER";
        }
    });

    state.interviews.forEach(d => {
        if (d.parole_board_interview_type === "MERIT TIME" || d.parole_board_interview_type === "INITIAL" || d.parole_board_interview_type === "PIE" || d.parole_board_interview_type === "MEDICAL"|| d.parole_board_interview_type === "ECPDO" || d.parole_board_interview_type === "SUPP MERIT") {
            d.parole_board_interview_type = "INITIAL";
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
    

    deniedTotal = state.interviews.filter(d => d.interview_decision === "DENIED").length;
    grantedTotal = state.interviews.filter(d=> d.interview_decision === "GRANTED").length;
    blackTotal = state.interviews.filter(d=> d.race__ethnicity === "BLACK").length;
    whiteTotal = state.interviews.filter(d=> d.race__ethnicity === "WHITE").length;
    reappearTotal = state.interviews.filter(d=> d.parole_board_interview_type === "REAPPEAR").length;
    initialTotal = state.interviews.filter(d=> d.parole_board_interview_type === "INITIAL").length;


    state.raceData = d3.group(state.individuals, d => d.race__ethnicity);
    state.raceDataInterviews = d3.group(state.interviews, d => d.race__ethnicity);
    state.intTypeData = d3.group(state.interviews, d => d.parole_board_interview_type);
    state.outcomeData = d3.group(state.interviews, d=>d.interview_decision);
    state.ageData = d3.group(state.interviews, d=>d.ageGroup);
    outcomes = Array.from(state.outcomeData.keys());
    races = Array.from(state.raceData.keys());
    intTypes = Array.from(state.intTypeData.keys());
    ageGroups = Array.from(state.ageData.keys());
    over55 = state.interviews.filter(d=> d.age >= 55);
    under55 = state.interviews.filter(d=>d.age < 55);
    interviewTotals = state.interviews.length;

    console.log(state.ageData)


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
        d.finalX = Math.random() * width;  // Random X coordinate
        d.finalY = Math.random() * height; // Random Y coordinate
    });
    
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
        .attr("stroke", "none")
        .attr("stroke-width", 0)
        // .on("mouseover", function(event, d) {
        //     if (d3.select(this).classed("animation-complete")) {
        //         tooltip.style("display", "block")
        //     }
        // })
        .on("mouseover", mouseOver)
        .on("mousemove",function(event, d) {
            // if (d3.select(this).classed("animation-complete")) {
                let count = d[0][1] - d[0][0];
                let formattedCount = count.toLocaleString(); // Format the count with commas
                let percentage = (count / state.interviews.length) * 100; // Calculate the percentage
                let tooltipContent = `<b>${formattedCount} (${percentage.toFixed(1)}%)</b> interviews 
                were given a <br>decision of <b>${d.key}</b>`;
                
            tooltip
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
    //                .style("left", (event.pageX + 10) + "px") // Adjust based on page coordinates
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
    axisGroup = svg.append("g")
    .attr("class", "outcomeBarsAxis")
    .attr("visibility", "hidden")
    .call(outcomexAxis)
    .selectAll(".tick text")
    .attr("transform", d => `translate(${(outcomexScale.bandwidth()/2)-20}, 0) rotate(-65)`)
    .style("text-anchor", "end")
    .style("font-size", "14px")
    .attr("dx", "-.8em")
    .attr("dy", ".15em");

    // WHOLE CIRCLES 
    deniedCircle = svg.append("circle")
    .attr("cx", outcomexScale('DENIED') + outcomexScale.bandwidth() / 2)
    .attr("cy", circleVerticalCenter)
    .attr("r", initialCircleRadius)
    .attr("fill","#B15E6C") 
    .attr("visibility", "hidden")
    .classed("denied-circle", true);

    grantedCircle = svg.append("circle")
    .attr("cx", outcomexScale('GRANTED') + outcomexScale.bandwidth() / 2)
    .attr("cy", circleVerticalCenter)
    .attr("r", initialCircleRadius)
    .attr("fill", "#BCD979")
    .attr("visibility", "hidden")
    .classed("granted-circle", true);

    deniedLabel = svg.append("text")
    .text("DENIED")
    .attr("x", rightCenterX)
    .attr("y", svgCenterY + finalRadius + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .attr("visibility", "hidden")
    .classed("circle-label", true);

    grantedLabel = svg.append("text")
    .text("GRANTED")
    .attr("x", leftCenterX)
    .attr("y", svgCenterY + finalRadius + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .attr("visibility", "hidden")
    .classed("circle-label", true);


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
    .attr('transform', `translate(${rightCenterX}, ${svgCenterY})`)
    .attr("visibility", "hidden")
    .on("mouseover", mouseOver)
    .on("mousemove", function(event, d) {
        let percent = calculatePercent(d.data.value, deniedTotal);
        const readableCategory = labelMapping[d.data.race] || d.data.race; 
        let tooltipContent = `<b>${percent}%</b> of the interviews <br> denied parole were <b>${readableCategory}</b>`;
        tooltip
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
    .attr('transform', `translate(${leftCenterX}, ${svgCenterY})`)
    .attr("visibility", "hidden")
    .on("mouseover", mouseOver)
    .on("mousemove", function(event, d) {
        let percent = calculatePercent(d.data.value, grantedTotal);
        const readableCategory = labelMapping[d.data.race] || d.data.race; 
        let tooltipContent = `<b>${percent}%</b> of the interviews <br> granted parole were <b>${readableCategory}</b>`;
        tooltip
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
        return `translate(${x + rightCenterX}, ${y + svgCenterY})`;
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
        return `translate(${x + leftCenterX}, ${y + svgCenterY})`; // Adjust position based on the pie's transform
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .text(d => calculatePercent(d.data.value, grantedTotal) + '%')
    .attr('visibility', "hidden");


//AGE PIE CHART
    ageDeniedPieData.sort((a, b) => a.value - b.value);
    ageGrantedPieData.sort((a, b) => a.value - b.value);

    const ageArc = d3.arc()
    .innerRadius(0)
    .outerRadius(finalRadius);

    const ageDeniedPie = d3.pie()
    .value(d => d.value)
    .sort(null)
    (ageDeniedPieData);

    const ageGrantedPie = d3.pie()
    .value(d => d.value)
    .sort(null)
    (ageGrantedPieData);


    // Add slices for the DENIED pie chart
    svg.selectAll('.age-denied-slice')
    .data(ageDeniedPie)
    .enter()
    .append('path')
    .attr('class', d => `age-denied-slice ${d.data.ageGroup}`)
    .attr('d', arc)
    .attr('fill', d => ageColorScale(d.data.ageGroup))
    .attr('transform', `translate(${rightCenterX}, ${svgCenterY})`)
    .attr("visibility", "hidden")
    .on("mouseover", mouseOver)
    .on("mousemove", function(event, d) {
        const readableCategory = labelMapping[d.data.ageGroup] || d.data.ageGroup; 
        let percent = calculatePercent(d.data.value, deniedTotal);
        let tooltipContent = `<b>${percent}%</b> of the interviews <br> denied parole were <b>${readableCategory}</b>`;
        tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(tooltipContent);
    })
    .on("mouseout", mouseOut);

    svg.selectAll('.age-granted-slice')
    .data(ageGrantedPie)
    .enter()
    .append('path')
    .attr('class', d => `age-granted-slice ${d.data.ageGroup}`)
    .attr('d', arc)
    .attr('fill', d => ageColorScale(d.data.ageGroup))
    .attr('transform', `translate(${leftCenterX}, ${svgCenterY})`)
    .attr("visibility", "hidden")
    .on("mouseover", mouseOver)
    .on("mousemove", function(event, d) {
        const readableCategory = labelMapping[d.data.ageGroup] || d.data.ageGroup; 
        let percent = calculatePercent(d.data.value, grantedTotal);
        let tooltipContent = `<b>${percent}%</b> of the interviews <br> granted parole were <b>${readableCategory}</b>`;
        tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(tooltipContent);
    })
    .on("mouseout", mouseOut);


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
        let tooltipContent = `<b>${percent}%</b> of initial interviews <br> were <b>${d.data.outcome}</b> parole`;
        tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(tooltipContent);
    })
    .on("mouseout", mouseOut)


    // Add slices for the reappearance pie chart
    svg.selectAll('.reappear-slice')
    .data(reapPie)
    .enter()
    .append('path')
    .attr('class', d => `reappear-slice ${d.data.intType}`)
    .attr('d', arc)
    .attr('fill', d => decColorScale(d.data.outcome))
    .attr('transform', `translate(${rightCenterX}, ${svgCenterY})`)
    .attr("visibility", "hidden")
    .on("mouseover", mouseOver)
    .on("mousemove", function(event, d) {
        let percent = calculatePercent(d.data.value, reappearTotal);
        let tooltipContent = `<b>${percent}%</b> of reappearance interviews <br> were <b>${d.data.outcome}</b> parole`;
        tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(tooltipContent);
    })
    .on("mouseout", mouseOut);

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
    let combinedData = [...combinedRaceData, ...combinedAgeData, ...combinedInterviewTypeData];
    let requiredCategories = ["BLACK", "WHITE", "REAPPEAR", "INITIAL", "over55", "under55"];
    let filteredData = combinedData.filter(d => requiredCategories.includes(d.category));

    combinedRaceData.sort((a, b) => b.percentOfCategoryDenied - a.percentOfCategoryDenied);
    combinedAgeData.sort((a, b) => b.percentOfCategoryDenied - a.percentOfCategoryDenied);


    // SCALES AND AXES FOR ALL BUTTERFLY CHARTS

    butterflyxScaleLeft = d3.scaleLinear()
    .domain([0, 50])
    .range([width / 2, m.left]);

    butterflyxScaleRight = d3.scaleLinear()
    .domain([0, 50])
    .range([width / 2, width - m.right]);

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
        .domain(combinedRaceData.map(d => d.category)) // Extract category names
        .range([m.top, height - m.bottom])
        .padding(0.1);
        

    combinedRaceData.forEach(d => {
        svg.append("rect")
            .attr('class', `race-butterfly-granted ${d.category}`)
            .attr("x", butterflyxScaleLeft(d.percentOfCategoryGranted))
            .attr("y", raceButterflyyScale(d.category))
            .attr("width", width / 2 - butterflyxScaleLeft(d.percentOfCategoryGranted))
            .attr("height", raceButterflyyScale.bandwidth())
            // .attr("fill", d => raceColorScale(d.category))
            .attr("fill", "#BCD979")
            .attr("visibility", "hidden")
            .on("mouseover", mouseOver)
            .on("mousemove", function(event) {
                const readableCategory = labelMapping[d.category] || d.category; 
                tooltip
                    .html(`<b>${readableCategory}</b> <br> identifying people were <br>
                        <b>GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% </b> and
                        <br> DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", mouseOut);

        svg.append("rect")
            .attr('class', `race-butterfly-denied ${d.category}`)
            .attr("x", width / 2)
            .attr("y", raceButterflyyScale(d.category))
            .attr("width", butterflyxScaleRight(d.percentOfCategoryDenied) - width / 2) 
            .attr("height", raceButterflyyScale.bandwidth())
            // .attr("fill", d => raceColorScale(d.category))
            .attr("fill", "#B15E6C")
            .attr("visibility", "hidden")
            .on("mouseover", mouseOver)
            .on("mousemove", function(event) {
                const readableCategory = labelMapping[d.category] || d.category; 
                tooltip
                .html(`<b>${readableCategory}</b> <br> identifying people were <br>
                    GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% and
                    <br> <b>DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%</b>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", mouseOut);
    });

    raceButterflyyAxis = svg.append("g")
        // .attr("transform", `translate(${width / 2}, 0)`)
        .attr("transform", `translate(${m.left}, 0)`)
        .attr("class", "raceButterflyyAxis")
        .attr("visibility", "hidden")
        .call(d3.axisLeft(raceButterflyyScale).tickSize(0))
        .selectAll(".tick text")
        .text(d => labelMapping[d] || d)
        .style("font-size", "12px")
        .attr("text-anchor", "start");

    raceButterflyyAxis.each(function() {
            wrap(d3.select(this), 150); // Adjust the second argument for the desired width
        });

    //TEXT ELEMENT FOR HIGHLIGHTING
    combinedRaceData.forEach(d => {
        if (d.category === 'BLACK' || d.category === 'WHITE') {
            // Add text for granted percentage
            svg.append("text")
                .attr('class', `race-butterfly-percentage-granted ${d.category}`)
                .attr("x", (butterflyxScaleLeft(0) + butterflyxScaleLeft(d.percentOfCategoryGranted)) / 2)
                .attr("y", raceButterflyyScale(d.category) + raceButterflyyScale.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .text(`${d.percentOfCategoryGranted.toFixed(1)}%`)
                .attr("fill", "black")
                .attr("visibility", "hidden");
    
            // Add text for denied percentage
            svg.append("text")
                .attr('class', `race-butterfly-percentage-denied ${d.category}`)
                .attr("x", (width / 2 + butterflyxScaleRight(d.percentOfCategoryDenied)) / 2)
                .attr("y", raceButterflyyScale(d.category) + raceButterflyyScale.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .text(`${d.percentOfCategoryDenied.toFixed(1)}%`)
                .attr("fill", "black")
                .attr("visibility", "hidden");
        }
    });
    


// AGE BUTTERFLY CHART

    ageButterflyyScale = d3.scaleBand()
        .domain(combinedAgeData.map(d => d.category)) // Extract category names
        .range([m.top, height - m.bottom])
        .padding(0.1);

    combinedAgeData.forEach(d => {
        svg.append("rect")
            .attr('class', `age-butterfly-granted A${d.category}`)
            .attr("x", butterflyxScaleLeft(d.percentOfCategoryGranted))
            .attr("y", ageButterflyyScale(d.category))
            .attr("width", width / 2 - butterflyxScaleLeft(d.percentOfCategoryGranted))
            .attr("height", ageButterflyyScale.bandwidth())
            .attr("fill", "#BCD979")
            .attr("visibility", "hidden")
            .on("mouseover", mouseOver)
            .on("mousemove", function(event) {
                const readableCategory = labelMapping[d.category] || d.category; 
                tooltip
                    .html(`People aged <b>${readableCategory}</b> <br> were <br>
                        <b>GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% </b> and
                        <br> DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", mouseOut);

        svg.append("rect")
            .attr('class', `age-butterfly-denied A${d.category}`)
            .attr("x", width / 2)
            .attr("y", ageButterflyyScale(d.category))
            .attr("width", butterflyxScaleRight(d.percentOfCategoryDenied) - width / 2) 
            .attr("height", ageButterflyyScale.bandwidth())
            // .attr("fill", d => raceColorScale(d.category))
            .attr("fill", "#B15E6C")
            .attr("visibility", "hidden")
            .on("mouseover", mouseOver)
            .on("mousemove", function(event) {
                const readableCategory = labelMapping[d.category] || d.category; 
                tooltip
                .html(`People aged <b>${readableCategory}</b> <br> were <br>
                    GRANTED parole ${d.percentOfCategoryGranted.toFixed(1)}% and
                    <br> <b>DENIED parole ${d.percentOfCategoryDenied.toFixed(1)}%</b>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", mouseOut);
    });


    // Adding Y-axis in the middle
    ageButterflyyAxis = svg.append("g")
        // .attr("transform", `translate(${width / 2}, 0)`)
        .attr("transform", `translate(${m.left}, 0)`)
        .attr("class", "ageButterflyyAxis")
        .attr("visibility", "hidden")
        .call(d3.axisLeft(ageButterflyyScale).tickSize(0))
        .selectAll(".tick text")
        .text(d => labelMapping[d] || d)
        .style("font-size", "12px")
        .attr("text-anchor", "start");


    //TEXT ELEMENT FOR HIGHLIGHTING
    combinedAgeData.forEach(d => {
        if (d.category === 'OVER55' || d.category === '45_54') {
            svg.append("text")
                .attr('class', `age-butterfly-percentage-granted A${d.category}`)
                .attr("x", (butterflyxScaleLeft(0) + butterflyxScaleLeft(d.percentOfCategoryGranted)) / 2)
                .attr("y", ageButterflyyScale(d.category) + ageButterflyyScale.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .text(`${d.percentOfCategoryGranted.toFixed(1)}%`)
                .attr("fill", "black")
                .attr("visibility", "hidden");
    
            // Add text for denied percentage
            svg.append("text")
                .attr('class', `age-butterfly-percentage-denied A${d.category}`)
                .attr("x", (width / 2 + butterflyxScaleRight(d.percentOfCategoryDenied)) / 2)
                .attr("y", ageButterflyyScale(d.category) + ageButterflyyScale.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .text(`${d.percentOfCategoryDenied.toFixed(1)}%`)
                .attr("fill", "black")
                .attr("visibility", "hidden");
        }
    });
        

// INTERVIEW BUBBLE CHART
    interviewTypeProportions = new Map();

    state.intTypeData.forEach((entries, intType) => {
        let proportion = entries.length / interviewTotals;
        interviewTypeProportions.set(intType, proportion);
    });

    radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(interviewTypeProportions.values())])
    .range([0, maxBubbleRadius]); // maxBubbleRadius depends on your SVG size

    intxScale = d3.scaleBand()
    .domain([...interviewTypeProportions.keys()])
    .range([0, width]);

    intyScale = d3.scaleLinear()
    // You can use a constant or some function of the data for y positions
    .domain([0, 1])
    .range([height, 0]);

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
        .attr("data-target-radius", d => radiusScale(d[1])); // Set target radius as a data attribute


    svg.selectAll(".bubble-label")
    .data([...interviewTypeProportions.entries()])
    .enter().append("text")
    .attr("x", (d, i) => {
        let radius = radiusScale(d[1]);
        return svgCenterX + (radius + 100) * Math.cos(2 * Math.PI * i / interviewTypeProportions.size);
    })
    .attr("y", (d, i) => {
        let radius = radiusScale(d[1]);
        return svgCenterY + (radius + 100) * Math.sin(2 * Math.PI * i / interviewTypeProportions.size);
    })
    .attr("class", d => `bubble-label ${d[0]}`)
    .text(d => d[0]) // The interview type
    .attr("text-anchor", "middle")
    .attr("visibility", "hidden");



    draw();
}

function draw() {

    ScrollTrigger.defaults({scroller: ".content-container" });
    ScrollTrigger.defaults({toggleActions: 'play none none reverse'})

    // document.querySelectorAll('section').forEach(section => {
    //     gsap.timeline({
    //         scrollTrigger: {
    //             trigger: section,
    //             start: "top 80%",
    //             end: "bottom 20%",
    //             scrub: true,
    //             toggleActions: "play none none reverse"
    //         }
    //     })
    //     .fromTo(section, {opacity: 0}, {opacity: 1, ease: "none"})
    //     .to(section, {opacity: 0, ease: "none"});
    // });

    // CREATE FIRST GSAP TIMELINE FOR SCROLL EFFECTS

    // tl1 = gsap.timeline({
    //     scrollTrigger: {
    //         trigger: "#section1",
    //         start: "top center",
    //         end: "center center",
    //     },
    // });

    tl1 = gsap.timeline({
        scrollTrigger: {
            trigger: "#section1",
            start: "top center", // Adjust as needed
            end: "center center", // Adjust to control the scroll length
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
        }, `+=${i * 0.02}`);
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

    // Add animations for bar2 and section1_1 p
    tl1
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


    // Add animations for bar3 and section1_2 p
    tl1
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
            scrub: 1
        }
    });

    tlFlyOut
    .to(".bar2, .count-text, .bar2text, .bar3, .bar3text", {
        y: -200, 
        visibility: "hidden", 
        duration: 0.5, 
        stagger: 0.1
    })

    gsap.set(".outcomeBarsAxis", { x: "-100%" });

    const verticalBarTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#section2",
            start: "top center",
            end: "center center",
            scrub: 1
        },
    });

    // Add animations to the timeline
    outcomes.forEach((outcome, i) => {
        verticalBarTimeline
        .set(`.bar1-${outcome}`, { pointerEvents: 'auto' })
        .to(`.bar1-${outcome}`, {
            height: height - m.bottom - outcomeyScale(state.outcomeData.get(outcome).length),
            y: outcomeyScale(state.outcomeData.get(outcome).length) - m.bottom,
            attr: {x: outcomexScale(outcome)+outcomexScale.bandwidth()/2},
            width: outcomexScale.bandwidth()/2,
            fill: barColors[i % barColors.length],
            duration: 2,
            ease: "power1.inOut",
        }, "<");
    });

    const axisYPosition = d3.max(outcomes, outcome => outcomeyScale(state.outcomeData.get(outcome).length));
    verticalBarTimeline.to(".outcomeBarsAxis", {
        attr: { transform: `translate(0, ${axisYPosition})` },
        visibility: "visible", 
        duration: 2,
        ease: "power1.inOut",
    }, "<");

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
            scrub: 1
        }
    });

    // moveBarsTimeline.to(".bar-count", {
    //     visibility: "hidden",
    //     ease: "none"
    // });
    
    moveBarsTimeline.to('.bar1-OTHER, .bar1-POSTPONED', {
        y: "-=300",
        visibility: "hidden",
        duration: 3,
        ease: 'power1.inOut'
    }, "<");

    moveBarsTimeline.to('.outcomeBarsAxis', {
        visibility: "hidden",
        duration: 3,
        ease: 'power1.inOut'
    }, "<");

    //turn bars into ovals
    moveBarsTimeline.to('.bar1-GRANTED, .bar1-DENIED', {
        duration: 3,
        rx: "50%",
        ry: "50%",
        ease: 'power1.inOut'
    }, ">");

    moveBarsTimeline.to('.denied-circle, .granted-circle', {
        visibility: "visible",
        duration: 3,
        attr: { r: circleRadius },
        ease: 'power1.inOut'
    }, ">");
    
    moveBarsTimeline.to('.denied-circle', {
        duration: 3,
        attr: { 
            cx: rightCenterX,
            cy: svgCenterY, 
            r: finalRadius 
        },
        ease: 'power1.inOut'
    }, "<");
    
    moveBarsTimeline.to('.granted-circle', {
        duration: 3,
        attr: { 
            cx: leftCenterX,
            cy: svgCenterY, 
            r: finalRadius 
        },
        ease: 'power1.inOut'
    }, '<');

    moveBarsTimeline.to('.bar1-DENIED, .bar1-GRANTED', {
        duration: 3,
        y: circleVerticalCenter, 
        height: 0, 
        visibility: "hidden",
        ease: 'power1.inOut'
    }, "<");

    moveBarsTimeline.to('.circle-label', {
        visibility: "visible",
        delay: 1,
        duration: 2,
        ease: 'power1.inOut'
    }, ">");
    
    // new timeline for making circles into pie graphs
    const racePieTL = gsap.timeline({
        scrollTrigger: {
            trigger: "#section4",
            start: "top center",
            end: "center center",
            scrub: 1
        }
    });
    
    // Fade out the denied and granted whole circles
    racePieTL
    .to('.denied-circle, .granted-circle', {
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
            scrub: 1
        }
    });

    // highlightPieSectionTimeline
    // .add(() => {
    //     d3.selectAll('.denied-slice, .granted-slice').classed('no-tooltip', true);
    // }, 0)

    highlightPieSectionTimeline
    .set('.denied-slice, .granted-slice', { pointerEvents: 'none' })
    .to('.denied-slice.WHITE, .granted-slice.WHITE', {
        visibility: "visible",
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.denied-slice:not(.WHITE), .granted-slice:not(.WHITE)', {
        visibility: "visible",
        opacity: 0.3, // Dim other slices
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
        scrub: 1
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
        opacity: 0.3, // Dim other slices
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

    const raceButterflyTL = gsap.timeline({
        scrollTrigger: {
        trigger: "#section7",
        start: "top top",
        end: "center center",
        scrub: 1
        }
    });

    raceButterflyTL
   .to('.denied-slice, .granted-slice, .pie-text-denied.BLACK, .pie-text-granted.BLACK, .pie-text-granted.WHITE, .pie-text-denied.WHITE', {
        visibility: "hidden",
        duration: 2,
        ease: 'power1.In'
    })
    .to('.denied-circle, .granted-circle', {
        visibility: "visible",
        duration: 2,
        ease: 'power1.Out'
    }, "<")
    .to(".denied-circle, .granted-circle", { 
        duration: 2,
        attr: {
            r: 0
        },
    }, ">")
    .to(".circle-label", {
        attr: {
            y: height - 50
        }
    }, "<")
    .to('.race-butterfly-granted, .race-butterfly-denied, .raceButterflyyAxis', {
        visibility: "visible",
        duration: 2,
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
        scrub: 1
        }
    });
    
    highlightRBTL
    .set('.race-butterfly-granted, .race-butterfly-denied', { pointerEvents: 'none' }) // Disable tooltip at the start
    .to('.race-butterfly-granted.BLACK, .butterfly-denied.BLACK, .butterfly-granted.WHITE, .butterfly-denied.WHITE', {
        duration: 1,
        opacity: 1,
        ease: 'power1.inOut'
    })
    .to('.race-butterfly-granted.HISPANIC, .race-butterfly-granted.AMERIND_ALSK, .race-butterfly-granted.ASIAN_PACIFIC, .race-butterfly-granted.UNKNOWN_OTHER, .race-butterfly-denied.HISPANIC, .race-butterfly-denied.AMERIND_ALSK, .race-butterfly-denied.ASIAN_PACIFIC, .race-butterfly-denied.UNKNOWN_OTHER', {
        duration: 1,
        opacity: 0.3, // Fade out other bars
        ease: 'power1.inOut'
    }, '<')
    .to('.race-butterfly-percentage-granted.BLACK, .race-butterfly-percentage-denied.BLACK, .race-butterfly-percentage-granted.WHITE, .race-butterfly-percentage-denied.WHITE', {
        duration: 1,
        opacity: 1,
        visibility: "visible",
        ease: 'power1.inOut'
    }, '<') // Adjust timing as needed
    .to('.raceButterflyyAxis .tick text', {
        duration: 1,
        ease: 'power1.inOut',
        opacity: function() {
            let label = d3.select(this).text();
            return (label === 'BLACK' || label === 'WHITE') ? 1 : 0.3;
        }
    }, '<');

   
    const agePieTL = gsap.timeline({
        scrollTrigger: {
        trigger: "#section9",
        start: "top center",
        end: "center center",
        scrub: 1
        }
    });

    agePieTL
    .to('.race-butterfly-granted, .race-butterfly-denied, .raceButterflyyAxis, .butterflyxAxisLeft, .butterflyxAxisRight, .race-butterfly-percentage-granted.BLACK, .race-butterfly-percentage-denied.BLACK, .race-butterfly-percentage-granted.WHITE, .race-butterfly-percentage-denied.WHITE', {
        visibility: "hidden",
        duration: 1,
        ease: "power1.inOut"
    })
    .to('.denied-circle, .granted-circle', {
        visibility: "visible",
        duration: 2,
        attr: {
            r: finalRadius
        },
        ease: 'power1.Out'
        }, ">")
    .to(".circle-label", {
        attr: {
            y: svgCenterY + finalRadius + 30
        }
    }, "<")
    .to('.denied-circle, .granted-circle', {
        visibility: "hidden",
        delay: 1,
        duration: 2,
        ease: 'power1.Out'
    }, ">")
    .to(".age-denied-slice, .age-granted-slice", {
        visibility: "visible",
        duration: 2,
        ease: 'power1.Out'
    }, ">")

    const ageButterflyTL = gsap.timeline({
        scrollTrigger: {
        trigger: "#section10",
        start: "top center",
        end: "center center",
        scrub: 1
        }
    });

    ageButterflyTL
    .to('.age-denied-slice, .age-granted-slice, .pie-text-granted.WHITE', {
        visibility: "hidden",
        duration: 2,
        ease: 'power1.In'
    })
    .to('.denied-circle, .granted-circle', {
        visibility: "visible",
        duration: 2,
        ease: 'power1.Out'
    }, "<")
    .to(".denied-circle, .granted-circle", { 
        duration: 2,
        attr: {
            r: 0
        },
    }, ">")
    .to(".circle-label", {
        attr: {
            y: height - 50
        }
    }, "<")
    .to('.age-butterfly-granted, .age-butterfly-denied, .ageButterflyyAxis', {
        visibility: "visible",
        duration: 2,
        ease: "power1.inOut"
    }, ">")
    .to('.butterflyxAxisLeft, .butterflyxAxisRight',{
        visibility: "visible",
        duration: 1,
        ease: "power1.inOut"
    }, "<")

    const highlightABTL = gsap.timeline({
        scrollTrigger: {
        trigger: "#section11",
        start: "top center",
        end: "center center",
        scrub: 1
        }
    });
    
    highlightABTL
    .set('.age-butterfly-granted, .age-butterfly-denied', { pointerEvents: 'none' }) // Disable tooltip at the start
    .to('.age-butterfly-granted.AOVER55, .age-butterfly-denied.AOVER55, .age-butterfly-granted.A45_54, .age-butterfly-denied.A45_54', {
        duration: 1,
        opacity: 1,
        ease: 'power1.inOut'
    })
    .to('.age-butterfly-granted.A25_34, .age-butterfly-denied.A25_34, .age-butterfly-granted.A35_44, .age-butterfly-denied.A35_44, .age-butterfly-granted.AUNDER25, .age-butterfly-denied.AUNDER25', {
        duration: 1,
        opacity: 0.3,
        ease: 'power1.inOut'
    }, '<')
    .to('.age-butterfly-percentage-granted.AOVER55, .age-butterfly-percentage-denied.AOVER55, .age-butterfly-percentage-granted.A45_54, .age-butterfly-percentage-denied.A45_54', {
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
            return (label === 'OVER 55' || label === '45-54') ? 1 : 0.3;
        }
    }, '<');
    


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



//     const mergeCirclesTimeline = gsap.timeline({
//         scrollTrigger: {
//             trigger: "#section8",
//             start: "top center",
//             end: "center center",
//             scrub: true
//         }
//     });
    
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

//     bubbles.each(function(d, i) {
//         let targetRadius = radiusScale(d[1]);
//         let targetcx = svgCenterX + spreadRadius * Math.cos(2 * Math.PI * i / interviewTypeProportions.size);
//         let targetcy = svgCenterY + spreadRadius * Math.sin(2 * Math.PI * i / interviewTypeProportions.size)
//         mergeCirclesTimeline.to(this, {
//             duration: 3,
//             ease: 'power1.Out',
//             attr: { 
//                 r: targetRadius,
//                 cx: targetcx,
//                 cy: targetcy
//             }
//         });
//     }, 0);

//     mergeCirclesTimeline.to(".bubble-label",{
//         visibility: "visible",
//         duration: 1,
//         ease: 'power1.Out'
//     });

//     const moveBubblesTL = gsap.timeline({
//         scrollTrigger: {
//             trigger: "#section9",
//             start: "top center",
//             end: "center center",
//             scrub: true
//         }
//     });

//     bubbles.each(function(d) {

//         let targetX, targetY, radius;
    
//         if (d[0] === 'REAPPEAR') {
//             targetX = rightCenterX;
//             targetY = svgCenterY;
//             radius = finalRadius;
//         } 
//         else if (d[0]=== 'INITIAL'){
//             targetX = leftCenterX;
//             targetY = svgCenterY;
//             radius = finalRadius;
//         }
//         else {
//             targetX = Math.random() * width;
//             targetY = Math.random() * height;
//             radius = 0;
//         }
    
//         moveBubblesTL.to(this, {
//             duration: 3,
//             ease: 'power1.inOut',
//             attr: { cx: targetX, cy: targetY, r: radius}
//         }, "<");
//     });

// // Animate labels for 'REAPPEAR' and 'INITIAL'
//     svg.selectAll(".bubble-label.REAPPEAR")
//         .each(function(d) {
//             moveBubblesTL.to(this, {
//                 duration: 3,
//                 ease: 'power1.inOut',
//                 attr:{
//                     x: rightCenterX,
//                     y: svgCenterY + 150
//                 }
//             }, "<");
//         });

//         svg.selectAll(".bubble-label.INITIAL")
//         .each(function(d) {
//             moveBubblesTL.to(this, {
//                 duration: 3,
//                 ease: 'power1.inOut',
//                 attr:{
//                     x: leftCenterX,
//                     y: svgCenterY + 150
//                 }
//             }, "<");
//         });

//     // Hide other labels
//     svg.selectAll(".bubble-label:not(.REAPPEAR):not(.INITIAL)")
//         .each(function() {
//             moveBubblesTL.to(this, {
//                 duration: 3,
//                 ease: 'power1.inOut',
//                 opacity: 0
//             }, "<");
//         });

//     const interviewPieTL = gsap.timeline({
//         scrollTrigger: {
//         trigger: "#section10",
//         start: "top center",
//         end: "center center",
//         scrub: 1
//         }
//     });

//     interviewPieTL
//     .to('.bubble',{
//         visibility: "hidden",
//         duration: 2,
//         ease: 'power1.out'
//         }, ">")
//     .to('.init-slice, .reappear-slice', {
//         visibility: "visible",
//         duration: 2,
//         ease: 'power1.in'
//     }, '<');

    
};