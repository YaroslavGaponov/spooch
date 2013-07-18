

var Driver = module.exports = function() {
    this.data = {};
}

Driver.prototype.open = function() {
    return true;
}

Driver.prototype.close = function() {
    this.data = null;
    return true;
}

Driver.prototype.forEach = function(cb) {
    for (var key in this.data) {
        cb(key, this.data[key]);
    }
}

Driver.prototype.set = function(key, value) {
    key = Driver.stringify(key);
    this.data[key] = value;    
    return true;
}

Driver.prototype.get = function(key) {
    key = Driver.stringify(key);
    return this.data[key] || null;
}

Driver.prototype.remove = function(key) {
    key = Driver.stringify(key);
    if (this.data[key]) {
        delete this.data[key];
        return true;
    }
    return false;
}

Driver.stringify = function(s) {
    return typeof s === "string" ? s : s.toString();
}