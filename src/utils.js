var exports = module.exports;

exports.forEachPromise = function(array, callback) {
  return new Promise((resolve, reject) => {
    if (array.length == 0) {
      return resolve();
    }
    return callback(array[0]).then(() => {
      return exports.forEachPromise(array.slice(1), callback).then(resolve);
    }).catch(reject);
  });
}

