import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
    input: 'src/main.js',
    output: {
        file: 'ui/c7emr-python.js',
        format: 'iife'
    },
    plugins: [nodeResolve(), commonjs()]
};