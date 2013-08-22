/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var errors = require("./errors");

var Chunk = module.exports = function(filename) {
    var self = this;
    
    var cp = require('child_process');    
    this.chunk = cp.fork(__filename, [filename]);    
        
    this.callbacks = {};
    this.id = 0;
    
    this.chunk.on("message", function(response) {
        if (response.id) {
            if (self.callbacks[response.id] && (typeof self.callbacks[response.id] === "function")) {
                self.callbacks[response.id](response.error, response.result);
                self._removeCallback(response.id);
            }
        }
    });
    
}

Chunk.prototype._addCallback = function(cb) {
    if (cb && typeof cb === "function") {
        var id = ++this.id;
        this.callbacks[id] = cb;
        return id;
    }
    return null;
}

Chunk.prototype._removeCallback = function(id) {
    if (id) {
        if (this.callbacks[id]) {
            delete this.callbacks[id];
        }
    }
}


Chunk.prototype._sendCmdToChunk = function(type) {
    var self = this;
    return function() {
        var args = Array.prototype.slice.call(arguments);
        return function(cb) {
            if (!self.chunk.connected) {
                return cb(errors.InternalError("chunk is offline"), null);
            }
            self.chunk.send( { "type": type, "id": self._addCallback(cb),  args: args } );
        }
    }
}

Chunk.prototype.open = function(cb) {    
    this._sendCmdToChunk("open")()(cb);
}

Chunk.prototype.close = function(cb) {
    this._sendCmdToChunk("close")()(cb);
}

Chunk.prototype.set = function(key, value, cb) {
    this._sendCmdToChunk("set")(key, value)(cb);
}

Chunk.prototype.get = function(key, cb) {
    this._sendCmdToChunk("get")(key)(cb);
}

Chunk.prototype.remove = function(key, cb) {
    this._sendCmdToChunk("remove")(key)(cb);
}

Chunk.prototype.disconnect = function() {
    if (this.chunk.connected) {
        this.chunk.disconnect();
    }
}


var driver = null;

process.on('message', function(request) {    
    var result = error = null;

    try {        
        if (!driver) {
            var Driver = require('./driver');
            driver = Driver.create(Driver.CONFIGS.FILE_LRU_BTREE, process.argv[2]);
        }
                
        if (!driver || !driver[request.type] || typeof driver[request.type] !== "function") {
            throw errors.NotImplemented("not support driver method");    
        }
        
        result =
            driver[request.type]
                .apply(driver, request.args);
        
    } catch(ex) {
        error = errors.InternalError(ex.toString());
        
    } finally {
        if (request.id) {
            process.send({ "id": request.id, "result": result, "error": error });
        }
    }
});

process.on("disconnect", function() {
    if (driver) {
        process.exit();
    }
});



