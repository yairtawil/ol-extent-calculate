import * as turf from '@turf/turf';
import OlGeoJSON from 'ol/format/geojson';
import Tile from 'ol/layer/tile';
import TileWMS from 'ol/source/tilewms';
import Polygon from 'ol/geom/polygon';
import Feature from 'ol/feature';
import extent from 'ol/extent';
import Map from 'ol/map';
import View from 'ol/view';
import VectorSource from 'ol/source/vector';
import VectorLayer from 'ol/layer/vector';

export class OlExtentCalculateComponent extends HTMLElement {
    public olGeoJson = new OlGeoJSON();

    public baseLayer = new Tile({
        source: new TileWMS({
            url: 'https://ahocevar.com/geoserver/wms',
            params: { 'LAYERS': 'ne:NE1_HR_LC_SR_W_DR', 'TILED': true }
        })
    });

    map4326: Map;
    map3857: Map;
    polygon1 = new Polygon([]);
    polygon2 = new Polygon([]);

    static innerHTML = `
        <style>
            h1 {
                text-align: center;
            }
            .container {
                width: 100vw;
                display: flex;
                justify-content: space-around;
            }
            .map1, .map2 {
                position: relative;
                width: 45vw;
            }
            .map1 #map1, .map2 #map2 {
                margin-top: 30px;
                width: 100%;
                height: 800px;
            }
        </style>
        <h1>Ol rotate extent calculation</h1>
        <div class="container">
            <div class="map1">
                <h2>EPSG:4326</h2>
                <button id="calc1">Draw</button>
                <button id="fit1">Fit</button>
                <input id="follow" type="checkbox" checked>Follow</input>
                <div id="map1"></div>
            </div>
            <div class="map2">
                <h2>EPSG:3857</h2>
                <button id="calc2">Draw</button>
                <button id="fit2">Fit</button>
                <div id="map2"></div>
            </div>
        </div>
    `;

    static selector = 'ol-rotate-extent';

    initMap4326(): Map {
        this.polygon1 = new Polygon([]);
        return new Map({
            target: 'map1',
            layers: [this.baseLayer, new VectorLayer({ source: new VectorSource({ features: [new Feature(this.polygon1)] }) })],
            view: new View({
                projection: 'EPSG:4326',
                center: [0, 0],
                zoom: 4
            })
        });
    }

    initMap3857() {
        return new Map({
            target: 'map2',
            layers: [
                this.baseLayer,
                new VectorLayer({ source: new VectorSource({ features: [new Feature(this.polygon2)] }) })
            ],
            view: new View({
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
            const extent = this.calculateExtent(this.map4326);
            this.polygon1.setCoordinates(extent);
        });

        document.querySelector('#calc2').addEventListener('click', () => {
            const extent = this.calculateExtent(this.map3857);
            this.polygon2.setCoordinates(extent);
        });

        document.querySelector('#fit1').addEventListener('click', () => {
            this.fitExtent(this.map4326, this.polygon1);
        });

        document.querySelector('#fit2').addEventListener('click', () => {
            this.fitExtent(this.map3857, this.polygon1);
        });

        this.map4326.getView().on('propertychange', () => {
            if((<HTMLInputElement>document.querySelector('#follow')).checked) {
                const extent = this.calculateExtent(this.map4326);
                const polygon = new Polygon(extent);
                this.fitExtent(this.map3857, polygon)
            }
        });
    }

    fitExtent(map: Map, polygon: Polygon) {
        const view = map.getView();
        const featureProjection = 'EPSG:4326';
        const dataProjection = view.getProjection();

        const geojson: GeoJSON.Feature<GeoJSON.Polygon> = <any> this.olGeoJson.writeFeatureObject(new Feature(polygon), {
            featureProjection,
            dataProjection
        });
        const [[[long1, lat1], [long2, lat2]]] = geojson.geometry.coordinates;
        const rotation = this.getAngle([long1, lat1], [long2, lat2]);
        const [width, height] = map.getSize();
        const size = width * Math.cos(rotation) + height * Math.sin(rotation);
        const resolution = extent.getWidth(<ol.Extent> [...geojson.geometry.coordinates[0][0], ...geojson.geometry.coordinates[0][2]]) / size;
        const center = turf.center(geojson.geometry);
        view.setCenter(<any> center.geometry.coordinates);
        view.setRotation(rotation);
        view.setResolution(resolution);
    }

    getAngle([long1, lat1], [long2, lat2]) {
        let theta = Math.atan2(long1 - long2, lat1 - lat2);
        theta += Math.PI / 2.0;
        console.log((6.283185307179586 - theta) % 6.283185307179586);
        return (6.283185307179586 - theta) % 6.283185307179586;
    }

    initMaps() {
        this.map3857 = this.initMap3857();
        this.map4326 = this.initMap4326();
    }

    connectedCallback() {
        this.innerHTML = OlExtentCalculateComponent.innerHTML;
        this.initMaps();
        this.initListeners();
    }

}
