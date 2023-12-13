import * as d3 from "d3";
import ScrollMagic from "scrollmagic";
import { TweenMax, TimelineMax } from "gsap"; // Also works with TweenLite and TimelineLite
import { ScrollMagicPluginGsap } from "scrollmagic-plugin-gsap";

ScrollMagicPluginGsap(ScrollMagic, TweenMax, TimelineMax);


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
    // Create the first bar initially
    const controller = new ScrollMagic.Controller();

    // Create the first bar
    svg.selectAll("rect")
        .data([totalInterviews])  // Start with a height of 0
        .enter()
        .append("rect")
        .attr('x', m.left)
        .attr('y', m.top)
        .attr('width', 0)
        .attr('height', barHeight)
        .attr('fill', '#095256')
        .attr('class', 'bar')
        .transition()
        .duration(1000)
        .attr("width", d => xScale(d));  // Add a class for easier selection
    
    // Create ScrollMagic scene for growing the first bar
    // const growFirstBarScene = new ScrollMagic.Scene({
    //     triggerElement: "#container",  // Adjust the trigger element as needed
    //     duration: 500,  // Adjust the duration of the animation
    //     offset: 200,  // Adjust the offset to control when the animation starts
    // })
    //     .setTween(TweenMax.to(".bar", 1, { width: xScale(totalInterviews) }))  // Animation to grow the bar
    //     .addTo(controller);
    
    // // Create the second bar with initial height set to 0
    // svg.selectAll("rect.second-bar")
    //     .data([uniquePersons])  // Initial height is 0
    //     .enter()
    //     .append("rect")
    //     .attr('x', m.left)
    //     .attr('y', m.top + barHeight + yOffset)  // Position it below the first bar
    //     .attr('width', 0)  // Initial width is 0
    //     .attr('height', 0)  // Initial height is 0
    //     .attr('fill', 'orange')
    //     .attr('class', 'second-bar');  // Add a class for easier selection

    // // Create ScrollMagic scene for growing the second bar
    // const growSecondBarScene = new ScrollMagic.Scene({
    //     triggerElement: "#container",
    //     duration: 300,
    //     offset: 400
    // })
    // .on("progress", (event) => {
    //     // Animate the growth of the second bar based on the scroll progress
    //     const newHeight = event.progress * barHeight;
    //     svg.selectAll(".second-bar")
    //         .attr('height', newHeight);
    // })
    // .addTo(controller);
}


