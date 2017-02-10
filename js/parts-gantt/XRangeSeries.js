 /**
 * (c) 2014-2016 Highsoft AS
 * Authors: Torstein Honsi, Lars A. V. Cabrera
 *
 * License: www.highcharts.com/license
 */
'use strict';
import H from '../parts/Globals.js';

var defaultPlotOptions = H.getOptions().plotOptions,
	defined = H.defined,
	color = H.Color,
	columnType = H.seriesTypes.column,
	each = H.each,
	extendClass = H.extendClass,
	isNumber = H.isNumber,
	isObject = H.isObject,
	merge = H.merge,
	pick = H.pick,
	seriesTypes = H.seriesTypes,
	stop = H.stop,
	wrap = H.wrap,
	Axis = H.Axis,
	Point = H.Point,
	Series = H.Series,
	pointFormat = 	'<span style="color:{point.color}">' +
						'\u25CF' +
					'</span> {series.name}: <b>{point.yCategory}</b><br/>',
	xrange = 'xrange';

defaultPlotOptions.xrange = merge(defaultPlotOptions.column, {
	dataLabels: {
		verticalAlign: 'middle',
		inside: true,
		formatter: function () {
			var point = this.point,
				amount = point.partialFill;
			if (isObject(amount)) {
				amount = amount.amount;
			}
			if (!defined(amount)) {
				amount = 0;
			}
			return (amount * 100) + '%';
		}
	},
	tooltip: {
		pointFormat: pointFormat
	},
	borderRadius: 3
});
seriesTypes.xrange = extendClass(columnType, {
	pointClass: extendClass(Point, {
		// Add x2 and yCategory to the available properties for tooltip formats
		getLabelConfig: function () {
			var point = this,
				cfg = Point.prototype.getLabelConfig.call(point),
				yCats = point.series.yAxis.categories;

			cfg.x2 = point.x2;
			cfg.yCategory = point.yCategory = yCats && yCats[point.y];
			return cfg;
		}
	}),
	type: xrange,
	forceDL: true,
	parallelArrays: ['x', 'x2', 'y'],
	requireSorting: false,
	animate: seriesTypes.line.prototype.animate,
	cropShoulder: 1,

	/**
	 * Borrow the column series metrics, but with swapped axes. This gives free
	 * access to features like groupPadding, grouping, pointWidth etc.
	 */
	getColumnMetrics: function () {
		var metrics,
			chart = this.chart;

		function swapAxes() {
			each(chart.series, function (s) {
				var xAxis = s.xAxis;
				s.xAxis = s.yAxis;
				s.yAxis = xAxis;
			});
		}

		swapAxes();

		this.yAxis.closestPointRange = 1;
		metrics = columnType.prototype.getColumnMetrics.call(this);

		swapAxes();

		return metrics;
	},

	/**
	 * Override cropData to show a point where x or x2 is outside visible range,
	 * but one of them is inside.
	 */
	cropData: function (xData, yData, min, max) {

		// Replace xData with x2Data to find the appropriate cropStart
		var cropData = Series.prototype.cropData,
			crop = cropData.call(this, this.x2Data, yData, min, max);

		// Re-insert the cropped xData
		crop.xData = xData.slice(crop.start, crop.end);

		return crop;
	},

	translatePoint: function (point) {
		var series = this,
			xAxis = series.xAxis,
			metrics = series.columnMetrics,
			minPointLength = series.options.minPointLength || 0,
			plotX = point.plotX,
			posX = pick(point.x2, point.x + (point.len || 0)),
			plotX2 = xAxis.toPixels(posX, true),
			width = plotX2 - plotX,
			widthDifference,
			shapeArgs,
			partialFill;

		if (minPointLength) {
			widthDifference = minPointLength - width;
			if (widthDifference < 0) {
				widthDifference = 0;
			}
			plotX -= widthDifference / 2;
			plotX2 += widthDifference / 2;
		}

		plotX = Math.max(plotX, -10);
		plotX2 = Math.min(Math.max(plotX2, -10), xAxis.len + 10);

		if (plotX2 < plotX) { // #6107
			plotX2 = plotX;
		}

		point.shapeArgs = {
			x: plotX,
			y: point.plotY + metrics.offset,
			width: plotX2 - plotX,
			height: metrics.width
		};
		point.tooltipPos[0] += width / 2;
		point.tooltipPos[1] -= metrics.width / 2;

		// Add a partShapeArgs to the point, based on the shapeArgs property
		partialFill = point.partialFill;
		if (partialFill) {
			// Get the partial fill amount
			if (isObject(partialFill)) {
				partialFill = partialFill.amount;
			}
			// If it was not a number, assume 0
			if (!isNumber(partialFill)) {
				partialFill = 0;
			}
			shapeArgs = point.shapeArgs;
			point.partShapeArgs = {
				x: shapeArgs.x + 0.5,
				y: shapeArgs.y + 0.5,
				width: shapeArgs.width - 1,
				height: shapeArgs.height - 1
			};
			point.clipRectArgs = {
				x: shapeArgs.x,
				y: shapeArgs.y,
				width: shapeArgs.width * partialFill,
				height: shapeArgs.height
			};
		}
	},

	translate: function () {
		columnType.prototype.translate.apply(this, arguments);
		var series = this;

		each(series.points, function (point) {
			series.translatePoint(point);
		});
	},

	/**
	 * Aligns an individual dataLabel.
	 *
	 * This override moves the
	 *
	 * @param  {Object} point     the point belonging to the dataLabel
	 * @param  {Object} dataLabel the dataLabel configuration object
	 * @param  {Object} options   dataLabel options for the series
	 * @return {void}
	 */
	alignDataLabel: function (point, dataLabel, options) {
		var chart = this.chart,
			align = options.align,
			inverted = chart.inverted,
			plotX = pick(point.plotX, -9999),
			plotY = pick(point.plotY, -9999),
			verticalAlign = options.verticalAlign,
			inside = options.inside,
			pointBox = point.shapeArgs,
			labelBox = dataLabel.getBBox(),
			labelTextBox = dataLabel.text.getBBox(),
			attr = {},
			visible =
				this.visible &&
				(
					labelTextBox.width <= pointBox.width &&
					labelTextBox.height <= pointBox.height
				) &&
				(
					this.forceDL ||
					chart.isInsidePlot(plotX, Math.round(plotY), inverted)
				);

		if (visible) {
			if (align === 'right') {
				if (inside) {
					attr.x = pointBox.x + pointBox.width - labelBox.width;
				} else {
					attr.x = pointBox.x - labelBox.width;
				}
			} else if (align === 'left') {
				if (inside) {
					attr.x = pointBox.x;
				} else {
					attr.x = pointBox.x + pointBox.width + labelBox.x;
				}
			} else { // Center
				attr.x = pointBox.x + pointBox.width / 2 - labelBox.width / 2;
			}

			if (verticalAlign === 'bottom') {
				if (inside) {
					attr.y = pointBox.y + pointBox.height - labelBox.height;
				} else {
					attr.y = pointBox.y - labelBox.height;
				}
			} else if (verticalAlign === 'top') {
				if (inside) {
					attr.y = pointBox.y;
				} else {
					attr.y = pointBox.y + pointBox.height;
				}
			} else { // Middle
				attr.y = pointBox.y + pointBox.height / 2 - labelBox.height / 2;
			}

			dataLabel.attr(attr);
		}
	},

	/**
	 * Draws a single point in the series.
	 *
	 * This override turns point.graphic into a group containing the original
	 * graphic and an overlay displaying the partial fill.
	 *
	 * @param  {Object} point an instance of Point in the series
	 * @param  {string} verb 'animate' (animates changes) or 'attr' (sets
	 *                       options)
	 * @returns {void}
	 */
	drawPoint: function (point, verb) {
		var series = this,
			plotY = point.plotY,
			seriesOpts = series.options,
			renderer = series.chart.renderer,
			graphic = point.graphic,
			type = point.shapeType,
			shapeArgs = point.shapeArgs,
			partShapeArgs = point.partShapeArgs,
			clipRectArgs = point.clipRectArgs,
			pfOptions = point.partialFill,
			fill,
			state = point.selected && 'select',
			cutOff = seriesOpts.stacking && !seriesOpts.borderRadius;

		if (isNumber(plotY) && point.y !== null) {
			if (graphic) { // update
				stop(graphic);
				point.graphicOriginal[verb](
					merge(shapeArgs)
				);
				if (partShapeArgs) {
					point.graphicOverlay[verb](
						merge(partShapeArgs)
					);
					point.clipRect.animate(
						merge(clipRectArgs)
					);
				}

			} else {
				point.graphic = graphic = renderer.g('point')
					.attr({
						'class': point.getClassName()
					})
					.add(point.group || series.group);

				point.graphicOriginal = renderer[type](shapeArgs)
					.addClass('highcharts-partfill-original')
					.add(graphic);
				if (clipRectArgs && partShapeArgs) {

					point.clipRect = renderer.clipRect(
						clipRectArgs.x,
						clipRectArgs.y,
						clipRectArgs.width,
						clipRectArgs.height
					);

					point.graphicOverlay = renderer[type](partShapeArgs)
						.addClass('highcharts-partfill-overlay')
						.add(graphic)
						.clip(point.clipRect);
				}
			}

			/*= if (build.classic) { =*/
			// Presentational
			point.graphicOriginal
				.attr(series.pointAttribs(point, state))
				.shadow(seriesOpts.shadow, null, cutOff);
			if (partShapeArgs) {
				// Ensure pfOptions is an object
				if (!isObject(pfOptions)) {
					pfOptions = {};
				}
				if (isObject(seriesOpts.partialFill)) {
					pfOptions = merge(pfOptions, seriesOpts.partialFill);
				}

				fill = pfOptions.fill ||
						color(series.color).brighten(-0.3).get('rgb');
				point.graphicOverlay
					.attr(series.pointAttribs(point, state))
					.attr({
						'fill': fill,
						'stroke-width': 0.1
					})
					.shadow(seriesOpts.shadow, null, cutOff);
			}
			/*= } =*/

		} else if (graphic) {
			point.graphic = graphic.destroy(); // #1269
		}
	},

	drawPoints: function () {
		var series = this,
			chart = this.chart,
			options = series.options,
			animationLimit = options.animationLimit || 250,
			verb = chart.pointCount < animationLimit ? 'animate' : 'attr';

		// draw the columns
		each(series.points, function (point) {
			series.drawPoint(point, verb);
		});
	}
});

/**
 * Max x2 should be considered in xAxis extremes
 */
wrap(Axis.prototype, 'getSeriesExtremes', function (proceed) {
	var axis = this,
		series = axis.series,
		dataMax,
		modMax;

	proceed.call(this);
	if (axis.isXAxis && series.type === xrange) {
		dataMax = pick(axis.dataMax, Number.MIN_VALUE);
		each(this.series, function (series) {
			each(series.x2Data || [], function (val) {
				if (val > dataMax) {
					dataMax = val;
					modMax = true;
				}
			});
		});
		if (modMax) {
			axis.dataMax = dataMax;
		}
	}
});