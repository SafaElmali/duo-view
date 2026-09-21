const stage = document.querySelector('[data-model]');
const status = document.querySelector('[data-model-status]');
const controls = [...document.querySelectorAll('[data-pose]')];
const slider = document.querySelector('#fold-angle');
const angleLabels = [...document.querySelectorAll('[data-angle]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const asset = name => new URL(`assets/${name}`, import.meta.url).href;

// The landing page owns only this demonstration. The simulator remains independent.
async function mountModel() {
  const [T, {createDuoModel}] = await Promise.all([
    import('../assets/three/three.module.min.js'),
    import('../duo-model.mjs'),
  ]);
  const renderer = new T.WebGLRenderer({alpha: true, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  // Compress bright reflections so the ceramic and its inlay retain detail.
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Foldable phone. Drag or use arrow keys to rotate. Press Home to reset.');
  stage.append(canvas);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, .1, 100);
  scene.add(new T.HemisphereLight(0xffffff, 0x929398, 1.6));
  const key = new T.DirectionalLight(0xffffff, 2.8);
  key.position.set(-3, 5, 7); scene.add(key);
  const rim = new T.DirectionalLight(0xe6e9ef, 1.4);
  rim.position.set(4, 1, -3); scene.add(rim);
  const fill = new T.DirectionalLight(0xffffff, .65);
  fill.position.set(2, -3, 4); scene.add(fill);
  const model = createDuoModel();
  model.finish('white');
  const pivot = new T.Group();
  pivot.add(model.root); scene.add(pivot);
  const textureLoader = new T.TextureLoader();
  const [wideImage, foldedImage, portraitImage] = await Promise.all([
    textureLoader.loadAsync(asset('demo-wide.png')),
    textureLoader.loadAsync(asset('demo-folded.png')),
    textureLoader.loadAsync(asset('demo-open.png')),
  ]);

  function viewportTexture(source, aspect) {
    const crop = document.createElement('canvas');
    crop.width = source.image.width;
    crop.height = Math.round(crop.width / aspect);
    const context = crop.getContext('2d');
    context.fillStyle = '#fafbf7'; context.fillRect(0, 0, crop.width, crop.height);
    context.drawImage(source.image, 0, 0);
    const texture = new T.CanvasTexture(crop);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    return texture;
  }
  const wide = viewportTexture(wideImage, 890 / 626);
  const folded = viewportTexture(foldedImage, 466 / 678);
  const portraitCrop = document.createElement('canvas');
  portraitCrop.width = 1780; portraitCrop.height = 1252;
  const portraitContext = portraitCrop.getContext('2d');
  portraitContext.translate(1780, 0); portraitContext.rotate(Math.PI / 2);
  portraitContext.drawImage(portraitImage.image, 0, 0, 1252, 1780, 0, 0, 1252, 1780);
  const tabletop = new T.CanvasTexture(portraitCrop);
  tabletop.colorSpace = T.SRGBColorSpace;
  tabletop.anisotropy = wide.anisotropy;
  const left = wide.clone(); left.repeat.set(.5, 1); left.needsUpdate = true;
  const right = wide.clone(); right.repeat.set(.5, 1); right.offset.x = .5; right.needsUpdate = true;
  const tableLeft = tabletop.clone(); tableLeft.repeat.set(.5, 1); tableLeft.needsUpdate = true;
  const tableRight = tabletop.clone(); tableRight.repeat.set(.5, 1); tableRight.offset.x = .5; tableRight.needsUpdate = true;
  function setScreen(pose) {
    for (const display of model.displays) {
      if (display.name === 'Inner_Display_Left') display.material.map = pose === 'tabletop' ? tableLeft : left;
      if (display.name === 'Inner_Display_Right') display.material.map = pose === 'tabletop' ? tableRight : right;
    }
  }
  model.displays.forEach(display => {
    display.material.dispose();
    const map = display.name === 'Inner_Display_Left' ? left : display.name === 'Inner_Display_Right' ? right : folded;
    display.material = new T.MeshBasicMaterial({map, toneMapped: false});
  });
  wideImage.dispose(); foldedImage.dispose(); portraitImage.dispose();
  stage.classList.add('is-ready');
  const isPoster = document.body.classList.contains('unfold');
  const poses = {
    flat: {angle: 180, x: -.18, y: -.14, z: -.055},
    book: {angle: 145, x: -.13, y: .16, z: isPoster ? -.16 : -.07},
    tabletop: {angle: 100, x: -.62, y: -.12, z: Math.PI / 2},
    folded: {angle: 0, x: -.12, y: Math.PI - .26, z: -.06},
  };
  let current = {...poses.book};
  let frame = 0;
  let visible = true;
  let contextLost = false;
  const box = new T.Box3();
  const center = new T.Vector3();
  const size = new T.Vector3();
  function draw() {
    if (!visible || contextLost) return;
    model.fold(current.angle);
    model.root.position.set(0, 0, 0);
    pivot.rotation.set(0, 0, 0);
    pivot.updateMatrixWorld(true);
    box.setFromObject(model.root).getCenter(center);
    model.root.position.copy(center).multiplyScalar(-1);
    pivot.rotation.set(current.x, current.y, current.z);
    pivot.updateMatrixWorld(true);
    box.setFromObject(pivot).getSize(size);
    const tangent = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    const height = stage.clientHeight || 400;
    const width = stage.clientWidth || 600;
    camera.aspect = width / height;
    // Keep both halves inside the stage throughout a fold, not only at endpoints.
    const distance = Math.max(size.y / (2 * tangent), size.x / (2 * tangent * camera.aspect));
    const padding = width < 600 ? 1.18 : isPoster ? 1.17 : 1.2;
    camera.position.set(0, 0, distance * padding + size.z / 2);
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  function setAngleLabel() {
    const angle = Math.round(current.angle);
    for (const label of angleLabels) label.textContent = `${angle}°`;
    if (slider) slider.value = String(angle);
  }
  function animateTo(target) {
    cancelAnimationFrame(frame);
    const start = {...current};
    const startTime = performance.now();
    const duration = reducedMotion.matches || document.hidden ? 0 : 750;
    function tick(now) {
      const progress = duration ? Math.min((now - startTime) / duration, 1) : 1;
      const eased = 1 - (1 - progress) ** 4;
      for (const field of Object.keys(target)) current[field] = start[field] + (target[field] - start[field]) * eased;
      setAngleLabel(); draw();
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    if (duration) frame = requestAnimationFrame(tick);
    else tick(performance.now());
  }
  for (const button of controls) button.addEventListener('click', () => {
    controls.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    setScreen(button.dataset.pose);
    animateTo(poses[button.dataset.pose]);
    status.textContent = `${button.textContent} view · Drag or use arrow keys to explore`;
  });
  slider?.addEventListener('input', () => {
    cancelAnimationFrame(frame);
    current.angle = Number(slider.value);
    // Turn toward the cover as the device closes, keeping the display visible.
    current.y = current.angle < 55 ? .16 + (55 - current.angle) / 55 * (Math.PI - .42) : .16;
    current.x = -.13; current.z = -.16;
    setAngleLabel(); draw();
  });
  let drag = null;
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    cancelAnimationFrame(frame);
    drag = {x: event.clientX, y: event.clientY, yaw: current.y, pitch: current.x};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    current.y = drag.yaw + (event.clientX - drag.x) * .007;
    current.x = Math.max(-1.1, Math.min(1.1, drag.pitch + (event.clientY - drag.y) * .006));
    draw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault(); cancelAnimationFrame(frame);
    if (event.key === 'Home') {
      setScreen('book');
      animateTo(poses.book);
      controls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pose === 'book')));
      status.textContent = 'Book view · Drag or use arrow keys to explore';
      return;
    }
    if (event.key === 'ArrowLeft') current.y -= .1;
    if (event.key === 'ArrowRight') current.y += .1;
    if (event.key === 'ArrowUp') current.x = Math.max(-1.1, current.x - .1);
    if (event.key === 'ArrowDown') current.x = Math.min(1.1, current.x + .1);
    draw();
  });
  const resize = new ResizeObserver(() => {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false); draw();
  });
  resize.observe(stage);
  const intersection = new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; if (visible) draw();});
  intersection.observe(stage);
  document.addEventListener('visibilitychange', draw);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true;
    stage.classList.remove('is-ready');
    status.textContent = '3D preview paused. Reload the page, or explore the simulator in 2D.';
    controls.forEach(button => {button.disabled = true;});
    if (slider) slider.disabled = true;
  });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect();
    model.dispose(); renderer.dispose();
    [wide, folded, left, right, tabletop, tableLeft, tableRight].forEach(texture => texture.dispose());
  }, {once: true});
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  draw();
}

if (stage) mountModel().catch(() => {
  stage.querySelector('canvas')?.remove();
  stage.classList.remove('is-ready');
  status.textContent = '3D isn’t available in this browser. You can still explore the simulator in 2D.';
  controls.forEach(button => {button.disabled = true;});
  if (slider) slider.disabled = true;
});
