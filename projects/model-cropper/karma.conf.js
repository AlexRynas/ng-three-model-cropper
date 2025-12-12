// Karma configuration file for model-cropper library
// This extends the Angular CLI's default karma config

module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', '@angular-devkit/build-angular'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-coverage'),
            require('@angular-devkit/build-angular/plugins/karma'),
        ],
        client: {
            jasmine: {},
            clearContext: false,
        },
        jasmineHtmlReporter: {
            suppressAll: true,
        },
        coverageReporter: {
            dir: require('path').join(__dirname, '../../coverage/model-cropper'),
            subdir: '.',
            reporters: [
                { type: 'html' },
                { type: 'lcovonly', file: 'lcov.info' },
                { type: 'text-summary' },
            ],
        },
        reporters: ['progress', 'kjhtml'],
        browsers: ['Chrome'],
        restartOnFileChange: true,
    });
};
