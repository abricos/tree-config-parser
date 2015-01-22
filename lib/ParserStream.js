/**
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

'use strict';

var util = require('util');
var Stream = require('stream').Stream;

var C = {};

var LESS_THAN = C.LESS_THAN = 0x1;
var GREATER_THAN = C.GREATER_THAN = 0x2;
var PERCENT = C.PERCENT = 0x3;
var EQUALS = C.EQUALS = 0x4;

var STATE_SEARCH = C.STATE_SEARCH = 0x11;

var STATE_START = C.STATE_START = 0x21;
var STATE_START1 = C.STATE_START1 = 0x22;

var STATE_KEY = C.STATE_KEY = 0x31;

var STATE_END = C.STATE_END = 0x41;
var STATE_PARSE = C.STATE_END1 = 0x51;

var ParserStream = function(configNode){
    this.state = STATE_SEARCH;

    this._paused = this._ended = this._destroyed = false;

    this.writable = true;
    this.readable = true;

    this._appName = require('./../package').name;
    this._version = require('./../package').version;

    this._errorPrefix = this._appName + ': ';

    this._errorBadOptions = new Error(this._errorPrefix + 'configNode incorrect.');
    this._errorWriteAfterEnd = new Error(this._errorPrefix + 'attempt to write to a stream that has ended.');
    this._errorUnwritable = new Error(this._errorPrefix + 'attempt to write to a stream that is not writable.');

    if (!configNode){
        this.emit('error', this._errorBadOptions);
    } else {
        this._configNode = configNode;
    }

    this._stack = [];

    this._stackKey = [];

    Stream.call(this);

    return this
};

util.inherits(ParserStream, Stream);

ParserStream.prototype.push = function(c){
    this._stack.push(c);
};

ParserStream.prototype.pop = function(){
    this._stackKey.push(this._stack.pop());
};

ParserStream.prototype.write = function(buffer){
    // cannot write to a stream after it has ended
    if (this._ended){
        throw this._errorWriteAfterEnd;
    }

    // stream must not be paused
    if (this._paused){
        return false;
    }

    if (typeof buffer === 'string'){
        buffer = new Buffer(buffer);
    }

    this._cleanKeyBuilder();

    var stack = this._stack;
    var n;
    for (var i = 0, l = buffer.length; i < l; i++){
        n = buffer[i];

        stack.push(n);

        if (n === 0x3C){
            this.onToken(LESS_THAN, "<")
        } else if (n === 0x25){
            this.onToken(PERCENT, "%")
        } else if (n === 0x3D){
            this.onToken(EQUALS, "=")
        } else if (n === 0x3E){
            this.onToken(GREATER_THAN, ">")
        } else if (this.state === STATE_KEY){
            this.pop();
        }
    }

    var outBuffer = new Buffer(stack);

    this.emit('data', outBuffer);
};

ParserStream.prototype.onToken = function(token, value){

    if (token === LESS_THAN){ // <

        this._cleanKeyBuilder()

        if (this.state === STATE_SEARCH){
            this.state = STATE_START;
            this.pop();
        } else {
            this._cleanKeyBuilder();
        }

    } else if (token === PERCENT){ // %

        if (this.state == STATE_START){
            this.state = STATE_START1;
            this.pop();
        } else if (this.state === STATE_KEY){
            this.state = STATE_END;
            this.pop();
        } else {
            this._cleanKeyBuilder();
        }

    } else if (token === EQUALS){ // =

        if (this.state == STATE_START1){
            this.state = STATE_KEY;
            this.pop();
        } else {
            this._cleanKeyBuilder();
        }

    } else if (token === GREATER_THAN){ // >
        this.state = STATE_PARSE;
        this.pop();
        this._cleanKeyBuilder();
    }
};

ParserStream.prototype._cleanKeyBuilder = function(){

    var stackKey = this._stackKey;

    if (this.state === STATE_PARSE){
        var buf = new Buffer(stackKey, 'UTF8')
        var key = buf.toString()
            .replace('<%=', '')
            .replace('%>', '');

        var value = this._configNode.get(key, {
            default: ''
        });

        if (typeof value !== 'string'){
            value = JSON.stringify(value);
        }

        for (var i = 0; i < value.length; i++){
            this._stack.push(value.charCodeAt(i));
        }
    }else if (stackKey.length > 0){
        this._stack = this._stack.concat(stackKey);
    }

    this.state = STATE_SEARCH;
    this._stackKey = [];
};

ParserStream.prototype.end = function(str){
    if (this._ended){
        return;
    }

    if (!this.writable){
        return;
    }

    if (arguments.length){
        this.write(str)
    }

    this._ended = true;
    this.readable = false;
    this.writable = false;

    this.emit('end');
    this.emit('close');
};

ParserStream.prototype.destroy = function(){
    if (this._destroyed){
        return;
    }

    this._destroyed = true;
    this._ended = true;

    this.readable = false;
    this.writable = false;

    this.emit('end');
    this.emit('close');
};

ParserStream.prototype.pause = function(){
    if (this._paused){
        return;
    }

    this._paused = true;
    this.emit('pause');
};

ParserStream.prototype.resume = function(){
    if (this._paused){
        this._paused = false;
        this.emit('drain');
    }
};

ParserStream.C = C;
module.exports = ParserStream;