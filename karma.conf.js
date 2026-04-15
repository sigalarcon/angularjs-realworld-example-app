module.exports = function (config) {
  config.set({
    // Base path used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // Frameworks to use
    frameworks: ['jasmine', 'browserify'],

    // List of files / patterns to load in the browser
    files: [
      'src/js/**/*.spec.js'
    ],

    // Preprocess matching files before serving them to the browser
    preprocessors: {
      'src/js/**/*.spec.js': ['browserify']
    },

    // Browserify configuration
    browserify: {
      debug: true,
      transform: [
        ['babelify', { presets: ['es2015'] }],
        'browserify-ngannotate'
      ]
    },

    // Test results reporter to use
    reporters: ['progress', 'coverage'],

    // Coverage reporter configuration
    coverageReporter: {
      dir: 'coverage/',
      reporters: [
        { type: 'html', subdir: 'html' },
        { type: 'text-summary' }
      ]
    },

    // Web server port
    port: 9876,

    // Enable / disable colors in the output (reporters and logs)
    colors: true,

    // Level of logging
    logLevel: config.LOG_INFO,

    // Enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // Start these browsers
    browsers: ['ChromeHeadlessNoSandbox'],

    // Custom launcher for CI environments
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level - how many browsers should be started simultaneously
    concurrency: Infinity
  });
};
