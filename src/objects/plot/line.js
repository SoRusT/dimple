    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/plot/line.js
    dimple.plot.line = {
        stacked: false,
        supportedAxes: ["x", "y", "c"],
        draw: function (chart, series, duration) {
            // Get the position data
            var data = series._positionData,
                self = this,
                lineData = [],
                theseShapes = null,
                className = "series" + chart.series.indexOf(series),
                // If there is a category axis we should draw a line for each aggField.  Otherwise
                // the first aggField defines the points and the others define the line
                firstAgg = (series.x._hasCategories() || series.y._hasCategories() ? 0 : 1),
                // Build the point calculator
                lineCoords = d3.svg.line()
                    .x(function (d) { return dimple._helpers.cx(d, chart, series); })
                    .y(function (d) { return dimple._helpers.cy(d, chart, series); }),
                // Build the point calculator
                entryCoords = d3.svg.line()
                    .x(function (d) { return (series.x._hasCategories() ? dimple._helpers.cx(d, chart, series) : series.x._origin); })
                    .y(function (d) { return (series.y._hasCategories() ? dimple._helpers.cy(d, chart, series) : series.y._origin); }),
                graded = false,
                i,
                k,
                key,
                keyString,
                rowIndex,
                getSeriesOrder = function (d, s) {
                    var rules = [].concat(series._orderRules),
                        cats = s.categoryFields,
                        returnValue = [];
                    if (cats !== null && cats !== undefined && cats.length > 0) {
                        // Concat is used here to break the reference to the parent array, if we don't do this, in a storyboarded chart,
                        // the series rules to grow and grow until the system grinds to a halt trying to deal with them all.
                        if (s.c !== null && s.c !== undefined && s.c._hasMeasure()) {
                            rules.push({ ordering : s.c.measure, desc : true });
                        }
                        if (s.x._hasMeasure()) {
                            rules.push({ ordering : s.x.measure, desc : true });
                        }
                        if (s.y._hasMeasure()) {
                            rules.push({ ordering : s.y.measure, desc : true });
                        }
                        returnValue = dimple._getOrderedList(d, cats, rules);
                    }
                    return returnValue;
                },
                // Get the array of ordered values
                orderedSeriesArray = getSeriesOrder(series.data || chart.data, series),
                arrayIndexCompare = function (array, a, b) {
                    var returnValue,
                        p,
                        q,
                        aMatch,
                        bMatch,
                        rowArray;
                    for (p = 0; p < array.length; p += 1) {
                        aMatch = true;
                        bMatch = true;
                        rowArray = [].concat(array[p]);
                        for (q = 0; q < a.length; q += 1) {
                            aMatch = aMatch && (a[q] === rowArray[q]);
                        }
                        for (q = 0; q < b.length; q += 1) {
                            bMatch = bMatch && (b[q] === rowArray[q]);
                        }
                        if (aMatch && bMatch) {
                            returnValue = 0;
                            break;
                        } else if (aMatch) {
                            returnValue = -1;
                            break;
                        } else if (bMatch) {
                            returnValue = 1;
                            break;
                        }
                    }
                    return returnValue;
                },
                sortFunction = function (a, b) {
                    var sortValue = 0;
                    if (series.x._hasCategories()) {
                        sortValue = (dimple._helpers.cx(a, chart, series) < dimple._helpers.cx(b, chart, series) ? -1 : 1);
                    } else if (series.y._hasCategories()) {
                        sortValue = (dimple._helpers.cy(a, chart, series) < dimple._helpers.cy(b, chart, series) ? -1 : 1);
                    } else if (orderedSeriesArray !== null && orderedSeriesArray !== undefined) {
                        sortValue = arrayIndexCompare(orderedSeriesArray, a.aggField, b.aggField);
                    }
                    return sortValue;
                },
                addTransition = function (input, duration) {
                    var returnShape = null;
                    if (duration === 0) {
                        returnShape = input;
                    } else {
                        returnShape = input.transition().duration(duration);
                    }
                    return returnShape;
                },
                drawMarkerBacks = function (lineDataRow) {
                    var markerBacks,
                        markerBackClasses = ["markerBacks", className, lineDataRow.keyString],
                        rem;
                    if (series.lineMarkers) {
                        if (chart._group.selectAll("." + markerBackClasses.join("."))[0].length === 0) {
                            markerBacks = chart._group.selectAll("." + markerBackClasses.join(".")).data(lineDataRow.data);
                        } else {
                            markerBacks = series._markerBacks.data(lineDataRow.data, function (d) { return d.keyString; });
                        }
                        // Add
                        markerBacks
                            .enter()
                            .append("circle")
                            .attr("id", function (d) { return d.keyString; })
                            .attr("class", markerBackClasses.join(" "))
                            .attr("cx", function (d) { return (series.x._hasCategories() ? dimple._helpers.cx(d, chart, series) : series.x._origin); })
                            .attr("cy", function (d) { return (series.y._hasCategories() ? dimple._helpers.cy(d, chart, series) : series.y._origin); })
                            .attr("r", 0)
                            .attr("fill", "white")
                            .attr("stroke", "none");

                        // Update
                        addTransition(markerBacks, duration)
                            .attr("cx", function (d) { return dimple._helpers.cx(d, chart, series); })
                            .attr("cy", function (d) { return dimple._helpers.cy(d, chart, series); })
                            .attr("r", 2 + series.lineWeight);

                        // Remove
                        rem = addTransition(markerBacks.exit(), duration)
                            .attr("r", 0);

                        // Run after transition methods
                        if (duration === 0) {
                            rem.remove();
                        } else {
                            rem.each("end", function () {
                                d3.select(this).remove();
                            });
                        }

                        series._markerBacks = markerBacks;
                    }
                },
                // Add the actual marker. We need to do this even if we aren't displaying them because they
                // catch hover events
                drawMarkers = function (lineDataRow) {
                    var markers,
                        markerClasses = ["markers", className, lineDataRow.keyString],
                        rem;
                    // Deal with markers in the same way as main series to fix #28
                    if (chart._group.selectAll("." + markerClasses.join("."))[0].length === 0) {
                        markers = chart._group.selectAll("." + markerClasses.join(".")).data(lineDataRow.data);
                    } else {
                        markers = series._markers.data(lineDataRow.data, function (d) { return d.keyString; });
                    }
                    // Add
                    markers
                        .enter()
                        .append("circle")
                        .attr("id", function (d) { return d.keyString; })
                        .attr("class", markerClasses.join(" "))
                        .on("mouseover", function (e) {
                            self.enterEventHandler(e, this, chart, series);
                        })
                        .on("mouseleave", function (e) {
                            self.leaveEventHandler(e, this, chart, series);
                        })
                        .attr("cx", function (d) { return (series.x._hasCategories() ? dimple._helpers.cx(d, chart, series) : series.x._origin); })
                        .attr("cy", function (d) { return (series.y._hasCategories() ? dimple._helpers.cy(d, chart, series) : series.y._origin); })
                        .attr("r", 0)
                        .attr("opacity", function (d) { return (series.lineMarkers ? chart.getColor(d).opacity : 0); })
                        .call(function () {
                            if (!chart.noFormats) {
                                this.attr("fill", "white")
                                    .style("stroke-width", series.lineWeight)
                                    .attr("stroke", function (d) {
                                        return (graded ? dimple._helpers.fill(d, chart, series) : chart.getColor(d.aggField[d.aggField.length - 1]).stroke);
                                    });
                            }
                        });

                    // Update
                    addTransition(markers, duration)
                        .attr("cx", function (d) { return dimple._helpers.cx(d, chart, series); })
                        .attr("cy", function (d) { return dimple._helpers.cy(d, chart, series); })
                        .attr("r", 2 + series.lineWeight)
                        .call(function () {
                            if (!chart.noFormats) {
                                this.attr("fill", "white")
                                    .style("stroke-width", series.lineWeight)
                                    .attr("stroke", function (d) {
                                        return (graded ? dimple._helpers.fill(d, chart, series) : chart.getColor(d.aggField[d.aggField.length - 1]).stroke);
                                    });
                            }
                        });

                    // Remove
                    rem = addTransition(markers.exit(), duration)
                        .attr("r", 0);

                    // Run after transition methods
                    if (duration === 0) {
                        rem.remove();
                    } else {
                        rem.each("end", function () {
                            d3.select(this).remove();
                        });
                    }

                    series._markers = markers;
                },
                updated,
                removed;

            if (series.c !== null && series.c !== undefined && ((series.x._hasCategories() && series.y._hasMeasure()) || (series.y._hasCategories() && series.x._hasMeasure()))) {
                graded = true;
            }

            // Create a set of line data grouped by the aggregation field
            for (i = 0; i < data.length; i += 1) {
                key = [];
                rowIndex = -1;
                // Skip the first category unless there is a category axis on x or y
                for (k = firstAgg; k < data[i].aggField.length; k += 1) {
                    key.push(data[i].aggField[k]);
                }
                // Find the corresponding row in the lineData
                keyString = key.join(" ").split(" ").join("_");
                for (k = 0; k < lineData.length; k += 1) {
                    if (lineData[k].keyString === keyString) {
                        rowIndex = k;
                        break;
                    }
                }
                // Add a row to the line data if none was found
                if (rowIndex === -1) {
                    rowIndex = lineData.length;
                    lineData.push({ key: key, keyString: keyString, data: [], line: {}, entry: {} });
                }
                // Add this row to the relevant data
                lineData[rowIndex].data.push(data[i]);
            }

            // Sort the line data itself based on the order series array - this matters for stacked lines and default color
            // consistency with colors usually awarded in terms of prominence
            if (orderedSeriesArray !== null && orderedSeriesArray !== undefined) {
                lineData.sort(function (a, b) {
                    return arrayIndexCompare(orderedSeriesArray, a.key, b.key);
                });
            }

            // Create a set of line data grouped by the aggregation field
            for (i = 0; i < lineData.length; i += 1) {
                // Sort the points so that lines are connected in the correct order
                lineData[i].data.sort(sortFunction);
                // If this should have colour gradients, add them
                if (graded) {
                    dimple._addGradient(lineData[i].key, "fill-line-gradient-" + key.keyString, (series.x._hasCategories() ? series.x : series.y), data, chart, duration, "fill");
                }
                // Get the points that this line will appear
                lineData[i].entry = entryCoords(lineData[i].data);
                // Get the actual points of the line
                lineData[i].line = lineCoords(lineData[i].data);
            }

            if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
                chart._tooltipGroup.remove();
            }

            if (series.shapes === null || series.shapes === undefined) {
                theseShapes = chart._group.selectAll("." + className).data(lineData);
            } else {
                theseShapes = series.shapes.data(lineData, function (d) { return d.key; });
            }

            // Add
            theseShapes
                .enter()
                .append("path")
                .attr("id", function (d) { return d.key; })
                .attr("class", function (d) {
                    return className + " line " + d.keyString;
                })
                .attr("d", function (d) {
                    return d.entry;
                })
                .call(function () {
                    // Apply formats optionally
                    if (!chart.noFormats) {
                        this.attr("opacity", function (d) { return (graded ? 1 : chart.getColor(d.key[d.key.length - 1]).opacity); })
                            .attr("fill", "none")
                            .attr("stroke", function (d) { return (graded ? "url(#fill-line-gradient-" + d.key.keyString + ")" : chart.getColor(d.key[d.key.length - 1]).stroke); })
                            .attr("stroke-width", series.lineWeight);
                    }
                })
                .each(drawMarkerBacks)
                .each(drawMarkers);

            // Update
            updated = addTransition(theseShapes, duration)
                .attr("d", function (d) { return d.line; })
                .each(drawMarkerBacks)
                .each(drawMarkers);

            // Remove
            removed = addTransition(theseShapes.exit(), duration)
                .attr("d", function (d) {
                    return d.entry;
                });

            // Run after transition methods
            if (duration === 0) {
                updated.each(function (d, i) {
                    if (series.afterDraw !== null && series.afterDraw !== undefined) {
                        series.afterDraw(this, d, i);
                    }
                });
                removed.remove();
            } else {
                updated.each("end", function (d, i) {
                    if (series.afterDraw !== null && series.afterDraw !== undefined) {
                        series.afterDraw(this, d, i);
                    }
                });
                removed.each("end", function () {
                    d3.select(this).remove();
                });
            }

            // Save the shapes to the series array
            series.shapes = theseShapes;

        },
        drawOld: function (chart, series, duration) {

            // Get self pointer for inner functions
            var self = this,
                sourceData = series.data || chart.data,
                data = series._positionData,
                fillIns = [],
                uniqueValues = [],
                // If there is a category axis we should draw a line for each aggField.  Otherwise
                // the first aggField defines the points and the others define the line
                firstAgg = 1,
                graded = false,
                seriesClass = "series" + chart.series.indexOf(series),
                orderedSeriesArray = dimple._getOrderedList(sourceData,  series.categoryFields, [].concat(series._orderRules)),
                line,
                markers,
                markerBacks;

            if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
                chart._tooltipGroup.remove();
            }

            if (series.x._hasCategories() || series.y._hasCategories()) {
                firstAgg = 0;
            }

            data.forEach(function (d) {
                var filter = [],
                    match = false,
                    k;

                for (k = firstAgg; k < d.aggField.length; k += 1) {
                    filter.push(d.aggField[k]);
                }

                uniqueValues.forEach(function (d) {
                    match = match || (d.join("/") === filter.join("/"));
                }, this);

                if (!match) {
                    uniqueValues.push(filter);
                }

            }, this);

            if (series.c !== null && series.c !== undefined && ((series.x._hasCategories() && series.y._hasMeasure()) || (series.y._hasCategories() && series.x._hasMeasure()))) {
                graded = true;
                uniqueValues.forEach(function (seriesValue) {
                    dimple._addGradient(seriesValue, "fill-line-gradient-" + seriesValue.join("_").replace(" ", ""), (series.x._hasCategories() ? series.x : series.y), data, chart, duration, "fill");
                }, this);
            }

            line = d3.svg.line()
                .x(function (d) { return dimple._helpers.cx(d, chart, series); })
                .y(function (d) { return dimple._helpers.cy(d, chart, series); });

            if (series.shapes === null || series.shapes === undefined) {
                series.shapes = chart._group.selectAll(".line." + seriesClass)
                    .data(uniqueValues)
                    .enter()
                        .append("svg:path")
                            .attr("opacity", function(d) { return chart.getColor(d).opacity; });
            }

            series.shapes
                .data(uniqueValues)
                .transition().duration(duration)
                .attr("class", function (d) { return seriesClass + " series line " + d.join("_").split(" ").join("_"); })
                .attr("d", function (d) {
                    var seriesData = [];
                    data.forEach(function (r) {
                        var add = true,
                            k;
                        for (k = firstAgg; k < r.aggField.length; k += 1) {
                            add = add && (d[k - firstAgg] === r.aggField[k]);
                        }
                        if (add) {
                            seriesData.push(r);
                        }
                    }, this);
                    seriesData.sort(function (a, b) {
                        var sortValue = 0,
                            p,
                            q,
                            aMatch,
                            bMatch;
                        if (series.x._hasCategories()) {
                            sortValue = (dimple._helpers.cx(a, chart, series) < dimple._helpers.cx(b, chart, series) ? -1 : 1);
                        } else if (series.y._hasCategories()) {
                            sortValue = (dimple._helpers.cy(a, chart, series) < dimple._helpers.cy(b, chart, series) ? -1 : 1);
                        } else if (orderedSeriesArray !== null && orderedSeriesArray !== undefined) {
                            for (p = 0; p < orderedSeriesArray.length; p += 1) {
                                aMatch = true;
                                bMatch = true;
                                for (q = 0; q < a.aggField.length; q += 1) {
                                    aMatch = aMatch && (a.aggField[q] === orderedSeriesArray[p][q]);
                                }
                                for (q = 0; q < b.aggField.length; q += 1) {
                                    bMatch = bMatch && (b.aggField[q] === orderedSeriesArray[p][q]);
                                }
                                if (aMatch && bMatch) {
                                    sortValue = 0;
                                    break;
                                } else if (aMatch) {
                                    sortValue = -1;
                                    break;
                                } else if (bMatch) {
                                    sortValue = 1;
                                    break;
                                }
                            }
                        }
                        return sortValue;
                    });
                    if (seriesData.length === 1) {
                        fillIns.push({
                            cx: dimple._helpers.cx(seriesData[0], chart, series),
                            cy: dimple._helpers.cy(seriesData[0], chart, series),
                            opacity: chart.getColor(d[d.length - 1]).opacity,
                            color: chart.getColor(d[d.length - 1]).stroke
                        });
                        d3.select(this).remove();
                    }
                    return line(seriesData);
                })
                .call(function () {
                    if (!chart.noFormats) {
                        this.attr("fill", "none")
                            .attr("stroke", function (d) { return (graded ? "url(#fill-line-gradient-" + d.join("_").replace(" ", "") + ")" : chart.getColor(d[d.length - 1]).stroke);    })
                            .attr("stroke-width", series.lineWeight);
                    }
                });

            if (series.lineMarkers) {
                if (series._markerBacks === null || series._markerBacks === undefined) {
                    markerBacks = chart._group.selectAll(".markerBacks." + seriesClass).data(data);
                } else {
                    markerBacks = series._markerBacks.data(data, function (d) { return d.key; });
                }
                // Add
                markerBacks
                    .enter()
                    .append("circle")
                    .attr("id", function (d) { return d.key; })
                    .attr("class", "markerBacks " + seriesClass)
                    .attr("cx", function (d) { return dimple._helpers.cx(d, chart, series); })
                    .attr("cy", function (d) { return dimple._helpers.cy(d, chart, series); })
                    .attr("r", 0)
                    .attr("fill", "white")
                    .attr("stroke", "none");

                // Update
                markerBacks
                    .transition().duration(duration)
                    .attr("cx", function (d) { return dimple._helpers.cx(d, chart, series); })
                    .attr("cy", function (d) { return dimple._helpers.cy(d, chart, series); })
                    .attr("r", 2 + series.lineWeight);
                // Remove
                markerBacks
                    .exit()
                    .transition().duration(duration)
                    .attr("r", 0)
                    .each("end", function () {
                        d3.select(this).remove();
                    });
                series._markerBacks = markerBacks;
            }

            // Deal with markers in the same way as main series to fix #28
            if (series._markers === null || series._markers === undefined) {
                markers = chart._group.selectAll(".markers." + seriesClass).data(data);
            } else {
                markers = series._markers.data(data, function (d) { return d.key; });
            }


            // Add the actual marker. We need to do this even if we aren't displaying them because they
            // catch hover events
            markers
                .enter()
                .append("circle")
                .attr("id", function (d) { return d.key; })
                .attr("class", "markers " + seriesClass)
                .on("mouseover", function (e) {
                    self.enterEventHandler(e, this, chart, series);
                })
                .on("mouseleave", function (e) {
                    self.leaveEventHandler(e, this, chart, series);
                })
                .attr("cx", function (d) { return dimple._helpers.cx(d, chart, series); })
                .attr("cy", function (d) { return dimple._helpers.cy(d, chart, series); })
                .attr("r", 0)
                .attr("opacity", function (d) { return (series.lineMarkers ? chart.getColor(d).opacity : 0); })
                .call(function () {
                    if (!chart.noFormats) {
                        this.attr("fill", "white")
                            .style("stroke-width", series.lineWeight)
                            .attr("stroke", function (d) {
                                return (graded ? dimple._helpers.fill(d, chart, series) : chart.getColor(d.aggField[d.aggField.length - 1]).stroke);
                            });
                    }
                });

            markers
                .transition().duration(duration)
                .attr("cx", function (d) { return dimple._helpers.cx(d, chart, series); })
                .attr("cy", function (d) { return dimple._helpers.cy(d, chart, series); })
                .attr("r", 2 + series.lineWeight)
                .call(function () {
                    if (!chart.noFormats) {
                        this.attr("fill", "white")
                            .style("stroke-width", series.lineWeight)
                            .attr("stroke", function (d) {
                                return (graded ? dimple._helpers.fill(d, chart, series) : chart.getColor(d.aggField[d.aggField.length - 1]).stroke);
                            });
                    }
                });

            markers
                .exit()
                .transition().duration(duration)
                .attr("r", 0)
                .each("end", function () {
                    d3.select(this).remove();
                });

            // Save the shapes to the series array
            series._markers = markers;

            // Deal with single point lines if there are no markers
            if (!series.lineMarkers) {
                chart._group.selectAll(".fill")
                    .data(fillIns)
                    .enter()
                    .append("circle")
                    .attr("cx", function (d) { return d.cx; })
                    .attr("cy", function (d) { return d.cy; })
                    .attr("r", series.lineWeight)
                    .attr("opacity", function (d) { return d.opacity; })
                    .call(function () {
                        if (!chart.noFormats) {
                            this.attr("fill", function (d) { return d.color; })
                                .attr("stroke", "none");
                        }
                    });
            }
        },

        // Handle the mouse enter event
        enterEventHandler: function (e, shape, chart, series) {

            // The margin between the text and the box
            var textMargin = 5,
                // The margin between the ring and the popup
                popupMargin = 10,
                // The popup animation duration in ms
                animDuration = 750,
                // Collect some facts about the highlighted bubble
                selectedShape = d3.select(shape),
                cx = parseFloat(selectedShape.attr("cx")),
                cy = parseFloat(selectedShape.attr("cy")),
                r = parseFloat(selectedShape.attr("r")),
                opacity = dimple._helpers.opacity(e, chart, series),
                fill = selectedShape.attr("stroke"),
                dropDest = series._dropLineOrigin(),
                // Fade the popup stroke mixing the shape fill with 60% white
                popupStrokeColor = d3.rgb(
                    d3.rgb(fill).r + 0.6 * (255 - d3.rgb(fill).r),
                    d3.rgb(fill).g + 0.6 * (255 - d3.rgb(fill).g),
                    d3.rgb(fill).b + 0.6 * (255 - d3.rgb(fill).b)
                ),
                // Fade the popup fill mixing the shape fill with 80% white
                popupFillColor = d3.rgb(
                    d3.rgb(fill).r + 0.8 * (255 - d3.rgb(fill).r),
                    d3.rgb(fill).g + 0.8 * (255 - d3.rgb(fill).g),
                    d3.rgb(fill).b + 0.8 * (255 - d3.rgb(fill).b)
                ),
                // The running y value for the text elements
                y = 0,
                // The maximum bounds of the text elements
                w = 0,
                h = 0,
                t,
                box,
                rows = [],
                overlap;

            if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
                chart._tooltipGroup.remove();
            }
            chart._tooltipGroup = chart.svg.append("g");

            // On hover make the line marker visible immediately
            selectedShape.style("opacity", 1);

            // Add a ring around the data point
            chart._tooltipGroup.append("circle")
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("r", r)
                .attr("opacity", 0)
                .style("fill", "none")
                .style("stroke", fill)
                .style("stroke-width", 1)
                .transition()
                    .duration(animDuration / 2)
                    .ease("linear")
                        .attr("opacity", 1)
                        .attr("r", r + series.lineWeight + 2)
                        .style("stroke-width", 2);

            // Add a drop line to the x axis
            if (dropDest.y !== null) {
                chart._tooltipGroup.append("line")
                    .attr("x1", cx)
                    .attr("y1", (cy < dropDest.y ? cy + r + series.lineWeight + 2 : cy - r - series.lineWeight - 2))
                    .attr("x2", cx)
                    .attr("y2", (cy < dropDest.y ? cy + r + series.lineWeight + 2 : cy - r - series.lineWeight - 2))
                    .style("fill", "none")
                    .style("stroke", fill)
                    .style("stroke-width", 2)
                    .style("stroke-dasharray", ("3, 3"))
                    .style("opacity", opacity)
                    .transition()
                        .delay(animDuration / 2)
                        .duration(animDuration / 2)
                        .ease("linear")
                            // Added 1px offset to cater for svg issue where a transparent
                            // group overlapping a line can sometimes hide it in some browsers
                            // Issue #10
                            .attr("y2", (cy < dropDest.y ? dropDest.y - 1 : dropDest.y + 1));
            }

            // Add a drop line to the y axis
            if (dropDest.x !== null) {
                chart._tooltipGroup.append("line")
                    .attr("x1", (cx < dropDest.x ? cx + r + series.lineWeight + 2 : cx - r - series.lineWeight - 2))
                    .attr("y1", cy)
                    .attr("x2", (cx < dropDest.x ? cx + r + series.lineWeight + 2 : cx - r - series.lineWeight - 2))
                    .attr("y2", cy)
                    .style("fill", "none")
                    .style("stroke", fill)
                    .style("stroke-width", 2)
                    .style("stroke-dasharray", ("3, 3"))
                    .style("opacity", opacity)
                    .transition()
                        .delay(animDuration / 2)
                        .duration(animDuration / 2)
                        .ease("linear")
                            // Added 1px offset to cater for svg issue where a transparent
                            // group overlapping a line can sometimes hide it in some browsers
                            // Issue #10
                            .attr("x2", (cx < dropDest.x ? dropDest.x - 1 : dropDest.x + 1));
            }

            // Add a group for text
            t = chart._tooltipGroup.append("g");
            // Create a box for the popup in the text group
            box = t.append("rect")
                .attr("class", "chartTooltip");

            // Add the series categories
            if (series.categoryFields !== null && series.categoryFields !== undefined && series.categoryFields.length > 0) {
                series.categoryFields.forEach(function (c, i) {
                    if (c !== null && c !== undefined && e.aggField[i] !== null && e.aggField[i] !== undefined) {
                        // If the category name and value match don't display the category name
                        rows.push(c + (e.aggField[i] !== c ? ": " + e.aggField[i] : ""));
                    }
                }, this);
            }

            if (series.x._hasTimeField()) {
                if (e.xField[0] !== null && e.xField[0] !== undefined) {
                    rows.push(series.x.timeField + ": " + series.x._getFormat()(e.xField[0]));
                }
            } else if (series.x._hasCategories()) {
                // Add the x axis categories
                series.x.categoryFields.forEach(function (c, i) {
                    if (c !== null && c !== undefined && e.xField[i] !== null && e.xField[i] !== undefined) {
                        // If the category name and value match don't display the category name
                        rows.push(c + (e.xField[i] !== c ? ": " + e.xField[i] : ""));
                    }
                }, this);
            } else {
                // Add the axis measure value
                if (series.x.measure !== null && series.x.measure !== undefined && e.width !== null && e.width !== undefined) {
                    rows.push(series.x.measure + ": " + series.x._getFormat()(e.width));
                }
            }

            if (series.y._hasTimeField()) {
                if (e.yField[0] !== null && e.yField[0] !== undefined) {
                    rows.push(series.y.timeField + ": " + series.y._getFormat()(e.yField[0]));
                }
            } else if (series.y._hasCategories()) {
                // Add the y axis categories
                series.y.categoryFields.forEach(function (c, i) {
                    if (c !== null && c !== undefined && e.yField[i] !== null && e.yField[i] !== undefined) {
                        rows.push(c + (e.yField[i] !== c ? ": " + e.yField[i] : ""));
                    }
                }, this);
            } else {
                // Add the axis measure value
                if (series.y.measure !== null && series.y.measure !== undefined && e.height !== null && e.height !== undefined) {
                    rows.push(series.y.measure + ": " + series.y._getFormat()(e.height));
                }
            }

            if (series.z !== null && series.z !== undefined) {
                // Add the axis measure value
                if (series.z.measure !== null && series.z.measure !== undefined && e.zValue !== null && e.zValue !== undefined) {
                    rows.push(series.z.measure + ": " + series.z._getFormat()(e.zValue));
                }
            }

            if (series.c !== null && series.c !== undefined) {
                // Add the axis measure value
                if (series.c.measure !== null && series.c.measure !== undefined && e.cValue !== null && e.cValue !== undefined) {
                    rows.push(series.c.measure + ": " + series.c._getFormat()(e.cValue));
                }
            }

            // Get distinct text rows to deal with cases where 2 axes have the same dimensionality
            rows = rows.filter(function(elem, pos) {
                return rows.indexOf(elem) === pos;
            });

            // Create a text object for every row in the popup
            t.selectAll(".textHoverShapes").data(rows).enter()
                .append("text")
                    .attr("class", "chartTooltip")
                    .text(function (d) { return d; })
                    .style("font-family", "sans-serif")
                    .style("font-size", "10px");

            // Get the max height and width of the text items
            t.each(function () {
                w = (this.getBBox().width > w ? this.getBBox().width : w);
                h = (this.getBBox().width > h ? this.getBBox().height : h);
            });

            // Position the text relative to the bubble, the absolute positioning
            // will be done by translating the group
            t.selectAll("text")
                .attr("x", 0)
                .attr("y", function () {
                    // Increment the y position
                    y += this.getBBox().height;
                    // Position the text at the centre point
                    return y - (this.getBBox().height / 2);
                });

            // Draw the box with a margin around the text
            box.attr("x", -textMargin)
                .attr("y", -textMargin)
                .attr("height", Math.floor(y + textMargin) - 0.5)
                .attr("width", w + 2 * textMargin)
                .attr("rx", 5)
                .attr("ry", 5)
                .style("fill", popupFillColor)
                .style("stroke", popupStrokeColor)
                .style("stroke-width", 2)
                .style("opacity", 0.95);

            // Shift the ring margin left or right depending on whether it will overlap the edge
            overlap = cx + r + textMargin + popupMargin + w > parseFloat(chart.svg.node().getBBox().width);

            // Translate the shapes to the x position of the bubble (the x position of the shapes is handled)
            t.attr("transform", "translate(" +
                   (overlap ? cx - (r + textMargin + popupMargin + w) : cx + r + textMargin + popupMargin) + " , " +
                   (cy - ((y - (h - textMargin)) / 2)) +
                ")");
        },

        // Handle the mouse leave event
        leaveEventHandler: function (e, shape, chart, series) {
            // Return the opacity of the marker
            d3.select(shape).style("opacity", (series.lineMarkers ? dimple._helpers.opacity(e, chart, series) : 0));
            if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
                chart._tooltipGroup.remove();
            }
        }
    };

