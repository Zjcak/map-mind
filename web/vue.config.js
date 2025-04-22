const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
const isLibrary = process.env.NODE_ENV === 'library'

const WebpackDynamicPublicPathPlugin = require('webpack-dynamic-public-path')

module.exports = {
  publicPath: isDev ? '' : './dist',
  outputDir: '../dist',
  lintOnSave: false,
  productionSourceMap: false,
  filenameHashing: false,
  // transpileDependencies: ['yjs', 'lib0', 'quill'], // <-- 原来的第一个，注释掉或删除，合并到下面

  chainWebpack: config => {
    // 移除 preload 插件
    config.plugins.delete('preload')
    // 移除 prefetch 插件
    config.plugins.delete('prefetch')
    // 支持运行时设置public path
    if (!isDev) {
      config
        .plugin('dynamicPublicPathPlugin')
        .use(WebpackDynamicPublicPathPlugin, [
          { externalPublicPath: 'window.externalPublicPath' }
        ])
    }
    // 给插入html页面内的js和css添加hash参数
    if (!isLibrary) {
      config.plugin('html').tap(args => {
        args[0].hash = true
        return args
      })
    }
  },

  configureWebpack: { // <--- 这个大括号后面需要逗号
    resolve: {
      symlinks: false, // <-- 保留这个配置，用于处理 npm link
      alias: {
        '@': path.resolve(__dirname, './src/')
        // 'simple-mind-map': path.resolve(__dirname, 'node_modules/simple-mind-map') // 这个别名可以先不加，看看 symlinks: false 是否足够
      }
    }
  }, // <--- 在这里添加逗号

  // 将两个 transpileDependencies 合并到一起
  transpileDependencies: [
    'yjs',
    'lib0',
    'quill',
    'simple-mind-map' // <-- 把 simple-mind-map 加到这里
    // 如果 simple-mind-map-plugin-themes 也需要编译，取消注释
    // 'simple-mind-map-plugin-themes'
  ], // <--- 这个方括号后面需要逗号 (之前 devServer 前面缺少)

  devServer: {
    proxy: {
      '^/api/v3/': {
        target: 'http://ark.cn-beijing.volces.com',
        changeOrigin: true
      }
    }
  }
}