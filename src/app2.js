import * as d3 from "d3";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

/* CONSTANTS AND GLOBALS*/
const width = window.innerWidth * 0.7,
    height = window.innerHeight * 0.8,
    m = { top: 20, bottom: 80, left: 20, right: 20 };
let svg, xScale, yScale, rect1, rect2, rect3, racexScale, raceyScale, races, deniedCircle, grantedCircle;
let tl1, racexAxis, axisGroup, interviewTypeData, deniedTotal, grantedTotal, butterflyAxis, butterflyyScale;
let leftCenterX, rightCenterX, typeCircles, typeColorScale, decColorScale, butterflyxScaleLeft, butterflyxScaleRight;
let butterflyxAxisLeft, butterflyxAxisRight;
let over55, under55;
const circleRadius = 50;
const initialCircleRadius = 0;
const finalRadius = 100;
const circleVerticalCenter = height / 2;
const colors = ['#2292A4', '#D96C06', '#FADF63', '#A67DB8', '#9467bd', '#632B30'];
const barColors = ["#3A5683", "#BCD979", "#B15E6C", "#FF7F11", "#93BEDF", "#35A66D"];
const svgCenterX = width / 2;
const svgCenterY = height / 2;

//FUNCTIONS
function arePieChartsInteractive() {
    return window.scrollY >= document.querySelector("#section4").offsetTop;
}

