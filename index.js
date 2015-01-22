/**
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

var ParserStream = require('./lib/ParserStream');
var through = require('through');

'use strict';

exports.ParserStream = ParserStream;

exports.parse = function(config){

    var parserStream = new ParserStream(config);

    var stream = through(
        function write(chunk){
            if ('string' === typeof chunk){
                chunk = new Buffer(chunk)
            }
            parserStream.write(chunk)
        }, function end(data){
            if (data){
                stream.write(data);
            }
            stream.queue(null);
        }
    );

    parserStream.onError = function(err){
        stream.emit('error', err);
    };

    return stream;
};