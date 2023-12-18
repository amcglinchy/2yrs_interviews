import * as d3 from "d3";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);


const width = window.innerWidth * 0.7,
    height = window.innerHeight * 0.8,
    m = { top: 20, bottom: 50, left: 40, right: 40 };
const barHeight = 30; // Adjusted bar height
let svg, xScale, yScale, rect1, rect2, rect3, raceBars, racexScale, raceyScale, races;
let tl1, maxCounts, raceBarStartY, additionalSpacing, barYPositions, barHeights, raceDataArray;

/* APPLICATION STATE */
let state = {
    interviews: [],
    raceData: [],
    individuals: [],
    moreThanOnce: []
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

    state.raceData = d3.group(state.individuals, d => d.race__ethnicity);
    raceDataArray = Array.from(state.raceData, ([race, data]) => ({ race, count: data.length }));

    // CREATE SCALES FOR BARS
    xScale = d3.scaleLinear()
    .domain([0, d3.max([state.interviews.length, state.individuals.length, state.moreThanOnce.length])])
    .range([m.left, width - m.right]);

    yScale = d3
        .scaleBand()
        .domain(['Total Interviews', 'Unique Persons', 'IDs More Than Once'])
        .range([m.top, height - m.bottom])
        .padding(0.1);

    races = Array.from(state.raceData.keys());

    // Find the maximum count for each race
    maxCounts = races.map(race => d3.max(state.raceData.get(race), d => d.race__ethnicity));
    
    additionalSpacing = 20;  // Adjust this value as needed for spacing
    raceBarStartY = m.top + 3 * barHeight + additionalSpacing;

    // Create xScale and yScale
    racexScale = d3
    .scaleLinear()
    .domain([0, d3.max(raceDataArray, d => d.count)])
    .range([m.left, width - m.right]);

    raceyScale = d3.scaleBand()
    .domain(races)
    .range([m.left, width - m.right])
    .padding(0.1);

    // CREATE SVG
    svg = d3
        .select("#container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("overflow", "visible");

    //CREATE BARS AND TEXT
    rect1 = svg
    .selectAll(".bar1")
    .data([state.interviews])
    .enter()
    .append("rect")
    .attr("x", m.left)
    .attr("y", m.top)
    .attr("width", 0)
    .attr("height", barHeight)
    .attr("fill", "#1169e4")
    .attr("class", "bar1");

    // rect2 = svg
    // .selectAll(".bar2")
    // .data(races) // Bind to races
    // .enter()
    // .append("rect")
    // .attr("class", "bar2")
    // .attr("x", m.left)
    // .attr("y", m.top + (barHeight * 2))
    // .attr("width", xScale(state.individuals.length))
    // .attr("height", barHeight)
    // .attr("fill", "#ec2d93")
    // .attr("opacity", 0);

    rect2 = svg
    .selectAll(".bar2")
    .data([raceDataArray])
    .enter()
    .append("rect")
    .attr("class", "bar2")
    .attr("x", m.left)
    .attr("y", m.top + (barHeight * 2)) // Set its initial vertical position
    .attr("width", xScale(state.individuals.length) - m.right) // Set its initial width
    .attr("height", barHeight)
    .attr("fill", "#ec2d93")
    .attr("opacity", 0);

    rect3 = svg
    .selectAll(".bar3")
    .data([state.individuals])
    .enter()
    .append("rect")
    .attr("x", m.left)
    .attr("y", m.bottom)
    .attr("width", xScale(state.moreThanOnce.length))
    .attr("height", barHeight)
    .attr("fill", "#ec6f08")
    .attr("opacity", "0")
    .attr("class", "bar3");

    countText = svg
    .append("text")
    .attr("x", xScale(state.interviews.length)+10) // Adjust the x position as needed
    .attr("y", m.top + barHeight / 2) // Adjust the y position as needed
    .attr("dy", ".35em")
    .text(0) // Initial count is 0
    .attr("class", "count-text");

    bar2text = svg
    .append("text")
    .attr("x", xScale(state.individuals.length)+50)
    .attr("y", m.top+barHeight*2.5)
    .attr("dy", ".35em")
    .text(state.individuals.length + " individuals")
    .attr("class", "bar2text")
    .attr("opacity", "0");

    bar3text = svg
    .append("text")
    .attr("x", xScale(state.moreThanOnce.length)+50)
    .attr("y", m.top+(barHeight*4.75))
    .attr("dy", ".35em")
    .text(state.moreThanOnce.length + " persons interviewed more than once")
    .attr("class", "bar3text")
    .attr("opacity", "0");

    console.log("races:", races);
    console.log("state.raceData:", state.raceData);
    console.log("Race Data keys:", Array.from(state.raceData.keys()));


    console.log("racedataarray:", raceDataArray)


    raceBars = svg
    .selectAll(".raceBar")
    .data(raceDataArray)
    .enter()
    .append("rect")
    .attr("class", "raceBar")
    .attr("x", m.left)
    .attr("y", (d, i) => raceBarStartY + i * (barHeight + additionalSpacing))
    .attr("width", 0) // Initial width is 0
    .attr("height", barHeight)
    .attr("fill", "#ec6f08")
    .attr("opacity", 0);



    barHeights = [];
barYPositions = [];

races.forEach(race => {
    const count = state.raceData.get(race).length;
    barHeights.push(racexScale(count));
    barYPositions.push(height - m.bottom - racexScale(count));
});

    draw();
}

/* DRAW FUNCTION */

function draw() {
    // CREATE FIRST GSAP TIMELINE FOR SCROLL EFFECTS
    tl1 = gsap.timeline({
        scrollTrigger: {
            trigger: "#container",
            start: "top center",
            end: "+=300", 
            markers: true,
        },
    });

    // ADD EFFECTS TO TIMELINE
    tl1
    .add('start')
    .to(".bar1", {width: xScale(state.interviews.length) - m.right, duration: 5}, 'start')
    .to(countText, {text: state.interviews.length + " interviews", duration: 5}, 'start')
    .to(".bar2", {opacity: 1, delay: 1, duration: .3}, ">")
    .to(".bar2text", {opacity: 1, delay: 1, duration: .3}, 5)
    .to(".bar3", {opacity: 1, y: m.top + (barHeight * 2.5), duration: 2}, ">")
    .to(".bar3text", {opacity: 1, delay: 1, duration: .3}, 6);

    tl1
    .to(".bar2", { opacity: 0, duration: 1 }, ">")
    .to(".bar2text", { opacity: 0, duration: 1 }, ">");

    // tl1.to(".bar2", {
    //     attr: {
    //       width: (d) => xScale(d.count) - m.left, // Set the width based on the count
    //       x: m.left, // Set the x position to the left
    //     },
    //     duration: 0.3, // Adjust the duration as needed
    //     stagger: 0.1,
    //     ease: "power1.inOut"
    //   }, ">")
    //   .to(".bar2", {
    //     attr: {
    //       width: 0, // Set the width to 0
    //       x: m.left, // Set the x position back to the left
    //     },
    //     duration: 0.3, // Adjust the duration as needed
    //   }, ">"); // Transition to the final width


    tl1.to(".raceBar", {
        attr: {
          width: (d) => racexScale(d.count) - m.left, // Set the width based on the count
          x: m.left, // Set the x position to the left
        },
        opacity: 1,
        duration: 0.3, // Adjust the duration as needed
        stagger: 0.1,
        ease: "power1.inOut"
      }, ">");
};




