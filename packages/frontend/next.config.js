/**
 * @type {import('next').NextConfig}
 */
const path = require('path');
const StylelintPlugin = require('stylelint-webpack-plugin');

module.exports = {
    webpack: (config) => {
        const oneOfRule = config.module.rules.find((rule) => rule.oneOf);

        // Next 12 has multiple TS loaders, and we need to update all of them.
        const tsRules = oneOfRule.oneOf.filter(
            (rule) => rule.test && rule.test.toString().includes('tsx|ts')
        );

        tsRules.forEach((rule) => {
            // eslint-disable-next-line no-param-reassign
            rule.include = undefined;
        });
        config.module.rules.push({
            test: /\.svg$/,
            use: ['@svgr/webpack'],
        });
        config.plugins.push(new StylelintPlugin());
        return config;
    },
    output: 'export',
    distDir: 'dist',
    assetPrefix: '.',
    experimental: {
        outputFileTracingRoot: path.join(__dirname, '../../'),
    },
    sassOptions: {
        includePaths: [path.join(__dirname, 'styles')],
    },
    compress: true,
    generateEtags: true,
    pageExtensions: ['tsx', 'mdx', 'ts'],
    poweredByHeader: false,
    productionBrowserSourceMaps: false,
    swcMinify: true,
    trailingSlash: false,
};
