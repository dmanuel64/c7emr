import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copyModinfo from '../../scripts/copy-modinfo-plugin.mjs';

export default {
    input: 'src/main.js',
    output: {
        file: 'dist/ui/c7emr-lua.js',
        format: 'iife'
    },
    plugins: [nodeResolve(), commonjs(), copyModinfo('c7emr-lua.modinfo')]
};