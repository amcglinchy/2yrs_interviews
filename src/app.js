import * as d3 from "d3";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const width = window.innerWidth * 0.7,
    height = window.innerHeight * 0.8,
    m = { top: 20, bottom: 50, left: 40, right: 40 };
const barHeight = 30; // Adjusted bar height
let svg, xScale, yScale, rect1, rect2, rect3, raceBars, racexScale, raceyScale;
let totalInterviews, uniquePersons, idsMoreThanOnce;

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

    console.log(state.raceData)


    // CREATE SCALES FOR BARS
    xScale = d3
        .scaleLinear()
        .domain([0, Math.max(state.interviews.length, state.individuals.length, state.moreThanOnce.length)])
        .range([m.left, width - m.right]);

    yScale = d3
        .scaleBand()
        .domain(['Total Interviews', 'Unique Persons', 'IDs More Than Once'])
        .range([m.top, height - m.bottom])
        .padding(0.1);

    const races = Array.from(state.raceData.keys());

    // Find the maximum count for each race
    const maxCounts = races.map(race => d3.max(state.raceData.get(race), d => d.race__ethnicity));
    
    // Create xScale and yScale
    racexScale = d3
    .scaleLinear()
    .domain([0, d3.max(races, race => state.raceData.get(race).length)])  // Use d3.max with accessor function
    .range([m.left, width - m.right]);

    raceyScale = d3
        .scaleBand()
        .domain(races)
        .range([m.top, height - m.bottom]);

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

    rect2 = svg
    .selectAll(".bar2")
    .data([state.individuals])
    .enter()
    .append("rect")
    .attr("x", m.left)
    .attr("y", m.top+(barHeight*2))
    .attr("width", xScale(state.individuals.length))
    .attr("height", barHeight)
    .attr("fill", "#ec2d93")
    .attr("opacity", "0")
    .attr("class", "bar2");

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

    console.log("Race Data:", state.raceData);

    raceBars = svg
        .selectAll(".raceBar")
        .data(races)
        .enter()
        .append("rect")
        .attr("class", "raceBar")
        .attr("x", m.left)
        .attr("y", race => raceyScale(race))
        .attr("width", race => racexScale(state.raceData.get(race).length))
        .attr("height", raceyScale.bandwidth())
        .attr("fill", "#ec6f08")
        .attr("opacity", 0);


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
    })

    // ADD EFFECTS TO TIMELINE
    tl1
    .add('start')
    .to(".bar1", {width: xScale(state.interviews.length)-m.right, duration: 5}, 'start')
    .to(countText, {text: state.interviews.length + " interviews", duration: 5}, 'start')
    .to(".bar2", {opacity: 1, delay: 1, duration: .3}, ">")
    .to(".bar2text", {opacity: 1, delay: 1, duration: .3}, 5)
    .to(".bar3", {opacity: 1, y: m.top+(barHeight*2.5), duration: 2}, ">")
    .to(".bar3text", {opacity: 1, delay: 1, duration: .3}, 6)
    .add(() => {
        // Callback function to run when the timeline reaches this point
        // CREATE SECOND GSAP TIMELINE FOR RACE BARS
        const tl2 = gsap.timeline({
            scrollTrigger: {
                trigger: "#container",
                start: "top center",
                end: "+=300",
                markers: true,
            },
        });

        // ADD EFFECTS TO SECOND TIMELINE
        tl2
            .to(".raceBar", { opacity: 1, duration: 1 })
            .fromTo(".raceBar", { scaleX: 0 }, { scaleX: 1, transformOrigin: "left", duration: 1 });
    });
};



