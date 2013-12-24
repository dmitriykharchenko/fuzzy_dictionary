module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jasmine: {
      unit: {
        src: "dist/fuzzy_dictionary.js",
        options: {
          keepRunner: false,
          specs: 'spec/*_spec.js',
          vendor: ['dist/lib/batch.js']
          // helpers: ['spec/**/**_fixture.js']
        }
      }
    },

    clean: {
      tmp: ['_tmp']
    },

    uglify: {
      javascripts: {
        files: {
          'dist/fuzzy_dictionary.min.js': [
            'dist/fuzzy_dictionary.js'
          ]
        }
      }
    },

    coffee: {
      compile: {
        files: {
          'dist/fuzzy_dictionary.js': ["components/batchjs/src/batch.coffee", 'src/fuzzy_dictionary.coffee']
        },
        options: {
          bare: true
        }
      }
    },

    // copy: {
    //   scripts: {
    //     expand: true,
    //     flatten: true,
    //     src: '**/dist/*.js',
    //     dest: 'dist/lib/',
    //     cwd: 'components/'
    //   }
    // },

    watch: {
      scripts: {
        files: ['src/fuzzy_dictionary.coffee', 'spec/**/**.js'],
        tasks: ['compile'],
        options: {
          atBegin: true
        }
      }
    },

    jshint: {
      all: 'dist/fuzzy_dictionary.js',
      options: {
        reporter: 'jslint',
        reporterOutput: '../javascriptslint.xml'
      }
    }

  });

  grunt.event.on('watch', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });

  grunt.registerTask('compile', ['clean', 'coffee']);
  grunt.registerTask('build', ['compile', 'uglify']);
  grunt.registerTask('test', ['compile', 'jasmine:unit']);

};
