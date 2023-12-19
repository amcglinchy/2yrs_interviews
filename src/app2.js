import * as d3 from "d3";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

/* CONSTANTS AND GLOBALS*/


const width = window.innerWidth * 0.7,
    height = window.innerHeight * 0.8,
    m = { top: 20, bottom: 80, left: 40, right: 40 };
let svg, xScale, yScale, rect1, rect2, rect3, racexScale, raceyScale, races;
let tl1, racexAxis, axisGroup;
const additionalOffsetY = 300;

const raceColors = ["#3A5683", "#BCD979", "#B15E6C", "#FF7F11", "#93BEDF", "#35A66D"];

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
    races = Array.from(state.raceData.keys());

    // CREATE SCALES FOR BARS
    xScale = d3.scaleLinear()
    .domain([0, d3.max([state.interviews.length, state.individuals.length, state.moreThanOnce.length])])
    .range([m.left, width - m.right]);

    yScale = d3.scaleBand()
    .domain(['Total Interviews', 'Unique Persons', 'IDs More Than Once'])
    .range([m.top, height - m.bottom])
    .padding(0.2);
    
    raceyScale = d3.scaleLinear()
        .domain([0, d3.max(races, race => state.raceData.get(race).length)])
        .range([height - m.bottom, m.top]);

    racexScale = d3.scaleBand()
        .domain(races)
        .range([m.left, width - m.right])
        .padding(0.1);

    racexAxis = d3.axisBottom(racexScale)
        .tickFormat((d, i) => races[i])
        .tickSize(0)
        .tickPadding(10); 
        

    // CREATE SVG
    svg = d3.select(".svg-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("overflow", "visible");

    //CREATE BARS AND TEXT
    rect1 = svg
    .selectAll(".bar1")
    .data([state.interviews])
    .enter()
    .append("rect")
    .attr("x", m.left)
    .attr("y", yScale('Total Interviews'))
    .attr("width", 0)
    .attr("height", yScale.bandwidth())
    .attr("fill", "#1169e4")
    .attr("class", "bar1");

    rect2 = svg
    .selectAll(".bar2")
    .data(races) // Bind to races
    .enter()
    .append("rect")
    .attr("class", "bar2")
    .attr("x", m.left)
    .attr("y", yScale('Unique Persons'))
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
    .attr("x", xScale(state.interviews.length)+10)
    .attr("y", yScale('Total Interviews') + yScale.bandwidth() / 2)
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
    .attr("class", "raceBarsAxis")
    .attr("opacity", "0")
    .call(racexAxis)
    .selectAll(".tick text")
    .attr("transform", `translate(${racexScale.bandwidth() / 2}, 0)`)
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)");

    draw();
}

function draw() {

    // CREATE FIRST GSAP TIMELINE FOR SCROLL EFFECTS
    tl1 = gsap.timeline({
        scrollTrigger: {
            trigger: "#section1",
            start: "top center",
            end: "top top+=100%",
            markers: {startColor: "red", endColor: "red"},
            toggleActions: "play none none reverse",
            onLeave: () => {
                // Enable tlMoveDown when tlFlyOut leaves the viewport
                tlFlyOut.scrollTrigger.enable();
            }
        },
    });
    let countObj = { value: 0 };

    // ADD INITIAL BARS TO TIMELINE
    tl1
    .add('start')
    .to(".bar1", {width: xScale(state.interviews.length) - m.right, duration: 8}, 'start')
    .to(countObj, {
        value: state.interviews.length,
        duration: 8,
        onStart: () => {
            gsap.to(countText.node(), { attr: { opacity: 1 }, duration: 8 });
        },
        onUpdate: () => {
            countText.text(Math.round(countObj.value) + " interviews");
        }
    }, 'start')
    .to(".bar2", {opacity: 1, delay: 1, duration: .3}, ">")
    .to(".bar2text", {opacity: 1, delay: 1, duration: .3}, ">")
    .to(".bar3", {opacity: 1, y: yScale('IDs More Than Once'), duration: 2}, ">")
    .to(".bar3text", {opacity: 1, duration: .3}, ">");
    
    // Timeline for flying out rect1, rect3, and their texts
    const tlFlyOut = gsap.timeline({
        scrollTrigger: {
            trigger: "#section2",
            start: "top center",
            markers: {startColor: "blue", endColor: "blue"},
            enabled: false,
            end: "top+=500 center",
            onLeave: () => {
                // Enable tlMoveDown when tlFlyOut leaves the viewport
                tlMoveDown.scrollTrigger.enable();
            }
        }
    });

    tlFlyOut.to(".bar1, .count-text, .bar2text, .bar3, .bar3text", {
        y: -200, opacity: 0, duration: 0.5, stagger: 0.1
    });

    // Timeline for moving rect2 down
    const tlMoveDown = gsap.timeline({
        scrollTrigger: {
            trigger: "#section2",
            start: "top center",
            end: "top+=900 bottom",
            scrub: true,
            markers: {startColor: "pink", endColor: "pink"},
            enabled: false
        }
    });

    tlMoveDown.to(".bar2", {
        y: "+=300",
        duration: 1,
        ease: "none"
    });

    gsap.set(".raceBarsAxis", { x: "-100%" });

    
    // ScrollTrigger for splitting rect2 into vertical bars
    const barSplitTrigger = ScrollTrigger.create({
        trigger: "#section3",
        start: "top center",
        end: "top+=600 bottom",
        markers: {startColor: "black", endColor: "black"},
        onEnter: () => {
            gsap.to(".bar2", {
                height: (i) => height - m.bottom - raceyScale(state.raceData.get(races[i]).length),
                x: (i) => racexScale(races[i]),
                y: (i) => raceyScale(state.raceData.get(races[i]).length) - m.bottom + additionalOffsetY,
                width: racexScale.bandwidth(),
                fill: (i) => raceColors[i % raceColors.length],
                duration: 2,
                ease: "power1.inOut",
                stagger: 0.1
            });

            const axisYPosition = d3.max(races, race => {
                return raceyScale(state.raceData.get(race).length);
            }) + additionalOffsetY+100;
            
            gsap.to(".raceBarsAxis", {
                attr: { transform: `translate(${m.left}, ${axisYPosition})` },
                opacity: 1,
                delay: 2,
                duration: 2,
                ease: "power1.inOut"
            });
        },
        onRefresh: self => {
            if (window.scrollY < self.start) {
                gsap.set(".raceBarsAxis", { opacity: 0 });
            }
        }
    });


};
