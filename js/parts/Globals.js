'use strict';
/* global window */
	var win = window,
		doc = win.document;

	var SVG_NS = 'http://www.w3.org/2000/svg',
		userAgent = (win.navigator && win.navigator.userAgent) || '',
		svg = doc && doc.createElementNS && !!doc.createElementNS(SVG_NS, 'svg').createSVGRect,
		isMS = /(edge|msie|trident)/i.test(userAgent) && !window.opera,
		useCanVG = doc && !svg && !isMS && !!doc.createElement('canvas').getContext,
		vml = !svg && !useCanVG,
		isFirefox = /Firefox/.test(userAgent),
		hasBidiBug = isFirefox && parseInt(userAgent.split('Firefox/')[1], 10) < 4; // issue #38

	var Highcharts = win.Highcharts = win.Highcharts ? win.Highcharts.error(16, true) : {
		product: '@product.name@',
		version: '@product.version@',
		deg2rad: Math.PI * 2 / 360,
		doc: doc,
		hasBidiBug: hasBidiBug,
		isMS: isMS,
		isWebKit: /AppleWebKit/.test(userAgent),
		isFirefox: isFirefox,
		isTouchDevice: /(Mobile|Android|Windows Phone)/.test(userAgent),
		SVG_NS: SVG_NS,
		idCounter: 0,
		chartCount: 0,
		seriesTypes: {},
		svg: svg,
		useCanVG: useCanVG,
		vml: vml,
		win: win,
		charts: [],
		marginNames: ['plotTop', 'marginRight', 'marginBottom', 'plotLeft'],
		noop: function () {
			return undefined;
		}
	};
export default Highcharts;
