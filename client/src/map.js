export const mapComponents = [
  //perpendicular walls
  { translate: [-47, 0, 35],   rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-37, 0, 35],   rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [0, 0, 40],     rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [37, 0, 40],    rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-30, 0, 15],   rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [0, 0, 15],     rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [20, 0, 0],     rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-47, 0, 0],    rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-10, 0, -20],  rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [30, 0, -20],   rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-47, 0, -35],  rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-0, 0, -40],   rotation: [0, 0, 1], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },

  //parallel walls
  { translate: [-47, 0, 35],  rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-37, 0, 35],  rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [0, 0, 40],    rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [37, 0, 40],   rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-30, 0, 15],  rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [0, 0, 15],    rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [20, 0, 0],    rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-47, 0, 0],   rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-10, 0, -20], rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [30, 0, -20],  rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-47, 0, -35], rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },
  { translate: [-0, 0, -40],  rotation: [0, 1, 0], roationAngle: Math.PI / 2, scale: [2, 3, 0.1] },

  //floors
  { translate: [47,  0,   0],    rotation: [1, 0, 0], roationAngle: Math.PI / 2, scale: [6, 3, 0.1] },
  { translate: [47,  1, -10],    rotation: [1, 0, 0], roationAngle: Math.PI / 2, scale: [6, 3, 0.1] },
  { translate: [47,  2, -20],    rotation: [1, 0, 0], roationAngle: Math.PI / 2, scale: [6, 3, 0.1] },

  // //left route
  //   //stairs
  //   { translate: [-40,  -1.5, 4],    rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [6, 1.5, 0.1] },
  //   { translate: [-40,  -1,   2],    rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [6, 1.5, 0.1] },
  //   { translate: [-40,  -0.5, 0],    rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [6, 1.5, 0.1] },
  //   { translate: [-40,  0  , -2],    rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [6, 1.5, 0.1] },
  //   { translate: [-40,  0.5, -4],    rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [6, 1.5, 0.1] },
  //   { translate: [-40,  1  , -6],    rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [6, 1.5, 0.1] },
  //   { translate: [-40,  1.5, -8],    rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [6, 1.5, 0.1] },
  //   { translate: [-40,  2  ,-10],    rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [6, 1.5, 0.1] },
  //   { translate: [-40,  2.5,-12],    rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [6, 1.5, 0.1] },
  //   //platforms
  //   { translate: [-40,  3, -20],    rotation: [1, 0, 0], roationAngle: Math.PI / 2, scale: [3, 3, 0.1] },
  //   { translate: [-40,  3, -30],    rotation: [1, 0, 0], roationAngle: Math.PI / 2, scale: [3, 3, 0.1] },
  //   { translate: [-40,  5, -40],    rotation: [1, 0, 0], roationAngle: Math.PI / 2, scale: [2, 2, 0.1] },

  //back right
  // ...Array(50).fill(0).map((_, i) => (
  //   { translate: [50,  -1.5 + 0.5 * i, 50 - 2*i],   rotation: [1, 0, 0], roationAngle: 0.578 * Math.PI, scale: [3, 1.5, 0.1] }
  // ))
]

export const genRandomStartingPos = () => {
  const positions = [
    [-48, 0,  48],
    // [-48, 0, -48],
    // [48 , 0, -48],
    // [48 , 0,  48],
  ]
  return positions[Math.floor(Math.random() * positions.length)]
}