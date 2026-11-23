// Metro config: the app imports the game logic from ../sim, which sits outside this project folder.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, "../sim")];

module.exports = config;
