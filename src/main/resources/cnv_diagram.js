/**
 * Draw a diagram of a CNV based on javascript data
 */
class CNVDiagram {
    
  constructor(svg, cnv_data_js, width, height) {   
      this.state = { 
          cnv_data_js: cnv_data_js, 
          svg: svg,
          width: width,
          height: height
      };
  }    
  
  componentWillMount() {
      this.loadCnvData();
  }
  
  setState(props) {
      this.state = Object.assign(this.state, props);
      this.render();
  }
  
  loadCnvData(callback) {
      
      var oldScriptElement = document.getElementById('cnv_load_script');
      if(oldScriptElement)
          oldScriptElement.parentNode.removeChild(oldScriptElement);
      
      const script = document.createElement("script");
      script.id = 'cnv_load_script';
//      script.src = process.env.PUBLIC_URL + "cnvs/cnv_chr1_1634904_1636473_UZG45_S46.js";
//      script.src = process.env.PUBLIC_URL + "cnvs/cnv_chr1_38095229_40230498_UZG45_S46.js";
//      script.src = process.env.PUBLIC_URL + "cnvs/cnv_chr19_53552485_53553607_170113_K00164_0104_ML170025_16W000437_clinex042_SSQXTCRE.js";
//      script.src = process.env.PUBLIC_URL + "cnvs/cnv_chr18_15005845_21894329_170113_K00164_0104_ML170026_16W000419_clinex042_SSQXTCRE.js";
      script.src = this.state.cnv_data_js;
      script.async = true;
      script.onload = () => { this.setState({cnv:window.cnv}); if(callback) callback(window.cnv); };
      document.body.appendChild(script);
  }    
  
  componentDidMount() {
      console.log("Did mount: refs="+this.refs);
      var svg = this.refs.svg;
      window.svg = svg;
      window.d3 = d3;
      this.renderPlot();
  }
  
  componentDidUpdate() {
      console.log("Did update");
      this.renderPlot();
  }
  
  /**
   * Render the variants for the CNV to this plot
   */
  renderCnvVariants(svg,cnv,plotLayout) {
      
      var xScale = plotLayout.xScale;
      var vEl = svg.selectAll('.cnvvariant')
         .data(cnv.variants)
         .enter()
         
      var variantHeight = 15;
      
      var baseline = plotLayout.stackHeight+5;
      vEl.append('line')
         .attr('x1', (v) => xScale(v.pos))
         .attr('x2', (v) => xScale(v.pos))
         .attr('y1', (v) => baseline)
         .attr('y2', (v) => baseline+variantHeight)
         .attr('stroke','green')
         .attr('stroke-width',3)
         
      vEl.append('line')
         .attr('x1', (v) => xScale(v.pos))
         .attr('x2', (v) => xScale(v.pos))
         .attr('y1', (v) => baseline)
         .attr('y2', (v) => baseline+variantHeight*v.frac)
         .attr('stroke','red')
         .attr('stroke-width',3)         
         
      plotLayout.stackHeight += (variantHeight+10);
  }
  
