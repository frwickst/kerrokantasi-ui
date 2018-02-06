import React from 'react';
import PropTypes from 'prop-types';
import {injectIntl, FormattedMessage} from 'react-intl';
import Leaflet from 'leaflet';
import getTranslatedTooltips from '../../utils/getTranslatedTooltips';
import Button from 'react-bootstrap/lib/Button';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import isEmpty from 'lodash/isEmpty';
import keys from 'lodash/keys';
import includes from 'lodash/includes';
import {localizedNotifyError} from '../../utils/notify';

import {hearingShape} from '../../types';

// This is needed for the invalidateMap not to fire after the component has dismounted and causing error.
let mapInvalidator;

Leaflet.Marker.prototype.options.icon = new Leaflet.Icon({
  iconUrl: require('../../../assets/images/leaflet/marker-icon.png'),
  shadowUrl: require('../../../assets/images/leaflet/marker-shadow.png'),
  iconRetinaUrl: require('../../../assets/images/leaflet/marker-icon.png'),
  iconSize: [25, 41],
  iconAnchor: [13, 41],
});

function getHearingArea(hearing) {
  if (typeof window === "undefined") return null;
  if (!hearing || !hearing.geojson) return null;

  const {LatLng} = require('leaflet');  // Late import to be isomorphic compatible
  const {Polygon, GeoJSON, Marker, Polyline} = require('react-leaflet');  // Late import to be isomorphic compatible
  const {geojson} = hearing;
  switch (geojson.type) {
    case "Polygon": {
      // XXX: This only supports the _first_ ring of coordinates in a Polygon
      const latLngs = geojson.coordinates[0].map(([lng, lat]) => new LatLng(lat, lng));
      return <Polygon positions={latLngs}/>;
    }
    case "Point": {
      const latLngs = new LatLng(geojson.coordinates[0], geojson.coordinates[1]);
      return (
        <Marker
          position={latLngs}
          icon={new Leaflet.Icon({
            iconUrl: require('../../../assets/images/leaflet/marker-icon.png'),
            shadowUrl: require('../../../assets/images/leaflet/marker-shadow.png'),
            iconRetinaUrl: require('../../../assets/images/leaflet/marker-icon-2x.png'),
            iconSize: [25, 41],
            iconAnchor: [13, 41]
          })}
        />
      );
    }
    case "LineString": {
      const latLngs = geojson.coordinates.map(([lng, lat]) => new LatLng(lat, lng));
      return (<Polyline positions={latLngs}/>);
    }
    default:
      // TODO: Implement support for other geometries too (markers, square, circle)
      return (<GeoJSON data={geojson} key={JSON.stringify(geojson)}/>);
  }
}


function getFirstGeometry(featureCollectionGeoJSON) {
  const firstFeature = featureCollectionGeoJSON.features[0];
  if (firstFeature) {
    return firstFeature.geometry;
  }
  return {};
}


class HearingFormStep3 extends React.Component {
  constructor(props) {
    super(props);
    this.onDrawCreated = this.onDrawCreated.bind(this);
    this.onDrawDeleted = this.onDrawDeleted.bind(this);
    this.onDrawEdited = this.onDrawEdited.bind(this);
    // This is necessary to prevent getHearingArea() from rendering drawings twice after editing
    this.state = {isEdited: false};
  }

  componentDidMount() {
    Leaflet.drawLocal = getTranslatedTooltips(this.props.language);
  }

  componentWillReceiveProps(nextProps) {
    const {language} = this.props;

    if (nextProps.language !== language) {
      Leaflet.drawLocal = getTranslatedTooltips(nextProps.language);
    }
  }

  componentDidUpdate() {
    this.invalidateMap();
  }

  componentWillUnmount() {
    clearTimeout(mapInvalidator);
  }

  onDrawEdited(event) {
    // TODO: Implement proper onDrawEdited functionality
    this.setState({isEdited: true});
    this.props.onHearingChange("geojson", getFirstGeometry(event.layers.toGeoJSON()));
  }

  onDrawCreated(event) {
    // TODO: Implement proper onDrawCreated functionality
    this.setState({isEdited: true});
    this.props.onHearingChange("geojson", event.layer.toGeoJSON().geometry);
  }

