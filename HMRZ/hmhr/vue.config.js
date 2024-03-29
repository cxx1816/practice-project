'use strict'
const path = require('path')
const defaultSettings = require('./src/settings.js')

function resolve(dir) {
  return path.join(__dirname, dir)
}

const name = defaultSettings.title || 'vue Admin Template' // page title
// webpack热更新->只能热更新main.js引入的相关代码(代码更改页面自动更新)
// 配置文件/和main.js没有引入关系的文件要变化，就必须要重启服务器(让webpack读取其他的配置)

// If your port is set to 80,
// use administrator privileges to execute the command line.
// For example, Mac: sudo npm run
// You can change the port by the following methods:
// port = 9528 npm run dev OR npm run dev --port = 9528
// 1.解释：process.env ->node环境内置的全局变量
const port = process.env.port || process.env.npm_config_port || 9528 // dev port

// 需要排除的包对象
let externals = {}
// 需要配置的 CDN 链接
let CDN = { css: [], js: [] }
// 判断是否是生产环境
const isProduction = process.env.NODE_ENV === 'production'
// 如何是生产环境，需要执行以下逻辑
if (isProduction) {
  externals = {
    /**
      * externals 对象属性解析：
      * '包名': '在项目中引入的名字'
      * 以 element-ui 举例 我再 main.js 里是以
      * import ELEMENT from 'element-ui'
      * Vue.use(ELEMENT)
      * 这样引入的，所以我的 externals 的属性值应该是 ELEMENT
      * 一定要去main.js设置
    */
    'vue': 'Vue',
    'element-ui': 'ELEMENT',
    'xlsx': 'XLSX'
  }

  CDN = {
    css: [
      'https://unpkg.com/element-ui/lib/theme-chalk/index.css' // element-ui css 样式表
    ],

    js: [
      // vue must at first!
      'https://unpkg.com/vue@2.6.12/dist/vue.js', // vuejs
      'https://unpkg.com/element-ui/lib/index.js', // element-ui js
      'https://cdn.jsdelivr.net/npm/xlsx@0.16.6/dist/xlsx.full.min.js' // xlsx
    ]
  }
}

// All configuration item explanations can be find in https://cli.vuejs.org/config/
module.exports = {
  /**
   * You will need to set publicPath if you plan to deploy your site under a sub path,
   * for example GitHub Pages. If you plan to deploy your site to https://foo.github.io/bar/,
   * then publicPath should be set to "/bar/".
   * In most cases please use '/' !!!
   * Detail: https://cli.vuejs.org/config/#publicpath
   */
  publicPath: process.env.NODE_ENV === 'development' ? '/' : './',
  // publicPath: '/',
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: process.env.NODE_ENV === 'development',
  productionSourceMap: false,
  devServer: {
    port: port, // 端口号
    open: true,
    overlay: {
      warnings: false,
      errors: true
    },
    // before: require('./mock/mock-server.js')
    // 代理配置
    proxy: {
      // 这里的 api 表示如果我们的请求地址以 /api 开头的时候，就触发代理机制
      '/api': { // 例如：axios请求的完整地址：/api/sys/login
        target: 'http://ihrm.itheima.net', // 需要代理的地址 (拼接在你本来要请求的地址前 http://ihrm.itheima.net/api/sys/login)
        // 备用地址：target: 'http://ihrm-java.itheima.net',
        changeOrigin: true // 是否跨域，需要设置此值为 true 才可以让本地服务代理我们发出请求
      }
      // 这里没有pathRewrite, 因为后端接口就是ihrm.itheima.net/api这种格式,所以不需要重写
    }
  },
  configureWebpack: {
    // provide the app's title in webpack's name field, so that
    // it can be accessed in index.html to inject the correct title.
    name: name,
    externals: externals,
    resolve: {
      alias: {
        '@': resolve('src')
      }
    }
  },
  chainWebpack(config) {
    // 注入cdn变量 (打包时会执行)
    config.plugin('html').tap(args => {
      args[0].cdn = CDN // 配置 CDN 给插件
      return args
    })
    // it can improve the speed of the first screen, it is recommended to turn on preload
    config.plugin('preload').tap(() => [
      {
        rel: 'preload',
        // to ignore runtime.js
        // https://github.com/vuejs/vue-cli/blob/dev/packages/@vue/cli-service/lib/config/app.js#L171
        fileBlacklist: [/\.map$/, /hot-update\.js$/, /runtime\..*\.js$/],
        include: 'initial'
      }
    ])

    // when there are many pages, it will cause too many meaningless requests
    config.plugins.delete('prefetch')

    // set svg-sprite-loader
    config.module.rule('svg').exclude.add(resolve('src/icons')).end()
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end()

    config.when(process.env.NODE_ENV !== 'development', (config) => {
      config
        .plugin('ScriptExtHtmlWebpackPlugin')
        .after('html')
        .use('script-ext-html-webpack-plugin', [
          {
            // `runtime` must same as runtimeChunk name. default is `runtime`
            inline: /runtime\..*\.js$/
          }
        ])
        .end()
      config.optimization.splitChunks({
        chunks: 'all',
        cacheGroups: {
          libs: {
            name: 'chunk-libs',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial' // only package third parties that are initially dependent
          },
          elementUI: {
            name: 'chunk-elementUI', // split elementUI into a single package
            priority: 20, // the weight needs to be larger than libs and app or it will be packaged into libs or app
            test: /[\\/]node_modules[\\/]_?element-ui(.*)/ // in order to adapt to cnpm
          },
          commons: {
            name: 'chunk-commons',
            test: resolve('src/components'), // can customize your rules
            minChunks: 3, //  minimum common number
            priority: 5,
            reuseExistingChunk: true
          }
        }
      })
      // https:// webpack.js.org/configuration/optimization/#optimizationruntimechunk
      config.optimization.runtimeChunk('single')
    })
  }
}
