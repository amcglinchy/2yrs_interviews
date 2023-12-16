import * as d3 from "d3";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const width = window.innerWidth * 0.7,
    height = window.innerHeight * 0.8,
    m = { top: 20, bottom: 50, left: 40, right: 40 };
const barHeight = 30; // Adjusted bar height
let svg, xScale, yScale, rect1, rect2;
let totalInterviews, uniquePersons, idsMoreThanOnce;

/* APPLICATION STATE */
let state = {
    data: [],
    // selectedParty: "All" // + YOUR INITIAL FILTER SELECTION
};

/* LOAD DATA */
import("../data/all_interviews_capstone_final.json").then(raw_data => {
    // + SET YOUR DATA PATH
    console.log("data", raw_data);
    // save our data to the application state
    state.data = raw_data;
    init();
});

/* INITIALIZING FUNCTION */
function init() {
    totalInterviews = state.data.length;
    uniquePersons = new Set(state.data.map(d => d.id)).size;
    const idCounts = {};

    state.data.forEach(item => {
        const id = item.id;
        idCounts[id] = (idCounts[id] || 0) + 1;
    });

    idsMoreThanOnce = Object.values(idCounts).filter(count => count > 1).length;

    xScale = d3
        .scaleLinear()
        .domain([0, Math.max(totalInterviews, uniquePersons, idsMoreThanOnce)])
        .range([m.left, width - m.right]);

    yScale = d3
        .scaleBand()
        .domain(['Total Interviews', 'Unique Persons', 'IDs More Than Once'])
        .range([m.top, height - m.bottom])
        .padding(0.1);

    svg = d3
        .select("#container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("overflow", "visible");

    // const xAxis = d3.axisBottom(xScale);
    // const yAxis = d3.axisLeft(yScale);

    rect1 = svg
    .selectAll(".bar1")
    .data([totalInterviews])
    .enter()
    .append("rect")
    .attr("x", m.left)
    .attr("y", m.top)
    .attr("width", 0)
    .attr("height", barHeight)
    .attr("fill", "#1169e4")
    .attr("class", "bar1");

// Append the second bar to the SVG
    rect2 = svg
    .selectAll(".bar2")
    .data([uniquePersons])
    .enter()
    .append("rect")
    .attr("x", m.left)
    .attr("y", m.top+(barHeight*2))
    .attr("width", xScale(uniquePersons))
    .attr("height", barHeight)
    .attr("fill", "#ec2d93")
    .attr("opacity", "0")
    .attr("class", "bar2");

    rect3 = svg
    .selectAll(".bar3")
    .data([uniquePersons])
    .enter()
    .append("rect")
    .attr("x", m.left)
    .attr("y", m.bottom)
    .attr("width", xScale(idsMoreThanOnce))
    .attr("height", barHeight)
    .attr("fill", "#ec6f08")
    .attr("opacity", "0")
    .attr("class", "bar3");

    countText = svg
    .append("text")
    .attr("x", xScale(totalInterviews)+10) // Adjust the x position as needed
    .attr("y", m.top + barHeight / 2) // Adjust the y position as needed
    .attr("dy", ".35em")
    .text(0) // Initial count is 0
    .attr("class", "count-text");

    bar2text = svg
    .append("text")
    .attr("x", xScale(uniquePersons)+50)
    .attr("y", m.top+barHeight*2.5)
    .attr("dy", ".35em")
    .text(uniquePersons + " individuals")
    .attr("class", "bar2text")
    .attr("opacity", "0");

    bar3text = svg
    .append("text")
    .attr("x", xScale(idsMoreThanOnce)+50)
    .attr("y", m.top+(barHeight*4.75))
    .attr("dy", ".35em")
    .text(idsMoreThanOnce + " persons interviewed more than once")
    .attr("class", "bar3text")
    .attr("opacity", "0");


    draw(); // calls the draw function
}

/* DRAW FUNCTION */
function draw() {
    // Append the first bar to the SVG
    gsap.timeline({
        scrollTrigger: {
            trigger: "#container",
            start: "top center", // Adjust the start position as needed
            end: "+=300", // Adjust the end position as needed
            markers: true, // Set to true to show trigger markers
        },
    })
    .add('start')
    .to(".bar1", {width: xScale(totalInterviews)-m.right, duration: 5}, 'start')
    .to(countText, {text: totalInterviews + " interviews", duration: 5}, 'start')
    .to(".bar2", {opacity: 1, delay: 1, duration: .3}, ">")
    .to(".bar2text", {opacity: 1, delay: 1, duration: .3}, 5)
    .to(".bar3", {opacity: 1, y: m.top+(barHeight*2.5), duration: 1}, ">")
    .to(".bar3text", {opacity: 1, delay: 1, duration: .3}, 6)
    };


