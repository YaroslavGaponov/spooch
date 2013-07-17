/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var Entry = function(key, value) {
    this.key = key;
    this.value = value;
}

var Cache = module.exports = function(limit) {
    this.limit = limit || 1024;
    this.cache = new Array(this.limit);
}

Cache.prototype.clear = function() {
    this.cache = new Array(this.limit);  
}

Cache.prototype.add = function(key, value) {
    var index = Cache.hashCode(key) % this.limit; 
    this.cache[index] = new Entry(key, value);
}

Cache.prototype.remove = function(key) {
    var index = Cache.hashCode(key) % this.limit;
    if (this.cache[index]) {
        if (this.cache[index].key === key) {
            this.cache[index] = null;
        }
    }
}

Cache.prototype.exists = function(key) {
    var index = Cache.hashCode(key) % this.limit;
    var entry = this.cache[index];
    return entry && (entry.key === key);
}


Cache.prototype.get = function(key) {
    var index = Cache.hashCode(key) % this.limit;
    var entry = this.cache[index]
    if (entry && (entry.key === key)) {
        return entry.value;
    }
    return undefined;
}

Cache.hashCode = function(s) {
    var ch, hash = 0;
    if (s.length == 0) return hash;
    var length = s.length <= 32 ? s.length : 32;
    for (var i=0; i<length; i++) {
        ch = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash = hash & hash;
    }
    return hash & 0x7fffffff;
}



