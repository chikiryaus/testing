// babel.config.js
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current", // Транспилировать для текущей версии Node.js
        },
      },
    ],
  ],
};
