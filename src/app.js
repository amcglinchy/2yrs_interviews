import * as d3 from "d3";
import ScrollMagic from "scrollmagic";
import { TweenMax, TimelineMax } from "gsap"; // Also works with TweenLite and TimelineLite
import { ScrollMagicPluginGsap } from "scrollmagic-plugin-gsap";
import scrollama from "scrollama"; // or...


ScrollMagicPluginGsap(ScrollMagic, TweenMax, TimelineMax);

const scroller = scrollama();
const width = window.innerWidth * .7,
    height = window.innerHeight * .8,
    m = { top: 20, bottom: 50, left: 40, right: 40 };
const barHeight = 25
// const height = Math.ceil((state.data.length + 0.1) * barHeight) + marginTop + marginBottom;
let svg, xScale, yScale;
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
    // save our data to application state
    state.data = raw_data;
    init();
  });



  /* INITIALIZING FUNCTION */
  // this will be run *one time* when the data finishes loading in
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
        .attr("height", height);  
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);

        console.log(uniquePersons, totalInterviews, idsMoreThanOnce)
  
  
    draw(); // calls the draw function
  }
  
  /* DRAW FUNCTION */
  // we call this every time there is an update to the data/state
  function draw() {

    const barHeight = 30;
    const yOffset = 40; 

    // svg.selectAll("rect")
    //     .data([totalInterviews, uniquePersons, idsMoreThanOnce])
    //     .join(
    //         enter => enter.append("rect")
    //             .attr('x', m.left)  // Start x at the left margin
    //             .attr('y', (_, i) => m.top + i * (barHeight + yOffset))                 
    //             .attr('width', d => xScale(d))
    //             .attr('height', barHeight)
    //             .attr('fill', (_, i) => i === 0 ? 'steelblue' : 'orange'),  // Different color for the second bar
    //         // + HANDLE UPDATE SELECTION
    //         update => update,
    //         // + HANDLE EXIT SELECTION
    //         exit => exit.remove()
    //     );

    svg.selectAll("rect")
    .data([totalInterviews])
    .enter()
    .append("rect")
    .class(".bar1")
    .attr('x', m.left)
    .attr('y', m.top)
    .attr('width', 0)
    .attr('height', yScale.bandwidth())
    .attr('fill', '#095256')
    .attr('class', 'bar')
    .transition()
    .duration(300)
    .attr("width", d=>xScale(d));


}


