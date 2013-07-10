
var Cache = module.exports = function(limit) {
    this.cache = {};
    this.potential = {};
    this.limit = limit || 1024;
    this.size = 0;
}

Cache.prototype.clear = function() {
    this.cache = {};
    this.potential = {};
    this.size = 0;
}

Cache.prototype.add = function(key, value) {
    var pot = 0;
    if (this.size > this.limit) {
        while (( this.size >> 1 ) > this.limit) {
            for(var k in this.potential) {
                if (this.potential[k] < pot) {
                    this.remove(k);
                }
            }
            pot++;
        }        
        for(var k in this.cache) {
            this.potential[k] = 0;
        }                    
    }

    this.cache[key] = value;
    this.potential[key] = 0;        
}

Cache.prototype.remove = function(key) {
    delete this.cache[key];
    delete this.potential[key];
    this.size--;
}

Cache.prototype.exists = function(key) {
    return this.cache[key] ? true : false;
}


Cache.prototype.get = function(key) {
    if (this.potential[key]) {
        this.potential[key]++;
    }
    return this.cache[key];
}
