const utils = require("./utils")
const fs = require('fs');

var algoliaIdx = []; 
var maxFiles = 0;

function Indexer(setup) {
	this.setup = setup;
}

Indexer.prototype.run = function(){
	var _that = this;
	var indexTime = +new Date();

	return new Promise(function(resolve, reject){

		recursiveloop(_that.setup.dir, function(err,result){
			if(!result){
				console.error("no files in " + _that.setup.dir);
				return;
			}
			for(i=0;i<result.length;i++){
			    
				utils.parseMD(result[i], _that.setup)
				.then(
					function(props){
						if(
							(!props.draft || props.draft===false) && 
							(_that.setup.index_empty_content===undefined || _that.setup.index_empty_content===true || (_that.setup.index_empty_content===false && props.content.replace(/\s/g,"")!=="")) &&
							(!utils.checkArrInStr(props.uri,_that.setup.excludes)) 
						){
							props.indexTime = indexTime;
							algoliaIdx.push(props);
						}
						maxFiles--;

						if(maxFiles===0){
							resolve(algoliaIdx);
						}
					}
				);	    	
			}
		});
	});

};


// Asynchronous function to read folders and files recursively
function recursiveloop(dir, done){
  var results = [];
  fs.readdir(dir, function(err, list){
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          recursiveloop(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          maxFiles++;
          results.push(file);
          next();
        }
      });
    })();
  });
}

module.exports.Indexer = Indexer;