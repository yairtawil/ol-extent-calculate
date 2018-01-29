class Index {

    constructor() {
        this.baseLayer = new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'https://ahocevar.com/geoserver/wms',
                params: {
                    'LAYERS': 'ne:NE1_HR_LC_SR_W_DR',
                    'TILED': true
                }
            })
        });

        this.olGeoJson = new ol.format.GeoJSON();
        console.log(this.olGeoJson);
        this.map1 = this.initMap4326();
        this.map2 = this.initMap3857();
        this.initListeners();
    }

    initMap4326() {
        this.source1 = new ol.source.Vector({features: []});
        return new ol.Map({
            target: 'map1',
            layers: [ this.baseLayer, new ol.layer.Vector({ source: this.source1 }) ],
            view: new ol.View({
                projection: 'EPSG:4326',
                center: [0, 0],
                zoom: 4
            })
        });
    }

    initMap3857() {
        this.source2 = new ol.source.Vector({features: []});
        return new ol.Map({
            target: 'map2',
            layers: [
                this.baseLayer,
                new ol.layer.Vector({ source: this.source2 })
            ],
            view: new ol.View({
                center: [0, 0],
                zoom: 4
            })
        });
    }

    calculateExtent(map) {
        const [width, height] = map.getSize();
        const topLeft = map.getCoordinateFromPixel([0, 0]);
        const topRight = map.getCoordinateFromPixel([width, 0]);
        const bottomRight = map.getCoordinateFromPixel([width, height]);
        const bottomLeft = map.getCoordinateFromPixel([0, height]);
        return [[topLeft, topRight, bottomRight, bottomLeft, topLeft]];
    }

    initListeners() {
        document.querySelector('#calc1').addEventListener('click', () => {
            const extent = this.calculateExtent(this.map1);
            this.polygon1 = new ol.Feature(new ol.geom.Polygon(extent));
            this.source1.clear();
            this.source1.addFeature(this.polygon1);
        });

        document.querySelector('#calc2').addEventListener('click', () => {
            const extent = this.calculateExtent(this.map2);
            this.polygon2 = new ol.Feature(new ol.geom.Polygon(extent));
            this.source2.clear();
            this.source2.addFeature(this.polygon2);
        });

        document.querySelector('#fit1').addEventListener('click', () => {
            this.fitExtent(this.map1, this.polygon1);
        });

        document.querySelector('#fit2').addEventListener('click', () => {
            this.fitExtent(this.map2, this.polygon1)
        });
        this.map1.getView().on('propertychange', () => {
            const extent = this.calculateExtent(this.map1);
            const polygon = new ol.Feature(new ol.geom.Polygon(extent));
            this.fitExtent(this.map2, polygon)
        });
    }

    fitExtent(map, polygon) {
        const projection = map.getView().getProjection();
        const view = map.getView();
        const geojson = this.olGeoJson.writeFeatureObject(polygon, {
            featureProjection: 'EPSG:4326',
            dataProjection: projection
        });
        // const geojson = turf.polygon(polygon.getCoordinates());
        const [[[long1, lat1], [long2, lat2]]] = geojson.geometry.coordinates;
        const rotation = this.getAngle([long2, lat2], [ long1, lat1]);
        const [width, height] = map.getSize();
        const size = width * Math.cos(rotation) + height * Math.sin(rotation);
        const resolution = ol.extent.getWidth([...geojson.geometry.coordinates[0][0], ...geojson.geometry.coordinates[0][2]]) / size;
        const center = turf.center(geojson.geometry);
        view.setCenter(center.geometry.coordinates);
        view.setRotation(rotation);
        view.setResolution(resolution);
    }

    getAngle(source, destination) {
        source = {longitude: source[0], latitude: source[1]};
        destination = {longitude: destination[0], latitude: destination[1]};

        let theta = Math.atan2(destination.longitude - source.longitude, destination.latitude - source.latitude);
        theta += Math.PI / 2.0;
        let angle = ol.math.toDegrees(theta);
        angle = 360 - angle;
        while (angle < 0) {
            angle += 360;
        }
        while (360 <= angle) {
            angle -= 360;
        }
        return ol.math.toRadians(angle);
    }

}

const index = new Index();
