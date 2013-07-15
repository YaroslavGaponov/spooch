
var Entry = function(value, potential) {
    this.value = value;
    this.potential = potential;
}

var Cache = module.exports = function(limit, interval) {
    var self = this;
    
    this.limit = limit || Infinity;
    this.cache = {};    
    this.potentials = {};
    this.potential = this.size = this.min = 0;
        
    setInterval(function() { self.trim(); }, interval || 5000);
}

Cache.prototype.clear = function() {
    this.cache = {};
    this.potentials = {};    
    this.potential = this.size = this.min = 0;    
}

Cache.prototype.add = function(key, value) {    
    this.remove(key);
    var potential = this.potential++;
    this.potentials[potential] = key;
    this.cache[key] = new Entry(value, potential);
    this.size++;
}

Cache.prototype.remove = function(key) {
    if (this.cache[key]) {
        var potential = this.cache[key].potential;
        delete this.potentials[potential];
        delete this.cache[key];
        this.size--;
    }
}

Cache.prototype.exists = function(key) {
    return this.cache[key] ? true : false;
}


Cache.prototype.get = function(key) {
    if (this.cache[key]) {
        var potential = this.cache[key].potential;
        delete this.potentials[potential];
        
        potential = this.potential++;
        this.cache[key].potential = potential;
        this.potentials[potential] = key;
        
        return this.cache[key].value;
    }
    return undefined;
}


Cache.prototype.trim = function() {
    if (this.size > this.limit) {
        for(var p=this.min; p<=this.potential; p++) {
            if (this.potentials[p]) {
                this.min = p;
                this.remove(this.potentials[p]);
                if (this.size < this.limit) {
                    return;
                }
            }            
        }
        this.min = this.potential;
    }    
}