  onDrawDeleted(event) {
    // TODO: Implement proper onDrawDeleted functionality
    if (event.layers && !isEmpty(event.layers._layers)) {
      this.props.onHearingChange("geojson", null);
      this.setState({isEdited: true});
    }
  }

  onUploadGeoJSON = (event) => {
    this.readTextFile(event.target.files[0], (json) => {
      try {
        const featureCollection = JSON.parse(json);
        if (
          !isEmpty(featureCollection.features) &&
          Array.isArray(featureCollection.features) &&
          includes(keys(featureCollection.features[0]), 'geometry') &&
          includes(keys(featureCollection.features[0].geometry), 'type') &&
          includes(keys(featureCollection.features[0].geometry), 'coordinates')
        ) {
          this.props.onHearingChange("geojson", featureCollection.features[0].geometry);
        } else {
          localizedNotifyError('Virheellinen tiedosto.');
        }
      } catch (err) {
        localizedNotifyError('Virheellinen tiedosto.');
      }
    });
  }

  readTextFile = (file, callback) => {
    try {
      const reader = new FileReader();

      reader.onload = () => callback(reader.result);

      reader.readAsText(file);
    } catch (err) {
      localizedNotifyError('Virheellinen tiedosto.');
    }
  }

  invalidateMap() {
    // Map size needs to be invalidated after dynamically resizing
    // the map container.
    const map = this.map;
    if (map && this.props.visible) {
      mapInvalidator = setTimeout(() => {
        map.leafletElement.invalidateSize();
      }, 200);  // Short delay to wait for the animation to end
    }
  }

  getDrawOptions() {
    const {geojson} = this.props.hearing;

    if (!geojson || isEmpty(geojson)) {
      return {
        circle: false,
        circlemarker: false,
        polyline: false,
        marker: {
          icon: new Leaflet.Icon({
            iconUrl: require('../../../assets/images/leaflet/marker-icon.png'),
            shadowUrl: require('../../../assets/images/leaflet/marker-shadow.png'),
            iconRetinaUrl: require('../../../assets/images/leaflet/marker-icon-2x.png'),
            iconSize: [25, 41],
            iconAnchor: [13, 41],
          })
        }
      };
    }
    return {
      circle: false,
      circlemarker: false,
      marker: false,
      polyline: false,
      polygon: false,
      rectangle: false,
    };
  }

  refCallBack = (el) => {
    this.map = el;
  }

  render() {
    if (typeof window === "undefined") return null;  // Skip rendering outside of browser context
    const {FeatureGroup, Map, TileLayer} = require("react-leaflet");  // Late import to be isomorphic compatible
    const {EditControl} = require("react-leaflet-draw");
    const position = [60.192059, 24.945831];  // Default to Helsinki's center
    const hearing = this.props.hearing;

    return (
      <div className="form-step">
        <FormGroup controlId="hearingArea">
          <ControlLabel><FormattedMessage id="hearingArea"/></ControlLabel>
          <Map
            ref={this.refCallBack}
            // onResize={this.invalidateMap.bind(this)}
            center={position}
            zoom={11}
            zoomControl
            className="hearing-map"
          >
            <TileLayer
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
            />
            <FeatureGroup ref={(group) => { this.featureGroup = group; }}>
              <EditControl
                position="topleft"
                onEdited={this.onDrawEdited}
                onCreated={this.onDrawCreated}
                onDeleted={this.onDrawDeleted}
                draw={this.getDrawOptions()}
                edit={
                  {
                    featureGroup: this.featureGroup,
                    edit: false
                  }
                }
              />
              {!this.state.isEdited && getHearingArea(hearing)}
            </FeatureGroup>
          </Map>
        </FormGroup>
        <div className="step-footer">
          <label htmlFor="geojsonUploader">
            <input id="geojsonUploader" type="file" onChange={this.onUploadGeoJSON} style={{display: 'none'}} />
            Upload GeoJSON
          </label>
          <Button
            bsStyle="default"
            onClick={this.props.onContinue}
          >
            <FormattedMessage id="hearingFormNext"/>
          </Button>
        </div>
      </div>
    );
  }
}

HearingFormStep3.propTypes = {
  hearing: hearingShape,
  onContinue: PropTypes.func,
  onHearingChange: PropTypes.func,
  visible: PropTypes.bool,
  language: PropTypes.string
};

const WrappedHearingFormStep3 = injectIntl(HearingFormStep3);

export default WrappedHearingFormStep3;
