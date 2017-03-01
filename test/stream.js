'use strict';

var fs = require('fs');
var should = require('should');
var concat = require('concat-stream')
var path = require('path');
var config = require('tree-config');

var txtFile = path.join(__dirname, 'data', 'test.txt');

var ParserStream = require('../lib/ParserStream');

describe('TreeConfig parser: ', function(){

    before(function(done){
        config.setDefaults({
            tester: {
                myValue: 'Hello world!'
            }
        });
        done();
    });

    after(function(done){
        config.clean();
        done();
    });

    it('should be parse file', function(done){
        var parserStream = new ParserStream(config);

        fs.createReadStream(txtFile)
            .pipe(parserStream)
            .pipe(concat(function(data){
                console.log(data.toString());

                var result = /Hello world!/.test(data.toString());
                result.should.be.true();

                done();
            }));
    });
});
