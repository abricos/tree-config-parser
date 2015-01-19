'use strict';

var fs = require('fs');
var should = require('should');
var path = require('path');
var treeConfig = require('tree-config');

var txtFile = path.join(__dirname, 'data', 'test.txt');

var ParserStream = require('../lib/ParserStream');

describe('TreeConfig parser: ', function(){

    before(function(done){
        treeConfig.configure({
            ROOT_OPTIONS: {
                tester: {
                    myValue: 'Hello world!'
                }
            }
        });
        done();
    });

    after(function(done){
        treeConfig.clean();
        done();
    });

    it('should be parse file', function(done){

        var config = treeConfig.instance();

        var parserStream = new ParserStream(config);

        var r = fs.createReadStream(txtFile);
        r.pipe(parserStream);

        done();
    });

});
