var map;
var vectorSource = new ol.source.Vector({});
var iconStyle = new ol.style.Style({
	image: new ol.style.Circle({
		radius: 3,
		snapToPixel: false,
		fill: new ol.style.Fill({color: 'red'}),
		stroke: new ol.style.Stroke({
			color: 'black', width: 1
		})
	})
});
var vectorLayer = new ol.layer.Vector({
	source: vectorSource,
	style: iconStyle
});
var isMapCentred = true;
var user_identifier = "Unknown";

var url = "wss://10.1.1.5:9001";
var w = new WebSocket(url);

w.onopen = function(){
	console.log("socket open");
}

w.onmessage = function(e){
	console.log(e.data);
	var data = JSON.parse(e.data);
	plotDot(data.id, data.lat, data.lng);
}

w.onclose = function(e){
	console.log("socket closed");
}

w.onerror = function(e){
	console.log("socket error");
}

function getLocation(){
	if(!navigator.geolocation){
		console.log("Location not supported by browser");
		return;
	}

	function geo_success(position){
		$(".search").remove();

		var id = user_identifier;
		var lat = position.coords.latitude;
		var lng = position.coords.longitude;
		var time = Math.round((new Date()).getTime() / 1000);
		var data = {id: id, time: time, lat: lat, lng: lng};

		w.send(JSON.stringify(data));

		plotDot(id, lat, lng);
	}

	function geo_error(err){
		console.log(err);
	}

	navigator.geolocation.watchPosition(geo_success, geo_error, {enableHighAccuracy: true, maximumAge: 0, timeout: 5000});
}

function plotDot(record, lat, lng){
	var coord = ol.proj.transform([parseFloat(lng), parseFloat(lat)], 'EPSG:4326', 'EPSG:3857');
	var marker = vectorLayer.getSource().getFeatureById(record);

	if(marker != null){
		marker.getGeometry().setCoordinates(coord);
		vectorLayer.getSource().changed
	}else{
		var marker = new ol.Feature({
			geometry: new ol.geom.Point(ol.proj.transform([parseFloat(lng), parseFloat(lat)], 'EPSG:4326', 'EPSG:3857')),
			name: record
		});
		marker.setId(record);
		vectorSource.addFeature(marker);
		vectorLayer.getSource().changed

		$('#top').append('<div id="' + record + '" class="person item"><i class="circle icon"></i> ' + record + '</div>');
	}

	if(isMapCentred === true){
		map.getView().fit(vectorSource.getExtent(), map.getSize());
	}
}

function Progress(el) {
	this.el = el;
	this.loading = 0;
	this.loaded = 0;
}

function initMap() {
	Progress.prototype.addLoading = function() {
		if (this.loading === 0) {
			this.show();
		}
		++this.loading;
		this.update();
	};

	Progress.prototype.addLoaded = function() {
		var this_ = this;
		setTimeout(function() {
			++this_.loaded;
			this_.update();
		}, 100);
	};

	Progress.prototype.update = function() {
		var width = (this.loaded / this.loading * 100).toFixed(1) + '%';
		this.el.style.width = width;
		if (this.loading === this.loaded) {
			this.loading = 0;
			this.loaded = 0;
			var this_ = this;
			setTimeout(function() {
				this_.hide();
			}, 500);
		}
	};

	Progress.prototype.show = function() {
		this.el.style.visibility = 'visible';
	};

	Progress.prototype.hide = function() {
		if (this.loading === this.loaded) {
			this.el.style.visibility = 'hidden';
			this.el.style.width = 0;
		}
	};

	var source = new ol.source.VectorTile({
		format: new ol.format.MVT(),
		tileGrid: new ol.tilegrid.createXYZ(),
		tilePixelRatio: 16,
		urls: ['tileserver.php?/index.json?/australia/{z}/{x}/{y}.pbf']
	});

	fetch('mapstyle.json').then(function(response) {
		response.json().then(function(glStyle) {
			olms.applyStyle(OSMVector, glStyle, 'openmaptiles');
		});
	});

	var OSMVector = new ol.layer.VectorTile({
		renderMode: 'vector',
		source: source,
		declutter: true

	});

	var progress = new Progress(document.getElementById('progress'));

	source.on('tileloadstart', function() {
		progress.addLoading();
	});

	source.on('tileloadend', function() {
		progress.addLoaded();
	});
	source.on('tileloaderror', function() {
		progress.addLoaded();
	});

	var tilesLoading = 0, tilesLoaded = 0;

	source.on('tileloadend', function () {
		tilesLoaded++;
		if (tilesLoading === tilesLoaded) {
			console.log(tilesLoaded + ' tiles finished loading');
			tilesLoading = 0;
			tilesLoaded = 0;
		}
	});

	source.on('tileloadstart', function () {
		this.tilesLoading++;
	});

	window.app = {};

	window.app.CentreMapButton = function() {
		var button = document.createElement('button');
		button.innerHTML = 'C';

		var this_ = this;
		var centreMap = function() {
			isMapCentred = true;
			map.getView().fit(vectorSource.getExtent(), map.getSize());
		};

		button.addEventListener('click', centreMap, false);

		var element = document.createElement('div');
		element.className = 'bars-button ol-unselectable ol-control';
		element.appendChild(button);

		ol.control.Control.call(this, {
			element: element
		});
	};
	ol.inherits(app.CentreMapButton, ol.control.Control);

	map = new ol.Map({
		target: 'map',
		controls: ol.control.defaults().extend([
			new app.CentreMapButton()
		]),
		layers: [
			OSMVector,
			vectorLayer
		],
		view: new ol.View({
			center: ol.proj.fromLonLat([133.77, -25.27]),
			zoom: 5,
			maxZoom: 15
		})
	});

	map.on("pointerdrag", function(e){
		isMapCentred = false;
	});
}

$(document).ready(function(){
	initMap();

	$('#identifier').on('keypress', function (e) {
		if(e.which === 13){
			if($("#identifier").val() != ''){
				user_identifier = $("#identifier").val();
				
				$(this).attr("placeholder", "Please wait...");
				$(this).attr("disabled", "disabled");
				$("#identifier").val('');
				$("#identifier").blur();

				getLocation();
			}
		}
	});
});
