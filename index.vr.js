import React from 'react';
import {
  AppRegistry,
  asset,
  StyleSheet,
  Pano,
  Text,
  Sphere,
  Cylinder,
  View,
  PointLight,
  NativeModules,
  VrHeadModel,
} from 'react-vr';
import {mat4, vec3} from 'gl-matrix';
import Color from 'color';
import structure from './fixtures/structure.json';

function getVrHead() {
  return {
    position: VrHeadModel.positionOfHeadMatrix(),
    rotation: VrHeadModel.rotationOfHeadMatrix(),
    horizFov: VrHeadModel.horizontalFov(),
    vertFov: VrHeadModel.verticalFov(),
    matrix: VrHeadModel.headMatrix
  };
}

import RCTDeviceEventEmitter from 'RCTDeviceEventEmitter';
import { throttle } from 'lodash';

const TeleportModule = NativeModules.TeleportModule;

function toRGBAString({ r, g, b, a = 1 }) {
  const floatToByte = number => number === 1.0 ? 255 : (number * 256) | 0;
  
  const color = {
    r: floatToByte(r),
    g: floatToByte(g),   
    b: floatToByte(b),
    a,
  };
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

export default class vr extends React.Component {
  state = {
    activeCommunity: null,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    vertices: [],
    links: [],
  }
  
  renderVertices = ({ vertices }) => {
    return vertices.map((shape) => {
      const darken = this.state.activeCommunity === shape.community ? false : this.state.activeCommunity !== null ? true : false;
      const color = Color(toRGBAString(shape.color)).darken(darken ? .9 : 0);
      return <Sphere
        lit
        radius={shape.r}
        widthSegments={10}
        heightSegments={10}
        key={shape.id}
        onEnter={() => this.handleGazeEnter(shape.community)}
        onExit={() => this.setState({ activeCommunity: null })}
        style={{
          layoutOrigin: [0.5, 0.5],
          transform: [{translate: [shape.x - this.state.offsetX, shape.y - this.state.offsetY, shape.z - this.state.offsetZ]}],
          color,
        }}
      />
    });
  }
  
  renderLinks = ({ vertices, links }) => {
    return links.map(({ id, weight, source, target, sourceColor }) => {
      const sourceVertex = vertices.find(({ id }) => id == source);
      const targetVertex = vertices.find(({ id }) => id == target);
      const height = Math.sqrt(
        (sourceVertex.x - targetVertex.x) * (sourceVertex.x - targetVertex.x) +
        (sourceVertex.y - targetVertex.y) * (sourceVertex.y - targetVertex.y) +
        (sourceVertex.z - targetVertex.z) * (sourceVertex.z - targetVertex.z)
      );
      const sourcePosition = vec3.fromValues(sourceVertex.x, sourceVertex.y, sourceVertex.z);
      const targetPosition = vec3.fromValues(targetVertex.x, targetVertex.y, targetVertex.z);
      const yBasis = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), targetPosition, sourcePosition));
      const xBasis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), yBasis, vec3.fromValues(1, 0, 0)));
      const zBasis = vec3.cross(vec3.create(), xBasis, yBasis);
      let translation = vec3.scale(vec3.create(), vec3.add(vec3.create(), sourcePosition, targetPosition), 0.5);
      translation[0] -= this.state.offsetX;
      translation[1] -= this.state.offsetY;
      translation[2] -= this.state.offsetZ;
      const modelMatrix = [...xBasis, 0, ...yBasis, 0, ...zBasis, 0, ...translation, 1];

      const darken = this.state.activeCommunity === sourceVertex.community ? false : this.state.activeCommunity !== null ? true : false;
      const color = Color(toRGBAString(sourceColor)).darken(darken ? .9 : 0);
      return <Cylinder
        radiusTop={weight / 5}
        radiusBottom={weight / 5}
        height={height}
        segments={6}
        key={id}
        onEnter={() => this.handleGazeEnter(sourceVertex.community)}
        onExit={() => this.setState({ activeCommunity: null })}
        lit
        style={{
          layoutOrigin: [0.5, 0.5],
          transform: [{matrix: modelMatrix}],
          color,
        }}
      />;
    });
  }

  updateNodes = (data) => {
    this.setState({
      vertices: data.vertices,
      links: data.links,
    })
  }
  
  handleRightAnalog = ({ axis, value, vrHead }) => {
    const transformMatrix = vrHead.matrix;
    // axis can be 0 or 1 (x and y)
    // value is a number between 1 and -1 (the amount of movement)
    const unitX = [transformMatrix[0], transformMatrix[1], transformMatrix[2]];
    const unitY = [transformMatrix[4], transformMatrix[5], transformMatrix[6]];
    const unitZ = [transformMatrix[8], transformMatrix[9], transformMatrix[10]];
    // const cameraTranslation = [transformMatrix[12], transformMatrix[13], transformMatrix[14]];
    let deltaPosition;
    if (axis === 0) {
      deltaPosition = [50 * value * unitX[0], 50 * value * unitX[1], 50 * value * unitX[2]];
    }
    if (axis === 1) {
      deltaPosition = [50 * value * unitZ[0], 50 * value * unitZ[1], 50 * value * unitZ[2]];
    }
    this.setState(({ offsetX, offsetY, offsetZ }) => ({
        offsetX: offsetX - deltaPosition[0],
        offsetY: offsetY - deltaPosition[1],
        offsetZ: offsetZ - deltaPosition[2],
      }));
  }
  
  handleRightButtonOne = () => {
    // trigger 1 pressed (the top one, zoom in?)
  }
  
  handleRightButtonTwo = () => {
    // trigger 2 pressed (the top one, zoom out?)
  }
  
  handleLeftAnalog = ({ axis, value, vrHead }) => {
    // axis can be 0 or 1 (x and y)
    // value is a number between 1 and -1 (the amount of movement)
  }
  
  handleLeftButtonOne = () => {
    // trigger 1 pressed (the top one)
  }
  
  handleLeftButtonTwo = () => {
    // trigger 2 pressed (the top one)
  }
  
  handleGazeEnter = (community) => {
    console.log('gazing', community);
    this.setState({ activeCommunity: community });
  }
  
  handleInput = (evt) => {
    const { eventType, axis, gamepad, value } = evt.nativeEvent.inputEvent;
    const vrHead = getVrHead();
    
    // Using right gamepad analog
    if (eventType === 'axismove' && gamepad === 1) {
      this.handleRightAnalog({ axis, value, vrHead });
    }
    
    // Using right gamepad analog
    if (eventType === 'axismove' && gamepad === 0) {
      this.handleLeftAnalog({ axis, value, vrHead });
    }
    
    // Clicking a right gamepad button
    if (eventType === 'keydown' && gamepad === 1) {
      if (button === 1) {
        this.handleRightButtonOne();
      }
      if (button === 2) {
        this.handleRightButtonTwo();
      }
    }
    
    // Clicking a right gamepad button
    if (eventType === 'keydown' && gamepad === 0) {
      if (button === 1) {
        this.handleLeftButtonOne();
      }
      if (button === 2) {
        this.handleLeftButtonTwo();
      }
    }
  }

  componentDidMount() {
    // Simulate a stream of updates to our structure of nodes
    setInterval(() => {
      this.updateNodes(structure);
    }, 22);
  }

  render() {
    return (
      <View onInput={this.handleInput}>
        <Pano source={asset('floor3.png')}/>
        <PointLight style={{color:'white', transform:[{translate : [0, 0, 0]}]}} />
        {this.renderVertices(this.state)}
        {this.renderLinks(this.state)}
      </View>
    );
  }
};

AppRegistry.registerComponent('vr', () => vr);
