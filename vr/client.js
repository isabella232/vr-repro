// Auto-generated content.
// This file contains the boilerplate to set up your React app.
// If you want to modify your application, start in "index.vr.js"

// Auto-generated content.
import {Module, VRInstance} from 'react-vr-web';
import RCTDeviceEventEmitter from 'RCTDeviceEventEmitter'

class TeleportModule extends Module {
  constructor() {
    super('TeleportModule');
    this._camera = null;
  }

  setCamera(camera) {
    this._camera = camera;
  }

  teleportCamera(x, y, z) {
    if (this._camera) {
      this._camera.position.set(x, y, z);
      // Call this to make sure anything positioned relative to the camera is set up properly:
      this._camera.updateMatrixWorld(true);
    }
  }
}

function init(bundle, parent, options) {
  const teleportModule = new TeleportModule();
  const vr = new VRInstance(bundle, 'vr', parent, {
    // Add custom options here
    nativeModules: [teleportModule],
    cursorVisibility: 'visible',
    ...options,
  });
  teleportModule.setCamera(vr.player.camera);
  vr.render = function() {
    // Any custom behavior you want to perform on each frame goes here
  };
  // Begin the animation loop
  vr.start();
  return vr;
}

window.ReactVR = {init};
