var exports = module.exports;

exports.forEachAsync = function(array, callback) {
  return array.reduce((promise, item) => {
    return promise.then((result) => {
      return callback(item);
    });
  }, Promise.resolve());
}