  renderCnvCalls(svg,cnv, plotLayout) {
      
      // Finally, draw the CNV calls themselves
      var callersBaseline = plotLayout.baselineY+plotLayout.exonHeight+25;
      var callerColors = ["blue","orange","purple","cyan","red","pink","yellow"];
      var callerColorIndex = 0;
      var callerTickHeight=4;
      var callQualFormat = d3.format(".2f");
      var callerHeight = 16;
      var callersYOffset = callersBaseline;
      var xScale = plotLayout.xScale;
      var textShiftMod=1;
      for(var caller in cnv.callers) {
          if ([].hasOwnProperty.call(cnv.callers, caller)) {
              if(cnv.callers[caller].calls.length > 6) {
                  var labelLines = Math.round(cnv.callers[caller].calls.length/3);
                  callersYOffset+=callerHeight*(labelLines-1);
                  textShiftMod=labelLines;
              }
              else
                  textShiftMod=1;
              
              var callSelect = svg.selectAll('.cnvCall')
                 .data(cnv.callers[caller].calls)
                 .enter()
      
              callSelect.append("line")
                        .attr("x1", function(call,i) { return xScale(call.start) })
                        .attr("x2", function(call,i) { return xScale(call.end) })
                        .attr("y1", function(call,i) { return callersYOffset; })
                        .attr("y2", function(call,i) { return callersYOffset; })
                        .attr("stroke", callerColors[callerColorIndex])
                        .attr("stroke-width", 3);
       
              callSelect.append("line")
                        .attr("x1", function(call,i) { return xScale(call.start) })
                        .attr("x2", function(call,i) { return xScale(call.start) })
                        .attr("y1", function(call,i) { return callersYOffset+callerTickHeight; })
                        .attr("y2", function(call,i) { return callersYOffset-callerTickHeight; })
                        .attr("stroke", callerColors[callerColorIndex])
                        .attr("stroke-width", 3);      
      
              callSelect.append("line")
                        .attr("x1", function(call,i) { return xScale(call.end) })
                        .attr("x2", function(call,i) { return xScale(call.end) })
                        .attr("y1", function(call,i) { return callersYOffset+callerTickHeight; })
                        .attr("y2", function(call,i) { return callersYOffset-callerTickHeight; })
                        .attr("stroke", callerColors[callerColorIndex])
                        .attr("stroke-width", 3);
      
              callSelect.append("text")
                        .attr("x", function(call,i) { return xScale((call.end + call.start)/2) /*+ cnv.callers[caller].caller.length*8 */ })
                        .attr("y", function(call,i) { return callersYOffset+callerTickHeight-10*(1+(i % textShiftMod)) })
                        .text(function(call,i) { return cnv.callers[caller].caller + " ("+callQualFormat(call.quality)+")"});
       
              ++callerColorIndex;
              callersYOffset+=callerHeight+2;
          }
      }      
      
      // Always allow 10px gap for callers
      plotLayout.callersHeight+=(callersYOffset-callersBaseline) + 10;
      plotLayout.stackHeight = callersYOffset;
  }
  
