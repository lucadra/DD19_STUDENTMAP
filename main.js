function generateGEXF(nodes, links) {
  let gexf = '<?xml version="1.0" encoding="UTF-8"?>';
  gexf += '<gexf xmlns="http://www.gexf.net/1.2" version="1.2">';
  gexf += '<meta lastmodifieddate="' + new Date().toISOString() + '">';
  gexf += '<creator>DD19</creator>';
  gexf += '</meta>';
  gexf += '<graph mode="static" defaultedgetype="directed">';

  // Nodes
  gexf += '<nodes>';
  nodes.forEach((node, index) => {
      gexf += '<node id="' + index + '" label="' + node.name + '"/>';
  });
  gexf += '</nodes>';

  // Edges
  gexf += '<edges>';
  links.forEach((link, index) => {
    console.log(link)
      const sourceId = nodes.findIndex(node => node.name === link.source.name);
      const targetId = nodes.findIndex(node => node.name === link.target.name);
      gexf += '<edge id="' + index + '" source="' + sourceId + '" target="' + targetId + '"/>';
  });
  gexf += '</edges>';

  gexf += '</graph></gexf>';

  return gexf;
}

function downloadGEXF(nodes, links) {
  const gexfContent = generateGEXF(nodes, links);
  const blob = new Blob([gexfContent], {type: "application/xml"});
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = "network.gexf";

  document.body.appendChild(a);
  a.click();

  window.URL.revokeObjectURL(url);
}


d3.csv(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRlmsylkRlBQCqq0tWvQNmBVbwy6kz-dy5zICdAne8u-aFvIKd8jBZluEVNkpP6z7wgxH40YZgiya9C/pub?gid=234658209&single=true&output=csv"
).then(function (data, error) {
  console.log(data)
  // DATA MANIPULATION
  const students = data.map(function (d) {
    return [
      d["What is your name? "],
      ...d["Which of these students did you know already? "].split(", "),
    ];
  });

  const nodes = [...new Set(students.flat())].map(function (d) {
    return { name: d };
  });

  function getLinks() {
    return data.reduce((acc, item) => {
      const source = item["What is your name? "];
      const targets =
        item["Which of these students did you know already? "].split(", ");
      const linkArray = targets.map((target) => ({
        source: source,
        target: target,
      }));
      return acc.concat(linkArray);
    }, []);
  }

  const links = getLinks().filter(function (d) {
    return d.source !== d.target;
  });

  //DEGREE
  nodes.forEach(function (d) {
    d.degree = links.filter(function (l) {
      return l.source === d.name || l.target === d.name;
    }).length;
  });

  //SVG AND ZOOM
  const svg = d3
    .select("#wrapper")
    .append("svg")
    .attr("viewBox", [0, 0, 1166, 500]);

  const g = svg.append("g");

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", function () {
      g.attr("transform", d3.event.transform);
    });

  svg.call(zoom);

  //FILTER
  svg
    .append("defs")
    .append("filter")
    .attr("id", "blur")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%")
    .append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", 5);

  //NODES AND LINKS
  const link = g
    .append("g")
    .attr("stroke", "#c09bd8ff")
    .attr("stroke-opacity", 0.8)
    .selectAll("line")
    .data(links)
    .join("line");

  const node = g
    .append("g")
    .selectAll(".node-group")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node-group");

  node
    .append("circle")
    .attr("fill", "#9f84bdff")
    .attr("r", (d) => Math.sqrt(d.degree) * 10)
    .attr("filter", "url(#blur)");

  
  const labels = node
    .append("text")
    .text((d) => {
      const nameParts = d.name.split(" ");
      const firstNameInitial = nameParts.pop()[0];
      const surnameInitial = nameParts[0][0];
      return firstNameInitial + ". " + surnameInitial + ".";
  })  
    .attr("font-family", "Work Sans")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("fill", "white");

  labels.each(function (d, i) {
    const bbox = this.getBBox();
    const padding = 2;
    d3.select(this.parentNode)
      .insert("rect", "text")
      .attr("x", bbox.x - padding * 2)
      .attr("y", bbox.y - padding)
      .attr("width", bbox.width + padding * 4)
      .attr("height", bbox.height + padding * 2)
      .attr("fill", "#c09bd8ff")
      .attr("rx", 5);
  });

  let maxLabelWidth = 0;
  labels.each(function () {
    const bbox = this.getBBox();
    if (bbox.width > maxLabelWidth) {
      maxLabelWidth = bbox.width;
    }
  });


  //SIMULATION
  const simulation = d3.forceSimulation(nodes);

  simulation
    .force(
      "link",
      d3.forceLink(links).id((d) => d.name)
    )
    .force("charge", d3.forceManyBody().strength(-4000))
    .force("center", d3.forceCenter(350, 250))
    .force(
      "collide",
      d3
        .forceCollide()
        .radius((d) => Math.log(d.degree) * 5 + maxLabelWidth / 2 + 5)
    );

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
  });

  const button = document.querySelector("#download");
  button.onclick = () => downloadGEXF(nodes, links);

});
