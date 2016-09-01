'use strict';
import H from '../parts/Globals.js';
import '../parts/Utilities.js';
import '../parts/Options.js';
import '../parts/Point.js';
	var extend = H.extend,
		Point = H.Point,
		seriesType = H.seriesType,
		seriesTypes = H.seriesTypes;

// The mapbubble series type
if (seriesTypes.bubble) {

	seriesType('mapbubble', 'bubble', {
		animationLimit: 500,
		tooltip: {
			pointFormat: '{point.name}: {point.z}'
		}

	// Prototype members
	}, {
		xyFromShape: true,
		type: 'mapbubble',
		pointArrayMap: ['z'], // If one single value is passed, it is interpreted as z
		/**
		 * Return the map area identified by the dataJoinBy option
		 */
		getMapData: seriesTypes.map.prototype.getMapData,
		getBox: seriesTypes.map.prototype.getBox,
		setData: seriesTypes.map.prototype.setData

	// Point class
	}, {
		applyOptions: function (options, x) {
			var point;
			if (options && options.lat !== undefined && options.lon !== undefined) {
				point = Point.prototype.applyOptions.call(this, options, x);
				point = extend(point, this.series.chart.fromLatLonToPoint(point));
			} else {
				point = seriesTypes.map.prototype.pointClass.prototype.applyOptions.call(this, options, x);
			}
			return point;
		},
		ttBelow: false
	});
}
