
var Chunk = module.exports = function(filename) {
    var self = this;

    var cp = require('child_process');    
    this.chunk = cp.fork(__filename, [filename]);    
    
    this.callbacks = {};
    this.id = 0;
    
    this.chunk.on("message", function(response) {
        if (response.id) {
            if (self.callbacks[response.id]) {
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


var driver = null;

process.on('message', function(request) {    
    var result = error = null;

    try {        
        if (!driver) {
            var Driver = require('./driver');
            driver = new Driver(process.argv[2]);
        }
                
        if (!driver || !driver[request.type] || typeof driver[request.type] !== "function") {
            throw new Error("Not support method");    
        }
        
        result =
            driver[request.type]
                .apply(driver, request.args);
        
    } catch(ex) {
        error = ex;
        
    } finally {
        if (request.id) {
            process.send({ "id": request.id, "result": result, "error": error });
        }
    }
});



