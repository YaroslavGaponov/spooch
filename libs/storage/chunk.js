

var Driver = require('./driver');

var driver = null;

process.on('message', function(request) {
    var result = error = null;
    try {
        switch(request.type) {
            case "create":                
                driver = new Driver(request.filename);
                result = true;
                break;
            case "open":                
                driver.open();
                result = true;
                break;
            case "close":
                driver.close();
                result = true;
                break;
            case "set":
                result = driver.set(request.key, request.value);
                break;
            case "get":
                result = driver.get(request.key);
                break;
            case "remove":
                result = driver.remove(request.key);
                break;
        }
    } catch(ex) {
        error = ex;
    } finally {
        if (request.id) {
            process.send({ "id": request.id, "result": result, "error": error });
        }
    }
});




var cp = require('child_process');

var Chunk = module.exports = function(filename) {
    var self = this;
    
    this.chunk = cp.fork(__filename);
    this.chunk.send( { "type": "create", "filename": filename } );
    
    this.callbacks = {};
    this.id = 0;
    
    this.chunk.on("message", function(response) {
        if (response.id) {
            if (self.callbacks[response.id]) {
                self.callbacks[response.id](response.error, response.result);
                delete self.callbacks[response.id];
            }
        }
    });
    
}

Chunk.prototype.register = function(cb) {
    if (cb && typeof cb === "function") {
        var id = ++this.id;
        this.callbacks[id] = cb;
        return id;
    }
    return null;
}

Chunk.prototype.open = function(cb) {    
    this.chunk.send( { "id": this.register(cb), "type": "open" } );
}

Chunk.prototype.close = function(cb) {
    this.chunk.send( { "id": this.register(cb), "type": "close" } );
}


Chunk.prototype.set = function(key, value, cb) {
    this.chunk.send( { "id": this.register(cb), "type": "set", "key": key, "value": value } );
}


Chunk.prototype.get = function(key, cb) {
    this.chunk.send( { "id": this.register(cb), "type": "get", "key": key } );
}

Chunk.prototype.remove = function(key, cb) {
    this.chunk.send( { "id": this.register(cb), "type": "remove", "key": key } );
}


