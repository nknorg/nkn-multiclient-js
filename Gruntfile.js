module.exports = function(grunt) {
  grunt.initConfig({
    browserify: {
      dist: {
        files: {
          'dist/nkn-multiclient.js': [ 'lib/index.js' ]
        },
        options: {
          browserifyOptions: {
            standalone: 'nkn'
          }
        }
      }
    },
    uglify: {
      dist: {
        files: {
          'dist/nkn-multiclient.min.js' : [ 'dist/nkn-multiclient.js' ]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify-es');

  grunt.registerTask('dist', ['browserify', 'uglify']);
};
