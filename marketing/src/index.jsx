import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {DuoMarketing} from './video.jsx';

const Root=()=> <Composition id="DuoView-Marketing" component={DuoMarketing} width={1920} height={1080} fps={30} durationInFrames={840}/>;
registerRoot(Root);
