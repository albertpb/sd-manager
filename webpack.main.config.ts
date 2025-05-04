import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';
import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main/index.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    ...plugins,
    new CopyPlugin({
      patterns: [
        {
          from: 'src/main/workers',
          to: './workers',
        },
        {
          from: 'assets',
          to: 'assets',
        },
      ],
    }),
  ],
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};
