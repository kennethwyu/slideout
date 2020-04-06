import babel from 'rollup-plugin-babel'
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser'

const config = ({ format, output, name, dir }) => ({
  input: 'src/index.js',
  output: {
    sourcemap: true,
    dir: `dist/${dir || format}`,
    format,
    name,
    plugins: process.env.NODE_ENV === 'production'
      ? [terser({
        mangle: {
          properties: {
            reserved: ['__esModule'],
            regex: /^_/
          }
        }
      })]
      : []
  },
  plugins: [
    resolve(),
    babel({
      rootMode: 'upward',
      caller: {
        output
      }
    })
  ]
})

export default [
  config({ format: 'es', output: 'es6' }),
  config({ format: 'es', output: 'es5m', dir: 'es5m' }),
  config({ format: 'umd', output: 'es5m', name: 'slideout' })
]