function addBarCounts() {
    outcomes.forEach((outcome, i) => {
        const barYPosition = outcomeyScale(state.outcomeData.get(outcome).length)-m.bottom;

        svg.append('text')
            .attr('class', `bar-count ${outcome.replace(/\s+/g, '-')}`)
            .attr('x', outcomexScale(outcome) + (outcomexScale.bandwidth()/2) +20)
            .attr('y', barYPosition)
            .attr('text-anchor', 'start')
            .text(state.outcomeData.get(outcome).length)
            .attr('opacity', 0);
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
            d.race__ethnicity = "UNKNOWN/OTHER";
        }
        else if (d.race__ethnicity === "OTHER"){
            d.race__ethnicity = "UNKNOWN/OTHER";
        }
    });

    state.interviews.forEach(d => {
        if (d.interview_decision === "OPEN DATE" || d.interview_decision === "PAROLED") {
            d.interview_decision = "GRANTED";
        }
        else if (d.interview_decision === "RCND&HOLD" || d.interview_decision === "RCND&RELSE"
        || d.interview_decision === "REINSTATE"){
            d.interview_decision = "OTHER";
        }
        else if(d.interview_decision === "NOT GRANTD"){
            d.interview_decision = "DENIED"
        }
    });

    state.interviews.forEach(d => {
        if (d.interview_decision === "**********") {
            d.interview_decision = "OTHER";
        }
    });

    deniedTotal = state.interviews.filter(d => d.interview_decision === "DENIED").length;
    grantedTotal = state.interviews.filter(d=> d.interview_decision === "GRANTED").length;
    blackTotal = state.interviews.filter(d=> d.race__ethnicity === "BLACK").length;
    whiteTotal = state.interviews.filter(d=> d.race__ethnicity === "WHITE").length;
    reappearTotal = state.interviews.filter(d=> d.parole_board_interview_type === "REAPPEAR").length;
    initialTotal = state.interviews.filter(d=> d.parole_board_interview_type === "INITIAL").length;


    state.raceData = d3.group(state.individuals, d => d.race__ethnicity);
    state.intTypeData = d3.group(state.interviews, d => d.parole_board_interview_type);
    state.outcomeData = d3.group(state.interviews, d=>d.interview_decision);
    outcomes = Array.from(state.outcomeData.keys());
    races = Array.from(state.raceData.keys());
    intTypes = Array.from(state.intTypeData.keys());

    over55 = state.interviews.filter(d=> d.age >= 55);
    under55 = state.interviews.filter(d=>d.age < 55);

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
    
    function preparePieData(outcome) {
        return races.map(race => {
            let filteredData = state.interviews.filter(d => {
                // Adjusting for recoded interview_decision values
                let matchesOutcome = false;
                if (outcome === "GRANTED") {
                    matchesOutcome = (d.interview_decision === "OPEN DATE" || d.interview_decision === "PAROLED" || d.interview_decision === "GRANTED");
                } else if (outcome === "DENIED") {
                    matchesOutcome = (d.interview_decision === "NOT GRANTD" || d.interview_decision === "DENIED");
                }
                let matchesRace = d.race__ethnicity === race;
                return matchesRace && matchesOutcome;
            });
    
            return { race: race, value: filteredData.length };
        });
    }
    
    const deniedPieData = preparePieData("DENIED");
    const grantedPieData = preparePieData("GRANTED");

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

    const raceColorScale = d3.scaleOrdinal()
    .domain(races)
    .range(colors);

    typeColorScale = d3.scaleOrdinal()
    .domain(intTypes)
    .range(barColors);

    decColorScale = d3.scaleOrdinal()
    .domain(outcomes)
    .range(barColors);

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


    bar1Group = svg.selectAll(".bar1")
    .data(stackedData)
    .enter().append("rect")
        .attr("class", d => `bar1-${d.key.replace(/\s+/g, '-')}`) 
        .attr("x", d => xScale(d[0][0])) 
        .attr("y", yScale('Total Interviews'))
        // .attr("width", d => xScale(d[0][1]) - xScale(d[0][0])) 
        .attr("width", 0)
        .attr("height", yScale.bandwidth())
        .attr("fill", "#1169e4");

    rect2 = svg
    .selectAll(".bar2")
    .data([state.individuals])
    .enter()
    .append("rect")
    .attr("class", "bar2")
    .attr("x", m.left)
    .attr("y", 0)
    .attr("width", xScale(state.individuals.length))
    .attr("height", yScale.bandwidth())
    .attr("fill", "#ec2d93")
    .attr("opacity", "0");

    rect3 = svg
    .selectAll(".bar3")
    .data([state.individuals])
    .enter()
    .append("rect")
    .attr("x", m.left)
    .attr("y", 0)
    .attr("width", xScale(state.moreThanOnce.length))
    .attr("height", yScale.bandwidth())
    .attr("fill", "#ec6f08")
    .attr("opacity", "0")
    .attr("class", "bar3");

    countText = svg
    .append("text")
    .attr("x", xScale(state.interviews.length)-120)
    .attr("y", yScale('Total Interviews') + yScale.bandwidth()/1.5)
    .attr("dy", ".35em")
    .text(0)
    .attr("class", "count-text")
    .attr("opacity", 0);

    bar2text = svg
    .append("text")
    .attr("x", xScale(state.individuals.length)+50)
    .attr("y", yScale('Unique Persons') + yScale.bandwidth() / 2)
    .attr("dy", ".35em")
    .text(state.individuals.length + " individuals")
    .attr("class", "bar2text")
    .attr("opacity", "0");
    
    bar3text = svg
    .append("text")
    .attr("x", xScale(state.moreThanOnce.length)+50)
    .attr("y", yScale('IDs More Than Once') + yScale.bandwidth() / 2)
    .attr("dy", ".35em")
    .text(state.moreThanOnce.length + " persons interviewed more than once")
    .attr("class", "bar3text")
    .attr("opacity", "0");

    axisGroup = svg.append("g")
    .attr("class", "outcomeBarsAxis")
    .attr("opacity", "0")
    .call(outcomexAxis)
    .selectAll(".tick text")
    .attr("transform", d => `translate(${(outcomexScale.bandwidth()/2)-20}, 0) rotate(-65)`)
    .style("text-anchor", "end")
    .style("font-size", "14px")
    .attr("dx", "-.8em")
    .attr("dy", ".15em");

    // Create circles for "DENIED" and "GRANTED"
    deniedCircle = svg.append("circle")
    .attr("cx", outcomexScale('DENIED') + outcomexScale.bandwidth() / 2)
    .attr("cy", circleVerticalCenter)
    .attr("r", initialCircleRadius)
    .attr("fill","#BCD979") 
    .attr("opacity", 0)
    .classed("denied-circle", true);

    grantedCircle = svg.append("circle")
    .attr("cx", outcomexScale('GRANTED') + outcomexScale.bandwidth() / 2)
    .attr("cy", circleVerticalCenter)
    .attr("r", initialCircleRadius)
    .attr("fill", "#3A5683")
    .attr("opacity", 0)
    .classed("granted-circle", true);

    deniedLabel = svg.append("text")
    .text("DENIED")
    .attr("x", leftCenterX)
    .attr("y", svgCenterY + finalRadius + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .attr("opacity", 0)
    .classed("circle-label", true);

    grantedLabel = svg.append("text")
    .text("GRANTED")
    .attr("x", rightCenterX)
    .attr("y", svgCenterY + finalRadius + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .attr("opacity", 0)
    .classed("circle-label", true);

    const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

    deniedPieData.sort((a, b) => a.value - b.value);
    grantedPieData.sort((a, b) => a.value - b.value);

    const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(finalRadius);

    const deniedPie = d3.pie()
    .value(d => d.value)
    .sort(null) // Disable D3's default sorting
    (deniedPieData);

    const grantedPie = d3.pie()
    .value(d => d.value)
    .sort(null) // Disable D3's default sorting
    (grantedPieData);

    // Add slices for the DENIED pie chart
    svg.selectAll('.denied-slice')
    .data(deniedPie)
    .enter()
    .append('path')
    .attr('class', d => `denied-slice ${d.data.race.replace(/\s+/g, '-')}`)
    .attr('d', arc)
    .attr('fill', d => raceColorScale(d.data.race))
    .attr('transform', `translate(${leftCenterX}, ${svgCenterY})`)
    .attr("opacity", "0");

    // Add slices for the GRANTED pie chart
    svg.selectAll('.granted-slice')
    .data(grantedPie)
    .enter()
    .append('path')
    .attr('class', d => `granted-slice ${d.data.race.replace(/\s+/g, '-')}`)
    .attr('d', arc)
    .attr('fill', d => raceColorScale(d.data.race))
    .attr('transform', `translate(${rightCenterX}, ${svgCenterY})`)
    .attr("opacity", "0");

    function calculatePercent(value, total) {
        return (value / total * 100).toFixed(1); // Rounded to one decimal place
    }

    svg.selectAll('.pie-text-denied')
    .data(deniedPie)
    .enter()
    .append('text')
    .attr('class', d => `pie-text-denied ${d.data.race.replace(/\s+/g, '-')}`)
    .attr('transform', d => {
        const [x, y] = arc.centroid(d);
        return `translate(${x + leftCenterX}, ${y + svgCenterY})`; // Adjust position based on the pie's transform
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .text(d => calculatePercent(d.data.value, deniedTotal) + '%')
    .attr('opacity', 0);

svg.selectAll('.pie-text-granted')
    .data(grantedPie)
    .enter()
    .append('text')
    .attr('class', d => `pie-text-granted ${d.data.race.replace(/\s+/g, '-')}`)
    .attr('transform', d => {
        const [x, y] = arc.centroid(d);
        return `translate(${x + rightCenterX}, ${y + svgCenterY})`; // Adjust position based on the pie's transform
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .text(d => calculatePercent(d.data.value, grantedTotal) + '%')
    .attr('opacity', 0);

        //BUTTERFLY CHART
    state.interviews.forEach(item => {
        item.ageCategory = item.age >= 55 ? 'over55' : 'under55';
    });

//     // Example function to calculate percentages
// function calculatePercentages(data, categoryKey, outcomeKey) {
//     const categoryCounts = d3.rollup(data, 
//                                      v => d3.rollup(v, leaves => leaves.length, d => d[outcomeKey]),
//                                      d => d[categoryKey]);

//     let formattedData = [];

//     categoryCounts.forEach((outcomes, category) => {
//         const total = Array.from(outcomes.values()).reduce((a, b) => a + b, 0);
//         const formattedEntry = { category };

//         outcomes.forEach((count, outcome) => {
//             formattedEntry[outcome] = (count / total) * 100;
//         });

//         formattedData.push(formattedEntry);
//     });

//     return formattedData;
// }

// // Call the function for each category you're interested in
// let butterflyRaceData = calculatePercentages(state.interviews, 'race__ethnicity', 'interview_decision');
// let butterflyAgeData = calculatePercentages(state.interviews, 'ageCategory', 'interview_decision'); // Assuming 'age' is a key
// let butterflyInterviewTypeData = calculatePercentages(state.interviews, 'parole_board_interview_type', 'interview_decision');


// function updatePercentagesForTotal(data) {
//     data.forEach(d => {
//         d.percentOfDenied = deniedTotal ? (d.DENIED / deniedTotal) * 100 : 0;
//         d.percentOfGranted = grantedTotal ? (d.GRANTED / grantedTotal) * 100 : 0;
//     });
// }

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
let combinedAgeData = calculateCombinedPercentages(state.interviews, 'ageCategory', 'interview_decision');
let combinedInterviewTypeData = calculateCombinedPercentages(state.interviews, 'parole_board_interview_type', 'interview_decision');
let combinedData = [...combinedRaceData, ...combinedAgeData, ...combinedInterviewTypeData];
let requiredCategories = ["BLACK", "WHITE", "REAPPEAR", "INITIAL", "over55", "under55"];
let filteredData = combinedData.filter(d => requiredCategories.includes(d.category));

console.log(filteredData)

// Create the scales
butterflyyScale = d3.scaleBand()
    .domain(requiredCategories)
    .range([m.top, height - m.bottom])
    .padding(0.1);

butterflyxScaleLeft = d3.scaleLinear()
    .domain([0, 100])
    .range([width / 2, m.left]);

butterflyxScaleRight = d3.scaleLinear()
    .domain([0, 100])
    .range([width / 2, width - m.right]);

// Drawing Bars
filteredData.forEach(d => {
    // Drawing Denied Bars (Left side)
    svg.append("rect")
        .attr("class", "but-bar-cat-denied")
        .attr("x", butterflyxScaleLeft(d.percentOfCategoryDenied)) // Use percentOfCategoryDenied
        .attr("y", butterflyyScale(d.category))
        .attr("width", width / 2 - butterflyxScaleLeft(d.percentOfCategoryDenied)) // Adjust width calculation
        .attr("height", butterflyyScale.bandwidth())
        .attr("fill", "red")
        .attr("opacity", 0); 

    // Drawing Granted Bars (Right side)
    svg.append("rect")
        .attr("class", "but-bar-cat-granted")
        .attr("x", width / 2)
        .attr("y", butterflyyScale(d.category))
        .attr("width", butterflyxScaleRight(d.percentOfCategoryGranted) - width / 2) // Use percentOfCategoryGranted
        .attr("height", butterflyyScale.bandwidth())
        .attr("fill", "green")
        .attr("opacity", 0); // Change opacity as needed
});

filteredData.forEach(d => {
    // Drawing Denied Bars (Left side)
    svg.append("rect")
        .attr("class", "but-bar-tot-denied")
        .attr("x", butterflyxScaleLeft(d.percentOfTotalDenied)) // Use percentOfCategoryDenied
        .attr("y", butterflyyScale(d.category))
        .attr("width", width / 2 - butterflyxScaleLeft(d.percentOfTotalDenied)) // Adjust width calculation
        .attr("height", butterflyyScale.bandwidth())
        .attr("fill", "red")
        .attr("fill-opacity", .2)
        .attr("stroke", "black")
        .attr("opacity", 0); 

    // Drawing Granted Bars (Right side)
    svg.append("rect")
        .attr("class", "but-bar-tot-granted")
        .attr("x", width / 2)
        .attr("y", butterflyyScale(d.category))
        .attr("width", butterflyxScaleRight(d.percentOfTotalGranted) - width / 2) // Use percentOfCategoryGranted
        .attr("height", butterflyyScale.bandwidth())
        .attr("fill", "green")
        .attr("fill-opacity", .2)
        .attr("stroke", "black")
        .attr("opacity", 0); // Change opacity as needed
});


// Adding Y-axis in the middle
butterflyyAxis = svg.append("g")
    .attr("transform", `translate(${width / 2}, 0)`)
    .attr("class", "butterflyyAxis")
    .call(d3.axisLeft(butterflyyScale).tickSize(0))
    .attr("opacity", 0)
    .select(".domain").remove();

butterflyxAxisLeft = svg.append("g")
    .attr("transform", `translate(0, ${height - m.bottom})`)
    .attr("class", "butterflyxAxisLeft")
    .call(d3.axisBottom(butterflyxScaleLeft).ticks(4)) // Adjust number of ticks as needed
    .attr("opacity", 0)
    .select(".domain").remove();


butterflyxAxisRight = svg.append("g")
    .attr("transform", `translate(0, ${height - m.bottom})`)
    .attr("class", "butterflyxAxisRight")
    .call(d3.axisBottom(butterflyxScaleRight).ticks(4)) // Adjust number of ticks as needed
    .attr("opacity", 0)
    .select(".domain").remove();




    // const tooltip = d3.select('#tooltip');

    // svg.selectAll('.denied-slice, .granted-slice')
    // .on('mouseover', function(event, d) {
    //     if (!arePieChartsInteractive()) {
    //         return;
    //     }
    //     svg.selectAll('.denied-slice, .granted-slice')
    //        .transition().duration(300)
    //        .style('opacity', 0.5);

    //     svg.selectAll(`.denied-slice.${d.data.race}, .granted-slice.${d.data.race}`)
    //        .transition().duration(300)
    //        .style('opacity', 1)
    //        .style('stroke', 'white')
    //        .style('stroke-width', '2px');

    //     tooltip.transition().duration(300).style('opacity', 1);
    //     const deniedPercent = calculateHoverPercent(d.data.race, 'DENIED');
    //     const grantedPercent = calculateHoverPercent(d.data.race, 'GRANTED');
    //     tooltip.html(`${d.data.race}<br>Denied: ${deniedPercent.toFixed(1)}%<br>Granted: ${grantedPercent.toFixed(1)}%`)
    //            .style('left', (event.pageX + 10) + 'px')
    //            .style('top', (event.pageY - 28) + 'px');
    // })
    // .on('mouseout', function() {
    //     if (!arePieChartsInteractive()) {
    //         return;
    //     }
    //     svg.selectAll('.denied-slice, .granted-slice')
    //        .transition().duration(300)
    //        .style('opacity', 1)
    //        .style('stroke', 'none')
    //        .style('stroke-width', '0px');


    //     tooltip.transition().duration(300).style('opacity', 0);
    // });

// Smaller circles for interview types
 typeCircles = svg.selectAll(".type-circle")
    .data(interviewTypeData)
    .enter()
    .append("circle")
    .attr("class", "type-circle")
    .attr("cx", width / 2) // Start at the center
    .attr("cy", height / 2) // Start at the center
    .attr("r", 0) // Start with radius 0
    .attr("fill", d => typeColorScale(d.type)); // Assign color based on type

    draw();
}

function draw() {

    ScrollTrigger.defaults({scroller: ".content-container" });
    ScrollTrigger.defaults({toggleActions: 'play none none reverse'})


    document.querySelectorAll('section').forEach(section => {
        gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "bottom 20%",
                scrub: true,
                toggleActions: "play none none reverse"
            }
        })
        .fromTo(section, {opacity: 0}, {opacity: 1, ease: "none"})
        .to(section, {opacity: 0, ease: "none"});
    });

    // CREATE FIRST GSAP TIMELINE FOR SCROLL EFFECTS
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
    
        tl1.to(`.bar1-${outcome.replace(/\s+/g, '-')}`, {
            width: segmentWidth,
            duration: 1.5,
            ease: "none",
        }, `+=${i * 0.02}`);
    },);

    tl1.to(countObj, {
        value: state.interviews.length,
        duration: 6,
        onStart: () => {
            gsap.to(countText.node(), { attr: { opacity: 1 }});
        },
        onUpdate: () => {
            countText.text(Math.round(countObj.value) + " interviews");
        }
    }, 0)
    .to(".bar2", {
        opacity: 1, 
        y: yScale('Unique Persons'), 
        duration: 1
    }, ">")
    .to(".bar2text", {
        opacity: 1, 
        duration: 1
    }, "<")
    .to(".bar3", {
        opacity: 1, 
        y: yScale('IDs More Than Once'), 
        duration: 1
    }, "<")
    .to(".bar3text", {
        opacity: 1, 
        duration: 1
    }, "<");
    
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
        y: -200, opacity: 0, duration: 0.5, stagger: 0.1
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
        verticalBarTimeline.to(`.bar1-${outcome.replace(/\s+/g, '-')}`, {
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
        opacity: 1,
        duration: 2,
        ease: "power1.inOut",
    }, "<");

    addBarCounts(); 
    verticalBarTimeline.to('.bar-count', {
        opacity: 1,
        delay: 1,
        duration: 1,
        ease: 'power1.inOut',
    }, "<");

       
        // ScrollTrigger for splitting rect1 into vertical bars
    // const barSplitTrigger = ScrollTrigger.create({
    //     trigger: "#section2",
    //     start: "top center",
    //     end: "center center",
    //     onEnter: () => {
    //         gsap.to(".bar1", {
    //             height: (i) => height - m.bottom - outcomeyScale(state.outcomeData.get(outcomes[i]).length),
    //             x: (i) => outcomexScale(outcomes[i]),
    //             y: (i) => outcomeyScale(state.outcomeData.get(outcomes[i]).length) - m.bottom,
    //             width: outcomexScale.bandwidth(),
    //             fill: (i) => barColors[i % barColors.length],
    //             duration: 2,
    //             ease: "power1.inOut",
    //             stagger: 0.1
    //         });

    //         const axisYPosition = d3.max(outcomes, outcome => {
    //             return outcomeyScale(state.outcomeData.get(outcome).length);
    //         });
            
    //         gsap.to(".outcomeBarsAxis", {
    //             attr: { transform: `translate(${m.left}, ${axisYPosition})` },
    //             opacity: 1,
    //             duration: 2,
    //             ease: "power1.inOut"
    //         });

    //         addBarCounts(); 
    //         gsap.to('.bar-count', {
    //             opacity: 1,
    //             delay: 1,
    //             duration: 1,
    //             ease: 'power1.inOut',
    //         });
    //     },
    //     onEnterBack: () => {
    //         // Reverse the split
    //         gsap.to(".bar1", {
    //             x: 0, // Reset x position
    //             y: yScale('Total Interviews'), // Reset y position
    //             width: xScale(state.interviews.length) - m.right, // Reset width
    //             height: yScale.bandwidth(), // Reset height
    //             fill: "#1169e4", // Reset fill color
    //             duration: 2,
    //             ease: "power1.inOut",
    //             stagger: 0.1
    //         });
    
    //         // Hide the axis
    //         gsap.to(".outcomeBarsAxis", {
    //             opacity: 0,
    //             duration: 2,
    //             ease: "power1.inOut"
    //         });

    //         gsap.to('.bar-count', {
    //             opacity: 0,
    //             immediateRender: true
    //         });
    //     },
    //     onLeaveBack: () => {
    //         // Reset the bars to their initial state
    //         gsap.set(".bar1", {
    //             x: 0,
    //             y: yScale('Total Interviews'),
    //             width: 0, // Initially, the width is set to 0
    //             height: yScale.bandwidth(),
    //             fill: "#1169e4"
    //         });
    
    //         // Hide the axis
    //         gsap.set(".outcomeBarsAxis", { opacity: 0 });
    //         gsap.set('.bar-count', {opacity: 0});
    //         svg.selectAll('.bar-count').remove();

    //     }
    // });


    const moveBarsTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#section3",
            start: "top center",
            end: "center center",
            scrub: 1
        }
    });

    moveBarsTimeline.to(".bar-count", {
        opacity: 0,
        ease: "none"
    });
    
    moveBarsTimeline.to('.bar1-OTHER, .bar1-OREARLIER', {
        y: "-=300",
        opacity: 0,
        duration: 2,
        ease: 'power1.inOut'
    }, ">");

    moveBarsTimeline.to('.outcomeBarsAxis', {
        opacity: 0,
        duration: 2,
        ease: 'power1.inOut'
    }, "<");

    //turn bars into ovals
    moveBarsTimeline.to('.bar1-GRANTED, .bar1-DENIED', {
        duration: 2,
        rx: "50%",
        ry: "50%",
        ease: 'power1.inOut'
    }, ">");

    moveBarsTimeline.to('.denied-circle, .granted-circle', {
        opacity: 1,
        duration: 2,
        attr: { r: circleRadius },
        ease: 'power1.inOut'
    }, ">");
    
    moveBarsTimeline.to('.denied-circle', {
        duration: 2,
        attr: { 
            cx: leftCenterX,
            cy: svgCenterY, 
            r: finalRadius 
        },
        ease: 'power1.inOut'
    }, "<");
    
    moveBarsTimeline.to('.granted-circle', {
        duration: 2,
        attr: { 
            cx: rightCenterX,
            cy: svgCenterY, 
            r: finalRadius 
        },
        ease: 'power1.inOut'
    }, '<');

    moveBarsTimeline.to('.bar1-DENIED, .bar1-GRANTED', {
        duration: 2,
        y: circleVerticalCenter, 
        height: 0, 
        opacity: 0,
        ease: 'power1.inOut'
    }, "<");

    moveBarsTimeline.to('.circle-label', {
        opacity: 1,
        delay: 1,
        duration: 2,
        ease: 'power1.inOut'
    }, ">");
    
    // new timeline for making circles into pie graphs
    const pieTransitionTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#section4",
            start: "top center",
            end: "center center",
            scrub: 1
        }
    });
    
    // Fade out the denied and granted whole circles
    pieTransitionTimeline.to('.denied-circle, .granted-circle', {
        opacity: 0,
        duration: 2,
        ease: 'power1.out'
    }, ">");
    
    // Fade in the pie slices for denied and granted
    pieTransitionTimeline.to('.denied-slice, .granted-slice', {
        opacity: 1,
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

    highlightPieSectionTimeline
    .to('.denied-slice.WHITE, .granted-slice.WHITE', {
        opacity: 1, // Fully visible
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.denied-slice:not(.WHITE), .granted-slice:not(.WHITE)', {
        opacity: 0.3, // Dim other slices
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.pie-text-granted.WHITE, .pie-text-denied.WHITE', {
        opacity: 1,
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
    .to('.denied-slice.BLACK, .granted-slice.BLACK', {
        opacity: 1, // Fully visible
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.denied-slice:not(.BLACK), .granted-slice:not(.BLACK)', {
        opacity: 0.3, // Dim other slices
        duration: 1,
        ease: "power1.inOut"
    }, 0)
    .to('.pie-text-denied.BLACK, .pie-text-granted.BLACK', {
        opacity: 1,
        duration: 1,
        ease: 'power1.inOut'
    }, 0)
    .to('.pie-text-granted.WHITE, .pie-text-denied.WHITE', {
        opacity: .2,
        duration: 1,
        ease: 'power1.inOut'
    }, 0);

    const newPieTimeline = gsap.timeline({
        scrollTrigger: {
        trigger: "#section7",
        start: "top center",
        end: "center center",
        scrub: 1
        }
    });

    newPieTimeline
    .to('.denied-circle, .granted-circle', {
        opacity: 1,
        duration: 2,
        ease: 'power1.out'
    }, 0)
   .to('.denied-slice, .granted-slice', {
        opacity: 0,
        duration: 2,
        ease: 'power1.in'
    },0)
    .to('.pie-text-denied.BLACK, .pie-text-granted.BLACK', {
        opacity: 0,
        duration: 1,
        ease: 'power1.inOut'
    }, 0)
    .to('.pie-text-granted.WHITE, .pie-text-denied.WHITE', {
        opacity: 0,
        duration: 1,
        ease: 'power1.inOut'
    }, 0);

    const butterflyTimeline1 = gsap.timeline({
        scrollTrigger: {
        trigger: "#section8",
        start: "top center",
        end: "center center",
        scrub: 1
        }
    });

    butterflyTimeline1
    .to('.denied-circle, .granted-circle, .circle-label', {
        opacity: 0,
        duration: 1,
        ease: 'power1.out'
    }, 0)
    .to('.but-bar-cat-denied, .but-bar-cat-granted, .butterflyyAxis', {
        opacity: 1,
        duration: 1,
        ease: "power1.inOut"
    })
    .to('.butterflyxAxisLeft',{
        opacity: 1,
        duration: 1,
        ease: "power1.inOut"
    })
    .to('.butterflyxAxisRight',{
        opacity: 1,
        duration: 1,
        ease: "power1.inOut"
    });

    const butterflyTimeline2 = gsap.timeline({
        scrollTrigger: {
        trigger: "#section9",
        start: "top center",
        end: "center center",
        scrub: 1
        }
    });

    butterflyTimeline2
    // .to('.but-bar-cat-denied, .but-bar-cat-granted', {
    //     opacity: 0,
    //     duration: 1,
    //     ease: "power1.inOut"
    // })
    .to('.but-bar-tot-denied, .but-bar-tot-granted', {
        opacity: 1,
        duration: 1,
        ease: "power1.inOut"
    })





    // const mergeCirclesTimeline = gsap.timeline({
    //     scrollTrigger: {
    //         trigger: "#section5",
    //         start: "top center",
    //         end: "center center",
    //         scrub: true
    //     }
    // });
    
    // mergeCirclesTimeline
    //     .to('.denied-slice, .granted-slice', { opacity: 0, duration: 1 }, 0)
    //     .to('.denied-circle, .granted-circle', { opacity: 1, duration: 1 }, 0)


    // mergeCirclesTimeline
    // .to('.denied-circle', {
    //     duration: 1,
    //     attr: { cx: svgCenterX, cy: svgCenterY },

    //     ease: 'power1.inOut'
    // })
    // .to('.granted-circle', {
    //     duration: 1,
    //     attr: { cx: svgCenterX, cy: svgCenterY },
    //     ease: 'power1.inOut'
    // }, '<')
    // .to(".denied-circle, .granted-circle, .circle-label", { 
    //     duration: 0.5,
    //     r: 0,
    //     opacity: 0
    // }, '+=0.5');

    // mergeCirclesTimeline
    // .to(typeCircles.nodes(), {
    //     duration: 2,
    //     attr: function(i) {
    //         return {
    //             cx: interviewTypeData[i].finalX,
    //             cy: interviewTypeData[i].finalY,
    //             r: radiusScale(interviewTypeData[i].count)
    //         };
    //     },
    //     stagger: 0.1 
    // }, "<");
    
    
};
