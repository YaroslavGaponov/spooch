/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var os = require("os");
var util = require("util");
var path = require("path");
var Chunk = require("./chunk");


var Storage = module.exports = function(directory, shards) {
    this.chunks = [];
    shards = shards ? shards : os.cpus().length;
    for(var i=0; i<shards; i++) {
        var chunk = new Chunk(path.join(directory, util.format("%s.%s", "chunk", i)));
        this.chunks.push(chunk);
    }
}

Storage.prototype.open = function(cb) {
    var total = this.chunks.length;
    var errors = [], results = [];
    this.chunks.forEach(function(chunk) {
        chunk.open(function(err, res) {
            errors.push(err);
            results.push(res);
            if (--total === 0) {
                return cb(errors, results);
            }            
        });
    });
}

Storage.prototype.close = function(cb) {
    var self = this;
    var total = this.chunks.length;
    var errors = [], results = [];
    this.chunks.forEach(function(chunk) {
        chunk.close(function(err, res) {            
            errors.push(err);
            results.push(res);
            if (--total === 0) {
                return cb(errors, results);
            }            
        });
    });
}

Storage.prototype.disconnect = function() {
    this.chunks.forEach(function(chunk) {
        chunk.disconnect();
    });
}

Storage.prototype.set = function(key, value, cb) {    
    var instance = Storage.hashCode(key) % this.chunks.length;
    this.chunks[instance].set(key, value, cb);
}

Storage.prototype.get = function(key, cb) {    
    var instance = Storage.hashCode(key) % this.chunks.length;
    this.chunks[instance].get(key, cb);
}

Storage.prototype.remove = function(key, cb) {    
    var instance = Storage.hashCode(key) % this.chunks.length;
    this.chunks[instance].remove(key, cb);
}

Storage.hashCode = function (s) {
    var hash = 0;
    for (var i=0; i<s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash = hash & hash;
    }    
    return hash & 0x7fffffff;
}