  renderPlot() {
      
      var cnv = this.state.cnv;
      if(!cnv)
          return;
      
      // The element into which all our drawing will be done
      var svg = d3.select(this.state.svg)
  
      var start = cnv.targets[0].start;
      var end = cnv.targets[cnv.targets.length-1].end;
      var size = end - start;
      
      var bases = cnv.targets.map((target) => target.end - target.start).reduce((target, acc) => acc + target);
      
      var domains = [];
      cnv.targets.forEach(function(t) { domains.push(t.start); domains.push(t.end); });
      
      var ranges = [];
      var intronSize = 10;
      var xPadding = 80;
      
      
      var plotLayout = {
          width: this.state.width,
          xOffset : xPadding / 2,
          baselineY : 25,
          exonHeight : 14,
          xScale : null // populated later
      }
      
      // The stack height is the position which each new track is added
      // It is adjusted as each component gets added in
      plotLayout.stackHeight = plotLayout.baselineY;
      
      // We construct the x-scale piecewise with gaps between each
      // target region
      var scaleFactor = (plotLayout.width - intronSize*(cnv.targets.length-1)) / bases;
      var prevEnd = plotLayout.xOffset;
      cnv.targets.forEach(function(t) { 
          ranges.push(prevEnd); 
          var targetEnd = prevEnd + (scaleFactor*(t.end-t.start));
          ranges.push(targetEnd); 
          prevEnd = targetEnd + intronSize;
      });
      
      console.log("Domains are: " + domains);
      console.log("Ranges are: " + ranges);
      
      var xScale = d3.scaleLinear()
                     .domain(domains)
                     .range(ranges);
      
      plotLayout.xScale = xScale;
      
      window.xScale = xScale;
     
     
    plotLayout.stackHeight = plotLayout.baselineY;
      
    // Draw genes and target regions
    var geneLines = svg.selectAll('.baseline')
        .data(cnv.genes) 
        .enter()
        
    var geneMarkHeight = 6;
      
    // Draw the genes 
    // Three separate parts: the horizontal line, then vertical strokes at beginning and end
    geneLines.append('line')
        .attr('x1', (gene) => xScale(gene.end)+2)
        .attr('x2', (gene) => xScale(gene.start)-2)
        .attr('y1', (gene) => plotLayout.baselineY+(plotLayout.exonHeight/2))
        .attr('y2', (gene) => plotLayout.baselineY+(plotLayout.exonHeight/2))
        .attr('style', "stroke:green;stroke-width:3")
            
    geneLines.append('line')
        .attr('x1', function(gene) { console.log("Gene end = " + gene.end); return xScale(gene.end)+3 })
        .attr('x2', (gene) => xScale(gene.end)+3)
        .attr('y1', (gene) => plotLayout.baselineY+(plotLayout.exonHeight)+geneMarkHeight)
        .attr('y2', (gene) => plotLayout.baselineY-geneMarkHeight)
        .attr('style', "stroke:green;stroke-width:3")

    geneLines.append('line')
        .attr('x1', function(gene) { console.log("Gene start = " + gene.start); return xScale(gene.start)-5 })
        .attr('x2', (gene) => xScale(gene.start)-5)
        .attr('y1', (gene) => plotLayout.baselineY+(plotLayout.exonHeight)+geneMarkHeight)
        .attr('y2', (gene) => plotLayout.baselineY-geneMarkHeight)
        .attr('style', "stroke:green;stroke-width:3");
            
    geneLines.append('text')
             .attr('x', function(gene) { return xScale((gene.end+gene.start)/2)})
             .attr('y', function(gene) { return plotLayout.baselineY-geneMarkHeight-5})
             .text(function(gene) { return gene.gene; })
             
    plotLayout.stackHeight += plotLayout.exonHeight;
    
    this.renderCnvCalls(svg,cnv,plotLayout)
    
    // Do we have variants? If so, draw them
    if(cnv.variants && cnv.variants.length>0)
        this.renderCnvVariants(svg,cnv, plotLayout) 
      
      var yScale = d3.scaleLinear()
                     .domain([-0.25,2.5])
                     .range([this.state.height,plotLayout.stackHeight]);
      
     
      // Draw axes
      var gridYValues = [-0.25, 0,0.25,0.5,0.75,1.0,1.25,1.5,1.75,2.0,2.25,2.5];
      var gridColor = d3.rgb('#eeeeee');
      svg.selectAll('.xgrid')
         .data(gridYValues)
         .enter()
         .append("path")
         .attr("d", function(y) { 
              console.log("Gridy line " + y + " at " + yScale(y));
              return d3.line().x(function(d,i) { return xScale(i===0 ? start : end); })
                              .y(function(d,i) { return yScale(y); })
                              .curve(d3.curveLinear)([y,y]);
          })
         .attr("stroke", gridColor)
         .attr("stroke-width", 1)
         .attr("fill", "none");  
      
      var gridYValuesMax = Math.max.apply(null,gridYValues);
      var gridYMin = yScale(Math.min.apply(null,gridYValues));
      var gridYMax = yScale(gridYValuesMax);
      
      var yMargin = 4;
      
      // Draw outer rectangle
      svg.append('rect')
         .attr('x',xScale(start)-1)
         .attr('y',Math.min(gridYMin,gridYMax))
         .attr('width',xScale(end)-xScale(start))
         .attr('height',Math.abs(gridYMax - gridYMin))
         .attr('style', 'stroke:#888;stroke-width:1;fill:transparent;')
         .attr('rx',2)
         .attr('ry',2)
      
     svg.append('line')
         .attr('x1',xScale(start))
         .attr('y1',yScale(1.0))
         .attr('x2',xScale(end))
         .attr('y2',yScale(1.0))
         .attr('style', 'stroke:gray;stroke-width:2;');
      
//      svg.selectAll('.baseline')
//        .data([cnv]) 
//        .enter()
//        .append('line')
//            .attr('x1', (cnv) => xScale(cnv.targets[0].end))
//            .attr('x2', (cnv) => xScale(cnv.targets[cnv.targets.length-1].start))
//            .attr('y1', (cnv) => plotLayout.baselineY+(plotLayout.exonHeight/2))
//            .attr('y2', (cnv) => plotLayout.baselineY+(plotLayout.exonHeight/2))
//            .attr('style', "stroke:green;stroke-width:3")
            
             
    var yAxis = d3.axisLeft(yScale)
                  .tickValues(gridYValues.slice(1))
                  .tickFormat(d3.format(".2f"))
                    
    svg.append("g")
       .attr("transform", "translate(30,0)")
       .call(yAxis);
    
    svg.selectAll('.target')
        .data(cnv.targets)
        .enter()
        .append('rect')
            .attr('class', 'target')
            .attr('fill', 'green')
            .attr('stroke','green') 
            .attr('x',function(target) { return xScale(target.start); })
            .attr('y',plotLayout.baselineY)
            .attr('rx',3)
            .attr('ry',3)
            .attr('height',function() {
                return plotLayout.exonHeight;
            })
            .attr('width',function(target) { return Math.max(1,xScale(target.end) - xScale(target.start)); });
      
    // Draw vertical gridlines
    svg.selectAll('.targetgrid')
       .data(cnv.targets.slice(1))
       .enter()
       .append('line')
           .attr('class', 'targetgrid')
           .attr('stroke','#eee') 
           .attr('x1',function(target) {return xScale(target.start) - intronSize/2})
           .attr('y1',Math.min(gridYMin,gridYMax))
           .attr('x2',function(target) { return xScale(target.start) - intronSize/2})
           .attr('y2',Math.max(gridYMin,gridYMax))
       
//      svg.selectAll('.targetgridend')
//        .data(cnv.targets)
//        .enter()
//        .append('line')
//            .attr('class', 'targetgrid')
//            .attr('stroke','#eee') 
//            .attr('x1',function(target) {return xScale(target.end)})
//            .attr('y1',Math.min(gridYMin,gridYMax))
//            .attr('x2',function(target) { return xScale(target.end)})
//            .attr('y2',Math.max(gridYMin,gridYMax))
           
         
       console.log("gridYMax = " + gridYMax);
       // Draw the standard deviation
       for(var i=0; i<cnv.targets.length; ++i) {

           var target = cnv.targets[i];
       
           // The plain sd values are not great because we actually 
           // want to see them relative to the mean (1.0) and we also want
           // to see them in the same direction as the test sample
           // So we do this transform to map their values to that form
           var sdValues = target.coverageSd.map(function(x,i) {
               return Math.min(gridYValuesMax-0.01, Math.max(0, target.sampleCov[i]>1.0 ? 1+x : 1-x));
           });
      
           var lineSd = d3.line()
                         .x(function(c,i) { return xScale(target.start + i); })
                         .y(function(c,i) { return yScale(c); })
                         .curve(d3.curveLinear);
      
           var area = d3.area()
                        .x(function(c,i) { return xScale(target.start + i); })
                        .y0(yScale(1.0))
                        .y1(function(c,i) { return yScale(c) })
           
           svg.append("path")
              .attr("class", "area")
              .attr("d", area(sdValues))
              .attr("fill", "#f5eeee")
              .attr("stroke", "#eee")
              .attr("stroke-width", 2)
      }     
           
      // Draw the sample coverage
      for(var i=0; i<cnv.targets.length; ++i) {
          var target = cnv.targets[i];
      
          var line = d3.line()
                       .x(function(c,i) { return xScale(target.start + i); })
                       .y(function(c,i) { return yScale(Math.min(c,gridYValuesMax)); })
                       .curve(d3.curveLinear);
      
          svg.append("path")
             .attr("d", line(target.sampleCov))
             .attr("stroke", "red")
             .attr("stroke-width", 2)
             .attr("fill", "none");
      }
      

  }
  
  render() {
  }
}